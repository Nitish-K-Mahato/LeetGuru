document.addEventListener('DOMContentLoaded', async () => {
    const apiKeyInput = document.getElementById('apiKey');
    const saveBtn = document.getElementById('saveBtn');
    const status = document.getElementById('status');
    
    // Load existing API key
    const result = await chrome.storage.sync.get(['geminiApiKey']);
    if (result.geminiApiKey) {
        apiKeyInput.value = result.geminiApiKey;
        showStatus('API key loaded successfully!', 'success');
    }
    
    // Save API key
    saveBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey) {
            showStatus('Please enter an API key', 'error');
            return;
        }
        
        if (!apiKey.startsWith('AIza')) {
            showStatus('Invalid API key format. It should start with "AIza"', 'error');
            return;
        }
        
        try {
            // Save to storage
            await chrome.storage.sync.set({ geminiApiKey: apiKey });
            
            // Test the API key
            const isValid = await testApiKey(apiKey);
            
            if (isValid) {
                showStatus('API key saved and validated successfully!', 'success');
            } else {
                showStatus('API key saved but validation failed. Please check your key.', 'error');
            }
        } catch (error) {
            showStatus('Error saving API key: ' + error.message, 'error');
        }
    });
    
    function showStatus(message, type) {
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';
        
        // Hide after 3 seconds
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }
    
    async function testApiKey(apiKey) {
        try {
            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-goog-api-key': apiKey
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: "Hello"
                        }]
                    }]
                })
            });
            
            return response.ok;
        } catch (error) {
            console.error('API key test failed:', error);
            return false;
        }
    }
});