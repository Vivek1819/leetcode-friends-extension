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

  const getUsernameFromPage = () => {
    return new Promise((resolve) => {
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          function: () => {
            const avatarImg = document.querySelector(
              'img[src*="leetcode.com/users/"]'
            );
            if (avatarImg && avatarImg.src) {
              const match = avatarImg.src.match(/users\/([^/]+)\/avatar/);
              return match ? match[1] : null;
            }
            return null;
          },
        },
        (results) => {
          if (results && results[0] && results[0].result) {
            const username = results[0].result;
            chrome.storage.local.set({ leetcodeUsername: username }, () => {
              console.log("Username stored from page:", username);
              resolve(username);
            });
          } else {
            resolve(null);
          }
        }
      );
    });
  };

  const registerUser = async (username) => {
    try {
      const response = await fetch(
        `${window.LeetCodeFriendsConfig.API_BASE_URL}/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        }
      );

      if (response.status === 201) {
        const data = await response.json();
        console.log("User registered:", data);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Registration error:", error);
      return false;
    }
  };

  const checkUserExists = async (username) => {
    try {
      const response = await fetch(
        `${window.LeetCodeFriendsConfig.API_BASE_URL}/${username}`
      );
      return response.status === 200;
    } catch (error) {
      console.error("Error checking user:", error);
      return false;
    }
  };
  /**
   * Navigate to submissions page to start scraping
   * @param {boolean} fullScan - If true, perform a full scan ignoring previous checkpoints
   */
  const startScraping = (fullScan = false) => {
    const scrapeUrl =
      window.LeetCodeFriendsConfig.SUBMISSIONS_PAGE_URL +
      "#/1?scrape=true" +
      (fullScan ? "&full=true" : "");

    chrome.tabs.update(tab.id, { url: scrapeUrl });
    window.close();
  };

  const initializePopup = async () => {
    chrome.storage.local.get(
      ["leetcodeUsername", "lastSubmissionSync", "submissionCount"],
      async (data) => {
        let username = data.leetcodeUsername;
        const { lastSubmissionSync, submissionCount } = data;

        if (!username) {
          username = await getUsernameFromPage();
        }

        if (!username) {
          document.body.innerHTML = `
          <div style="text-align:center; padding:10px;">
            <p style="font-size:14px;">Please <b>sign in</b> to LeetCode.</p>
          </div>
        `;
          return;
        }

        const userExists = await checkUserExists(username);

        if (userExists) {
          let syncInfo = "";
          if (lastSubmissionSync) {
            const syncDate = new Date(lastSubmissionSync);
            syncInfo = `
            <div class="sync-info">
              <p>Last sync: ${syncDate.toLocaleString()}</p>
              <p>${submissionCount || 0} submissions tracked</p>
            </div>
          `;
          }

          document.body.innerHTML = `
          <div style="text-align:center; padding:10px;">            <p style="font-size:14px;">Welcome back, <b>${username}</b>!</p>
            ${syncInfo}
            <button id="sync-btn" class="primary-btn">Quick Sync</button>
            <div style="margin-top: 8px; text-align: center;">
              <a href="#" id="full-sync-btn" style="font-size: 12px; color: #0070f3; text-decoration: underline;">
                Perform Full Scan
              </a>
            </div>
          </div>
        `;

          document
            .getElementById("sync-btn")
            .addEventListener("click", () => startScraping(false));
          document
            .getElementById("full-sync-btn")
            .addEventListener("click", () => startScraping(true));
        } else {
          document.body.innerHTML = `
          <div style="text-align:center; padding:10px;">
            <p style="font-size:14px;">Hello <b>${username}</b>! You're not registered yet.</p>
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
            .addEventListener("click", async () => {
              const registerSuccess = await registerUser(username);
              if (registerSuccess) {
                startScraping();
              } else {
                alert("Registration failed. Please try again.");
              }
            });
        }
      }
    );
  };
  initializePopup();
});

document.addEventListener("DOMContentLoaded", () => {
  const checkbox = document.getElementById("theme-toggle");
  if (checkbox) {
    const body = document.body;
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
  }
});
