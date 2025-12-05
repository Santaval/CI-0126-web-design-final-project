// Example: Testing Passport Authentication with fetch API

// Example 1: Register a new user
async function registerExample() {
    const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: 'testuser',
            password: 'password123',
            email: 'test@example.com',
            profileImageUrl: '/img/default-profile.png'
        })
    });
    
    const data = await response.json();
    console.log('Registration result:', data);
}

// Example 2: Login
async function loginExample() {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: 'example_user',
            password: 'securepassword123'
        })
    });
    
    const data = await response.json();
    console.log('Login result:', data);
}

// Example 3: Get current user
async function getCurrentUserExample() {
    const response = await fetch('/api/auth/user', {
        method: 'GET',
        credentials: 'include'
    });
    
    const data = await response.json();
    console.log('Current user:', data);
}

// Example 4: Update user profile
async function updateUserExample() {
    const response = await fetch('/api/auth/user', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
            email: 'newemail@example.com',
            imageUrl: '/img/new-avatar.png'
        })
    });
    
    const data = await response.json();
    console.log('Update result:', data);
}

// Example 5: Logout
async function logoutExample() {
    const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
    });
    
    const data = await response.json();
    console.log('Logout result:', data);
}

// Using the AuthService class (recommended)
import AuthService from '/utils/user.js';

// Register
await AuthService.register({
    username: 'newuser',
    password: 'password123',
    email: 'user@example.com'
});

// Login
await AuthService.login({
    username: 'example_user',
    password: 'securepassword123'
});

// Get current user
const user = await AuthService.getUser();

// Update user
await AuthService.updateUser({
    email: 'newemail@example.com'
});

// Logout
await AuthService.logout();
