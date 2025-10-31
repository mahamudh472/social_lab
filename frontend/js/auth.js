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
            
            // Add real-time validation for register form
            const usernameField = document.getElementById('username');
            const passwordField = document.getElementById('password');
            const password2Field = document.getElementById('password2');

            if (usernameField) {
                usernameField.addEventListener('blur', () => this.validateUsername());
                usernameField.addEventListener('input', () => {
                    // Clear error on input
                    this.clearFieldError('username');
                });
            }

            if (passwordField) {
                passwordField.addEventListener('input', () => {
                    this.validatePasswordStrength();
                    this.clearFieldError('password');
                });
            }

            if (password2Field) {
                password2Field.addEventListener('input', () => {
                    this.validatePasswordMatch();
                });
            }
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
        
        const formData = new FormData(e.target);
        const username = formData.get('username');
        const email = formData.get('email');
        const password = formData.get('password');
        const password2 = formData.get('password2');

        // Clear previous error messages
        this.clearErrors();

        // Basic validation
        if (!username || username.trim().length < 3) {
            this.showFieldError('username', 'Username must be at least 3 characters');
            return;
        }

        if (!password || password.length < 8) {
            this.showFieldError('password', 'Password must be at least 8 characters');
            return;
        }

        if (password !== password2) {
            this.showFieldError('password2', 'Passwords do not match');
            return;
        }

        const termsCheckbox = document.getElementById('terms');
        if (!termsCheckbox.checked) {
            showToast('Please agree to the Terms and Conditions', 'error');
            return;
        }

        // Disable submit button and show spinner
        const registerBtn = document.getElementById('registerBtn');
        const registerBtnText = document.getElementById('registerBtnText');
        const registerSpinner = document.getElementById('registerSpinner');
        
        if (registerBtn) {
            registerBtn.disabled = true;
            registerBtn.classList.add('opacity-75', 'cursor-not-allowed');
        }
        if (registerBtnText) registerBtnText.textContent = 'Creating Account...';
        if (registerSpinner) registerSpinner.classList.remove('hidden');

        showLoading();

        const data = {
            username: username.trim(),
            password: password,
            password2: password2
        };

        try {
            const response = await apiPost('/auth/register/', data, false);
            
            if (response.success || response.id) {
                showToast('Registration successful! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
            } else {
                showToast('Registration failed', 'error');
                this.enableSubmitButton();
            }
        } catch (error) {
            console.error('Registration error:', error);
            
            // Handle specific error messages from backend
            if (error.username) {
                const usernameError = Array.isArray(error.username) ? error.username[0] : error.username;
                this.showFieldError('username', usernameError);
            } else if (error.password) {
                const passwordError = Array.isArray(error.password) ? error.password[0] : error.password;
                this.showFieldError('password', passwordError);
            } else if (error.detail) {
                showToast(error.detail, 'error');
            } else if (error.message) {
                showToast(error.message, 'error');
            } else {
                showToast('Registration failed. Please try again.', 'error');
            }
            
            this.enableSubmitButton();
        } finally {
            hideLoading();
        }
    }

    enableSubmitButton() {
        const registerBtn = document.getElementById('registerBtn');
        const registerBtnText = document.getElementById('registerBtnText');
        const registerSpinner = document.getElementById('registerSpinner');
        
        if (registerBtn) {
            registerBtn.disabled = false;
            registerBtn.classList.remove('opacity-75', 'cursor-not-allowed');
        }
        if (registerBtnText) registerBtnText.textContent = 'Create Account';
        if (registerSpinner) registerSpinner.classList.add('hidden');
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showFieldError(fieldName, message) {
        const field = document.getElementById(fieldName);
        if (!field) return;

        // Add error styling to field
        field.classList.add('border-red-500', 'focus:ring-red-500');
        
        // Create or update error message
        let errorDiv = field.parentElement.querySelector('.field-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'field-error text-red-600 text-sm mt-1';
            field.parentElement.appendChild(errorDiv);
        }
        errorDiv.textContent = message;

        // Focus on the field
        field.focus();
    }

    clearErrors() {
        // Remove error styling from all fields
        const fields = document.querySelectorAll('.input-field');
        fields.forEach(field => {
            field.classList.remove('border-red-500', 'focus:ring-red-500');
        });

        // Remove all error messages
        const errorDivs = document.querySelectorAll('.field-error');
        errorDivs.forEach(div => div.remove());
    }

    clearFieldError(fieldName) {
        const field = document.getElementById(fieldName);
        if (!field) return;

        field.classList.remove('border-red-500', 'focus:ring-red-500');
        const errorDiv = field.parentElement.querySelector('.field-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    validateUsername() {
        const usernameField = document.getElementById('username');
        const username = usernameField?.value.trim();

        if (!username) return;

        if (username.length < 3) {
            this.showFieldError('username', 'Username must be at least 3 characters');
            return false;
        }

        // Username format validation (alphanumeric and underscore)
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(username)) {
            this.showFieldError('username', 'Username can only contain letters, numbers, and underscores');
            return false;
        }

        return true;
    }

    validatePasswordStrength() {
        const passwordField = document.getElementById('password');
        const password = passwordField?.value;

        if (!password) return;

        let strength = 0;
        let message = '';
        let color = '';

        // Length check
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;

        // Character variety checks
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;

        // Determine strength level
        if (strength <= 2) {
            message = 'Weak password';
            color = 'text-red-600';
        } else if (strength <= 4) {
            message = 'Medium password';
            color = 'text-yellow-600';
        } else {
            message = 'Strong password';
            color = 'text-green-600';
        }

        // Show strength indicator
        let strengthDiv = passwordField.parentElement.querySelector('.password-strength');
        if (!strengthDiv) {
            strengthDiv = document.createElement('div');
            strengthDiv.className = 'password-strength text-sm mt-1';
            passwordField.parentElement.appendChild(strengthDiv);
        }
        strengthDiv.className = `password-strength text-sm mt-1 ${color}`;
        strengthDiv.textContent = message;
    }

    validatePasswordMatch() {
        const passwordField = document.getElementById('password');
        const password2Field = document.getElementById('password2');
        
        const password = passwordField?.value;
        const password2 = password2Field?.value;

        if (!password2) {
            this.clearFieldError('password2');
            return;
        }

        if (password !== password2) {
            this.showFieldError('password2', 'Passwords do not match');
            return false;
        } else {
            this.clearFieldError('password2');
            // Show match indicator
            let matchDiv = password2Field.parentElement.querySelector('.password-match');
            if (!matchDiv) {
                matchDiv = document.createElement('div');
                matchDiv.className = 'password-match text-sm mt-1 text-green-600';
                password2Field.parentElement.appendChild(matchDiv);
            }
            matchDiv.textContent = '✓ Passwords match';
        }

        return true;
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