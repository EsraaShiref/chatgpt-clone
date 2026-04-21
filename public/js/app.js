// public/js/app.js - ChatGPT Clone Frontend Logic

const API_BASE = '/api';
let currentSessionId = null;
let currentModel = 'gpt-4o-mini';
let isLoading = false;

// ============ INITIALIZATION ============

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 ChatGPT Clone initialized');
    await loadChatHistory();
    loadAvailableModels();
    restoreScrollPosition();
});

// ============ CHAT SESSION MANAGEMENT ============

async function loadChatHistory() {
    try {
        const response = await fetch(`${API_BASE}/sessions`);
        const data = await response.json();

        if (!data.success) throw new Error(data.error);

        const chatList = document.getElementById('chatList');

        if (data.count === 0) {
            chatList.innerHTML = '<div class="empty-state">No chats yet<br>Create one to get started</div>';
            return;
        }

        chatList.innerHTML = '';
        data.data.forEach(chat => {
            const chatItem = createChatItem(chat);
            chatList.appendChild(chatItem);
        });
    } catch (error) {
        console.error('Error loading chats:', error);
        showNotification('Failed to load chat history', 'error');
    }
}

function createChatItem(chat) {
    const div = document.createElement('div');
    div.className = `chat-item ${currentSessionId === chat.id ? 'active' : ''}`;
    div.innerHTML = `
        <span>${escapeHtml(chat.title)}</span>
        <div class="chat-item-actions">
            <button class="btn-icon-small" onclick="event.stopPropagation(); deleteChat(${chat.id})" title="Delete">🗑️</button>
        </div>
    `;
    div.onclick = () => loadChat(chat.id);
    return div;
}

async function loadChat(sessionId) {
    try {
        const response = await fetch(`${API_BASE}/sessions/${sessionId}`);
        const data = await response.json();

        if (!data.success) throw new Error(data.error);

        currentSessionId = data.data.id;
        currentModel = data.data.model_used;
        document.getElementById('modelSelect').value = currentModel;
        document.getElementById('headerTitle').textContent = data.data.title;

        // Display messages
        const container = document.getElementById('messagesContainer');
        container.innerHTML = '';

        if (data.data.messages.length === 0) {
            container.innerHTML = `
                <div class="welcome-screen">
                    <div class="welcome-icon">💬</div>
                    <h1>${escapeHtml(data.data.title)}</h1>
                    <p>Start a conversation...</p>
                </div>
            `;
        } else {
            data.data.messages.forEach(msg => {
                container.appendChild(createMessageElement(msg));
            });
            scrollToBottom();
        }

        // Update active chat item
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        event.target.classList.add('active');
    } catch (error) {
        console.error('Error loading chat:', error);
        showNotification('Failed to load chat', 'error');
    }
}

function createNewChat() {
    document.getElementById('newChatModal').classList.add('active');
    document.getElementById('chatTitle').focus();
}

async function confirmNewChat() {
    const title = document.getElementById('chatTitle').value.trim();

    if (!title) {
        showNotification('Please enter a chat title', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, model: currentModel })
        });

        const data = await response.json();

        if (!data.success) throw new Error(data.error);

        currentSessionId = data.data.id;
        document.getElementById('chatTitle').value = '';
        closeModal('newChatModal');
        document.getElementById('messagesContainer').innerHTML = `
            <div class="welcome-screen">
                <div class="welcome-icon">💬</div>
                <h1>${escapeHtml(title)}</h1>
                <p>Start a conversation...</p>
            </div>
        `;
        document.getElementById('headerTitle').textContent = title;
        document.getElementById('messageInput').focus();

        await loadChatHistory();
        showNotification('Chat created successfully', 'success');
    } catch (error) {
        console.error('Error creating chat:', error);
        showNotification('Failed to create chat', 'error');
    }
}

