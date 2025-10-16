import { checkAuth, showToast } from './utils.js';
import AuthManager from './auth.js';

class SocialMediaApp {
    constructor() {
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
        // Load navbar
        try {
            const navbarResponse = await fetch('/components/navbar.html');
            const navbarHTML = await navbarResponse.text();
            const navbarPlaceholder = document.getElementById('navbar-placeholder');
            if (navbarPlaceholder) {
                navbarPlaceholder.innerHTML = navbarHTML;
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
        
        if (searchButton && searchInput) {
            searchButton.addEventListener('click', () => {
                const query = searchInput.value.trim();
                if (query) {
                    window.location.href = `/search.html?q=${encodeURIComponent(query)}`;
                }
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const query = searchInput.value.trim();
                    if (query) {
                        window.location.href = `/search.html?q=${encodeURIComponent(query)}`;
                    }
                }
            });
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
document.addEventListener('DOMContentLoaded', () => {
    new SocialMediaApp();
});

export default SocialMediaApp;