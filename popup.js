chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];

  if (!tab || !tab.url || !tab.url.includes("leetcode.com")) {
    document.body.innerHTML = `
      <div style="text-align:center; padding:10px;">
        <img src="public/leetcode.png" width="50" />
        <p style="font-size:14px;">Please visit <b>leetcode.com</b> to use this extension.</p>
      </div>
    `;
    return;
  }

  chrome.storage.local.get("leetcodeUsername", (data) => {
    const username = data.leetcodeUsername;

    if (!username) {
      document.body.innerHTML = `
        <div style="text-align:center; padding:10px;">
          <p style="font-size:14px;">Please <b>sign in</b> to LeetCode.</p>
        </div>
      `;
    } else {
      const apiBaseUrl = "http://localhost:5000/api/users";

      fetch(`${apiBaseUrl}/${username}`)
        .then(async (response) => {
          if (response.status === 200) {
            document.body.innerHTML = `
        <div style="text-align:center; padding:10px;">
          <p style="font-size:14px;">Welcome back, <b>${username}</b>!</p>
        </div>
      `;
          } else if (response.status === 404) {
            document.body.innerHTML = `
        <div style="text-align:center; padding:10px;">          <p style="font-size:14px;">Hello <b>${username}</b>! You're not registered yet.</p>
          <button id="register-btn">
            <span style="display:flex; align-items:center; justify-content:center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
              Register Now
            </span>
          </button>
        </div>
      `;

            document
              .getElementById("register-btn")
              .addEventListener("click", () => {
                fetch(`${apiBaseUrl}/register`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ username }),
                })
                  .then((res) => res.json())
                  .then(() => {
                    alert("Registered successfully!");
                    window.location.reload();
                  })
                  .catch(() => alert("Registration failed"));
              });
          } else {
            throw new Error("Unexpected response");
          }
        })
        .catch((err) => {
          console.error("API check failed", err);
          document.body.innerHTML = `
      <div style="text-align:center; padding:10px;">
        <p style="font-size:14px; color:red;">Couldn't verify user. Try again later.</p>
      </div>
    `;
        });
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const checkbox = document.getElementById("theme-toggle");
  const body = document.body;

  // Theme toggle logic
  checkbox.checked = body.classList.contains("dark");
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      body.classList.add("dark");
      body.classList.remove("light");
    } else {
      body.classList.add("light");
      body.classList.remove("dark");
    }
  });
});
