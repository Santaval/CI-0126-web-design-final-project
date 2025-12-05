import AuthService from "/utils/user.js";

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

const loginForm = $('#login-form');

loginForm.addEventListener('submit', handleSubmit);

async function handleSubmit(event) {
    event.preventDefault();
    
    // Remove any existing error messages
    const existingError = loginForm.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }

    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Disable submit button to prevent double submission
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Logging in...';
    
    await login(data, submitButton);
}

async function login(data, submitButton) {
    try {
        // Call the backend API through AuthService
        const user = await AuthService.login(data);
        
        console.log('Login successful:', user);
        
        // Redirect to home page on success
        window.location.href = '/';
    } catch (error) {
        console.error('Login error:', error);
        
        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.textContent = 'Login';
        
        // Display error message to user
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.style.color = '#ff6b6b';
        errorMessage.style.marginTop = '10px';
        errorMessage.style.padding = '10px';
        errorMessage.style.borderRadius = '4px';
        errorMessage.style.backgroundColor = 'rgba(255, 107, 107, 0.1)';
        errorMessage.textContent = error.message || 'Invalid username or password. Please try again.';
        
        loginForm.appendChild(errorMessage);
        
        // Auto-remove error message after 5 seconds
        setTimeout(() => {
            errorMessage.remove();
        }, 5000);
    }
}














