import { apiGet, showToast, showLoading, hideLoading } from './utils.js';

class ProfileManager {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadProfilePosts();
        this.initEventListeners();
    }

    async loadProfilePosts() {
        showLoading();
        
        try {
            // Mock data for profile posts
            const mockPosts = this.generateMockPosts(9);
            this.renderProfilePosts(mockPosts);
        } catch (error) {
            console.error('Error loading profile posts:', error);
            showToast('Failed to load posts', 'error');
        } finally {
            hideLoading();
        }
    }

    generateMockPosts(count) {
        const posts = [];
        for (let i = 0; i < count; i++) {
            posts.push({
                id: i + 1,
                image: `https://picsum.photos/400/400?random=${i + 1}`,
                likes_count: Math.floor(Math.random() * 100),
                comments_count: Math.floor(Math.random() * 50)
            });
        }
        return posts;
    }

    renderProfilePosts(posts) {
        const container = document.getElementById('postsGrid');
        if (!container) return;

        container.innerHTML = '';
        
        posts.forEach(post => {
            const postElement = this.createProfilePostElement(post);
            container.appendChild(postElement);
        });
    }

    createProfilePostElement(post) {
        const postDiv = document.createElement('div');
        postDiv.className = 'aspect-square bg-gray-100 relative group cursor-pointer';
        postDiv.innerHTML = `
            <img 
                src="${post.image}" 
                alt="Post" 
                class="w-full h-full object-cover"
                onclick="window.location.href='/post.html?id=${post.id}'"
            >
            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center space-x-4 opacity-0 group-hover:opacity-100">
                <div class="text-white flex items-center space-x-1">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    <span class="font-semibold">${post.likes_count}</span>
                </div>
                <div class="text-white flex items-center space-x-1">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                    </svg>
                    <span class="font-semibold">${post.comments_count}</span>
                </div>
            </div>
        `;
        return postDiv;
    }

    initEventListeners() {
        const editProfileBtn = document.getElementById('editProfileBtn');
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => {
                window.location.href = '/edit-profile.html';
            });
        }

        const followBtn = document.getElementById('followBtn');
        if (followBtn) {
            followBtn.addEventListener('click', () => {
                this.handleFollow();
            });
        }
    }

    async handleFollow() {
        // Implement follow functionality
        showToast('Follow functionality would be implemented here');
    }
}

// Initialize profile manager
document.addEventListener('DOMContentLoaded', () => {
    new ProfileManager();
});

export default ProfileManager;