async function deleteChat(sessionId) {
    showConfirmation(
        'Delete this chat permanently?',
        async () => {
            try {
                const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
                    method: 'DELETE'
                });

                const data = await response.json();

                if (!data.success) throw new Error(data.error);

                if (currentSessionId === sessionId) {
                    currentSessionId = null;
                    document.getElementById('messagesContainer').innerHTML = `
                        <div class="welcome-screen">
                            <div class="welcome-icon">💬</div>
                            <h1>ChatGPT Clone</h1>
                            <p>Create a new chat to get started</p>
                        </div>
                    `;
                    document.getElementById('headerTitle').textContent = 'ChatGPT Clone';
                }

                await loadChatHistory();
                showNotification('Chat deleted', 'success');
            } catch (error) {
                console.error('Error deleting chat:', error);
                showNotification('Failed to delete chat', 'error');
            }
        }
    );
}

// ============ MESSAGE HANDLING ============

async function sendMessage() {
    if (!currentSessionId) {
        showNotification('Please create or select a chat first', 'warning');
        return;
    }

    const input = document.getElementById('messageInput');
    const message = input.value.trim();

    if (!message) return;

    if (isLoading) {
        showNotification('Please wait for the current response', 'warning');
        return;
    }

    isLoading = true;
    document.getElementById('sendBtn').disabled = true;

    try {
        // Display user message
        const container = document.getElementById('messagesContainer');

        // Remove welcome screen if present
        const welcomeScreen = container.querySelector('.welcome-screen');
        if (welcomeScreen) {
            welcomeScreen.remove();
        }

        const userMsg = createMessageElement({
            role: 'user',
            content: message
        });
        container.appendChild(userMsg);
        input.value = '';
        scrollToBottom();

        // Show typing indicator
        const typingMsg = document.createElement('div');
        typingMsg.className = 'message assistant';
        typingMsg.innerHTML = `
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        container.appendChild(typingMsg);
        scrollToBottom();

        // Send message to API
        const response = await fetch(`${API_BASE}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: currentSessionId,
                message: message,
                model: currentModel
            })
        });

        const data = await response.json();

        // Remove typing indicator
        typingMsg.remove();

        if (!data.success) {
            throw new Error(data.error);
        }

        // Display assistant message
        const assistantMsg = createMessageElement({
            role: 'assistant',
            content: data.data.assistantMessage.content,
            id: data.data.assistantMessage.id
        });
        container.appendChild(assistantMsg);
        scrollToBottom();

        showNotification(`✓ Response received (${data.data.tokensUsed} tokens)`, 'success');
    } catch (error) {
        console.error('Error sending message:', error);
        showNotification(error.message || 'Failed to send message', 'error');

        // Remove typing indicator if still there
        const typingMsg = document.querySelector('.typing-indicator');
        if (typingMsg?.parentElement) {
            typingMsg.parentElement.parentElement?.remove();
        }
    } finally {
        isLoading = false;
        document.getElementById('sendBtn').disabled = false;
        document.getElementById('messageInput').focus();
    }
}

function createMessageElement(msg, includeActions = true) {
    const div = document.createElement('div');
    div.className = `message ${msg.role}`;
    div.dataset.messageId = msg.id;

    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = msg.content;
    div.appendChild(content);

    if (msg.role === 'assistant' && includeActions) {
        const actions = document.createElement('div');
        actions.className = 'message-actions';
        actions.innerHTML = `
            <button class="btn-message-action" onclick="regenerateMessage(${msg.id})">🔄 Regenerate</button>
            <button class="btn-message-action" onclick="editMessage(${msg.id})">✏️ Edit</button>
            <button class="btn-message-action" onclick="deleteMessage(${msg.id})">🗑️ Delete</button>
        `;
        div.appendChild(actions);
    }

    return div;
}

