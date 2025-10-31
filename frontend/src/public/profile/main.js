import AuthService from "/utils/user.js";

document.addEventListener('DOMContentLoaded', async () => {
const $ = (selector) => document.querySelector(selector);

const form = $('#profile-form');
const profileImageInput = $('#profile-input');
const usernameInput = $('#username');
const logoutButton = $('#logout-button');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(form);

  if (profileImageInput.files.length > 0) {
    formData.append('profileImage', profileImageInput.files[0]);
  }

  try {
    const user = await AuthService.getUser();
    const updatedData = {
      id: user.id,
      username: formData.get('username'),
      profileImageUrl: formData.get('profileImage')
        ? URL.createObjectURL(formData.get('profileImage'))
        : user.profileImageUrl,
    };

    await AuthService.updateUser(updatedData);
    // window.location.href = '/profile';

  } catch (error) {
    console.error('Error submitting profile form:', error);
  }
});

function updatePreviewImage(event) {
  const file = event.target.files[0];
  const previewImage = $('#profile-preview');

  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      previewImage.src = e.target.result;
      previewImage.style.display = 'block';
    };
    reader.readAsDataURL(file);
  } else {
    previewImage.src = '';
    previewImage.style.display = 'none';
  }
}

profileImageInput.addEventListener('change', updatePreviewImage);


// Load existing profile data
  try {
    // Fetch existing profile data from server (mocked here)
    const user = await AuthService.getUser();
    // Populate form fields with existing data
    usernameInput.value = user.username;
    const previewImage = $('#profile-preview');
    previewImage.src = user.profileImageUrl;
    previewImage.style.display = 'block';

  } catch (error) {
    console.error('Error loading profile data:', error);
  }

  console.log(logoutButton  );
  logoutButton.addEventListener('click', async () => {
    try {
      await AuthService.logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Error during logout:', error);
    }
  });
});
