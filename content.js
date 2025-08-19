// LeetCode AI Assistant Content Script
let chatWidget = null;
let isWidgetOpen = false;

// Initialize the assistant when page loads
function init() {
    if (window.location.href.includes('leetcode.com/problems/')) {
        createAssistantButton();
    }
}

// Create the floating assistant button
function createAssistantButton() {
    const button = document.createElement('div');
    button.id = 'leetcode-ai-button';
    button.innerHTML = '🤖';
    button.title = 'LeetCode AI Assistant';
    
    button.addEventListener('click', toggleChatWidget);
    document.body.appendChild(button);
}

// Toggle chat widget visibility
function toggleChatWidget() {
    if (!chatWidget) {
        createChatWidget();
    }
    
    isWidgetOpen = !isWidgetOpen;
    chatWidget.style.display = isWidgetOpen ? 'block' : 'none';
    
    // Update button appearance
    const button = document.getElementById('leetcode-ai-button');
    button.style.backgroundColor = isWidgetOpen ? '#4CAF50' : '#2196F3';
}

// Create the chat widget
function createChatWidget() {
    chatWidget = document.createElement('div');
    chatWidget.id = 'leetcode-ai-widget';
    chatWidget.innerHTML = `
        <div class="ai-widget-header">
            <h3>🤖 AI Assistant</h3>
            <button id="close-widget">×</button>
        </div>
        <div class="ai-chat-container">
            <div id="chat-messages"></div>
            <div class="ai-input-container">
                <input type="text" id="chat-input" placeholder="Ask me anything about this problem...">
                <button id="send-btn">Send</button>
            </div>
        </div>
        <div class="ai-quick-actions">
            <button class="quick-btn" data-action="hint">💡 Hint</button>
            <button class="quick-btn" data-action="solution">🔧 Solution</button>
            <button class="quick-btn" data-action="explain">📚 Explain</button>
        </div>
    `;
    
    document.body.appendChild(chatWidget);
    setupChatEvents();
    
    // Add welcome message
    addMessage('Hello! I\'m your LeetCode AI assistant. I can help you with hints, solutions, and explanations for this problem. What would you like to know?', 'ai');
}

// Setup chat event listeners
function setupChatEvents() {
    const closeBtn = document.getElementById('close-widget');
    const sendBtn = document.getElementById('send-btn');
    const chatInput = document.getElementById('chat-input');
    const quickBtns = document.querySelectorAll('.quick-btn');
    
    closeBtn.addEventListener('click', () => {
        isWidgetOpen = false;
        chatWidget.style.display = 'none';
        document.getElementById('leetcode-ai-button').style.backgroundColor = '#2196F3';
    });
    
    sendBtn.addEventListener('click', sendMessage);
    
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    quickBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            handleQuickAction(action);
        });
    });
}

// Handle quick action buttons
function handleQuickAction(action) {
    let message = '';
    switch(action) {
        case 'hint':
            message = 'Can you give me a hint for this problem?';
            break;
        case 'solution':
            message = 'Can you provide the complete solution for this problem?';
            break;
        case 'explain':
            message = 'Can you explain the approach and algorithm for this problem?';
            break;
    }
    
    if (message) {
        document.getElementById('chat-input').value = message;
        sendMessage();
    }
}

// Send message to AI
async function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessage(message, 'user');
    chatInput.value = '';
    
    // Show loading
    addMessage('Thinking...', 'ai', true);
    
    try {
        // Get problem context
        const problemContext = extractProblemContext();
        
        // Send to AI
        const response = await callGeminiAPI(message, problemContext);
        
        // Remove loading message and add AI response
        removeLastMessage();
        addMessage(response, 'ai');
        
    } catch (error) {
        removeLastMessage();
        addMessage('Sorry, I encountered an error: ' + error.message, 'ai');
    }
}