async function regenerateMessage(messageId) {
    if (isLoading) {
        showNotification('Please wait for the current operation', 'warning');
        return;
    }

    isLoading = true;

    try {
        const response = await fetch(`${API_BASE}/messages/${messageId}/regenerate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: currentModel })
        });

        const data = await response.json();

        if (!data.success) throw new Error(data.error);

        // Reload chat to show updated message
        await loadChat(currentSessionId);
        showNotification('✓ Response regenerated', 'success');
    } catch (error) {
        console.error('Error regenerating:', error);
        showNotification('Failed to regenerate response', 'error');
    } finally {
        isLoading = false;
    }
}

async function editMessage(messageId) {
    showNotification('Edit feature coming soon', 'warning');
}

async function deleteMessage(messageId) {
    showConfirmation(
        'Delete this message and all following messages?',
        async () => {
            try {
                const response = await fetch(`${API_BASE}/messages/${messageId}`, {
                    method: 'DELETE'
                });

                const data = await response.json();

                if (!data.success) throw new Error(data.error);

                await loadChat(currentSessionId);
                showNotification('Message deleted', 'success');
            } catch (error) {
                console.error('Error deleting message:', error);
                showNotification('Failed to delete message', 'error');
            }
        }
    );
}

// ============ MODEL MANAGEMENT ============

async function loadAvailableModels() {
    try {
        const response = await fetch(`${API_BASE}/models`);
        const data = await response.json();

        if (!data.success) throw new Error(data.error);

        const select = document.getElementById('modelSelect');
        select.innerHTML = '';

        data.data.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            select.appendChild(option);
        });

        select.value = currentModel;
    } catch (error) {
        console.error('Error loading models:', error);
    }
}

function changeModel() {
    currentModel = document.getElementById('modelSelect').value;
    showNotification(`Model changed to ${currentModel}`, 'success');
}

// ============ UI UTILITIES ============

function handleInputKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 100);
}

function restoreScrollPosition() {
    const container = document.getElementById('messagesContainer');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============ MODAL MANAGEMENT ============

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Close modal on outside click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// ============ NOTIFICATION SYSTEM ============

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background-color: ${type === 'error' ? '#d64045' : type === 'warning' ? '#f5b642' : type === 'success' ? '#10a37f' : '#444654'};
        color: white;
        border-radius: 8px;
        font-size: 14px;
        z-index: 2000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============ CONFIRMATION DIALOG ============

let confirmCallback = null;

function showConfirmation(message, callback) {
    confirmCallback = callback;
    document.getElementById('confirmMessage').textContent = message;
    openModal('confirmModal');
}

function confirmAction() {
    if (confirmCallback) {
        confirmCallback();
        confirmCallback = null;
    }
    closeModal('confirmModal');
}

// ============ SETTINGS & STATS ============

function toggleSettings() {
    openModal('settingsModal');
}

function toggleDarkMode() {
    // Already dark mode, but could add light mode toggle here
    showNotification('Dark mode is default', 'info');
}

async function toggleStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const data = await response.json();

        if (!data.success) throw new Error(data.error);

        const stats = data.data;
        const statsContent = document.getElementById('statsContent');
        statsContent.innerHTML = `
            <div style="text-align: left;">
                <p><strong>Total Chats:</strong> ${stats.totalSessions}</p>
                <p><strong>Total Messages:</strong> ${stats.totalMessages}</p>
                <p><strong>Database Size:</strong> ${stats.databaseSize}</p>
                <p style="margin-top: 20px; color: var(--text-tertiary); font-size: 12px;">
                    💡 Database is stored locally in your project folder.
                </p>
            </div>
        `;
        openModal('statsModal');
    } catch (error) {
        console.error('Error loading stats:', error);
        showNotification('Failed to load statistics', 'error');
    }
}

function clearAllData() {
    showConfirmation(
        '⚠️ Delete ALL chats and messages? This cannot be undone.',
        async () => {
            try {
                const sessions = await fetch(`${API_BASE}/sessions`);
                const data = await sessions.json();

                if (data.success) {
                    for (const session of data.data) {
                        await fetch(`${API_BASE}/sessions/${session.id}`, {
                            method: 'DELETE'
                        });
                    }
                }

                currentSessionId = null;
                document.getElementById('messagesContainer').innerHTML = `
                    <div class="welcome-screen">
                        <div class="welcome-icon">💬</div>
                        <h1>ChatGPT Clone</h1>
                        <p>All data cleared. Create a new chat to get started</p>
                    </div>
                `;
                await loadChatHistory();
                showNotification('✓ All data cleared', 'success');
            } catch (error) {
                console.error('Error clearing data:', error);
                showNotification('Failed to clear data', 'error');
            }
        }
    );
}

// Add CSS for animations if not already in stylesheet
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);

console.log('✅ App script loaded successfully');
