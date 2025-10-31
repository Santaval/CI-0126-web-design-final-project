import AuthService from "/utils/user.js";

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

const registerForm = $('#register-form');

registerForm.addEventListener('submit', handleSubmit);



async function handleSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    registerUser(data);
}


async function registerUser(data) {
    try {
        await AuthService.register({
            ...data,
            profileImageUrl: '/img/default-profile.png'
        });
        window.location.href = '/';
    } catch (error) {
        console.error('Error registering user:', error);
    }
}














