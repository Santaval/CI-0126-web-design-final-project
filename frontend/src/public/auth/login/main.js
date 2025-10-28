import AuthService from "/utils/user.js";

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

const loginForm = $('#login-form');

loginForm.addEventListener('submit', handleSubmit);



async function handleSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    login(data);
}


async function login(data) {
    try {
        await AuthService.login(data);
        window.location.href = '/';
    } catch (error) {
        // append error message to form
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = 'Invalid username or password.';
        loginForm.appendChild(errorMessage);
    }
}














