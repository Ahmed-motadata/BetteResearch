document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');

    function appendMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-message ' + sender;
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.textContent = text;
        msgDiv.appendChild(bubble);
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;
        appendMessage(text, 'user');
        chatInput.value = '';
        // Simulate AI response
        setTimeout(() => {
            appendMessage('AI: This is a placeholder response.', 'ai');
        }, 700);
    }

    chatSendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    // Minimize and close button logic
    const minimizeBtn = document.getElementById('ai-minimize-btn');
    const closeBtn = document.getElementById('ai-close-btn');
    const chatMain = document.querySelector('.chat-main');

    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', function() {
            chatMain.style.display = 'none';
            // Optionally, trigger a custom event or callback for restore
        });
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            window.close && window.close(); // For Electron or similar
            chatMain.style.display = 'none'; // Fallback: just hide
        });
    }
});
