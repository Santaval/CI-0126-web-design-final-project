import AuthService from "/utils/user.js";

// Loads the navbar partial into any element with `data-include="navbar"`.
document.addEventListener('DOMContentLoaded', () => {
  const targets = document.querySelectorAll('[data-include="navbar"]');
  if (!targets.length) return;

  fetch('/components/navbar/navbar.html')
    .then(res => {
      if (!res.ok) throw new Error('Navbar not found');
      return res.text();
    })
    .then(html => {
      targets.forEach(t => t.innerHTML = html);
      // update nav after injection
      updateNavForTargets(targets);
    })
    .catch(err => {
      console.warn('Could not load navbar partial:', err);
      // Include a right-nav placeholder so updateNavForTargets can find it
      targets.forEach(t => {
        t.innerHTML = `
          <nav class="site-nav">
            <a href="/">Home</a>
            <div class="right-nav"></div>
          </nav>
        `;
      });
      updateNavForTargets(targets);
    });
});



async function updateNavForTargets(targets) {
  const user = await AuthService.getUser();
  targets.forEach(t => {
    const right = t.querySelector('.right-nav');
    if (!right) return;
    if (user) {
      right.innerHTML = `
        <a class="secondary-button" href="/auth/profile">Profile</a>
        <a class="primary-button" href="/auth/logout">Logout</a>
      `;
    } else {
      right.innerHTML = `
        <a class="secondary-button" href="/auth/register">Register</a>
        <a class="primary-button" href="/auth/login">Login</a>
      `;
    }
  });
}
