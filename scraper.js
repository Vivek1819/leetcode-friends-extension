const parseSubmissionsPage = () => {
  const submissions = [];

  const submissionApp = document.getElementById("submission-list-app");
  if (submissionApp) {
    console.log("Found submission-list-app container");
  }

  const tableCandidates = [
    document.querySelector(
      "table.table.table-striped.table-bordered.table-hover"
    ),
    document.querySelector("#submission-list-app table"),
    document.querySelector("table.table"),
    document.querySelector("table"),
  ];

  const table = tableCandidates.find((t) => t !== null);

  if (!table) {
    console.log(
      "Couldn't find the submissions table yet - waiting for it to load"
    );

    const allTables = document.querySelectorAll("table");
    console.log(
      `Found ${allTables.length} tables on page:`,
      Array.from(allTables).map((t) => t.className)
    );

    return submissions;
  }

  const submissionRows = table.querySelectorAll("tbody tr");
  console.log(`Found ${submissionRows.length} submission rows in table`);

  submissionRows.forEach((row, index) => {
    try {
      console.log(`Processing row ${index + 1}...`);

      const timeColumnElement = row.querySelector("td:nth-child(1)");
      const questionColumnElement = row.querySelector("td:nth-child(2) a");
      const statusColumnElement = row.querySelector("td:nth-child(3) a");
      const runtimeColumnElement = row.querySelector("td:nth-child(4)");
      const languageColumnElement = row.querySelector("td:nth-child(5)");

      if (timeColumnElement)
        console.log(`Time: ${timeColumnElement.textContent.trim()}`);
      if (questionColumnElement)
        console.log(`Question: ${questionColumnElement.textContent.trim()}`);
      if (statusColumnElement)
        console.log(`Status: ${statusColumnElement.className}`);

      if (!questionColumnElement || !statusColumnElement) {
        console.log(`Row ${index + 1}: Missing essential elements, skipping`);
        return;
      }

      const problemUrl = questionColumnElement.getAttribute("href");
      const problemSlugMatch = problemUrl
        ? problemUrl.match(/problems\/([^/]+)/)
        : null;
      const problemSlug = problemSlugMatch ? problemSlugMatch[1] : null;

      let submissionId = null;
      const submissionUrl = statusColumnElement.getAttribute("href");
      if (submissionUrl) {
        const submissionMatch = submissionUrl.match(
          /\/submissions\/detail\/(\d+)/
        );
        if (submissionMatch) submissionId = submissionMatch[1];
      }

      const problemTitle = questionColumnElement.textContent.trim();

      let status;
      const strongElement = statusColumnElement.querySelector("strong");
      if (strongElement) {
        status = strongElement.textContent.trim();
      } else {
        status = statusColumnElement.textContent.trim();
      }

      const isAccepted = statusColumnElement.classList.contains("text-success");
      if (isAccepted) {
        console.log(`Row ${index + 1}: Accepted solution`);
      }

      if (problemSlug && status) {
        submissions.push({
          problemSlug,
          problemTitle,
          status,
          submissionId,
          runtime: runtimeColumnElement
            ? runtimeColumnElement.textContent.trim()
            : null,
          language: languageColumnElement
            ? languageColumnElement.textContent.trim()
            : null,
          timestamp: timeColumnElement
            ? timeColumnElement.textContent.trim()
            : null,
        });
        console.log(
          `Added submission: ${problemTitle} - ${status} - ${submissionId}`
        );
      }
    } catch (error) {
      console.error("Error parsing submission row:", error);
    }
  });

  return submissions;
};

const navigateToNextPage = () => {
  const olderLink = document.querySelector("li.next a");

  if (olderLink) {
    console.log("Found 'Older' link, clicking to navigate to next page");
    olderLink.click();
    return true;
  }

  const noMoreText = document.querySelector("div.placeholder-text");
  if (noMoreText && noMoreText.textContent.includes("No more submissions")) {
    console.log("Reached the end of submissions - no more pages");
    return false;
  }

  const olderButton = Array.from(document.querySelectorAll("button, a")).find(
    (el) => el.textContent.includes("Older")
  );

  if (olderButton && !olderButton.disabled) {
    console.log("Clicking alternative 'Older' button to navigate");
    olderButton.click();
    return true;
  }

  console.log("No navigation elements found or reached the end of submissions");
  return false;
};

