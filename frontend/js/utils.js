// API base URL - update this to match your Django backend
const API_BASE = '/api';

// Token refresh function
const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
        console.log('No refresh token found');
        return false;
    }

    try {
        console.log('Attempting to refresh access token...');
        const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh: refreshToken }),
        });

        if (!response.ok) {
            console.log('Token refresh failed');
            // Refresh token is invalid or expired
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            return false;
        }

        const data = await response.json();
        console.log('Token refreshed successfully');
        localStorage.setItem('access_token', data.access);
        return true;
    } catch (error) {
        console.error('Error refreshing token:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        return false;
    }
};

// Helper functions for API calls
const apiGet = async (url, requiresAuth = true, showErrorToast = true) => {
    const headers = {};
    if (requiresAuth) {
        const token = localStorage.getItem('access_token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }
        headers['Authorization'] = `Bearer ${token}`;
    }

    const fullUrl = `${API_BASE}${url}`;
    console.log(`API GET: ${fullUrl}`);

    try {
        let response = await fetch(fullUrl, { headers });
        
        // If 401, try to refresh token and retry once
        if (response.status === 401 && requiresAuth) {
            console.log('Got 401, attempting token refresh...');
            const refreshed = await refreshAccessToken();
            
            if (refreshed) {
                // Retry the request with new token
                const newToken = localStorage.getItem('access_token');
                headers['Authorization'] = `Bearer ${newToken}`;
                response = await fetch(fullUrl, { headers });
            } else {
                // Refresh failed, redirect to login
                window.location.href = '/login.html';
                return;
            }
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API GET Error:', error);
        if (showErrorToast) {
            showToast('Error fetching data', 'error');
        }
        throw error;
    }
};

const apiPost = async (url, data, requiresAuth = true) => {
    const headers = {
        'Content-Type': 'application/json',
    };
    
    if (requiresAuth) {
        const token = localStorage.getItem('access_token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        let response = await fetch(`${API_BASE}${url}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });
        
        // If 401, try to refresh token and retry once
        if (response.status === 401 && requiresAuth) {
            console.log('Got 401, attempting token refresh...');
            const refreshed = await refreshAccessToken();
            
            if (refreshed) {
                // Retry the request with new token
                const newToken = localStorage.getItem('access_token');
                headers['Authorization'] = `Bearer ${newToken}`;
                response = await fetch(`${API_BASE}${url}`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(data),
                });
            } else {
                // Refresh failed, redirect to login
                window.location.href = '/login.html';
                return;
            }
        }
        
        return await response.json();
    } catch (error) {
        console.error('API POST Error:', error);
        showToast('Error submitting data', 'error');
    }
};

const apiPostFormData = async (url, formData, requiresAuth = true) => {
    const headers = {};
    
    if (requiresAuth) {
        const token = localStorage.getItem('access_token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        let response = await fetch(`${API_BASE}${url}`, {
            method: 'POST',
            headers,
            body: formData,
        });
        
        // If 401, try to refresh token and retry once
        if (response.status === 401 && requiresAuth) {
            console.log('Got 401, attempting token refresh...');
            const refreshed = await refreshAccessToken();
            
            if (refreshed) {
                // Retry the request with new token
                const newToken = localStorage.getItem('access_token');
                headers['Authorization'] = `Bearer ${newToken}`;
                response = await fetch(`${API_BASE}${url}`, {
                    method: 'POST',
                    headers,
                    body: formData,
                });
            } else {
                // Refresh failed, redirect to login
                window.location.href = '/login.html';
                return;
            }
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to submit data');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API POST FormData Error:', error);
        throw error;
    }
};

const apiPut = async (url, data) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };

    try {
        let response = await fetch(`${API_BASE}${url}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(data),
        });
        
        // If 401, try to refresh token and retry once
        if (response.status === 401) {
            console.log('Got 401, attempting token refresh...');
            const refreshed = await refreshAccessToken();
            
            if (refreshed) {
                // Retry the request with new token
                const newToken = localStorage.getItem('access_token');
                headers['Authorization'] = `Bearer ${newToken}`;
                response = await fetch(`${API_BASE}${url}`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify(data),
                });
            } else {
                // Refresh failed, redirect to login
                window.location.href = '/login.html';
                return;
            }
        }
        
        return await response.json();
    } catch (error) {
        console.error('API PUT Error:', error);
        showToast('Error updating data', 'error');
    }
};

const apiDelete = async (url) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
    };

    try {
        let response = await fetch(`${API_BASE}${url}`, {
            method: 'DELETE',
            headers,
        });
        
        // If 401, try to refresh token and retry once
        if (response.status === 401) {
            console.log('Got 401, attempting token refresh...');
            const refreshed = await refreshAccessToken();
            
            if (refreshed) {
                // Retry the request with new token
                const newToken = localStorage.getItem('access_token');
                headers['Authorization'] = `Bearer ${newToken}`;
                response = await fetch(`${API_BASE}${url}`, {
                    method: 'DELETE',
                    headers,
                });
            } else {
                // Refresh failed, redirect to login
                window.location.href = '/login.html';
                return;
            }
        }
        
        return response.ok;
    } catch (error) {
        console.error('API DELETE Error:', error);
        showToast('Error deleting data', 'error');
    }
};

// Toast notification system
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const types = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };
    
    toast.className = `fixed top-4 right-4 ${types[type]} text-white px-6 py-3 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300 z-50`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);
    
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Loading spinner
function showLoading() {
    const spinner = document.createElement('div');
    spinner.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    spinner.innerHTML = `
        <div class="bg-white p-4 rounded-lg flex items-center space-x-3">
            <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span class="text-gray-700">Loading...</span>
        </div>
    `;
    spinner.id = 'loading-spinner';
    document.body.appendChild(spinner);
}

function hideLoading() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        document.body.removeChild(spinner);
    }
}

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('access_token');
    const publicPages = ['/login.html', '/register.html', '/forgot-password.html'];
    const currentPath = window.location.pathname;
    
    // Normalize the path (remove leading slashes and ensure .html extension)
    const normalizedPath = currentPath.startsWith('/') ? currentPath : '/' + currentPath;
    
    // Check if current page is a public page
    const isPublicPage = publicPages.some(page => normalizedPath.endsWith(page) || normalizedPath === page);
    
    if (!token && !isPublicPage) {
        // User not logged in and trying to access protected page
        console.log('No token found, redirecting to login');
        window.location.href = '/login.html';
    } else if (token && isPublicPage) {
        // User logged in and trying to access login/register pages
        console.log('Already logged in, redirecting to home');
        window.location.href = '/index.html';
    }
}

// Format timestamp
function formatTimeAgo(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return date.toLocaleDateString();
}

export { 
    apiGet, 
    apiPost, 
    apiPostFormData,
    apiPut, 
    apiDelete, 
    refreshAccessToken,
    showToast, 
    showLoading, 
    hideLoading, 
    checkAuth, 
    formatTimeAgo 
};