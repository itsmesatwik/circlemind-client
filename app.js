// DOM Elements
const elements = {
    graphSelect: document.getElementById('graphSelect'),
    queryInput: document.getElementById('queryInput'),
    resultDiv: document.getElementById('result'),
    answerContent: document.getElementById('answerContent'),
    referencesSection: document.getElementById('referencesSection'),
    referencesList: document.getElementById('referencesList'),
    errorDiv: document.getElementById('error'),
    loadingDiv: document.getElementById('loading'),
    submitBtn: document.getElementById('submitBtn')
};

// API Endpoints
const API = {
    BASE_URL: 'http://localhost:8000',
    GRAPHS: '/api/graphs',
    QUERY: '/api/query'
};

// Fetch available graphs when page loads
document.addEventListener('DOMContentLoaded', fetchGraphs);

/**
 * Fetch available graphs from the API
 */
async function fetchGraphs() {
    try {
        const response = await fetch(`${API.BASE_URL}${API.GRAPHS}`);
        const data = await response.json();
        
        elements.graphSelect.innerHTML = ''; // Clear loading option
        
        // Add default option
        addGraphOption('default', 'Default Graph');
        
        // Add all available graphs
        if (Array.isArray(data)) {
            data.forEach(graph => addGraphOption(graph, graph));
        }
    } catch (error) {
        console.error('Error fetching graphs:', error);
        elements.graphSelect.innerHTML = '<option value="default">Default Graph</option>';
    }
}

/**
 * Add an option to the graph select dropdown
 * @param {string} value - The option value
 * @param {string} text - The option display text
 */
function addGraphOption(value, text) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    elements.graphSelect.appendChild(option);
}

/**
 * Execute a query against the selected graph
 */
async function executeQuery() {
    // Validate input
    if (!elements.queryInput.value.trim()) {
        showError('Please enter a query');
        return;
    }
    
    // Disable submit button and show loading
    setLoading(true);

    try {
        console.log('Sending query:', elements.queryInput.value, 'to graph:', elements.graphSelect.value);
        
        const response = await fetch(`${API.BASE_URL}${API.QUERY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: elements.queryInput.value,
                graph_id: elements.graphSelect.value
            })
        });

        const data = await response.json();
        console.log('Received response:', data);
        
        if (!response.ok) {
            throw new Error(data.error || 'An error occurred while processing your query');
        }

        displayResults(data);
    } catch (error) {
        console.error('Error executing query:', error);
        showError(error.message);
    } finally {
        setLoading(false);
    }
}

/**
 * Safely render markdown content with sanitization
 * @param {string} content - The markdown content to render
 * @returns {string} - Sanitized HTML
 */
function renderMarkdown(content) {
    try {
        // Parse markdown to HTML
        const html = marked.parse(content);
        // Sanitize the HTML
        return DOMPurify.sanitize(html);
    } catch (e) {
        console.error('Error rendering markdown:', e);
        return content;
    }
}

/**
 * Display query results
 * @param {Object} data - The query response data
 */
function displayResults(data) {
    console.log('Displaying results:', data);
    
    // Clear any previous errors
    elements.errorDiv.style.display = 'none';
    
    // Display the answer
    if (data.answer) {
        // Render the answer with markdown
        elements.answerContent.innerHTML = renderMarkdown(data.answer);
    } else {
        elements.answerContent.textContent = 'No answer found';
        console.warn('No answer in response data');
    }
    
    // Display references if available
    if (data.references && Object.keys(data.references).length > 0) {
        elements.referencesList.innerHTML = '';
        
        Object.entries(data.references).forEach(([key, value]) => {
            const referenceItem = document.createElement('div');
            referenceItem.className = 'reference-item';
            
            // Create reference header with ID
            const referenceHeader = document.createElement('div');
            referenceHeader.className = 'reference-header';
            referenceHeader.innerHTML = `<strong>Reference [${key}]</strong>`;
            
            // Create reference content
            const referenceContent = document.createElement('div');
            referenceContent.className = 'reference-content';
            
            // If there's content, display it (but truncate if too long)
            if (value.content) {
                const maxContentLength = 300;
                let contentText = value.content;
                let fullContent = value.content;
                let isContentTruncated = false;
                
                if (contentText.length > maxContentLength) {
                    contentText = contentText.substring(0, maxContentLength) + '...';
                    isContentTruncated = true;
                }
                
                // Create text element with markdown rendering
                const textElement = document.createElement('div');
                textElement.className = 'reference-text';
                textElement.innerHTML = renderMarkdown(contentText);
                referenceContent.appendChild(textElement);
                
                // Add show more button if content was truncated
                if (isContentTruncated) {
                    const showMoreBtn = document.createElement('button');
                    showMoreBtn.className = 'show-more-btn';
                    showMoreBtn.textContent = 'Show more';
                    
                    // Add click event listener
                    showMoreBtn.addEventListener('click', function() {
                        textElement.innerHTML = renderMarkdown(fullContent);
                        this.style.display = 'none';
                    });
                    
                    referenceContent.appendChild(showMoreBtn);
                }
            }
            
            // Add metadata if available (excluding content which we've already handled)
            const metadataEntries = Object.entries(value).filter(([k, _]) => k !== 'content');
            
            if (metadataEntries.length > 0) {
                const metadataDiv = document.createElement('div');
                metadataDiv.className = 'reference-metadata';
                
                metadataEntries.forEach(([k, v]) => {
                    // Format the value based on its type
                    let displayValue = v;
                    if (typeof v === 'object') {
                        displayValue = JSON.stringify(v);
                    }
                    
                    const metadataItem = document.createElement('div');
                    metadataItem.innerHTML = `<strong>${k}:</strong> ${displayValue}`;
                    metadataDiv.appendChild(metadataItem);
                });
                
                referenceContent.appendChild(metadataDiv);
            }
            
            // Add header and content to the reference item
            referenceItem.appendChild(referenceHeader);
            referenceItem.appendChild(referenceContent);
            
            elements.referencesList.appendChild(referenceItem);
        });
        
        elements.referencesSection.style.display = 'block';
    } else {
        console.log('No references found or empty references object');
        elements.referencesSection.style.display = 'none';
    }

    // Make sure the result div is visible
    elements.resultDiv.style.display = 'block';
    console.log('Result div display style:', elements.resultDiv.style.display);
    
    // Scroll to the result
    elements.resultDiv.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Show an error message
 * @param {string} message - The error message to display
 */
function showError(message) {
    console.error('Showing error:', message);
    elements.errorDiv.textContent = message;
    elements.errorDiv.style.display = 'block';
}

/**
 * Set the loading state
 * @param {boolean} isLoading - Whether the app is in a loading state
 */
function setLoading(isLoading) {
    elements.submitBtn.disabled = isLoading;
    if (isLoading) {
        elements.resultDiv.style.display = 'none';
        elements.errorDiv.style.display = 'none';
        elements.loadingDiv.style.display = 'block';
    } else {
        elements.loadingDiv.style.display = 'none';
    }
} 