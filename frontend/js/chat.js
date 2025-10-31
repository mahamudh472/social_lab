import { apiGet, apiPost, showToast, showLoading, hideLoading, checkAuth } from './utils.js';

class ChatManager {
    constructor() {
        this.currentConversationId = null;
        this.currentUser = null;
        this.currentConversation = null;
        this.websocket = null;
        this.conversations = [];
        this.selectedFile = null;
        this.deleteConfirmCallback = null; // Store the callback for deletion
        this.init();
    }

    async init() {
        // Check authentication first
        checkAuth();
        
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
            this.initUserSearch();

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
            this.initUserSearch();
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
            headerImg.className = 'w-10 h-10 rounded-full cursor-pointer hover:opacity-80 transition-opacity';
            headerImg.onclick = () => {
                window.location.href = `profile?id=${otherParticipant.id}`;
            };
        }

        const headerTitle = chatHeader.querySelector('h3');
        if (headerTitle) {
            headerTitle.textContent = otherParticipant.username;
            headerTitle.className = 'font-semibold text-gray-900 cursor-pointer hover:text-gray-600 transition-colors';
            headerTitle.onclick = () => {
                window.location.href = `profile?id=${otherParticipant.id}`;
            };
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
            const userId = otherParticipant?.id || null;
            const profileImage = otherParticipant?.profile_image || '/images/placeholder-avatar.jpg';
            const lastMessageText = lastMessage?.text || 'No messages yet';
            const timestamp = lastMessage?.created_at || conv.created_at;
            
            return `
                <div class="p-4 hover:bg-gray-50 cursor-pointer transition-colors" 
                     onclick="window.location='chat.html#id=${conv.id}';">
                    <div class="flex items-center space-x-3">
                        <img src="${profileImage}" 
                             alt="${username}" 
                             class="w-12 h-12 rounded-full object-cover hover:opacity-80 transition-opacity"
                             onerror="this.src='/images/placeholder-avatar.jpg'"
                             onclick="event.stopPropagation(); window.location.href='profile?id=${userId || ''}'">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between">
                                <h4 class="font-semibold text-gray-900 truncate hover:text-gray-600 transition-colors" onclick="event.stopPropagation(); window.location.href='profile?id=${userId || ''}'">${username}</h4>
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
            messageDiv.className = `flex ${isOwn ? 'justify-end' : 'justify-start'} group relative`;
            messageDiv.dataset.messageId = msg.id;
            
            let messageContent = '';
            
            // Check if message is deleted
            if (msg.deleted) {
                messageContent = `<p class="italic text-gray-400">This message was deleted</p>`;
            } else {
                // Check if message has a file attachment
                if (msg.file) {
                    const fileName = msg.file.split('/').pop();
                    const fileUrl = msg.file.startsWith('http') ? msg.file : `http://localhost:8000${msg.file}`;
                    
                    messageContent = this.renderFileAttachment(fileUrl, fileName, isOwn);
                    if (msg.text) {
                        messageContent += `<p class="mt-1">${this.escapeHtml(msg.text)}</p>`;
                    }
                } else {
                    messageContent = `<p>${this.escapeHtml(msg.text)}</p>`;
                }
            }
            
            // Three dots menu (only for own messages that are not deleted)
            const menuHTML = (isOwn && !msg.deleted) ? `
                <div class="absolute ${isOwn ? 'left-0 -translate-x-full -ml-2' : 'right-0 translate-x-full mr-2'} top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="message-menu-btn p-1 rounded hover:bg-gray-200 text-gray-500" data-message-id="${msg.id}">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                        </svg>
                    </button>
                    <div class="message-dropdown hidden absolute ${isOwn ? 'left-0' : 'right-0'} mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[120px]" data-message-id="${msg.id}">
                        <button class="delete-message-btn w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50" data-message-id="${msg.id}">
                            Delete
                        </button>
                    </div>
                </div>
            ` : '';
            
            messageDiv.innerHTML = `
                ${menuHTML}
                <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwn 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-gray-200 text-gray-900 rounded-bl-none'
                } ${msg.deleted ? 'opacity-60' : ''}">
                    ${messageContent}
                    <p class="text-xs opacity-70 mt-1 text-right">${time}</p>
                </div>
            `;
            
            container.appendChild(messageDiv);
            
            // Add event listeners for menu
            if (isOwn && !msg.deleted) {
                const menuBtn = messageDiv.querySelector('.message-menu-btn');
                const dropdown = messageDiv.querySelector('.message-dropdown');
                const deleteBtn = messageDiv.querySelector('.delete-message-btn');
                
                if (menuBtn && dropdown) {
                    menuBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        // Close all other dropdowns
                        document.querySelectorAll('.message-dropdown').forEach(dd => {
                            if (dd !== dropdown) dd.classList.add('hidden');
                        });
                        dropdown.classList.toggle('hidden');
                    });
                }
                
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.handleDeleteMessage(msg.id);
                    });
                }
            }
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            document.querySelectorAll('.message-dropdown').forEach(dd => {
                dd.classList.add('hidden');
            });
        });

        // Scroll to bottom with multiple fallbacks to ensure it works
        this.scrollToBottom(container);
    }

    scrollToBottom(container) {
        if (!container) {
            container = document.getElementById('messagesContainer');
        }
        if (!container) return;

        // Immediate scroll
        container.scrollTop = container.scrollHeight;

        // Scroll after animation frame (for DOM updates)
        requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
        });

        // Scroll after a short delay (for images and dynamic content)
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);

        // Final scroll after longer delay (for slower loading images)
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 300);
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

    async handleWebSocketMessage(data) {
        // If this is our own message, it was already added optimistically
        // Only add if it's from another user
        const isOwnMessage = this.currentUser && data.sender === this.currentUser.username;
        
        if (isOwnMessage) {
            return; // Skip own message echo
        }

        // Check if message has a file or if we need to fetch full message data
        if (data.file || data.id) {
            // If we have file data or message ID, fetch the complete message
            await this.fetchAndDisplayMessage(data);
        } else {
            // Add text-only message
            const messageText = data.message || data.text;
            this.addMessageToUI(messageText, false, data.timestamp);
        }
    }

    async fetchAndDisplayMessage(partialData) {
        try {
            // If we have the message ID, fetch complete data
            if (partialData.id) {
                const messages = await apiGet(`/chats/${this.currentConversationId}/messages/`);
                const fullMessage = messages.find(m => m.id === partialData.id);
                
                if (fullMessage) {
                    this.addFileMessageToUI(fullMessage, false);
                    return;
                }
            }
            
            // If we have file data directly, use it
            if (partialData.file) {
                this.addFileMessageToUI(partialData, false);
            } else {
                // Fallback to text message
                const messageText = partialData.message || partialData.text;
                this.addMessageToUI(messageText, false, partialData.timestamp);
            }
        } catch (error) {
            console.error('Error fetching message details:', error);
            // Fallback to basic message display
            const messageText = partialData.message || partialData.text;
            this.addMessageToUI(messageText, false, partialData.timestamp);
        }
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
        this.scrollToBottom(container);
    }

    initEventListeners() {
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', () => {
                window.location = 'messages.html';
            });
        }

        const messageForm = document.getElementById('messageForm');
        if (messageForm) {
            messageForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSendMessage(e.target);
            });
        }

        // File upload button
        const fileUploadBtn = document.getElementById('fileUploadBtn');
        const fileInput = document.getElementById('fileInput');
        if (fileUploadBtn && fileInput) {
            fileUploadBtn.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e);
            });
        }

        // Remove file button
        const removeFileBtn = document.getElementById('removeFileBtn');
        if (removeFileBtn) {
            removeFileBtn.addEventListener('click', () => {
                this.clearFileSelection();
            });
        }

        // Delete confirmation modal
        this.initDeleteModal();
    }

    async handleSendMessage(form) {
        const input = form.querySelector('#messageInput');
        if (!input) {
            console.error('Input field not found in form');
            return;
        }

        const message = input.value.trim();
        
        // If no message and no file, do nothing
        if (!message && !this.selectedFile) return;

        if (!this.currentConversationId) {
            console.error('No conversation ID set');
            showToast('Cannot send message: No conversation selected', 'error');
            return;
        }

        // Clear input
        input.value = '';

        // If there's a file, upload it first
        if (this.selectedFile) {
            await this.uploadFile(message);
            return;
        }

        // Otherwise, send text message normally
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

    // Initialize delete confirmation modal
    initDeleteModal() {
        const modal = document.getElementById('deleteConfirmModal');
        const cancelBtn = document.getElementById('cancelDeleteBtn');
        const confirmBtn = document.getElementById('confirmDeleteBtn');

        if (!modal || !cancelBtn || !confirmBtn) return;

        // Cancel button
        cancelBtn.addEventListener('click', () => {
            this.hideDeleteModal();
        });

        // Confirm button
        confirmBtn.addEventListener('click', () => {
            if (this.deleteConfirmCallback) {
                this.deleteConfirmCallback();
                this.deleteConfirmCallback = null;
            }
            this.hideDeleteModal();
        });

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideDeleteModal();
            }
        });

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                this.hideDeleteModal();
            }
        });
    }

    showDeleteModal(onConfirm) {
        const modal = document.getElementById('deleteConfirmModal');
        const modalContent = modal.querySelector('div > div');
        
        if (modal) {
            this.deleteConfirmCallback = onConfirm;
            modal.classList.remove('hidden');
            
            // Trigger animation
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                modalContent.classList.remove('scale-95');
                modalContent.classList.add('scale-100');
            }, 10);
        }
    }

    hideDeleteModal() {
        const modal = document.getElementById('deleteConfirmModal');
        const modalContent = modal.querySelector('div > div');
        
        if (modal) {
            modal.classList.add('opacity-0');
            modalContent.classList.remove('scale-100');
            modalContent.classList.add('scale-95');
            
            setTimeout(() => {
                modal.classList.add('hidden');
                this.deleteConfirmCallback = null;
            }, 200);
        }
    }

    async handleDeleteMessage(messageId) {
        // Show custom confirmation modal
        this.showDeleteModal(async () => {
            try {
                const token = localStorage.getItem('access_token');
                const response = await fetch(
                    `http://localhost:8000/api/chats/${this.currentConversationId}/messages/${messageId}/delete/`,
                    {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error('Failed to delete message');
                }

                // Update the message in the UI to show as deleted
                const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
                if (messageDiv) {
                    const messageContent = messageDiv.querySelector('.max-w-xs');
                    if (messageContent) {
                        messageContent.classList.add('opacity-60');
                        const contentArea = messageContent.querySelector('p');
                        if (contentArea) {
                            contentArea.innerHTML = '<span class="italic text-gray-400">This message was deleted</span>';
                        }
                    }
                    
                    // Remove the menu button
                    const menuBtn = messageDiv.querySelector('.message-menu-btn');
                    if (menuBtn) menuBtn.remove();
                    const dropdown = messageDiv.querySelector('.message-dropdown');
                    if (dropdown) dropdown.remove();
                }

                showToast('Message deleted', 'success');
            } catch (error) {
                console.error('Error deleting message:', error);
                showToast('Failed to delete message', 'error');
            }
        });
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            showToast('File size must be less than 10MB', 'error');
            event.target.value = '';
            return;
        }

        this.selectedFile = file;
        this.showFilePreview(file);
    }

    showFilePreview(file) {
        const filePreview = document.getElementById('filePreview');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');

        if (!filePreview || !fileName || !fileSize) return;

        fileName.textContent = file.name;
        fileSize.textContent = this.formatFileSize(file.size);
        filePreview.classList.remove('hidden');
    }

    clearFileSelection() {
        this.selectedFile = null;
        const fileInput = document.getElementById('fileInput');
        const filePreview = document.getElementById('filePreview');
        
        if (fileInput) fileInput.value = '';
        if (filePreview) filePreview.classList.add('hidden');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    isImageFile(filename) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
        const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
        return imageExtensions.includes(ext);
    }

    getFileIcon(filename) {
        const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
        
        // PDF files
        if (ext === '.pdf') {
            return `
                <svg class="w-8 h-8 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                    <path d="M14 2v6h6M9.5 13.5c0 .83.67 1.5 1.5 1.5h1.5v2h-1.5a3 3 0 1 1 0-6h1.5v1.5H11c-.83 0-1.5.67-1.5 1.5z"/>
                </svg>
            `;
        }
        
        // Video files
        if (['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv'].includes(ext)) {
            return `
                <svg class="w-8 h-8 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
            `;
        }
        
        // Document files
        if (['.doc', '.docx', '.txt', '.rtf'].includes(ext)) {
            return `
                <svg class="w-8 h-8 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
            `;
        }
        
        // Default file icon
        return `
            <svg class="w-8 h-8 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
        `;
    }

    truncateFileName(filename, maxLength = 30) {
        if (filename.length <= maxLength) return filename;
        
        const ext = filename.substring(filename.lastIndexOf('.'));
        const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
        const truncatedName = nameWithoutExt.substring(0, maxLength - ext.length - 3) + '...';
        
        return truncatedName + ext;
    }

    renderFileAttachment(fileUrl, fileName, isOwn) {
        if (this.isImageFile(fileName)) {
            return `
                <a href="${fileUrl}" target="_blank" class="block mb-1">
                    <img src="${fileUrl}" alt="${fileName}" class="max-w-xs rounded-lg" onerror="this.style.display='none'" />
                </a>
            `;
        } else {
            // For own messages (blue background), use darker semi-transparent overlay
            // For received messages (gray background), use lighter overlay
            const fileCardBg = isOwn ? 'bg-black bg-opacity-10' : 'bg-white bg-opacity-50';
            const hoverBg = isOwn ? 'hover:bg-opacity-20' : 'hover:bg-opacity-70';
            
            return `
                <a href="${fileUrl}" 
                   download 
                   target="_blank" 
                   class="flex items-center space-x-3 p-3 ${fileCardBg} ${hoverBg} rounded-lg mb-1 transition-all max-w-xs"
                   title="${this.escapeHtml(fileName)}">
                    <div class="flex-shrink-0">
                        ${this.getFileIcon(fileName)}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium truncate">${this.escapeHtml(this.truncateFileName(fileName))}</p>
                        <p class="text-xs opacity-75">Click to download</p>
                    </div>
                    <div class="flex-shrink-0">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                        </svg>
                    </div>
                </a>
            `;
        }
    }

    addFileMessageToUI(messageData, isOwn) {
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

        const time = new Date(messageData.created_at || new Date()).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        const messageDiv = document.createElement('div');
        messageDiv.className = `flex ${isOwn ? 'justify-end' : 'justify-start'}`;
        
        let messageContent = '';
        
        // Check if message has a file attachment
        if (messageData.file) {
            const fileName = messageData.file.split('/').pop();
            const fileUrl = messageData.file.startsWith('http') ? messageData.file : `http://localhost:8000${messageData.file}`;
            
            messageContent = this.renderFileAttachment(fileUrl, fileName, isOwn);
            if (messageData.text) {
                messageContent += `<p class="mt-1">${this.escapeHtml(messageData.text)}</p>`;
            }
        } else {
            messageContent = `<p>${this.escapeHtml(messageData.text || '')}</p>`;
        }

        messageDiv.innerHTML = `
            <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                isOwn 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-gray-200 text-gray-900 rounded-bl-none'
            }">
                ${messageContent}
                <p class="text-xs opacity-70 mt-1 text-right">${time}</p>
            </div>
        `;

        container.appendChild(messageDiv);
        this.scrollToBottom(container);
    }

    async uploadFile(messageText) {
        if (!this.selectedFile) return;

        const fileName = this.selectedFile.name;

        try {
            showLoading();

            const formData = new FormData();
            formData.append('file', this.selectedFile);
            if (messageText) {
                formData.append('text', messageText);
            }

            const token = localStorage.getItem('access_token');
            const response = await fetch(`http://localhost:8000/api/chats/${this.currentConversationId}/messages/upload/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('File upload failed');
            }

            const data = await response.json();

            // Clear file selection
            this.clearFileSelection();

            // Add message to UI with file data from server response
            this.addFileMessageToUI(data, true);

            showToast('File sent successfully', 'success');

        } catch (error) {
            console.error('File upload error:', error);
            showToast('Failed to upload file', 'error');
        } finally {
            hideLoading();
        }
    }

    initUserSearch() {
        const searchInput = document.getElementById('userSearchInput');
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        const newChatBtn = document.getElementById('newChatBtn');

        if (!searchInput) return;

        let searchTimeout;

        // Search as user types (debounced)
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();

            if (query.length === 0) {
                this.hideSearchResults();
                return;
            }

            if (query.length < 2) return;

            searchTimeout = setTimeout(() => {
                this.searchUsers(query);
            }, 300); // Debounce 300ms
        });

        // Clear search
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                this.clearUserSearch();
            });
        }

        // New chat button also focuses search
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => {
                searchInput.focus();
            });
        }
    }

    async searchUsers(query) {
        try {
            const users = await apiGet(`/users/search/?q=${encodeURIComponent(query)}`, true, false);
            
            if (!users || !Array.isArray(users) || users.length === 0) {
                this.renderSearchResults([]);
                return;
            }

            // Filter out current user from results
            const filteredUsers = users.filter(user => 
                this.currentUser && user.username !== this.currentUser.username
            );

            this.renderSearchResults(filteredUsers);

        } catch (error) {
            console.error('Error searching users:', error);
            // Show empty results instead of error toast
            this.renderSearchResults([]);
        }
    }

    renderSearchResults(users) {
        const searchResults = document.getElementById('searchResults');
        const searchResultsList = document.getElementById('searchResultsList');
        const conversationsContainer = document.getElementById('conversationsContainer');

        if (!searchResults || !searchResultsList) return;

        // Show search results, hide conversations
        searchResults.classList.remove('hidden');
        if (conversationsContainer) {
            conversationsContainer.classList.add('hidden');
        }

        if (users.length === 0) {
            searchResultsList.innerHTML = `
                <div class="p-4 text-center text-gray-500">
                    <svg class="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <p class="font-medium">No users found</p>
                    <p class="text-sm mt-1">Try searching with a different name</p>
                </div>
            `;
            return;
        }

        searchResultsList.innerHTML = users.map(user => {
            const profileImage = user.profile_image || '/images/placeholder-avatar.jpg';
            
            // Build display name - prioritize full name, fallback to username
            let displayName = user.username;
            let subtitle = `@${user.username}`;
            
            if (user.first_name || user.last_name) {
                const firstName = user.first_name || '';
                const lastName = user.last_name || '';
                displayName = `${firstName} ${lastName}`.trim();
                subtitle = `@${user.username}`;
            } else {
                subtitle = user.bio ? user.bio.substring(0, 40) + (user.bio.length > 40 ? '...' : '') : 'Click to message';
            }

            return `
                <div class="p-3 hover:bg-gray-50 cursor-pointer transition-colors" 
                     onclick="chatManager.startConversationWithUser(${user.id}, '${this.escapeHtml(user.username)}')">
                    <div class="flex items-center space-x-3">
                        <img src="${profileImage}" 
                             alt="${user.username}" 
                             class="w-10 h-10 rounded-full object-cover hover:opacity-80 transition-opacity"
                             onerror="this.src='/images/placeholder-avatar.jpg'"
                             onclick="event.stopPropagation(); window.location.href='profile?id=${user.id}'">
                        <div class="flex-1 min-w-0">
                            <p class="font-medium text-gray-900 truncate hover:text-gray-600 transition-colors" onclick="event.stopPropagation(); window.location.href='profile?id=${user.id}'">${this.escapeHtml(displayName)}</p>
                            <p class="text-sm text-gray-500 truncate">${this.escapeHtml(subtitle)}</p>
                        </div>
                        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </div>
                </div>
            `;
        }).join('');
    }

    hideSearchResults() {
        const searchResults = document.getElementById('searchResults');
        const conversationsContainer = document.getElementById('conversationsContainer');

        if (searchResults) {
            searchResults.classList.add('hidden');
        }
        if (conversationsContainer) {
            conversationsContainer.classList.remove('hidden');
        }
    }

    clearUserSearch() {
        const searchInput = document.getElementById('userSearchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        this.hideSearchResults();
    }

    async startConversationWithUser(userId, username) {
        try {
            showLoading();

            // Try to create or get existing conversation
            const response = await apiPost('/chats/', {
                participant_id: userId
            });

            if (response && response.id) {
                // Redirect to chat page with conversation ID
                window.location = `chat.html#id=${response.id}`;
            } else {
                showToast('Failed to start conversation', 'error');
            }

        } catch (error) {
            console.error('Error starting conversation:', error);
            showToast('Failed to start conversation', 'error');
        } finally {
            hideLoading();
        }
    }
}

let chatManager;
document.addEventListener('DOMContentLoaded', () => {
    chatManager = new ChatManager();
    // Make chatManager globally accessible for onclick handlers
    window.chatManager = chatManager;
});

window.addEventListener('beforeunload', () => {
    if (chatManager) {
        chatManager.disconnectWebSocket();
    }
});

export default ChatManager;
