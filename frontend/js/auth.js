import { apiPost, showToast, showLoading, hideLoading } from './utils.js';

class AuthManager {
    constructor() {
        this.initEventListeners();
    }

    initEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        showLoading();

        const formData = new FormData(e.target);
        const data = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        try {
            const response = await apiPost('/auth/login/', data, false);
            
            if (response.access) {
                localStorage.setItem('access_token', response.access);
                localStorage.setItem('refresh_token', response.refresh);
                showToast('Login successful!', 'success');
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 1000);
            } else {
                showToast('Invalid credentials', 'error');
            }
        } catch (error) {
            showToast('Login failed', 'error');
        } finally {
            hideLoading();
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        showLoading();

        const formData = new FormData(e.target);
        const data = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            password2: formData.get('password2')
        };

        // Basic validation
        if (data.password !== data.password2) {
            showToast('Passwords do not match', 'error');
            hideLoading();
            return;
        }

        try {
            const response = await apiPost('/register/', data, false);
            
            if (response.id) {
                showToast('Registration successful! Please login.', 'success');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
            } else {
                showToast('Registration failed', 'error');
            }
        } catch (error) {
            showToast('Registration failed', 'error');
        } finally {
            hideLoading();
        }
    }

    handleLogout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        showToast('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1000);
    }

    getCurrentUser() {
        const token = localStorage.getItem('access_token');
        if (!token) return null;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload;
        } catch (error) {
            return null;
        }
    }
}

// Initialize auth manager
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});

export default AuthManager;