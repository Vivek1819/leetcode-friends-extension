document.addEventListener('DOMContentLoaded', () => {
  const checkbox = document.getElementById('theme-toggle');
  const body = document.body;

  // Theme toggle logic
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

  // Sign-in logic
  const openBtn = document.getElementById('open-leetcode');
  const verifyBtn = document.getElementById('verify-btn');
  const profileInput = document.getElementById('profile-url');
  const statusText = document.getElementById('status');

  openBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://leetcode.com' });
  });

  verifyBtn.addEventListener('click', () => {
    const url = profileInput.value.trim();
    if (!url.startsWith('https://leetcode.com/') || url.split('/').length < 4) {
      statusText.textContent = '⚠️ Please enter a valid LeetCode profile URL';
      return;
    }

    const username = url.split('/')[3].replace(/[^a-zA-Z0-9_-]/g, '');
    statusText.textContent = `✅ Username verified: ${username}`;
  });
});
