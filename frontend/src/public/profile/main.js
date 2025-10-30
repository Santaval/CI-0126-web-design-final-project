const $ = (selector) => document.querySelector(selector);

const form = $('#profile-form');
const profileImageInput = $('#profile-input');
const usernameInput = $('#username');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(form);

  if (profileImageInput.files.length > 0) {
    formData.append('profileImage', profileImageInput.files[0]);
  }

  try {
    // log data for debugging
    for (let [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }

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
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Fetch existing profile data from server (mocked here)
    const existingProfile = {
      username: 'JohnDoe',
      profileImageUrl: 'https://via.placeholder.com/150'
    };

    // Populate form fields with existing data
    usernameInput.value = existingProfile.username;
    const previewImage = $('#profile-preview');
    previewImage.src = existingProfile.profileImageUrl;
    previewImage.style.display = 'block';

  } catch (error) {
    console.error('Error loading profile data:', error);
  }
});