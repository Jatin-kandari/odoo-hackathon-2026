// Authentication Helper Functions

const AUTH_API = 'http://localhost:5000/api/auth';

// Get current user token
function getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
}

// Get current user info
function getCurrentUser() {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Check if user is logged in
function isAuthenticated() {
    return !!getToken();
}

// Logout user
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Protect page (redirect to login if not authenticated)
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Verify token with server
async function verifyToken() {
    const token = getToken();
    if (!token) return false;
    
    try {
        const response = await fetch(`${AUTH_API}/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        return result.success;
    } catch (error) {
        return false;
    }
}

// Add auth header to fetch requests
function authHeaders() {
    const token = getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Update user menu with current user info
function updateUserMenu() {
    const user = getCurrentUser();
    if (!user) return;
    
    const userNameEl = document.querySelector('.user-name');
    const userRoleEl = document.querySelector('.user-role');
    const userAvatarEl = document.querySelector('.user-avatar');
    
    if (userNameEl) userNameEl.textContent = user.name;
    if (userRoleEl) userRoleEl.textContent = user.role;
    if (userAvatarEl) userAvatarEl.textContent = user.name.charAt(0).toUpperCase();
}

// Add logout functionality to user menu
function setupUserMenu() {
    const userMenu = document.querySelector('.user-menu');
    if (userMenu) {
        userMenu.style.cursor = 'pointer';
        userMenu.title = 'Click to logout';
        userMenu.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                logout();
            }
        });
    }
}

// Auto-check auth on protected pages
function initAuthProtection() {
    // Skip on login/register pages
    if (window.location.pathname.includes('login.html') || 
        window.location.pathname.includes('register.html')) {
        return;
    }
    
    if (!requireAuth()) return;
    
    // Update user menu
    updateUserMenu();
    setupUserMenu();
}

// Run on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthProtection);
} else {
    initAuthProtection();
}