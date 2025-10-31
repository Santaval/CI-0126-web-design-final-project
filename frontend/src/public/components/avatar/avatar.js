import AuthService from "/utils/user.js";

// Loads the avatar partial into any element with `data-include="avatar"`.
document.addEventListener('DOMContentLoaded', () => {
  const targets = document.querySelectorAll('[data-include="avatar"]');
  if (!targets.length) return;

  fetch('/components/avatar/avatar.html')
    .then(res => {
      if (!res.ok) throw new Error('Avatar not found');
      return res.text();
    })
    .then(html => {
      targets.forEach(t => t.innerHTML = html);
      // update nav after injection
      renderProfileImg(targets);
    })
    .catch(err => {
      console.warn('Could not load avatar partial:', err);
      // Include a right-nav placeholder so renderProfileImg can find it
      targets.forEach(t => {
        t.innerHTML = `
            <img src="/img/default-profile.png" alt="User Avatar" class="avatar-image">
        `;
      });
      renderProfileImg(targets);
    });
});


async function renderProfileImg(targets) {
  const user = await AuthService.getUser();
  targets.forEach(t => {
    const img = t.querySelector('.avatar');
    if (!img) return;
    if (user) {
      img.src = user.avatar || '/img/default-profile.png';
    } else {
      img.src = '/img/default-profile.png';
    }
  });
}
