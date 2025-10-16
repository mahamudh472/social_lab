// API base URL - update this to match your Django backend
const API_BASE = 'http://localhost:8000/api';

// Helper functions for API calls
const apiGet = async (url, requiresAuth = true) => {
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
        const response = await fetch(`${API_BASE}${url}`, { headers });
        if (response.status === 401) {
            localStorage.removeItem('access_token');
            window.location.href = '/login.html';
            return;
        }
        return await response.json();
    } catch (error) {
        console.error('API GET Error:', error);
        showToast('Error fetching data', 'error');
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
        const response = await fetch(`${API_BASE}${url}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });
        
        if (response.status === 401) {
            localStorage.removeItem('access_token');
            window.location.href = '/login.html';
            return;
        }
        
        return await response.json();
    } catch (error) {
        console.error('API POST Error:', error);
        showToast('Error submitting data', 'error');
    }
};

const apiPut = async (url, data) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}${url}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        
        if (response.status === 401) {
            localStorage.removeItem('access_token');
            window.location.href = '/login.html';
            return;
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

    try {
        const response = await fetch(`${API_BASE}${url}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        if (response.status === 401) {
            localStorage.removeItem('access_token');
            window.location.href = '/login.html';
            return;
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
    const currentPage = window.location.pathname;
    
    if (!token && !publicPages.includes(currentPage)) {
        window.location.href = '/login.html';
    } else if (token && publicPages.includes(currentPage)) {
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
    apiPut, 
    apiDelete, 
    showToast, 
    showLoading, 
    hideLoading, 
    checkAuth, 
    formatTimeAgo 
};