import AuthService from "/utils/user.js";

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

const registerForm = $('#register-form');

registerForm.addEventListener('submit', handleSubmit);

async function handleSubmit(event) {
    event.preventDefault();
    
    // Remove any existing error/success messages
    const existingMessage = registerForm.querySelector('.error-message, .success-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Disable submit button to prevent double submission
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Registering...';
    
    await registerUser(data, submitButton);
}

async function registerUser(data, submitButton) {
    try {
        // Call the backend API through AuthService
        const user = await AuthService.register({
            ...data,
            profileImageUrl: '/img/default-profile.png'
        });
        
        console.log('Registration successful:', user);
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.style.color = '#51cf66';
        successMessage.style.marginTop = '10px';
        successMessage.style.padding = '10px';
        successMessage.style.borderRadius = '4px';
        successMessage.style.backgroundColor = 'rgba(81, 207, 102, 0.1)';
        successMessage.textContent = 'Registration successful! Redirecting...';
        
        registerForm.appendChild(successMessage);
        
        // Redirect to home page after a short delay
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
        
    } catch (error) {
        console.error('Error registering user:', error);
        
        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.textContent = 'Register';
        
        // Display error message to user
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.style.color = '#ff6b6b';
        errorMessage.style.marginTop = '10px';
        errorMessage.style.padding = '10px';
        errorMessage.style.borderRadius = '4px';
        errorMessage.style.backgroundColor = 'rgba(255, 107, 107, 0.1)';
        
        // Show specific error message from backend
        if (error.message.includes('already exists')) {
            errorMessage.textContent = 'Username already taken. Please choose a different username.';
        } else if (error.message.includes('required')) {
            errorMessage.textContent = 'Please fill in all required fields.';
        } else {
            errorMessage.textContent = error.message || 'Registration failed. Please try again.';
        }
        
        registerForm.appendChild(errorMessage);
        
        // Auto-remove error message after 5 seconds
        setTimeout(() => {
            errorMessage.remove();
        }, 5000);
    }
}