const sendSubmissionsToBackend = async (
  username,
  submissions,
  checkpointSubmissionId = null
) => {
  if (!username || !submissions || submissions.length === 0) {
    console.log("No data to send to backend");
    return;
  }

  try {
    const latestSubmissionId =
      checkpointSubmissionId ||
      (submissions.length > 0 ? submissions[0].submissionId : null);

    if (latestSubmissionId) {
      console.log(`Using submission ID for checkpoint: ${latestSubmissionId}`);
      if (checkpointSubmissionId) {
        console.log(`(Using checkpoint from first page)`);
      }
    }

    console.log(
      `Sending ${submissions.length} submissions to backend for ${username}...`
    );

    const response = await fetch(
      `${window.LeetCodeFriendsConfig.API_BASE_URL}/${username}/submissions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          submissions,
          latestSubmissionId,
        }),
      }
    );
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Backend response:`, data);

      chrome.storage.local.get(["submissionCount"], (result) => {
        const previousCount = result.submissionCount || 0;
        const newCount = previousCount + submissions.length;

        chrome.storage.local.set({
          submissionCount: newCount,
        });

        updateScrapingIndicator(newCount);
      });

      return data;
    } else {
      console.error("Failed to send submissions:", response.statusText);
    }
  } catch (error) {
    console.error("Error sending submissions:", error);
  }
};

/**
 * Start the submission scraping process
 *
 * @param {string} username - The LeetCode username to scrape submissions for
 * @param {boolean} forceFullScan - If true, ignore the checkpoint and scrape all submissions
 */

const startSubmissionScraping = async (username, forceFullScan = false) => {
  if (!username) {
    console.log("No username provided, aborting scraping");
    return;
  }

  console.log(
    `Starting submission scraping for ${username}${
      forceFullScan ? " (full scan)" : ""
    }`
  );

  window.forceFullScan = forceFullScan;

  chrome.storage.local.set({ submissionCount: 0 }, () => {
    console.log("Reset submission count for new scraping session");
  });

  if (!window.location.href.includes("/submissions/")) {
    console.log("Not on submissions page. Redirecting...");
    window.location.href =
      window.LeetCodeFriendsConfig.SUBMISSIONS_PAGE_URL + "#/1";
    return;
  }

  const addScrapingIndicator = () => {
    const existingIndicator = document.getElementById(
      "leetcode-friends-scraping"
    );
    if (existingIndicator) return;

    const indicator = document.createElement("div");
    indicator.id = "leetcode-friends-scraping";
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 15px;
      background-color: #ffa116;
      color: white;
      border-radius: 4px;
      z-index: 9999;
      font-size: 14px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    indicator.innerHTML = `
      <div>LeetCode Friends</div>
      <div style="font-size: 12px; margin-top: 5px;">Scanning submissions...</div>
    `;
    document.body.appendChild(indicator);

    chrome.storage.local.get(["submissionCount"], (data) => {
      const count = data.submissionCount || 0;
      const countElement = document.createElement("div");
      countElement.style.fontSize = "12px";
      countElement.style.marginTop = "5px";
      countElement.textContent = `Found ${count} submissions`;
      indicator.appendChild(countElement);
    });
  };

  addScrapingIndicator();

  const updateScrapingIndicator = (count) => {
    const indicator = document.getElementById("leetcode-friends-scraping");
    if (!indicator) return;

    const existingCountEl = Array.from(indicator.children).find(
      (el) => el.textContent && el.textContent.includes("Found")
    );

    if (existingCountEl) {
      existingCountEl.textContent = `Found ${count} submissions`;
    } else {
      const countElement = document.createElement("div");
      countElement.style.fontSize = "12px";
      countElement.style.marginTop = "5px";
      countElement.textContent = `Found ${count} submissions`;
      indicator.appendChild(countElement);
    }
  };

  window.updateScrapingIndicator = updateScrapingIndicator;

  chrome.storage.local.get(
    ["scrapingCompleted", "scrapingCompletedAt"],
    (data) => {
      if (data.scrapingCompleted && data.scrapingCompletedAt) {
        const lastScan = new Date(data.scrapingCompletedAt);
        const now = new Date();
        const hoursSinceLastScan = (now - lastScan) / (1000 * 60 * 60);
      }
      if (forceFullScan) {
        console.log("Force full scan requested - will ignore checkpoint");
      }

      setupNavigationHandlers(username);

      console.log(
        "Scraper initialized and ready to process all submissions pages"
      );
    }
  );
};

