document.addEventListener('DOMContentLoaded', () => {
  const checkbox = document.getElementById('theme-toggle');
  const body = document.body;

  checkbox.checked = body.classList.contains('dark');

  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      body.classList.add('dark');
      body.classList.remove('light');
    } else {
      body.classList.add('light');
      body.classList.remove('dark');
    }
  });
});
