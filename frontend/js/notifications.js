import { apiGet, showToast, showLoading, hideLoading } from './utils.js';

class NotificationsManager {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadNotifications();
    }

    async loadNotifications() {
        showLoading();
        
        try {
            // Mock notifications data
            const notifications = this.generateMockNotifications();
            this.renderNotifications(notifications);
        } catch (error) {
            console.error('Error loading notifications:', error);
            showToast('Failed to load notifications', 'error');
        } finally {
            hideLoading();
        }
    }

    generateMockNotifications() {
        return [
            {
                id: 1,
                type: 'like',
                user: { username: 'alice', profile_picture: '/images/placeholder-avatar.jpg' },
                post: { image: 'https://picsum.photos/100/100?random=1' },
                timestamp: new Date(Date.now() - 7200000),
                read: false
            },
            {
                id: 2,
                type: 'follow',
                user: { username: 'bob', profile_picture: '/images/placeholder-avatar.jpg' },
                timestamp: new Date(Date.now() - 18000000),
                read: false
            },
            {
                id: 3,
                type: 'comment',
                user: { username: 'charlie', profile_picture: '/images/placeholder-avatar.jpg' },
                post: { image: 'https://picsum.photos/100/100?random=2' },
                comment: { text: 'Great photo!' },
                timestamp: new Date(Date.now() - 86400000),
                read: true
            }
        ];
    }

    renderNotifications(notifications) {
        const container = document.getElementById('notificationsContainer');
        if (!container) return;

        container.innerHTML = notifications.map(notification => `
            <div class="card p-4 ${!notification.read ? 'bg-blue-50 border-blue-200' : ''}">
                <div class="flex items-start space-x-3">
                    <img src="${notification.user.profile_picture}" alt="${notification.user.username}" class="w-10 h-10 rounded-full">
                    <div class="flex-1">
                        <p class="text-gray-900">
                            <span class="font-semibold">${notification.user.username}</span> 
                            ${this.getNotificationText(notification)}
                        </p>
                        <p class="text-sm text-gray-500">${this.formatTime(notification.timestamp)}</p>
                    </div>
                    ${notification.post ? `
                        <img src="${notification.post.image}" alt="Post" class="w-12 h-12 rounded">
                    ` : ''}
                    ${notification.type === 'follow' ? `
                        <button class="btn-primary text-sm px-4 py-1">
                            Follow Back
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    getNotificationText(notification) {
        switch (notification.type) {
            case 'like':
                return 'liked your post';
            case 'follow':
                return 'started following you';
            case 'comment':
                return `commented: "${notification.comment.text}"`;
            default:
                return 'interacted with your post';
        }
    }

    formatTime(timestamp) {
        const now = new Date();
        const diff = now - timestamp;
        
        if (diff < 60000) return 'just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
        return `${Math.floor(diff / 86400000)} days ago`;
    }
}

// Initialize notifications manager
document.addEventListener('DOMContentLoaded', () => {
    new NotificationsManager();
});

export default NotificationsManager;