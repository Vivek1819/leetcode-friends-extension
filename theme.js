// Theme initialization script
chrome.storage.local.get(['theme'], function(result) {
  const savedTheme = result.theme || 'light';
  document.documentElement.classList.add(savedTheme);
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
  }
});