const setupNavigationHandlers = (username) => {
  let currentPage = 1;
  let isProcessing = false;
  let retryCount = 0;
  const MAX_RETRIES = 3;
  let lastScrapedSubmissionId = null;
  let latestSubmissionId = null;

  const initScraper = async () => {
    if (window.forceFullScan) {
      console.log("Force full scan requested - skipping checkpoint retrieval");
      startProcessing();
    } else {
      try {
        const response = await fetch(
          `${window.LeetCodeFriendsConfig.API_BASE_URL}/${username}/checkpoint`
        );
        const data = await response.json();

        if (data && data.lastScrapedSubmissionId) {
          lastScrapedSubmissionId = data.lastScrapedSubmissionId;
          console.log(
            `Retrieved checkpoint from database: ${lastScrapedSubmissionId}`
          );
        } else {
          console.log(
            "No checkpoint found in database, will scrape all submissions"
          );
        }
      } catch (error) {
        console.error("Error fetching checkpoint from backend:", error);
        console.log(
          "Will scrape all submissions due to error fetching checkpoint"
        );
      }

      startProcessing();
    }
  };

  const startProcessing = () => {
    console.log("Starting submission processing...");
    setTimeout(() => {
      processAndNavigate();
    }, 3000);
  };

  const processAndNavigate = async () => {
    if (isProcessing) return;
    isProcessing = true;

    try {
      console.log(`Processing page ${currentPage} of submissions`);

      const loadingIndicator =
        document.querySelector(".ant-spin-spinning") ||
        document.querySelector(".ant-spin") ||
        document.querySelector('[role="progressbar"]');

      if (loadingIndicator) {
        console.log("Page is still loading. Waiting for content...");
        setTimeout(() => {
          isProcessing = false;
          processAndNavigate();
        }, 1500);
        return;
      }

      const noMoreText = document.querySelector("div.placeholder-text");
      if (
        noMoreText &&
        noMoreText.textContent.includes("No more submissions")
      ) {
        console.log("🏁 Finished scraping - no more submissions found");

        chrome.storage.local.get(["submissionCount"], (result) => {
          const finalCount = result.submissionCount || 0;
          console.log(`Final submission count for this session: ${finalCount}`);

          chrome.storage.local.set({
            scrapingCompleted: true,
            scrapingCompletedAt: new Date().toISOString(),
            finalSubmissionCount: finalCount,
          });
        });

        return;
      }
      const submissions = parseSubmissionsPage();
      if (submissions.length > 0) {
        retryCount = 0;
        const indicator = document.getElementById("leetcode-friends-scraping");
        if (indicator) {
          const retryMsg = Array.from(indicator.children).find(
            (el) => el.textContent && el.textContent.includes("Retrying")
          );
          if (retryMsg) {
            indicator.removeChild(retryMsg);
          }
        }

        if (currentPage === 1 && submissions[0].submissionId) {
          latestSubmissionId = submissions[0].submissionId;
          console.log(
            `📍 Set latest submission ID as checkpoint: ${latestSubmissionId}`
          );
        }
        if (lastScrapedSubmissionId) {
          console.log(
            `Looking for checkpoint submission ID: ${lastScrapedSubmissionId}`
          );
          console.log(
            `Current page submission IDs: ${submissions
              .map((s) => s.submissionId)
              .join(", ")}`
          );
          console.log(
            `Note: Submissions are ordered from newest to oldest, so checking if page has submissions newer than checkpoint...`
          );
          const checkpointId = String(lastScrapedSubmissionId);

          const checkpointIndex = submissions.findIndex((sub) => {
            const subId = String(sub.submissionId);
            const matches = subId === checkpointId;
            if (matches) {
              console.log(
                `Match found! Submission ${subId} matches checkpoint ${checkpointId}`
              );
            }
            return matches;
          });

          if (checkpointIndex !== -1) {
            console.log(
              `Found checkpoint submission ${lastScrapedSubmissionId} at position ${
                checkpointIndex + 1
              } of ${submissions.length}`
            );

            if (checkpointIndex > 0) {
              const newSubmissions = submissions.slice(0, checkpointIndex);
              console.log(
                `Processing ${newSubmissions.length} new submissions from this page before the checkpoint`
              );

              if (newSubmissions.length > 0) {
                await sendSubmissionsToBackend(
                  username,
                  newSubmissions,
                  latestSubmissionId
                );
              }
            }

            console.log(
              `🏁 Processed all submissions up to checkpoint ${lastScrapedSubmissionId}, stopping scan`
            );

            chrome.storage.local.get(["submissionCount"], (result) => {
              const finalCount = result.submissionCount || 0;
              console.log(
                `Final submission count for this session: ${finalCount}`
              );

              chrome.storage.local.set({
                scrapingCompleted: true,
                scrapingCompletedAt: new Date().toISOString(),
                finalSubmissionCount: finalCount,
              });
            });

            return;
          }
        }

        await sendSubmissionsToBackend(
          username,
          submissions,
          latestSubmissionId
        );

        const olderLink = document.querySelector("li.next a");
        if (olderLink) {
          currentPage++;
          console.log(`Navigating to page ${currentPage}`);
          olderLink.click();

          setTimeout(() => {
            isProcessing = false;
            processAndNavigate();
          }, 3000);
        } else {
          console.log("🏁 Finished scraping - no more pages found");

          chrome.storage.local.get(["submissionCount"], (result) => {
            const finalCount = result.submissionCount || 0;
            console.log(
              `Final submission count for this session: ${finalCount}`
            );

            chrome.storage.local.set({
              scrapingCompleted: true,
              scrapingCompletedAt: new Date().toISOString(),
              finalSubmissionCount: finalCount,
            });
          });
        }
      } else {
        console.log("No submissions found on this page");
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(
            `Retry attempt ${retryCount}/${MAX_RETRIES} - waiting for page to fully load`
          );

          const indicator = document.getElementById(
            "leetcode-friends-scraping"
          );
          if (indicator) {
            // Check for existing retry message element
            const existingRetryMsg = Array.from(indicator.children).find(
              (el) => el.textContent && el.textContent.includes("Retrying")
            );

            if (existingRetryMsg) {
              // Update existing message
              existingRetryMsg.textContent = `Retrying (${retryCount}/${MAX_RETRIES})...`;
            } else {
              // Create new message element if none exists
              const retryMsg = document.createElement("div");
              retryMsg.style.fontSize = "12px";
              retryMsg.textContent = `Retrying (${retryCount}/${MAX_RETRIES})...`;
              retryMsg.id = "retry-message";
              indicator.appendChild(retryMsg);
            }
          }

          setTimeout(() => {
            isProcessing = false;
            processAndNavigate();
          }, 3000);
        } else {
          console.log("Max retries reached, moving to next page or ending");
          retryCount = 0;

          // Remove retry message if it exists
          const indicator = document.getElementById(
            "leetcode-friends-scraping"
          );
          if (indicator) {
            const retryMsg = Array.from(indicator.children).find(
              (el) => el.textContent && el.textContent.includes("Retrying")
            );
            if (retryMsg) {
              indicator.removeChild(retryMsg);
            }
          }

          const olderLink = document.querySelector("li.next a");
          if (olderLink) {
            currentPage++;
            console.log(
              `Moving to page ${currentPage} despite no submissions found`
            );
            olderLink.click();
            setTimeout(() => {
              isProcessing = false;
              processAndNavigate();
            }, 3000);
          } else {
            console.log("No more pages to navigate to, ending scraper");

            chrome.storage.local.get(["submissionCount"], (result) => {
              const finalCount = result.submissionCount || 0;
              console.log(
                `Final submission count for this session: ${finalCount}`
              );

              chrome.storage.local.set({
                scrapingCompleted: true,
                scrapingCompletedAt: new Date().toISOString(),
                finalSubmissionCount: finalCount,
              });
            });
          }
        }
      }
    } catch (error) {
      console.error("Error during page processing:", error);
      isProcessing = false;
    }
  };

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target.closest("li.next a") || event.target;
      const isOlderNavigation =
        target.closest("li.next") ||
        (target.textContent || "").includes("Older");

      if (isOlderNavigation) {
        console.log("Navigation event detected");
      }
    },
    true
  );

  const contentObserver = new MutationObserver((mutations) => {
    const significantChanges = mutations.some((mutation) => {
      return (
        mutation.target.tagName === "TABLE" ||
        (mutation.target.className &&
          (mutation.target.className.includes("pagination") ||
            mutation.target.className.includes("table")))
      );
    });

    if (significantChanges && !isProcessing) {
      setTimeout(() => {
        processAndNavigate();
      }, 1000);
    }
  });

  const container =
    document.querySelector("main") ||
    document.querySelector(".container") ||
    document.body;

  contentObserver.observe(container, { childList: true, subtree: true });
  console.log("Set up observers for page navigation");
  console.log("Initializing scraper...");
  initScraper();
};

window.LeetCodeScraper = {
  startSubmissionScraping,
  parseSubmissionsPage,
  navigateToNextPage,
  sendSubmissionsToBackend,
};
