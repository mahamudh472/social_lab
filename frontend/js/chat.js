import { apiGet, apiPost, showToast, showLoading, hideLoading } from './utils.js';

class ChatManager {
    constructor() {
        this.currentConversationId = null;
        this.currentUser = null;
        this.currentConversation = null;
        this.websocket = null;
        this.conversations = [];
        this.init();
    }

    async init() {
        try {
            await this.loadCurrentUser();
            
            if (!this.currentUser) {
                console.error('Failed to load current user');
                showToast('Failed to load user data', 'error');
                return;
            }

            // Try to get conversation ID from query params first
            const urlParams = new URLSearchParams(window.location.search);
            let conversationId = urlParams.get('id');
            
            // If not found, try hash-based routing (fallback for URL rewriting servers)
            if (!conversationId && window.location.hash) {
                const hash = window.location.hash.substring(1); // Remove the #
                
                // Support both #id=12 and #?id=12 formats
                if (hash.startsWith('id=')) {
                    conversationId = hash.split('=')[1];
                } else if (hash.startsWith('?')) {
                    const hashParams = new URLSearchParams(hash);
                    conversationId = hashParams.get('id');
                }
            }
            
            if (conversationId) {
                this.currentConversationId = conversationId;
                await this.initChatPage(conversationId);
            } else {
                await this.initMessagesListPage();
            }

            this.initEventListeners();

        } catch (error) {
            console.error('Initialization error:', error);
            showToast('Failed to initialize chat', 'error');
        }
    }

    async initChatPage(conversationId) {
        showLoading();
        
        try {
            const conversationData = await apiGet(`/chats/${conversationId}/`);
            if (!conversationData) {
                throw new Error('Failed to load conversation');
            }

            const messagesData = await apiGet(`/chats/${conversationId}/messages/`);
            
            await this.enrichSingleConversation(conversationData);
            this.currentConversation = conversationData;

            this.updateChatHeader(conversationData);
            this.renderMessages(messagesData || []);
            this.loadConversationsList();
            this.connectWebSocket(conversationId);

        } catch (error) {
            console.error('Error initializing chat page:', error);
            showToast('Failed to load conversation', 'error');
        } finally {
            hideLoading();
        }
    }

    async initMessagesListPage() {
        showLoading();
        
        try {
            await this.loadConversationsList();
        } catch (error) {
            console.error('Error loading messages list:', error);
            showToast('Failed to load conversations', 'error');
        } finally {
            hideLoading();
        }
    }

    async loadCurrentUser() {
        try {
            const userData = await apiGet('/users/me/');
            if (userData) {
                this.currentUser = userData;
            }
        } catch (error) {
            console.error('Error loading current user:', error);
            throw error;
        }
    }

    async loadConversationsList() {
        try {
            const conversations = await apiGet('/chats/');
            
            if (!conversations || !Array.isArray(conversations)) {
                console.warn('No conversations found');
                this.renderConversationsList([]);
                return;
            }

            for (const conv of conversations) {
                await this.enrichSingleConversation(conv);
                
                try {
                    const messages = await apiGet(`/chats/${conv.id}/messages/`);
                    conv.lastMessage = messages && messages.length > 0 
                        ? messages[messages.length - 1] 
                        : null;
                } catch (error) {
                    console.error(`Error loading messages for conversation ${conv.id}:`, error);
                    conv.lastMessage = null;
                }
            }

            this.conversations = conversations;
            this.renderConversationsList(conversations);

        } catch (error) {
            console.error('Error loading conversations:', error);
            this.renderConversationsList([]);
        }
    }

    async enrichSingleConversation(conversation) {
        if (!conversation.participants || !Array.isArray(conversation.participants)) {
            console.warn('No participants in conversation:', conversation);
            return;
        }

        conversation.participantDetails = [];

        for (const participantId of conversation.participants) {
            try {
                const user = await apiGet(`/users/${participantId}/`);
                user.id = participantId;
                conversation.participantDetails.push(user);

                if (this.currentUser && user.username === this.currentUser.username) {
                    this.currentUser.id = participantId;
                }
            } catch (error) {
                console.error(`Error loading user ${participantId}:`, error);
            }
        }
    }