// Extract problem context from LeetCode page
function extractProblemContext() {
    const context = {
        title: '',
        description: '',
        examples: '',
        constraints: ''
    };
    
    // Get problem title
    const titleElement = document.querySelector('[data-cy="question-title"]') || 
                        document.querySelector('.css-v3d350') ||
                        document.querySelector('h1');
    if (titleElement) {
        context.title = titleElement.textContent.trim();
    }
    
    // Get problem description
    const descElement = document.querySelector('[data-track-load="description_content"]') ||
                       document.querySelector('.content__u3I1') ||
                       document.querySelector('.question-content');
    if (descElement) {
        context.description = descElement.textContent.trim();
    }
    
    return context;
}

// Call Gemini API
async function callGeminiAPI(message, problemContext) {
    // Get API key from storage
    const result = await chrome.storage.sync.get(['geminiApiKey']);
    
    if (!result.geminiApiKey) {
        throw new Error('Please set your Gemini API key in the extension popup first.');
    }
    
    const prompt = `
You are a helpful LeetCode problem-solving assistant. Here's the current problem context:

Title: ${problemContext.title}
Description: ${problemContext.description}

User Question: ${message}

Please provide a helpful response. If asked for hints, give progressive hints without revealing the complete solution. If asked for the solution, provide clean, well-commented code with explanation.
    `;
    
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': result.geminiApiKey
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        })
    });
    
    if (!response.ok) {
        throw new Error('API request failed: ' + response.statusText);
    }
    
    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
    } else {
        throw new Error('Invalid response from AI service');
    }
}

// Add message to chat
function addMessage(text, sender, isLoading = false) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}${isLoading ? ' loading' : ''}`;
    
    if (isLoading) {
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="loading-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-content">
                ${formatMessage(text)}
            </div>
        `;
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Remove last message (used for removing loading indicator)
function removeLastMessage() {
    const messagesContainer = document.getElementById('chat-messages');
    const lastMessage = messagesContainer.lastElementChild;
    if (lastMessage) {
        messagesContainer.removeChild(lastMessage);
    }
}

// Format message text (handle code blocks, etc.)
function formatMessage(text) {
    // Convert markdown-style code blocks to HTML with copy button
    text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
        const cleanCode = code.trim();
        const langLabel = language ? language.toUpperCase() : 'CODE';
        return `
            <div class="code-block-container">
                <pre><code>${escapeHtml(cleanCode)}</code></pre>
                <button class="copy-btn" onclick="copyCode(this, '${escapeHtml(cleanCode).replace(/'/g, "\\'")}')">📋 Copy</button>
            </div>
        `;
    });
    
    // Convert inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Convert **bold** text
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Convert *italic* text
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Convert headers
    text = text.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    text = text.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    
    // Convert line breaks
    text = text.replace(/\n\n/g, '</p><p>');
    text = text.replace(/\n/g, '<br>');
    
    // Wrap in paragraphs
    if (!text.includes('<p>') && !text.includes('<h1>') && !text.includes('<h2>') && !text.includes('<h3>')) {
        text = '<p>' + text + '</p>';
    }
    
    return text;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Copy code functionality
window.copyCode = function(button, code) {
    // Decode HTML entities
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = code;
    const decodedCode = tempDiv.textContent || tempDiv.innerText;
    
    navigator.clipboard.writeText(decodedCode).then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = '✅ Copied!';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('copied');
        }, 2000);
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = decodedCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        const originalText = button.innerHTML;
        button.innerHTML = '✅ Copied!';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('copied');
        }, 2000);
    });
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Handle navigation in SPA
let currentUrl = location.href;
new MutationObserver(() => {
    if (location.href !== currentUrl) {
        currentUrl = location.href;
        
        // Clean up existing elements
        const existingButton = document.getElementById('leetcode-ai-button');
        const existingWidget = document.getElementById('leetcode-ai-widget');
        
        if (existingButton) existingButton.remove();
        if (existingWidget) existingWidget.remove();
        
        chatWidget = null;
        isWidgetOpen = false;
        
        // Initialize for new page
        setTimeout(init, 1000);
    }
}).observe(document, { subtree: true, childList: true });