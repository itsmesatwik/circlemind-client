from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from circlemind import Circlemind
import os
import traceback
import json

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize Circlemind client
client = Circlemind()

@app.route('/')
def home():
    return send_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_file(path)

@app.route('/api/graphs', methods=['GET'])
def get_graphs():
    try:
        graphs = client.list_graphs()
        print(f"Available graphs: {graphs}")
        return jsonify(graphs)
    except Exception as e:
        print(f"Error getting graphs: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/query', methods=['POST'])
def query():
    try:
        data = request.json
        if not data or 'query' not in data:
            return jsonify({'error': 'Query is required'}), 400

        graph_id = data.get('graph_id', 'default')
        
        # Execute query using Circlemind SDK
        print(f"Querying graph {graph_id}: {data['query']}")
        result = client.query(
            query=data['query'],
            graph_id=graph_id,
            with_references=True
        )

        # Get the response directly
        response = result.response
        print(f"Raw response: {response}")
        
        # If references are available, format them
        references = {}
        try:
            if hasattr(result, 'format_references'):
                # Print the structure of the context to debug
                if hasattr(result, 'context'):
                    print(f"Context structure: {json.dumps(list(result.context.keys()), indent=2)}")
                    if 'chunks' in result.context:
                        # Safely check the chunks structure
                        chunks = result.context['chunks']
                        if chunks and isinstance(chunks, list) and len(chunks) > 0:
                            print(f"First chunk sample: {json.dumps(chunks[0], indent=2)}")
                        elif chunks and isinstance(chunks, dict) and chunks:
                            # If chunks is a dictionary, print the first key-value pair
                            first_key = next(iter(chunks))
                            print(f"First chunk sample (dict): {json.dumps({first_key: chunks[first_key]}, indent=2)}")
                        else:
                            print(f"Chunks is empty or has unexpected structure: {type(chunks)}")
                
                # Try to format references
                _, references = result.format_references()
                print(f"References formatted successfully: {json.dumps(references, default=str)}")
            else:
                print("Result object does not have format_references method")
        except Exception as ref_error:
            print(f"Error formatting references: {ref_error}")
            print(traceback.format_exc())
            
            # Try to extract references manually if possible
            try:
                if hasattr(result, 'context'):
                    print("Attempting to extract references manually from context")
                    
                    # Extract from chunks if available
                    if 'chunks' in result.context:
                        chunks = result.context['chunks']
                        if isinstance(chunks, dict):
                            # Process dictionary-style chunks
                            for chunk_id, chunk_data in chunks.items():
                                if isinstance(chunk_data, list) and len(chunk_data) > 0:
                                    chunk_info = chunk_data[0]
                                    if isinstance(chunk_info, dict):
                                        ref_id = str(len(references) + 1)  # Create sequential reference IDs
                                        
                                        # Extract useful information
                                        ref_content = {
                                            'content': chunk_info.get('content', 'No content available'),
                                            'relevance': chunk_data[1] if len(chunk_data) > 1 else 'Unknown'
                                        }
                                        
                                        # Add metadata if available
                                        if 'metadata' in chunk_info and chunk_info['metadata']:
                                            ref_content.update(chunk_info['metadata'])
                                            
                                        references[ref_id] = ref_content
                        elif isinstance(chunks, list):
                            # Process list-style chunks
                            for i, chunk in enumerate(chunks):
                                if isinstance(chunk, dict):
                                    ref_id = str(i + 1)
                                    references[ref_id] = {
                                        'content': chunk.get('content', 'No content available')
                                    }
                                    if 'metadata' in chunk and chunk['metadata']:
                                        references[ref_id].update(chunk['metadata'])
                    
                    # Also try to extract from documents if available
                    if 'documents' in result.context:
                        documents = result.context['documents']
                        if isinstance(documents, list):
                            for i, doc in enumerate(documents):
                                if isinstance(doc, dict):
                                    ref_id = str(len(references) + 1)
                                    doc_info = {
                                        'type': 'document'
                                    }
                                    
                                    # Add content if available
                                    if 'content' in doc:
                                        doc_info['content'] = doc['content']
                                        
                                    # Add metadata if available
                                    if 'metadata' in doc and doc['metadata']:
                                        doc_info.update(doc['metadata'])
                                        
                                    references[ref_id] = doc_info
                        elif isinstance(documents, dict):
                            for doc_id, doc in documents.items():
                                if isinstance(doc, dict):
                                    ref_id = str(len(references) + 1)
                                    doc_info = {
                                        'type': 'document',
                                        'id': doc_id
                                    }
                                    
                                    # Add content if available
                                    if 'content' in doc:
                                        doc_info['content'] = doc['content']
                                        
                                    # Add metadata if available
                                    if 'metadata' in doc and doc['metadata']:
                                        doc_info.update(doc['metadata'])
                                        
                                    references[ref_id] = doc_info
                    
                    print(f"Manually extracted references: {json.dumps(references, default=str)}")
            except Exception as manual_ref_error:
                print(f"Error extracting references manually: {manual_ref_error}")
                print(traceback.format_exc())

        # Prepare the response data
        response_data = {
            'answer': response,
            'references': references
        }
        
        print(f"Sending response: {json.dumps(response_data, default=str)}")
        return jsonify(response_data)

    except Exception as e:
        print(f"Error in query endpoint: {e}")
        print(traceback.format_exc())  # Print full traceback
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=8000) 