    getOtherParticipant(conversation) {
        if (!conversation || !conversation.participantDetails || !this.currentUser) {
            return null;
        }

        const other = conversation.participantDetails.find(p => 
            p.username !== this.currentUser.username
        );

        return other || null;
    }

    updateChatHeader(conversation) {
        const otherParticipant = this.getOtherParticipant(conversation);
        
        if (!otherParticipant) {
            console.error('No other participant found for header update');
            return;
        }

        const chatHeader = document.querySelector('.flex-1.flex.flex-col .p-4.border-b');
        if (!chatHeader) {
            console.error('Chat header not found');
            return;
        }

        const headerImg = chatHeader.querySelector('img');
        if (headerImg) {
            headerImg.src = otherParticipant.profile_image || '/images/placeholder-avatar.jpg';
            headerImg.alt = otherParticipant.username;
        }

        const headerTitle = chatHeader.querySelector('h3');
        if (headerTitle) {
            headerTitle.textContent = otherParticipant.username;
        }

        const headerStatus = chatHeader.querySelector('p.text-sm');
        if (headerStatus) {
            headerStatus.textContent = 'Online';
        }
    }

    renderConversationsList(conversations) {
        const container = document.getElementById('conversationsList');
        if (!container) return;

        if (!conversations || conversations.length === 0) {
            container.innerHTML = `
                <div class="p-4 text-center text-gray-500">
                    <p>No conversations yet</p>
                    <p class="text-sm mt-2">Start chatting with your friends!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = conversations.map(conv => {
            const otherParticipant = this.getOtherParticipant(conv);
            const lastMessage = conv.lastMessage;
            
            const username = otherParticipant?.username || 'Unknown User';
            const profileImage = otherParticipant?.profile_image || '/images/placeholder-avatar.jpg';
            const lastMessageText = lastMessage?.text || 'No messages yet';
            const timestamp = lastMessage?.created_at || conv.created_at;
            
            return `
                <div class="p-4 hover:bg-gray-50 cursor-pointer transition-colors" 
                     onclick="window.location='chat.html#id=${conv.id}';">
                    <div class="flex items-center space-x-3">
                        <img src="${profileImage}" 
                             alt="${username}" 
                             class="w-12 h-12 rounded-full object-cover"
                             onerror="this.src='/images/placeholder-avatar.jpg'">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between">
                                <h4 class="font-semibold text-gray-900 truncate">${username}</h4>
                                <span class="text-xs text-gray-500">${this.formatTime(timestamp)}</span>
                            </div>
                            <p class="text-sm text-gray-500 truncate">${this.escapeHtml(lastMessageText)}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderMessages(messages) {
        const container = document.getElementById('messagesContainer');
        if (!container) {
            console.error('Messages container not found');
            return;
        }

        container.innerHTML = '';

        if (!messages || messages.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <p>No messages yet</p>
                    <p class="text-sm mt-2">Start the conversation!</p>
                </div>
            `;
            return;
        }

        messages.forEach(msg => {
            const isOwn = this.isOwnMessage(msg);
            const time = new Date(msg.created_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            const messageDiv = document.createElement('div');
            messageDiv.className = `flex ${isOwn ? 'justify-end' : 'justify-start'}`;
            messageDiv.innerHTML = `
                <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwn 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-gray-200 text-gray-900 rounded-bl-none'
                }">
                    <p>${this.escapeHtml(msg.text)}</p>
                    <p class="text-xs opacity-70 mt-1 text-right">${time}</p>
                </div>
            `;
            container.appendChild(messageDiv);
        });

        requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
        });
    }

    isOwnMessage(message) {
        if (!message || !this.currentUser) return false;

        if (this.currentUser.id) {
            return message.sender === this.currentUser.id;
        }

        if (this.currentConversation && this.currentConversation.participantDetails) {
            const otherParticipant = this.getOtherParticipant(this.currentConversation);
            if (otherParticipant && otherParticipant.id) {
                return message.sender !== otherParticipant.id;
            }
        }

        return false;
    }

    formatTime(timestamp) {
        if (!timestamp) return '';
        
        const now = new Date();
        const date = new Date(timestamp);
        const diff = now - date;
        
        if (diff < 60000) return 'now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
        return `${Math.floor(diff / 86400000)}d`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    connectWebSocket(conversationId) {
        const token = localStorage.getItem('access_token');
        if (!token) {
            console.warn('No access token for WebSocket');
            return;
        }

        if (this.websocket) {
            this.websocket.close();
        }

        // WebSocket needs to connect to Django/Daphne backend (port 8000), not the static server
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const backendHost = 'localhost:8000'; // Django backend port
        const wsUrl = `${protocol}//${backendHost}/ws/chat/${conversationId}/?token=${token}`;
        
        this.websocket = new WebSocket(wsUrl);

        this.websocket.onopen = () => {
            console.log('[WebSocket] Connected');
        };

        this.websocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            } catch (error) {
                console.error('[WebSocket] Failed to parse message:', error);
            }
        };

        this.websocket.onerror = (error) => {
            console.error('[WebSocket] Connection error:', error);
            showToast('Chat connection error', 'error');
        };

        this.websocket.onclose = (event) => {
            console.log('[WebSocket] Disconnected');
            if (event.code !== 1000) {
                showToast('Chat connection lost', 'warning');
            }
        };
    }

