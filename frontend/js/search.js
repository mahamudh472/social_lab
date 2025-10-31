import { apiGet, showToast, showLoading, hideLoading, checkAuth } from './utils.js';

class SearchManager {
    constructor() {
        this.searchTimeout = null;
        this.currentQuery = '';
        this.init();
    }

    init() {
        // Check authentication first
        checkAuth();
        
        // Get query from URL if present
        const urlParams = new URLSearchParams(window.location.search);
        const queryParam = urlParams.get('q');
        
        // Wait for navbar to load, then init
        setTimeout(() => {
            this.initEventListeners();
            
            if (queryParam) {
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.value = queryParam;
                }
                this.handleSearch(queryParam);
            } else {
                this.showInitialState();
            }
        }, 100);
    }

    initEventListeners() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                const query = e.target.value.trim();
                
                if (query.length < 2) {
                    this.showInitialState();
                    return;
                }
                
                this.searchTimeout = setTimeout(() => {
                    this.handleSearch(query);
                }, 300);
            });
            
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const query = e.target.value.trim();
                    if (query) {
                        this.handleSearch(query);
                    }
                }
            });
        }
    }

    async handleSearch(query) {
        if (!query || query.length < 1) {
            this.showInitialState();
            return;
        }

        this.currentQuery = query;
        this.showLoadingState();
        
        try {
            const data = await apiGet(`/search/?q=${encodeURIComponent(query)}`);
            
            if (data) {
                this.renderSearchResults(data, query);
            } else {
                this.showNoResults(query);
            }
        } catch (error) {
            console.error('Search error:', error);
            showToast('Search failed', 'error');
            this.showNoResults(query);
        }
    }

    showLoadingState() {
        const container = document.getElementById('searchPageResults');
        if (!container) return;

        container.innerHTML = `
            <div class="bg-white rounded-lg shadow p-8 text-center">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p class="text-gray-500 mt-3">Searching...</p>
            </div>
        `;
    }

    showNoResults(query) {
        const container = document.getElementById('searchPageResults');
        if (!container) return;

        container.innerHTML = `
            <div class="bg-white rounded-lg shadow p-8 text-center">
                <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p class="text-gray-600 text-lg font-medium">No results found</p>
                <p class="text-gray-500 mt-2">Try searching for something else</p>
            </div>
        `;
    }

    showInitialState() {
        const container = document.getElementById('searchPageResults');
        if (!container) return;

        container.innerHTML = `
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="font-semibold text-gray-900 mb-4">Search for people and posts</h3>
                <p class="text-gray-500 text-sm">Type at least 2 characters to start searching</p>
            </div>
        `;
    }

    renderSearchResults(data, query) {
        const container = document.getElementById('searchPageResults');
        if (!container) return;

        const { users = [], posts = [] } = data;

        if (users.length === 0 && posts.length === 0) {
            this.showNoResults(query);
            return;
        }

        let html = '';

        // Users Section
        if (users.length > 0) {
            html += `
                <div class="bg-white rounded-lg shadow mb-4">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <h3 class="font-semibold text-gray-900">People (${users.length})</h3>
                    </div>
                    <div class="divide-y divide-gray-100">
            `;
            
            users.forEach(user => {
                const profileImage = user.profile_image ? user.profile_image : '/images/placeholder-avatar.jpg';
                
                const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || '';
                
                html += `
                    <a href="/profile?id=${user.id}" class="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div class="flex items-center space-x-3">
                            <img src="${profileImage}" alt="${user.username}" 
                                class="w-12 h-12 rounded-full object-cover" 
                                onerror="this.src='/images/placeholder-avatar.jpg'">
                            <div>
                                <p class="font-medium text-gray-900">@${user.username}</p>
                                ${fullName ? `<p class="text-sm text-gray-500">${fullName}</p>` : ''}
                                ${user.bio ? `<p class="text-xs text-gray-400 mt-1 max-w-md truncate">${user.bio}</p>` : ''}
                            </div>
                        </div>
                        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </a>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }

        // Posts Section
        if (posts.length > 0) {
            html += `
                <div class="bg-white rounded-lg shadow">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <h3 class="font-semibold text-gray-900">Posts (${posts.length})</h3>
                    </div>
                    <div class="grid grid-cols-3 gap-1 p-1">
            `;
            
            posts.forEach(post => {
                const postImage = post.image ? post.image : null;
                
                html += `
                    <a href="/post?id=${post.id}" class="relative aspect-square group">
                        ${postImage ? `
                            <img src="${postImage}" alt="Post" class="w-full h-full object-cover">
                            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                                <div class="opacity-0 group-hover:opacity-100 text-white text-center">
                                    <p class="text-sm font-semibold">❤️ ${post.likes_count || 0}</p>
                                    <p class="text-xs">💬 ${post.comments_count || 0}</p>
                                </div>
                            </div>
                        ` : `
                            <div class="w-full h-full bg-gray-200 flex items-center justify-center">
                                <div class="text-center p-4">
                                    <svg class="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p class="text-xs text-gray-500">${post.caption ? (post.caption.length > 30 ? post.caption.substring(0, 30) + '...' : post.caption) : 'No image'}</p>
                                </div>
                            </div>
                        `}
                    </a>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    loadRecentSearches() {
        const container = document.getElementById('searchPageResults');
        if (!container) return;

        // This would typically load from localStorage or API
        container.innerHTML = `
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="font-semibold text-gray-900 mb-4">Recent Searches</h3>
                <div class="space-y-3">
                    <div class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer" onclick="window.location.href='/profile'">
                        <div class="flex items-center space-x-3">
                            <img src="/images/placeholder-avatar.jpg" alt="User" class="w-10 h-10 rounded-full">
                            <div>
                                <p class="font-medium text-gray-900">alice</p>
                                <p class="text-sm text-gray-500">Alice Johnson</p>
                            </div>
                        </div>
                        <button class="text-gray-400 hover:text-gray-600">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

// Initialize search manager
document.addEventListener('DOMContentLoaded', () => {
    new SearchManager();
});

export default SearchManager;