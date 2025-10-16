import { apiGet, apiPost, formatTimeAgo, showToast, showLoading, hideLoading } from './utils.js';

class PostsManager {
    constructor() {
        this.currentPage = 1;
        this.hasMore = true;
        this.init();
    }

    async init() {
        await this.loadPosts();
        this.initEventListeners();
    }

    async loadPosts() {
        showLoading();
        
        try {
            // Mock data for demonstration
            const mockPosts = this.generateMockPosts(5);
            this.renderPosts(mockPosts);
        } catch (error) {
            console.error('Error loading posts:', error);
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
                user: {
                    username: `user${i + 1}`,
                    profile_picture: '/images/placeholder-avatar.jpg'
                },
                image: `https://picsum.photos/600/400?random=${i + 1}`,
                caption: `This is post #${i + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
                likes_count: Math.floor(Math.random() * 100),
                comments_count: Math.floor(Math.random() * 50),
                created_at: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
                liked: Math.random() > 0.5
            });
        }
        return posts;
    }

    renderPosts(posts) {
        const container = document.getElementById('postsContainer');
        if (!container) return;

        posts.forEach(post => {
            const postElement = this.createPostElement(post);
            container.appendChild(postElement);
        });
    }

    createPostElement(post) {
        const postDiv = document.createElement('div');
        postDiv.className = 'card';
        postDiv.innerHTML = `
            <!-- Post Header -->
            <div class="flex items-center justify-between p-4">
                <div class="flex items-center space-x-3">
                    <img 
                        src="${post.user.profile_picture}" 
                        alt="${post.user.username}" 
                        class="w-10 h-10 rounded-full"
                    >
                    <div>
                        <h3 class="font-semibold text-gray-900">${post.user.username}</h3>
                        <p class="text-sm text-gray-500">${formatTimeAgo(post.created_at)}</p>
                    </div>
                </div>
                <button class="text-gray-400 hover:text-gray-600">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path>
                    </svg>
                </button>
            </div>

            <!-- Post Image -->
            <div class="aspect-w-1 aspect-h-1 bg-gray-100">
                <img 
                    src="${post.image}" 
                    alt="Post image" 
                    class="w-full h-96 object-cover cursor-pointer"
                    onclick="window.location.href='/post.html?id=${post.id}'"
                >
            </div>

            <!-- Post Actions -->
            <div class="p-4">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center space-x-4">
                        <button class="post-like-btn ${post.liked ? 'text-red-500' : 'text-gray-400'} hover:text-red-500 transition-colors duration-200" data-post-id="${post.id}">
                            <svg class="w-6 h-6" fill="${post.liked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </button>
                        <button class="text-gray-400 hover:text-gray-600 transition-colors duration-200" onclick="window.location.href='/post.html?id=${post.id}'">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </button>
                        <button class="text-gray-400 hover:text-gray-600 transition-colors duration-200">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Likes Count -->
                <p class="text-sm font-semibold text-gray-900 mb-2">${post.likes_count} likes</p>

                <!-- Caption -->
                <div class="mb-2">
                    <span class="font-semibold text-gray-900">${post.user.username}</span>
                    <span class="text-gray-800">${post.caption}</span>
                </div>

                <!-- View Comments -->
                ${post.comments_count > 0 ? `
                    <button 
                        onclick="window.location.href='/post.html?id=${post.id}'"
                        class="text-sm text-gray-500 hover:text-gray-700 mb-2"
                    >
                        View all ${post.comments_count} comments
                    </button>
                ` : ''}

                <!-- Add Comment -->
                <div class="flex items-center space-x-2 mt-2">
                    <input 
                        type="text" 
                        placeholder="Add a comment..." 
                        class="flex-1 border-0 focus:ring-0 text-sm py-2 px-0 bg-transparent"
                    >
                    <button class="text-blue-600 text-sm font-semibold hover:text-blue-700">Post</button>
                </div>
            </div>
        `;

        // Add like button functionality
        const likeBtn = postDiv.querySelector('.post-like-btn');
        likeBtn.addEventListener('click', () => this.handleLike(post.id, likeBtn));

        return postDiv;
    }

    async handleLike(postId, button) {
        const isLiked = button.classList.contains('text-red-500');
        
        try {
            // Toggle like state
            if (isLiked) {
                button.classList.remove('text-red-500');
                button.querySelector('svg').setAttribute('fill', 'none');
                // await apiDelete(`/posts/${postId}/like/`);
            } else {
                button.classList.add('text-red-500');
                button.querySelector('svg').setAttribute('fill', 'currentColor');
                // await apiPost(`/posts/${postId}/like/`);
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            showToast('Failed to like post', 'error');
        }
    }

    initEventListeners() {
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadMorePosts());
        }
    }

    async loadMorePosts() {
        this.currentPage++;
        await this.loadPosts();
    }
}

// Initialize posts manager
document.addEventListener('DOMContentLoaded', () => {
    new PostsManager();
});

export default PostsManager;