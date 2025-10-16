import { apiGet, showToast, showLoading, hideLoading } from './utils.js';

class SearchManager {
    constructor() {
        this.init();
    }

    init() {
        this.initEventListeners();
        this.loadRecentSearches();
    }

    initEventListeners() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }
    }

    async handleSearch(query) {
        if (query.length < 2) {
            this.loadRecentSearches();
            return;
        }

        showLoading();
        
        try {
            // Mock search results
            const results = this.generateMockResults(query);
            this.renderSearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
            showToast('Search failed', 'error');
        } finally {
            hideLoading();
        }
    }

    generateMockResults(query) {
        const users = [
            { username: 'alice', name: 'Alice Johnson', isFollowing: false },
            { username: 'alex', name: 'Alex Smith', isFollowing: true },
            { username: 'alicia', name: 'Alicia Brown', isFollowing: false }
        ].filter(user => 
            user.username.includes(query.toLowerCase()) || 
            user.name.toLowerCase().includes(query.toLowerCase())
        );

        return { users, query };
    }

    renderSearchResults(results) {
        const container = document.getElementById('searchResults');
        if (!container) return;

        if (results.users.length === 0) {
            container.innerHTML = `
                <div class="card p-8 text-center">
                    <p class="text-gray-500">No results found for "${results.query}"</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="card p-6">
                <h3 class="font-semibold text-gray-900 mb-4">Users</h3>
                <div class="space-y-3" id="usersResults">
                    ${results.users.map(user => `
                        <div class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer" onclick="window.location.href='/profile.html'">
                            <div class="flex items-center space-x-3">
                                <img src="/images/placeholder-avatar.jpg" alt="${user.username}" class="w-10 h-10 rounded-full">
                                <div>
                                    <p class="font-medium text-gray-900">${user.username}</p>
                                    <p class="text-sm text-gray-500">${user.name}</p>
                                </div>
                            </div>
                            ${user.isFollowing ? 
                                '<span class="text-sm text-gray-500">Following</span>' : 
                                '<button class="btn-primary text-sm px-3 py-1">Follow</button>'
                            }
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    loadRecentSearches() {
        const container = document.getElementById('searchResults');
        if (!container) return;

        // This would typically load from localStorage or API
        container.innerHTML = `
            <div class="card p-6">
                <h3 class="font-semibold text-gray-900 mb-4">Recent Searches</h3>
                <div class="space-y-3">
                    <div class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer" onclick="window.location.href='/profile.html'">
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