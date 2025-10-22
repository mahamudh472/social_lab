import { apiGet, apiPost, formatTimeAgo, showToast, showLoading, hideLoading, checkAuth } from './utils.js';

class PostDetailManager {
    constructor() {
        console.log('PostDetailManager initialized');
        this.postId = this.getPostIdFromUrl();
        console.log('Post ID from URL:', this.postId);
        this.post = null;
        this.init();
    }

    getPostIdFromUrl() {
        console.log('Full URL:', window.location.href);
        console.log('Pathname:', window.location.pathname);
        console.log('Search:', window.location.search);
        console.log('Hash:', window.location.hash);
        
        // Try query parameter first
        let urlParams = new URLSearchParams(window.location.search);
        let id = urlParams.get('id');
        
        // If not found in query params, try hash
        if (!id && window.location.hash) {
            const hash = window.location.hash.substring(1); // Remove the #
            urlParams = new URLSearchParams(hash);
            id = urlParams.get('id');
            console.log('Extracted from hash:', id);
        }
        
        console.log('URLSearchParams keys:', Array.from(urlParams.keys()));
        console.log('Extracted post ID:', id);
        return id;
    }

    async init() {
        // Check authentication first
        checkAuth();
        
        if (!this.postId) {
            showToast('Post not found', 'error');
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 2000);
            return;
        }

