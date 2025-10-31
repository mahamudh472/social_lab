import { apiGet, apiPost, showToast, showLoading, hideLoading, checkAuth } from './utils.js';

class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.profileUser = null;
        this.userId = null;
        this.isOwnProfile = false;
        this.init();
    }

    async init() {
        // Check authentication first
        checkAuth();
        
        try {
            // Get current logged-in user
            await this.loadCurrentUser();
            
            // Check if viewing another user's profile or own profile
            // Handle both query parameters and hash-based routing
            let urlUserId = null;
            
            // Try query parameter first
            const urlParams = new URLSearchParams(window.location.search);
            urlUserId = urlParams.get('id');
            
            // If not found, try hash-based routing
            if (!urlUserId && window.location.hash) {
                const hash = window.location.hash.substring(1); // Remove the #
                
                // Support both #id=12 and #?id=12 formats
                if (hash.startsWith('id=')) {
                    urlUserId = hash.split('=')[1];
                } else if (hash.startsWith('?')) {
                    const hashParams = new URLSearchParams(hash);
                    urlUserId = hashParams.get('id');
                }
            }
            
            console.log('URL User ID:', urlUserId);
            console.log('Current User ID:', this.currentUser?.id);
            console.log('window.location.search:', window.location.search);
            console.log('window.location.hash:', window.location.hash);
            console.log('Full URL:', window.location.href);
            
            if (!urlUserId) {
                // No ID in URL means viewing own profile
                this.isOwnProfile = true;
                this.userId = this.currentUser?.id;
            } else {
                // Convert to number for comparison
                const numericUrlId = parseInt(urlUserId);
                this.userId = numericUrlId;
                // Check if the ID matches current user
                this.isOwnProfile = numericUrlId === this.currentUser?.id;
            }
            
            console.log('Is Own Profile:', this.isOwnProfile);
            console.log('Profile User ID:', this.userId);
            
            await this.loadProfile();
            await this.loadProfilePosts();
            this.initEventListeners();
        } catch (error) {
            console.error('Error initializing profile:', error);
            showToast('Failed to load profile', 'error');
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

    async loadProfile() {
        showLoading();
        
        try {
            let profileData;
            
            console.log('Loading profile - isOwnProfile:', this.isOwnProfile, 'userId:', this.userId);
            
            if (this.isOwnProfile) {
                // Get own profile
                console.log('Fetching own profile from /users/me/');
                profileData = await apiGet('/users/me/');
            } else {
                // Get another user's profile
                console.log(`Fetching other user's profile from /users/${this.userId}/`);
                profileData = await apiGet(`/users/${this.userId}/`);
                
                // Check follow status by getting one of their posts
                await this.checkFollowStatus();
            }
            
            console.log('Profile data received:', profileData);
            
            if (profileData) {
                this.profileUser = profileData;
                this.renderProfile(profileData);
                
                // Load followers and following counts
                await this.loadFollowerStats();
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            showToast('Failed to load profile', 'error');
        } finally {
            hideLoading();
        }
    }

    async loadFollowerStats() {
        try {
            // Fetch followers count
            const followersResponse = await apiGet(`/users/${this.userId}/followers/`);
            if (followersResponse) {
                const followersCount = Array.isArray(followersResponse) ? followersResponse.length : (followersResponse.count || 0);
                const followersCountEl = document.getElementById('followersCount');
                if (followersCountEl) {
                    followersCountEl.textContent = followersCount;
                }
            }

            // Fetch following count
            const followingResponse = await apiGet(`/users/${this.userId}/following/`);
            if (followingResponse) {
                const followingCount = Array.isArray(followingResponse) ? followingResponse.length : (followingResponse.count || 0);
                const followingCountEl = document.getElementById('followingCount');
                if (followingCountEl) {
                    followingCountEl.textContent = followingCount;
                }
            }
        } catch (error) {
            console.error('Error loading follower stats:', error);
            // Keep default "0" if there's an error
        }
    }

    async checkFollowStatus() {
        try {
            // Fetch posts from this user to check if we're following them
            const response = await apiGet(`/posts/user/${this.userId}/`);
            
            if (response && response.results && response.results.length > 0) {
                // Check the is_following field from the first post
                const isFollowing = response.results[0].is_following;
                console.log('Follow status from post:', isFollowing);
                
                // Update the follow button
                const followBtn = document.getElementById('followBtn');
                if (followBtn && isFollowing !== null) {
                    if (isFollowing) {
                        followBtn.textContent = 'Following';
                        followBtn.className = 'btn-secondary text-sm';
                    } else {
                        followBtn.textContent = 'Follow';
                        followBtn.className = 'btn-primary text-sm';
                    }
                }
            }
        } catch (error) {
            console.error('Error checking follow status:', error);
            // If no posts, default to "Follow"
        }
    }

    renderProfile(user) {
        console.log('Rendering profile for user:', user);
        console.log('User profile_image:', user.profile_image);
        
        // Update profile picture
        const profileImg = document.getElementById('profileImage');
        if (profileImg) {
            if (user.profile_image) {
                // Handle both full URLs and relative paths; leave relative paths intact so nginx serves them from same origin
                const imageUrl = user.profile_image;
                console.log('Setting profile image to:', imageUrl);
                profileImg.src = imageUrl;
                profileImg.onerror = function() {
                    console.log('Profile image load failed, using placeholder');
                    this.src = '/images/placeholder-avatar.jpg';
                };
            } else {
                console.log('No profile image, using placeholder');
                profileImg.src = '/images/placeholder-avatar.jpg';
            }
        }

        // Update username
        const usernameEl = document.getElementById('profileUsername');
        if (usernameEl) {
            usernameEl.textContent = user.username || 'Unknown User';
        }

        // Update bio
        const bioContainer = document.getElementById('profileBio');
        if (bioContainer) {
            if (user.bio) {
                bioContainer.innerHTML = `
                    <p class="font-semibold">${this.escapeHtml(user.username)}</p>
                    <p>${this.escapeHtml(user.bio)}</p>
                `;
            } else {
                bioContainer.innerHTML = `
                    <p class="font-semibold">${this.escapeHtml(user.username)}</p>
                    ${this.isOwnProfile ? '<p class="text-gray-500 text-sm">Add a bio to tell people about yourself</p>' : ''}
                `;
            }
        }

        // Show/hide edit profile or follow button
        const editProfileBtn = document.getElementById('editProfileBtn');
        const followBtn = document.getElementById('followBtn');
        
        if (this.isOwnProfile) {
            if (editProfileBtn) editProfileBtn.classList.remove('hidden');
            if (followBtn) followBtn.classList.add('hidden');
        } else {
            if (editProfileBtn) editProfileBtn.classList.add('hidden');
            if (followBtn) followBtn.classList.remove('hidden');
        }

        // Update page title
        document.title = `${user.username} - SocialApp`;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async loadProfilePosts() {
        showLoading();
        
        try {
            // Use the user-specific endpoint to get posts
            const endpoint = `/posts/user/${this.userId}/`;
            console.log('Fetching posts from:', endpoint);
            
            const response = await apiGet(endpoint);
            
            console.log('Posts response:', response);
            
            if (response && response.results) {
                console.log('User posts count:', response.results.length);
                
                // Update post count
                const postCountEl = document.getElementById('postsCount');
                if (postCountEl) {
                    postCountEl.textContent = response.results.length;
                }
                
                this.renderProfilePosts(response.results);
            } else {
                this.renderProfilePosts([]);
            }
        } catch (error) {
            console.error('Error loading profile posts:', error);
            showToast('Failed to load posts', 'error');
            this.renderProfilePosts([]);
        } finally {
            hideLoading();
        }
    }

    renderProfilePosts(posts) {
        const container = document.getElementById('postsGrid');
        if (!container) return;

        container.innerHTML = '';
        
        if (posts.length === 0) {
            container.innerHTML = `
                <div class="col-span-3 py-12 text-center text-gray-500">
                    <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <p class="text-lg font-medium">No posts yet</p>
                    ${this.isOwnProfile ? '<p class="text-sm mt-2">Share your first post!</p>' : ''}
                </div>
            `;
            return;
        }
        
        posts.forEach(post => {
            const postElement = this.createProfilePostElement(post);
            container.appendChild(postElement);
        });
    }

    createProfilePostElement(post) {
        const postDiv = document.createElement('div');
        postDiv.className = 'aspect-square bg-gray-100 relative group cursor-pointer';
        
        // Get the first image from the post
        const imageUrl = post.image || (post.images && post.images.length > 0 ? post.images[0] : 'https://via.placeholder.com/400');
        
        postDiv.innerHTML = `
            <img 
                src="${imageUrl}" 
                alt="Post" 
                class="w-full h-full object-cover"
                onerror="this.src='https://via.placeholder.com/400'"
            >
            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center space-x-4 opacity-0 group-hover:opacity-100">
                <div class="text-white flex items-center space-x-1">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    <span class="font-semibold">${post.likes_count || 0}</span>
                </div>
                <div class="text-white flex items-center space-x-1">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                    </svg>
                    <span class="font-semibold">${post.comments_count || 0}</span>
                </div>
            </div>
        `;
        
        postDiv.addEventListener('click', () => {
            console.log('Profile post clicked, navigating to post detail. Post ID:', post.id);
            // Use hash-based routing to match home page behavior
            window.location.href = `post#id=${post.id}`;
        });
        
        return postDiv;
    }

    initEventListeners() {
        const editProfileBtn = document.getElementById('editProfileBtn');
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => {
                window.location.href = 'edit-profile';
            });
        }

        const followBtn = document.getElementById('followBtn');
        if (followBtn && !this.isOwnProfile) {
            followBtn.addEventListener('click', () => {
                this.handleFollow();
            });
        }
    }

    async handleFollow() {
        const followBtn = document.getElementById('followBtn');
        if (!followBtn) return;
        
        const isFollowing = followBtn.textContent.trim() === 'Following';
        const followersCountEl = document.getElementById('followersCount');
        const currentFollowersCount = parseInt(followersCountEl?.textContent || '0');
        
        try {
            // Optimistic UI update
            if (isFollowing) {
                followBtn.textContent = 'Follow';
                followBtn.className = 'btn-primary text-sm';
                // Decrease followers count
                if (followersCountEl) {
                    followersCountEl.textContent = Math.max(0, currentFollowersCount - 1);
                }
            } else {
                followBtn.textContent = 'Following';
                followBtn.className = 'btn-secondary text-sm';
                // Increase followers count
                if (followersCountEl) {
                    followersCountEl.textContent = currentFollowersCount + 1;
                }
            }
            
            const response = await apiPost(`/users/${this.userId}/follow/`, {});
            
            if (response) {
                showToast(response.message || 'Success', 'success');
                // Reload stats to get accurate count
                await this.loadFollowerStats();
            }
        } catch (error) {
            console.error('Error following user:', error);
            // Revert on error
            if (isFollowing) {
                followBtn.textContent = 'Following';
                followBtn.className = 'btn-secondary text-sm';
                if (followersCountEl) {
                    followersCountEl.textContent = currentFollowersCount;
                }
            } else {
                followBtn.textContent = 'Follow';
                followBtn.className = 'btn-primary text-sm';
                if (followersCountEl) {
                    followersCountEl.textContent = currentFollowersCount;
                }
            }
            showToast('Failed to follow/unfollow user', 'error');
        }
    }
}

// Initialize profile manager
document.addEventListener('DOMContentLoaded', () => {
    window.profileManager = new ProfileManager();
});

export default ProfileManager;