    disconnectWebSocket() {
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
    }

    handleWebSocketMessage(data) {
        // If this is our own message, it was already added optimistically
        // Only add if it's from another user
        const isOwnMessage = this.currentUser && data.sender === this.currentUser.username;
        
        if (isOwnMessage) {
            return; // Skip own message echo
        }

        // Add the other user's message
        const messageText = data.message || data.text;
        this.addMessageToUI(messageText, false, data.timestamp);
    }

    addMessageToUI(messageText, isOwn, timestamp = null) {
        const container = document.getElementById('messagesContainer');
        if (!container) {
            console.error('Messages container not found');
            return;
        }

        // Remove placeholder if exists
        const placeholder = container.querySelector('.text-center.text-gray-500');
        if (placeholder) {
            placeholder.remove();
        }

        const time = timestamp 
            ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const messageDiv = document.createElement('div');
        messageDiv.className = `flex ${isOwn ? 'justify-end' : 'justify-start'}`;
        messageDiv.innerHTML = `
            <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                isOwn 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-gray-200 text-gray-900 rounded-bl-none'
            }">
                <p>${this.escapeHtml(messageText)}</p>
                <p class="text-xs opacity-70 mt-1 text-right">${time}</p>
            </div>
        `;

        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }

    initEventListeners() {
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', () => {
                window.location = 'messages.html';
            });
        }

        const messageForm = document.querySelector('form');
        if (messageForm) {
            messageForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSendMessage(e.target);
            });
        }
    }

    async handleSendMessage(form) {
        const input = form.querySelector('input');
        if (!input) {
            console.error('Input field not found in form');
            return;
        }

        const message = input.value.trim();
        
        if (!message) return;

        if (!this.currentConversationId) {
            console.error('No conversation ID set');
            showToast('Cannot send message: No conversation selected', 'error');
            return;
        }

        input.value = '';

        // Add message to UI optimistically (before server response)
        this.addMessageToUI(message, true);

        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            try {
                this.websocket.send(JSON.stringify({ message }));
                console.log('[WebSocket] Message sent');
                return;
            } catch (error) {
                console.error('[WebSocket] Send error:', error);
                showToast('Failed to send message via WebSocket, trying API...', 'warning');
            }
        } else {
            console.log('[WebSocket] Not connected, using API fallback');
        }

        // Fallback to API if WebSocket fails or not connected
        await this.sendMessageViaAPI(message);
    }

    async sendMessageViaAPI(message) {
        try {
            const response = await apiPost(`/chats/${this.currentConversationId}/messages/`, {
                text: message
            });

            if (!response) {
                showToast('Failed to send message', 'error');
            }
        } catch (error) {
            console.error('[API] Send error:', error);
            showToast('Failed to send message', 'error');
        }
    }
}

let chatManager;
document.addEventListener('DOMContentLoaded', () => {
    chatManager = new ChatManager();
});

window.addEventListener('beforeunload', () => {
    if (chatManager) {
        chatManager.disconnectWebSocket();
    }
});

export default ChatManager;