        await this.loadPost();
        this.initEventListeners();
    }

    async loadPost() {
        showLoading();
        
        try {
            console.log(`Fetching post details for ID: ${this.postId}`);
            const post = await apiGet(`/posts/${this.postId}`, true);
            console.log('Post data received:', post);
            
            if (post) {
                this.post = post;
                this.renderPost(post);
                await this.loadComments();
            } else {
                showToast('Post not found', 'error');
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 2000);
            }
        } catch (error) {
            console.error('Error loading post:', error);
            showToast('Failed to load post', 'error');
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 2000);
        } finally {
            hideLoading();
        }
    }

    renderPost(post) {
        // Get user info - handle both nested and flat structures
        const username = post.user?.username || post.username || 'anonymous';
        const userImage = post.user?.profile_image || post.profile_image || '/images/placeholder-avatar.jpg';
        
        // Handle image URL
        let imageUrl = post.image;
        if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `http://localhost:8000${imageUrl}`;
        }
        
        const hasImage = imageUrl && imageUrl !== 'null' && imageUrl !== '';
        const displayImage = hasImage ? imageUrl : '/images/placeholder-post.svg';
        
        const caption = post.caption || '';
        const likesCount = post.likes_count || 0;
        const liked = post.liked || false;
        const timeAgo = formatTimeAgo(post.created_at);

        // Update post header
        const postHeader = document.querySelector('.post-header');
        if (postHeader) {
            postHeader.innerHTML = `
                <div class="flex items-center space-x-3">
                    <img 
                        src="${userImage}" 
                        alt="${username}" 
                        class="w-8 h-8 rounded-full object-cover"
                        onerror="this.src='/images/placeholder-avatar.jpg'"
                    >
                    <div class="flex-1">
                        <h3 class="font-semibold text-gray-900">${username}</h3>
                    </div>
                </div>
                <button class="text-gray-400 hover:text-gray-600">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path>
                    </svg>
                </button>
            `;
        }

        // Update post image
        const postImage = document.querySelector('.post-image');
        if (postImage) {
            if (hasImage) {
                postImage.innerHTML = `
                    <img 
                        src="${displayImage}" 
                        alt="Post" 
                        class="w-full h-96 md:h-auto object-contain"
                        onerror="this.src='/images/placeholder-post.svg'"
                    >
                `;
            } else {
                postImage.innerHTML = `
                    <div class="w-full h-96 flex items-center justify-center bg-gray-100 text-gray-400">
                        <svg class="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                    </div>
                `;
            }
        }

        // Update caption
        const captionContainer = document.querySelector('.post-caption');
        if (captionContainer && caption) {
            captionContainer.innerHTML = `
                <div class="flex space-x-3 mb-4">
                    <img 
                        src="${userImage}" 
                        alt="${username}" 
                        class="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                        onerror="this.src='/images/placeholder-avatar.jpg'"
                    >
                    <div>
                        <p>
                            <span class="font-semibold text-gray-900">${username}</span>
                            <span class="text-gray-800"> ${caption}</span>
                        </p>
                        <p class="text-xs text-gray-500 mt-1">${timeAgo}</p>
                    </div>
                </div>
            `;
        } else if (captionContainer) {
            captionContainer.innerHTML = '';
        }

        // Update like button
        const likeBtn = document.querySelector('.post-like-btn');
        if (likeBtn) {
            likeBtn.className = `post-like-btn ${liked ? 'text-red-500' : 'text-gray-600'} hover:text-red-500`;
            likeBtn.innerHTML = `
                <svg class="w-6 h-6" fill="${liked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
            `;
        }

        // Update likes count
        const likesCountEl = document.querySelector('.likes-count');
        if (likesCountEl) {
            likesCountEl.textContent = `${likesCount} likes`;
        }

        // Update timestamp
        const timestampEl = document.querySelector('.post-timestamp');
        if (timestampEl) {
            timestampEl.textContent = timeAgo;
        }
    }

    async loadComments() {
        const commentsContainer = document.getElementById('commentsContainer');
        if (!commentsContainer) return;

        // For now, show empty state since we need to implement comments API
        commentsContainer.innerHTML = `
            <div class="text-center text-gray-500 py-4">
                <p class="text-sm">No comments yet</p>
            </div>
        `;
    }

    initEventListeners() {
        // Like button
        const likeBtn = document.querySelector('.post-like-btn');
        if (likeBtn) {
            likeBtn.addEventListener('click', () => this.handleLike());
        }

        // Comment form
        const commentForm = document.querySelector('.comment-form');
        if (commentForm) {
            commentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCommentSubmit(e);
            });
        }
    }

    async handleLike() {
        if (!this.post) return;

        const likeBtn = document.querySelector('.post-like-btn');
        const likesCountEl = document.querySelector('.likes-count');
        const isLiked = likeBtn.classList.contains('text-red-500');
        const currentCount = parseInt(likesCountEl.textContent) || 0;

        try {
            // Optimistic UI update
            if (isLiked) {
                likeBtn.classList.remove('text-red-500');
                likeBtn.classList.add('text-gray-600');
                likeBtn.querySelector('svg').setAttribute('fill', 'none');
                likesCountEl.textContent = `${Math.max(0, currentCount - 1)} likes`;
            } else {
                likeBtn.classList.add('text-red-500');
                likeBtn.classList.remove('text-gray-600');
                likeBtn.querySelector('svg').setAttribute('fill', 'currentColor');
                likesCountEl.textContent = `${currentCount + 1} likes`;
            }

            // Call API
            const response = await apiPost(`/posts/${this.postId}/like/`, {}, true);
            
            if (response && response.total_likes !== undefined) {
                likesCountEl.textContent = `${response.total_likes} likes`;
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            showToast('Failed to like post. Please login first.', 'error');

            // Revert UI on error
            if (isLiked) {
                likeBtn.classList.add('text-red-500');
                likeBtn.classList.remove('text-gray-600');
                likeBtn.querySelector('svg').setAttribute('fill', 'currentColor');
            } else {
                likeBtn.classList.remove('text-red-500');
                likeBtn.classList.add('text-gray-600');
                likeBtn.querySelector('svg').setAttribute('fill', 'none');
            }
            likesCountEl.textContent = `${currentCount} likes`;
        }
    }

    async handleCommentSubmit(e) {
        const form = e.target;
        const input = form.querySelector('input[type="text"]');
        const text = input.value.trim();

        if (!text) return;

        try {
            const response = await apiPost(`/posts/${this.postId}/comment/`, {
                text: text
            }, true);

            if (response) {
                showToast('Comment added!', 'success');
                input.value = '';
                await this.loadComments();
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            showToast('Failed to add comment. Please login first.', 'error');
        }
    }
}

// Initialize post detail manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PostDetailManager();
});

export default PostDetailManager;
