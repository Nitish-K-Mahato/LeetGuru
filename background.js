// Background service worker for LeetCode AI Assistant

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('LeetCode AI Assistant installed');
    }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getApiKey') {
        // Get API key from storage
        chrome.storage.sync.get(['geminiApiKey'], (result) => {
            sendResponse({ apiKey: result.geminiApiKey });
        });
        return true; // Will respond asynchronously
    }
    
    if (request.action === 'callGeminiAPI') {
        // Handle API calls from content script if needed
        handleGeminiAPICall(request.data)
            .then(response => sendResponse({ success: true, data: response }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Will respond asynchronously
    }
});

// Function to handle Gemini API calls
async function handleGeminiAPICall(requestData) {
    try {
        // Get API key from storage
        const result = await chrome.storage.sync.get(['geminiApiKey']);
        
        if (!result.geminiApiKey) {
            throw new Error('API key not found');
        }
        
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-goog-api-key': result.geminiApiKey
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        console.error('Gemini API call failed:', error);
        throw error;
    }
}

// Handle storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.geminiApiKey) {
        console.log('API key updated');
    }
});

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
    console.log('LeetCode AI Assistant service worker started');
});