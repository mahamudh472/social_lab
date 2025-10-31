import { checkAuth, showToast, apiGet } from './utils.js';
import AuthManager from './auth.js';

class SocialMediaApp {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Check authentication on page load
        checkAuth();
        
        // Initialize components
        this.loadComponents();
        this.initEventListeners();
    }

    async loadComponents() {
        // Load current user profile first
        await this.loadCurrentUser();
        
        // Load navbar
        try {
            const navbarResponse = await fetch('/components/navbar.html');
            const navbarHTML = await navbarResponse.text();
            const navbarPlaceholder = document.getElementById('navbar-placeholder');
            if (navbarPlaceholder) {
                navbarPlaceholder.innerHTML = navbarHTML;
                this.updateNavbarProfile();
                this.initNavbar();
            }
        } catch (error) {
            console.error('Failed to load navbar:', error);
        }

        // Load sidebar for desktop
        if (window.innerWidth > 768) {
            try {
                const sidebarResponse = await fetch('/components/sidebar.html');
                const sidebarHTML = await sidebarResponse.text();
                const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
                if (sidebarPlaceholder) {
                    sidebarPlaceholder.innerHTML = sidebarHTML;
                    this.initSidebar();
                }
            } catch (error) {
                console.error('Failed to load sidebar:', error);
            }
        }
    }

    async loadCurrentUser() {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) return;
            
            this.currentUser = await apiGet('/users/me/');
            console.log('Current user loaded:', this.currentUser);
            console.log('Profile image value:', this.currentUser?.profile_image);
        } catch (error) {
            console.error('Failed to load current user:', error);
        }
    }

    updateNavbarProfile() {
        if (!this.currentUser) {
            console.log('No current user data to update navbar');
            return;
        }
        
        console.log('Updating navbar with user:', this.currentUser);
        
        const profileImages = document.querySelectorAll('#profileMenuButton img');
        console.log('Found profile images in navbar:', profileImages.length);
        
        profileImages.forEach(img => {
            if (this.currentUser.profile_image) {
                // Handle both full URLs and relative paths
                // If the path is relative (e.g. /media/...), leave it as-is so the browser will request it from the same origin (nginx)
                const imageUrl = this.currentUser.profile_image;
                console.log('Setting navbar image to:', imageUrl);
                img.src = imageUrl;
                img.onerror = function() {
                    console.log('Image load failed, using placeholder');
                    this.src = '/images/placeholder-avatar.jpg';
                };
            } else {
                console.log('No profile image, using placeholder');
                img.src = '/images/placeholder-avatar.jpg';
            }
        });
    }

    initNavbar() {
        // Mobile menu toggle
        const mobileMenuButton = document.getElementById('mobileMenuButton');
        const mobileMenu = document.getElementById('mobileMenu');
        
        if (mobileMenuButton && mobileMenu) {
            mobileMenuButton.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }

        // Profile menu toggle
        const profileMenuButton = document.getElementById('profileMenuButton');
        const profileMenu = document.getElementById('profileMenu');
        
        if (profileMenuButton && profileMenu) {
            profileMenuButton.addEventListener('click', (e) => {
                e.stopPropagation();
                profileMenu.classList.toggle('hidden');
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!profileMenuButton.contains(e.target) && !profileMenu.contains(e.target)) {
                    profileMenu.classList.add('hidden');
                }
            });
        }

        // Logout functionality
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                showToast('Logged out successfully', 'success');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 500);
            });
        }

        // Search functionality
        const searchButton = document.getElementById('searchButton');
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');
        const searchResultsContent = document.getElementById('searchResultsContent');
        
        // Check if we're on the search page
        const isSearchPage = window.location.pathname.includes('search');
        
        let searchTimeout = null;
        
        // Only enable dropdown search if NOT on search page
        if (searchInput && searchResults && searchResultsContent && !isSearchPage) {
            // Live search with debounce
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();
                
                if (query.length < 2) {
                    searchResults.classList.add('hidden');
                    return;
                }
                
                searchTimeout = setTimeout(async () => {
                    await this.performSearch(query, searchResults, searchResultsContent);
                }, 300);
            });
            
            // Submit on Enter
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const query = searchInput.value.trim();
                    if (query) {
                        window.location.href = `/search?q=${encodeURIComponent(query)}`;
                    }
                }
            });
            
            // Close results when clicking outside
            document.addEventListener('click', (e) => {
                if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                    searchResults.classList.add('hidden');
                }
            });
        } else if (searchInput && isSearchPage) {
            // On search page, just redirect on Enter
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const query = searchInput.value.trim();
                    if (query) {
                        window.location.href = `/search?q=${encodeURIComponent(query)}`;
                    }
                }
            });
        }
        
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                window.location.href = '/search';
            });
        }
    }
    
    async performSearch(query, searchResults, searchResultsContent) {
        try {
            // Show loading state
            searchResultsContent.innerHTML = `
                <div class="p-4 text-center">
                    <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <p class="text-sm text-gray-500 mt-2">Searching...</p>
                </div>
            `;
            searchResults.classList.remove('hidden');
            
            const data = await apiGet(`/search/?q=${encodeURIComponent(query)}`);
            
            if (!data) {
                searchResults.classList.add('hidden');
                return;
            }
            
            const { users = [], posts = [] } = data;
            
            if (users.length === 0 && posts.length === 0) {
                searchResultsContent.innerHTML = `
                    <div class="p-4 text-center text-gray-500">
                        No results found for "${query}"
                    </div>
                `;
                searchResults.classList.remove('hidden');
                return;
            }
            
            let html = '';
            
            // Users section
            if (users.length > 0) {
                html += `
                    <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
                        <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">People</h3>
                    </div>
                `;
                
                users.slice(0, 5).forEach(user => {
                    const profileImage = user.profile_image ? user.profile_image : '/images/placeholder-avatar.jpg';
                    
                    html += `
                        <a href="/profile?id=${user.id}" class="flex items-center px-4 py-3 hover:bg-gray-50 transition-colors">
                            <img src="${profileImage}" alt="${user.username}" class="w-10 h-10 rounded-full object-cover" 
                                onerror="this.src='/images/placeholder-avatar.jpg'">
                            <div class="ml-3 flex-1">
                                <p class="text-sm font-medium text-gray-900">${user.username}</p>
                                <p class="text-xs text-gray-500">${user.first_name || ''} ${user.last_name || ''}</p>
                            </div>
                        </a>
                    `;
                });
                
                if (users.length > 5) {
                    html += `
                        <a href="/search?q=${encodeURIComponent(query)}" class="block px-4 py-2 text-center text-sm text-blue-600 hover:bg-gray-50">
                            View all ${users.length} users
                        </a>
                    `;
                }
            }
            
            // Posts section
            if (posts.length > 0) {
                html += `
                    <div class="px-4 py-2 bg-gray-50 border-b border-gray-200 ${users.length > 0 ? 'border-t' : ''}">
                        <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Posts</h3>
                    </div>
                `;
                
                posts.slice(0, 3).forEach(post => {
                    const postImage = post.image ? post.image : null;
                    
                    const caption = post.caption ? 
                        (post.caption.length > 60 ? post.caption.substring(0, 60) + '...' : post.caption) 
                        : 'No caption';
                    
                    html += `
                        <a href="/post?id=${post.id}" class="flex items-start px-4 py-3 hover:bg-gray-50 transition-colors">
                            ${postImage ? `
                                <img src="${postImage}" alt="Post" class="w-12 h-12 rounded object-cover flex-shrink-0">
                            ` : `
                                <div class="w-12 h-12 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                                    <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            `}
                            <div class="ml-3 flex-1 min-w-0">
                                <p class="text-sm text-gray-900 overflow-hidden" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${caption}</p>
                                <p class="text-xs text-gray-500 mt-1">${post.likes_count || 0} likes</p>
                            </div>
                        </a>
                    `;
                });
                
                if (posts.length > 3) {
                    html += `
                        <a href="/search?q=${encodeURIComponent(query)}" class="block px-4 py-2 text-center text-sm text-blue-600 hover:bg-gray-50 border-t border-gray-200">
                            View all ${posts.length} posts
                        </a>
                    `;
                }
            }
            
            searchResultsContent.innerHTML = html;
            searchResults.classList.remove('hidden');
            
        } catch (error) {
            console.error('Search error:', error);
            searchResults.classList.add('hidden');
        }
    }

    initSidebar() {
        // Sidebar navigation
        const sidebarLinks = document.querySelectorAll('.sidebar-link');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                if (href) {
                    window.location.href = href;
                }
            });
        });
    }

    initEventListeners() {
        // Create post button
        const createPostBtn = document.getElementById('createPostBtn');
        if (createPostBtn) {
            createPostBtn.addEventListener('click', () => {
                window.location.href = '/create-post.html';
            });
        }

        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                document.documentElement.classList.toggle('dark');
                const isDark = document.documentElement.classList.contains('dark');
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
                showToast(`Switched to ${isDark ? 'dark' : 'light'} mode`);
            });
        }

        // Check for saved theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        }
    }
}

// Initialize the app
let appInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    appInstance = new SocialMediaApp();
});

// Export function to reload user profile (useful after profile updates)
export const reloadUserProfile = async () => {
    if (appInstance) {
        await appInstance.loadCurrentUser();
        appInstance.updateNavbarProfile();
    }
};

export default SocialMediaApp;