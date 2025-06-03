chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (!tab || !tab.url || !tab.url.includes("leetcode.com")) {
    document.querySelector(".content").innerHTML = `
      <div style="text-align:center; padding:10px;">
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
            const username = results[0].result;            chrome.storage.local.set({ leetcodeUsername: username }, () => {
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
          document.querySelector(".content").innerHTML = `
          <div style="text-align:center; padding:10px;">
            <p style="font-size:14px; margin-bottom:15px;">Please <b>sign in</b> to LeetCode.</p>
          </div>
        `;
          return;
        }        const userExists = await checkUserExists(username);
        if (userExists) {
          let syncInfo = "";
          if (lastSubmissionSync) {
            const syncDate = new Date(lastSubmissionSync);
          }
          
          // Fetch friends list
          const fetchFriends = async () => {
            try {
              const response = await fetch(
                window.LeetCodeFriendsConfig.FRIENDS_API.GET_FRIENDS(username)
              );
              if (response.ok) {
                return await response.json();
              }
              return { friends: [] };
            } catch (error) {
              console.error("Error fetching friends:", error);
              return { friends: [] };
            }          };
          
          // Initial UI render
          const renderUI = async () => {
            const friendsData = await fetchFriends();
            console.log(friendsData.friends);
            const friendsList = friendsData.friends || [];

            document.querySelector(".content").innerHTML = `
            <div class="welcome-section">
              <p>Welcome back, <b>${username}</b>!</p>
            </div>
            
            <!-- Tab Navigation -->
            <div class="tab-navigation">
              <button id="sync-tab" class="tab-button active">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
                  <polyline points="16 16 12 12 8 16"></polyline>
                </svg>
                Sync
              </button>
              <button id="friends-tab" class="tab-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                Friends (${friendsList.length})
              </button>
            </div>
            
            <!-- Tab Content -->
            <div class="tab-content">
              <!-- Sync Tab (Default Active) -->
              <div id="sync-content" class="tab-pane active">
                <div class="sync-buttons">
                  <button id="sync-btn" class="primary-btn">
                    <span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="16 16 12 12 8 16"></polyline>
                        <line x1="12" y1="12" x2="12" y2="21"></line>
                        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
                      </svg>
                      Quick Sync
                    </span>
                  </button>
                  <button id="full-sync-btn" class="secondary-btn">
                    <span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="1 4 1 10 7 10"></polyline>
                        <polyline points="23 20 23 14 17 14"></polyline>
                        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                      </svg>
                      Full Scan
                    </span>
                  </button>
                </div>
              </div>
              
              <!-- Friends Tab -->
              <div id="friends-content" class="tab-pane">
                <div class="friends-container">
                  <!-- Search and Add Friend -->
                  <div class="friend-search">
                    <div class="search-input-container">
                      <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                      <input type="text" id="friend-username" placeholder="Find or add friend...">
                    </div>
                    <button id="add-friend-btn" class="add-btn">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      Add
                    </button>
                  </div>
                    <!-- Friends List with Stats -->
                  <div class="friends-list">
                    ${
                      friendsList.length > 0
                        ? friendsList
                            .map(
                              (friend) => `
                        <div class="friend-card">
                          <div class="friend-info">
                            <div class="friend-avatar">
                              <img src="https://leetcode.com/uploads/default_avatar.png" alt="${friend.username}" class="friend-avatar-img" data-fallback="public/leetcode.png">
                            </div>
                            <div class="friend-details">
                              <span class="friend-name">${friend.username}</span>
                              <span class="friend-stats">${friend.solvedProblems ? `${friend.solvedProblems.length} problems solved` : 'Loading stats...'}</span>
                            </div>
                          </div>
                          <div class="friend-actions">
                            <button class="view-profile-btn" data-username="${friend.username}">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                            <button class="remove-friend" data-username="${friend.username}">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </div>
                        </div>
                      `
                            )
                            .join("")
                        : '<div class="empty-state"><p>No friends yet</p><p class="empty-suggestion">Add friends to see their LeetCode progress!</p></div>'
                    }
                  </div>
                </div>
              </div>
            </div>
          `;
            // Tab navigation event listeners
            document
              .getElementById("sync-tab")
              .addEventListener("click", () => {
                document.getElementById("sync-tab").classList.add("active");
                document
                  .getElementById("friends-tab")
                  .classList.remove("active");
                document.getElementById("sync-content").classList.add("active");
                document
                  .getElementById("friends-content")
                  .classList.remove("active");
              });

            document
              .getElementById("friends-tab")
              .addEventListener("click", () => {
                document.getElementById("friends-tab").classList.add("active");
                document.getElementById("sync-tab").classList.remove("active");
                document
                  .getElementById("friends-content")
                  .classList.add("active");
                document
                  .getElementById("sync-content")
                  .classList.remove("active");
              });

            // Sync button event listeners
            document
              .getElementById("sync-btn")
              .addEventListener("click", () => startScraping(false));
            document
              .getElementById("full-sync-btn")
              .addEventListener("click", () => startScraping(true));

            // Friend management event listeners
            document
              .getElementById("add-friend-btn")
              .addEventListener("click", addFriend);            // Add event listeners for remove buttons
            document.querySelectorAll(".remove-friend").forEach((button) => {
              button.addEventListener("click", (e) => {
                const friendUsername =
                  e.currentTarget.getAttribute("data-username");
                removeFriend(friendUsername);
              });
            });

            // View profile buttons
            document.querySelectorAll(".view-profile-btn").forEach((button) => {
              button.addEventListener("click", (e) => {
                const friendUsername =
                  e.currentTarget.getAttribute("data-username");
                chrome.tabs.create({
                  url: `https://leetcode.com/${friendUsername}/`,
                });
              });
            });
          };

          // Add friend function
          const addFriend = async () => {
            const friendInput = document.getElementById("friend-username");
            const friendUsername = friendInput.value.trim();

            if (!friendUsername) return;

            // Add loading state
            const addButton = document.getElementById("add-friend-btn");
            const originalButtonText = addButton.innerHTML;
            addButton.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
            `;
            addButton.disabled = true;
            
            try {
              const response = await fetch(
                window.LeetCodeFriendsConfig.FRIENDS_API.ADD_FRIEND(username),
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    friendUsername: friendUsername,
                  }),
                }
              );

              if (response.ok) {
                friendInput.value = "";

                // Show success indicator
                addButton.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                `;

                // Reset button after a short delay
                setTimeout(() => {
                  addButton.innerHTML = originalButtonText;
                  addButton.disabled = false;
                  renderUI(); // Refresh UI
                }, 1000);
              } else {
                try {
                  const errorData = await response.json();
                  addButton.innerHTML = originalButtonText;
                  addButton.disabled = false;
                  alert(errorData.message || "Failed to add friend");
                } catch (jsonError) {
                  // If response is not valid JSON
                  addButton.innerHTML = originalButtonText;
                  addButton.disabled = false;
                  alert(
                    "Server error: API is unavailable or returned an invalid response"
                  );
                }
              }
            } catch (error) {
              console.error("Error adding friend:", error);
              addButton.innerHTML = originalButtonText;
              addButton.disabled = false;
              alert(
                "Error connecting to the API. Make sure your server is running at " +
                  window.LeetCodeFriendsConfig.API_BASE_URL
              );
            }          };
          
          // Remove friend function
          const removeFriend = async (friendUsername) => {
            if (confirm(`Remove ${friendUsername} from your friends?`)) {
              try {
                const response = await fetch(
                  window.LeetCodeFriendsConfig.FRIENDS_API.REMOVE_FRIEND(username),
                  {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      friendUsername: friendUsername
                    }),
                  }
                );
                if (response.ok) {
                  renderUI(); // Refresh UI
                } else {
                  try {
                    const errorData = await response.json();
                    alert(errorData.message || "Failed to remove friend");
                  } catch (jsonError) {
                    // If response is not valid JSON
                    alert(
                      "Server error: API is unavailable or returned an invalid response"
                    );
                  }
                }
              } catch (error) {
                console.error("Error removing friend:", error);
                alert(
                  "Error connecting to the API. Make sure your server is running at " +
                    window.LeetCodeFriendsConfig.API_BASE_URL
                );
              }
            }          };
          
          // Initialize the UI
          renderUI();
          
          // Function to set up image error handlers for avatar images
          const setupAvatarErrorHandlers = () => {
            document.querySelectorAll('.friend-avatar-img').forEach(img => {
              img.addEventListener('error', function() {
                const fallbackSrc = this.getAttribute('data-fallback');
                if (fallbackSrc) {
                  this.src = fallbackSrc;
                }
              });
            });
          };
          
          // Add a small delay to ensure DOM is ready before adding listeners
          setTimeout(setupAvatarErrorHandlers, 100);
        } else {
          document.querySelector(".content").innerHTML = `
          <div style="text-align:center; padding:10px;">
            <p style="font-size:14px; margin-bottom:15px;">Hello <b>${username}</b>! You're not registered yet.</p>
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
                startScraping();              } else {
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
  // Set up MutationObserver to watch for dynamically added friend images
  const observeFriendsContainer = () => {
    const friendsContainer = document.querySelector('.friends-list');
    if (friendsContainer) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            // Look for new images that were added
            document.querySelectorAll('.friend-avatar-img').forEach(img => {
              if (!img._hasErrorListener) {
                img.addEventListener('error', function() {
                  const fallbackSrc = this.getAttribute('data-fallback');
                  if (fallbackSrc) {
                    this.src = fallbackSrc;
                  }
                });
                // Mark this image as having an error listener
                img._hasErrorListener = true;
              }
            });
          }
        });
      });
      
      observer.observe(friendsContainer, { childList: true, subtree: true });
    }
  };
  
  // Try to observe immediately and also set a timeout to try again shortly
  observeFriendsContainer();
  setTimeout(observeFriendsContainer, 500);
  
  const checkbox = document.getElementById("theme-toggle");
  if (checkbox) {
    const body = document.body;

    chrome.storage.local.get(["theme"], function (result) {
      const savedTheme = result.theme || "light";

      if (savedTheme === "dark") {
        body.classList.add("dark");
        body.classList.remove("light");
        checkbox.checked = true;
      } else {
        body.classList.add("light");
        body.classList.remove("dark");
        checkbox.checked = false;
      }
    });

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        body.classList.add("dark");
        body.classList.remove("light");
        chrome.storage.local.set({ theme: "dark" });
      } else {
        body.classList.add("light");
        body.classList.remove("dark");
        chrome.storage.local.set({ theme: "light" });
      }
    });
  }
});
