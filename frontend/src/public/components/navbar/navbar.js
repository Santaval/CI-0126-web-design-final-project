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
      targets.forEach(t => {
        t.innerHTML = html;
      });
    })
    .catch(err => {
      // Fallback: write a simple nav so the site remains navigable
      console.warn('Could not load navbar partial:', err);
      targets.forEach(t => {
        t.innerHTML = '<nav class="site-nav"><a href="/">Home</a></nav>';
      });
    });
});
