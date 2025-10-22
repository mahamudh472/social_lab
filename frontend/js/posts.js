import { apiGet, apiPost, formatTimeAgo, showToast, showLoading, hideLoading, checkAuth } from './utils.js';

class PostsManager {
    constructor() {
        this.currentPage = 1;
        this.hasMore = true;
        this.postsCache = [];
        this.init();
    }

    async init() {
        // Check authentication first
        checkAuth();
        
        await this.loadPosts();
        this.initEventListeners();
    }

    async loadPosts() {
        showLoading();
        
        try {
            const response = await apiGet(`/posts/?page=${this.currentPage}`, true); // Changed to true - require auth
            
            // Handle paginated response
            let posts = [];
            if (response && response.results) {
                // Paginated response
                posts = response.results;
                this.hasMore = !!response.next;
            } else if (response && Array.isArray(response)) {
                // Non-paginated response
                posts = response;
                this.hasMore = false;
            }
            
            if (posts.length > 0) {
                this.postsCache = [...this.postsCache, ...posts];
                this.renderPosts(posts);
            } else if (this.currentPage === 1) {
                // No posts at all
                this.renderPosts([]);
            }
            
            // Update load more button
            const loadMoreBtn = document.getElementById('loadMoreBtn');
            if (loadMoreBtn) {
                loadMoreBtn.style.display = this.hasMore ? 'block' : 'none';
            }
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

        // Clear existing posts if first load
        if (this.currentPage === 1) {
            container.innerHTML = '';
        }

        if (posts.length === 0) {
            container.innerHTML = `
                <div class="card p-8 text-center">
                    <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">No posts yet</h3>
                    <p class="text-gray-600 mb-4">Be the first to share something!</p>
                    <button onclick="window.location.href='/create-post.html'" class="btn-primary">
                        Create Your First Post
                    </button>
                </div>
            `;
            return;
        }

        posts.forEach(post => {
            const postElement = this.createPostElement(post);
            container.appendChild(postElement);
        });
    }

    createPostElement(post) {
        console.log('Creating post element for post:', post);
        console.log('Post ID:', post.id);
        
        const postDiv = document.createElement('div');
        postDiv.className = 'card';
        
        // Get user info - handle different API response structures
        const username = post.user?.username || post.username || 'anonymous';
        const userImage = post.user?.profile_image || post.profile_image || '/images/placeholder-avatar.jpg';
        
        // Handle image URL - support both full URLs and relative paths
        let imageUrl = post.image;
        if (imageUrl && !imageUrl.startsWith('http')) {
            // Prepend API base URL for relative paths
            imageUrl = `http://localhost:8000${imageUrl}`;
        }
        
        // Handle missing images
        const hasImage = imageUrl && imageUrl !== 'null' && imageUrl !== '';
        const displayImage = hasImage ? imageUrl : '/images/placeholder-post.svg';
        
        // Get caption or default
        const caption = post.caption || '';
        
        // Get counts
        const likesCount = post.likes_count || 0;
        const commentsCount = post.comments_count || 0;
        
        // Check if user liked the post
        const liked = post.liked || false;
        
        // Format time
        const timeAgo = formatTimeAgo(post.created_at);
        
        postDiv.innerHTML = `
            <!-- Post Header -->
            <div class="flex items-center justify-between p-4">
                <div class="flex items-center space-x-3">
                    <img 
                        src="${userImage}" 
                        alt="${username}" 
                        class="w-10 h-10 rounded-full object-cover"
                        onerror="this.src='/images/placeholder-avatar.jpg'"
                    >
                    <div>
                        <h3 class="font-semibold text-gray-900">${username}</h3>
                        <p class="text-sm text-gray-500">${timeAgo}</p>
                    </div>
                </div>
                <button class="text-gray-400 hover:text-gray-600">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path>
                    </svg>
                </button>
            </div>

            <!-- Post Image -->
            ${hasImage ? `
            <div class="aspect-w-1 aspect-h-1 bg-gray-100 post-image-container" data-post-id="${post.id}">
                <img 
                    src="${displayImage}" 
                    alt="Post image" 
                    class="w-full h-96 object-cover cursor-pointer"
                    onerror="this.src='/images/placeholder-post.svg'; this.classList.add('object-contain', 'p-8');"
                >
            </div>
            ` : caption ? '' : `
            <div class="bg-gray-100 h-48 flex items-center justify-center text-gray-400 post-image-container" data-post-id="${post.id}">
                <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
            </div>
            `}

            <!-- Post Actions -->
            <div class="p-4">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center space-x-4">
                        <button class="post-like-btn ${liked ? 'text-red-500' : 'text-gray-400'} hover:text-red-500 transition-colors duration-200" data-post-id="${post.id}">
                            <svg class="w-6 h-6" fill="${liked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </button>
                        <button class="text-gray-400 hover:text-gray-600 transition-colors duration-200" onclick="window.location.href='post.html#id=${post.id}'">
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
                <p class="text-sm font-semibold text-gray-900 mb-2 likes-count">${likesCount} likes</p>

                <!-- Caption -->
                ${caption ? `
                <div class="mb-2">
                    <span class="font-semibold text-gray-900">${username}</span>
                    <span class="text-gray-800"> ${caption}</span>
                </div>
                ` : ''}

                <!-- View Comments -->
                ${commentsCount > 0 ? `
                    <button 
                        onclick="window.location.href='post.html#id=${post.id}'"
                        class="text-sm text-gray-500 hover:text-gray-700 mb-2"
                    >
                        View all ${commentsCount} comments
                    </button>
                ` : ''}

                <!-- Add Comment -->
                <div class="flex items-center space-x-2 mt-2">
                    <input 
                        type="text" 
                        placeholder="Add a comment..." 
                        class="flex-1 border-0 focus:ring-0 text-sm py-2 px-0 bg-transparent"
                        data-post-id="${post.id}"
                    >
                    <button class="text-blue-600 text-sm font-semibold hover:text-blue-700" onclick="window.location.href='post.html#id=${post.id}'">Post</button>
                </div>
            </div>
        `;

        // Add like button functionality
        const likeBtn = postDiv.querySelector('.post-like-btn');
        likeBtn.addEventListener('click', () => this.handleLike(post.id, likeBtn, postDiv));

        // Add click handler to post image to view details
        const imageContainer = postDiv.querySelector('.post-image-container');
        if (imageContainer) {
            imageContainer.addEventListener('click', () => {
                console.log('Post clicked, navigating to post detail. Post ID:', post.id);
                console.log('Post object:', post);
                const currentPath = window.location.pathname;
                const basePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
                // Use hash-based routing to avoid server rewriting issues
                const targetUrl = `${basePath}post.html#id=${post.id}`;
                console.log('Current path:', currentPath);
                console.log('Base path:', basePath);
                console.log('Navigating to URL:', targetUrl);
                console.log('Full URL will be:', window.location.origin + targetUrl);
                window.location.href = targetUrl;
            });
            imageContainer.style.cursor = 'pointer';
        } else {
            console.log('Warning: .post-image-container not found for post:', post.id);
        }

        return postDiv;
    }

    async handleLike(postId, button, postDiv) {
        const isLiked = button.classList.contains('text-red-500');
        const likesCountEl = postDiv.querySelector('.likes-count');
        const currentCount = parseInt(likesCountEl.textContent) || 0;
        
        try {
            // Optimistic UI update
            if (isLiked) {
                button.classList.remove('text-red-500');
                button.querySelector('svg').setAttribute('fill', 'none');
                likesCountEl.textContent = `${Math.max(0, currentCount - 1)} likes`;
            } else {
                button.classList.add('text-red-500');
                button.querySelector('svg').setAttribute('fill', 'currentColor');
                likesCountEl.textContent = `${currentCount + 1} likes`;
            }
            
            // Call API
            const response = await apiPost(`/posts/${postId}/like/`, {}, true);
            
            if (response && response.total_likes !== undefined) {
                likesCountEl.textContent = `${response.total_likes} likes`;
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            showToast('Failed to like post. Please login first.', 'error');
            
            // Revert UI on error
            if (isLiked) {
                button.classList.add('text-red-500');
                button.querySelector('svg').setAttribute('fill', 'currentColor');
                likesCountEl.textContent = `${currentCount} likes`;
            } else {
                button.classList.remove('text-red-500');
                button.querySelector('svg').setAttribute('fill', 'none');
                likesCountEl.textContent = `${currentCount} likes`;
            }
        }
    }

    initEventListeners() {
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadMorePosts());
        }
        
        // Floating create post button for mobile
        const createPostBtn = document.getElementById('createPostBtn');
        if (createPostBtn) {
            createPostBtn.addEventListener('click', () => {
                window.location.href = '/create-post.html';
            });
        }
    }

    async loadMorePosts() {
        if (!this.hasMore) return;
        this.currentPage++;
        await this.loadPosts();
    }
}

// Initialize posts manager
document.addEventListener('DOMContentLoaded', () => {
    new PostsManager();
});

export default PostsManager;