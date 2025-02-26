# Circlemind Query Application

A clean, modern web application for querying Circlemind knowledge graphs.

## Features

- Query any Circlemind knowledge graph
- Select from available graphs
- View formatted query results with references
- Clean, responsive UI

## Project Structure

```
├── server.py         # Flask server for handling API requests
├── index.html        # Main HTML file
├── styles.css        # CSS styles
├── app.js            # JavaScript functionality
├── requirements.txt  # Python dependencies
└── .env              # Environment variables (API key)
```

## Setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Set your Circlemind API key in the `.env` file:

```
CIRCLEMIND_API_KEY=your_api_key_here
```

3. Run the server:

```bash
python server.py
```

4. Open your browser and navigate to `http://localhost:8000`

## API Endpoints

- `GET /api/graphs` - Get a list of available graphs
- `POST /api/query` - Execute a query against a graph

## Query Parameters

When making a query, you can provide:

- `query` (required): The query text
- `graph_id` (optional): The ID of the graph to query (defaults to 'default')

## Technologies Used

- **Backend**: Flask, Python
- **Frontend**: HTML, CSS, JavaScript
- **API**: Circlemind SDK 