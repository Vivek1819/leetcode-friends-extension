/**
 * LeetCode Submissions Scraper
 * 
 * This file contains the logic for scraping LeetCode submission data.
 */

// Use shared config from config.js
// API_BASE_URL and SUBMISSIONS_PAGE_URL constants are now defined in config.js

/**
 * Parse the submission data from a submission page DOM
 */
const parseSubmissionsPage = () => {
  const submissions = [];
  
  // Print the page structure for debugging
  console.log("Scanning DOM for submission table...");
  
  // First check if we have the submission-list-app container
  const submissionApp = document.getElementById('submission-list-app');
  if (submissionApp) {
    console.log("Found submission-list-app container");
  }
  
  // Look for the submissions table with multiple possible selectors
  const tableCandidates = [
    document.querySelector('table.table.table-striped.table-bordered.table-hover'),
    document.querySelector('#submission-list-app table'),
    document.querySelector('table.table'),
    document.querySelector('table')
  ];
  
  const table = tableCandidates.find(t => t !== null);
  
  if (!table) {
    console.log("Couldn't find the submissions table yet - waiting for it to load");
    
    // Log all tables found in the page for debugging
    const allTables = document.querySelectorAll('table');
    console.log(`Found ${allTables.length} tables on page:`, 
      Array.from(allTables).map(t => t.className));
      
    return submissions;
  }
  
  console.log(`Located table with class: ${table.className}`);
  
  const submissionRows = table.querySelectorAll('tbody tr');
  console.log(`Found ${submissionRows.length} submission rows in table`);
  
  submissionRows.forEach((row, index) => {
    try {
      console.log(`Processing row ${index + 1}...`);
      
      // Based on the provided HTML, columns are:
      // 1. Time Submitted
      // 2. Question (with link to problem)
      // 3. Status (with link to submission)
      // 4. Runtime
      // 5. Language
      
      const timeColumnElement = row.querySelector('td:nth-child(1)');
      const questionColumnElement = row.querySelector('td:nth-child(2) a');
      const statusColumnElement = row.querySelector('td:nth-child(3) a');
      const runtimeColumnElement = row.querySelector('td:nth-child(4)');
      const languageColumnElement = row.querySelector('td:nth-child(5)');
      
      // Log found elements
      if (timeColumnElement) console.log(`Time: ${timeColumnElement.textContent.trim()}`);
      if (questionColumnElement) console.log(`Question: ${questionColumnElement.textContent.trim()}`);
      if (statusColumnElement) console.log(`Status: ${statusColumnElement.className}`);
      
      // Skip if any essential elements are missing
      if (!questionColumnElement || !statusColumnElement) {
        console.log(`Row ${index + 1}: Missing essential elements, skipping`);
        return;
      }
      
      // Extract problem slug from href attribute
      const problemUrl = questionColumnElement.getAttribute('href');
      const problemSlugMatch = problemUrl ? problemUrl.match(/problems\/([^/]+)/) : null;
      const problemSlug = problemSlugMatch ? problemSlugMatch[1] : null;
      
      // Extract submission ID from the status link
      let submissionId = null;
      const submissionUrl = statusColumnElement.getAttribute('href');
      if (submissionUrl) {
        const submissionMatch = submissionUrl.match(/\/submissions\/detail\/(\d+)/);
        if (submissionMatch) submissionId = submissionMatch[1];
      }
      
      // Extract the problem title and status
      const problemTitle = questionColumnElement.textContent.trim();
      
      // Extract status, handling different possible structures
      let status;
      const strongElement = statusColumnElement.querySelector('strong');
      if (strongElement) {
        status = strongElement.textContent.trim();
      } else {
        // Backup: extract from the status column element itself
        status = statusColumnElement.textContent.trim();
      }
      
      // Check status class to determine if it's accepted
      const isAccepted = statusColumnElement.classList.contains('text-success');
      if (isAccepted) {
        console.log(`Row ${index + 1}: Accepted solution`);
      }
      
      // Only add if we have the essential data
      if (problemSlug && status) {
        submissions.push({
          problemSlug,
          problemTitle,
          status,
          submissionId,
          runtime: runtimeColumnElement ? runtimeColumnElement.textContent.trim() : null,
          language: languageColumnElement ? languageColumnElement.textContent.trim() : null,
          timestamp: timeColumnElement ? timeColumnElement.textContent.trim() : null
        });
        console.log(`Added submission: ${problemTitle} - ${status} - ${submissionId}`);
      }
    } catch (error) {
      console.error("Error parsing submission row:", error);
    }
  });
  
  return submissions;
};

/**
 * Navigate to the next submissions page
 */
const navigateToNextPage = () => {
  // Look for the "Older" button based on the actual DOM structure
  // <li class="next"><a href="#/2"><span aria-hidden="true">Older &nbsp;<i class="fa fa-chevron-circle-right" aria-hidden="true"></i></span></a></li>
  const olderLink = document.querySelector('li.next a');
  
  if (olderLink) {
    console.log("Found 'Older' link, clicking to navigate to next page");
    olderLink.click();
    return true;
  }
  
  // Look for the "No more submissions" message to detect last page
  const noMoreText = document.querySelector('div.placeholder-text');
  if (noMoreText && noMoreText.textContent.includes('No more submissions')) {
    console.log("Reached the end of submissions - no more pages");
    return false;
  }
  
  // Fallbacks for other possible navigation elements
  const olderButton = Array.from(document.querySelectorAll('button, a')).find(
    el => el.textContent.includes('Older')
  );
  
  if (olderButton && !olderButton.disabled) {
    console.log("Clicking alternative 'Older' button to navigate");
    olderButton.click();
    return true;
  }
  
  console.log("No navigation elements found or reached the end of submissions");
  return false;
};

/**
 * Send submissions to backend
 */
const sendSubmissionsToBackend = async (username, submissions) => {
  if (!username || !submissions || submissions.length === 0) {
    console.log("⚠️ No data to send to backend");
    return;
  }
  
  try {
    console.log(`📤 Sending ${submissions.length} submissions to backend for ${username}...`);
    
    const response = await fetch(`${window.LeetCodeFriendsConfig.API_BASE_URL}/${username}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ submissions }),
    });
      if (response.ok) {
      const data = await response.json();
      console.log(`✅ Backend response:`, data);
      
      // Get current submission count and add new submissions
      chrome.storage.local.get(['submissionCount'], (result) => {
        const previousCount = result.submissionCount || 0;
        const newCount = previousCount + submissions.length;
        
        // Store last sync timestamp and updated count
        chrome.storage.local.set({ 
          lastSubmissionSync: new Date().toISOString(),
          submissionCount: newCount
        });
        
        // Update the UI counter
        updateScrapingIndicator(newCount);
      });
      
      return data;
    } else {
      console.error('❌ Failed to send submissions:', response.statusText);
    }
  } catch (error) {
    console.error('❌ Error sending submissions:', error);
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
  
  console.log(`Starting submission scraping for ${username}${forceFullScan ? ' (full scan)' : ''}`);
    // Check if we're on the submissions page
  if (!window.location.href.includes('/submissions/')) {
    console.log("Not on submissions page. Redirecting...");
    window.location.href = window.LeetCodeFriendsConfig.SUBMISSIONS_PAGE_URL + '#/1';
    return;
  }
  
  // Show a visual indicator that scraping is in progress
  const addScrapingIndicator = () => {
    const existingIndicator = document.getElementById('leetcode-friends-scraping');
    if (existingIndicator) return;
    
    const indicator = document.createElement('div');
    indicator.id = 'leetcode-friends-scraping';
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
    
    // Update the indicator with progress
    chrome.storage.local.get(['submissionCount'], (data) => {
      const count = data.submissionCount || 0;
      const countElement = document.createElement('div');
      countElement.style.fontSize = '12px';
      countElement.style.marginTop = '5px';
      countElement.textContent = `Found ${count} submissions`;
      indicator.appendChild(countElement);
    });
  };
    // Add the indicator
  addScrapingIndicator();
  
  // Function to update the scraping indicator with the latest count
  const updateScrapingIndicator = (count) => {
    const indicator = document.getElementById('leetcode-friends-scraping');
    if (!indicator) return;
    
    // Look for existing count element
    const existingCountEl = Array.from(indicator.children).find(
      el => el.textContent && el.textContent.includes('Found')
    );
    
    if (existingCountEl) {
      // Update existing count element
      existingCountEl.textContent = `Found ${count} submissions`;
    } else {
      // Create new count element if it doesn't exist
      const countElement = document.createElement('div');
      countElement.style.fontSize = '12px';
      countElement.style.marginTop = '5px';
      countElement.textContent = `Found ${count} submissions`;
      indicator.appendChild(countElement);
    }
  };
  
  // Make the updateScrapingIndicator function available at the window level
  window.updateScrapingIndicator = updateScrapingIndicator;
  
  // Check if we recently completed a full scan
  chrome.storage.local.get(['scrapingCompleted', 'scrapingCompletedAt'], (data) => {
    if (data.scrapingCompleted && data.scrapingCompletedAt) {
      const lastScan = new Date(data.scrapingCompletedAt);
      const now = new Date();
      const hoursSinceLastScan = (now - lastScan) / (1000 * 60 * 60);
      
      if (hoursSinceLastScan < 12) {
        console.log(`Last complete scan was ${hoursSinceLastScan.toFixed(1)} hours ago`);
        const indicator = document.getElementById('leetcode-friends-scraping');
        if (indicator) {
          indicator.style.backgroundColor = '#4caf50';
          indicator.innerHTML = `
            <div>LeetCode Friends</div>
            <div style="font-size: 12px; margin-top: 5px;">
              Submissions are up-to-date<br>
              Last scan: ${lastScan.toLocaleTimeString()}
            </div>
          `;
          setTimeout(() => {
            indicator.style.opacity = '0';
            indicator.style.transition = 'opacity 1s';
            setTimeout(() => indicator.remove(), 1000);
          }, 5000);
        }
        return;
      }    }
    
    // If we're doing a forced full scan, clear the last submission ID
    if (forceFullScan) {
      console.log("Force full scan requested - clearing checkpoint");
      chrome.storage.local.remove("lastScrapedSubmissionId");
    }
    
    // Set up navigation to handle paging through all submission pages
    setupNavigationHandlers(username);
    
    console.log("Scraper initialized and ready to process all submissions pages");
  });
};

/**
 * Setup handlers for navigating through submission pages
 */
const setupNavigationHandlers = (username) => {
  let currentPage = 1;
  let isProcessing = false;
  let retryCount = 0;
  const MAX_RETRIES = 3;
  let lastScrapedSubmissionId = null; // Track the last submission ID we've seen before
  
  // Check if we have a saved last submission ID from previous scraping
  chrome.storage.local.get(['lastScrapedSubmissionId'], (data) => {
    if (data.lastScrapedSubmissionId) {
      lastScrapedSubmissionId = data.lastScrapedSubmissionId;
      console.log(`Found previous scraping checkpoint: ${lastScrapedSubmissionId}`);
    } else {
      console.log("No previous scraping checkpoint found, will scrape all submissions");
    }
  });
  
  // Process current page and navigate to the next one if available
  const processAndNavigate = async () => {
    if (isProcessing) return; // Prevent multiple simultaneous processing
    isProcessing = true;
    
    try {
      console.log(`Processing page ${currentPage} of submissions`);
      
      // Check for loading indicators first
      const loadingIndicator = document.querySelector('.ant-spin-spinning') || 
                              document.querySelector('.ant-spin') ||
                              document.querySelector('[role="progressbar"]');
      
      if (loadingIndicator) {
        console.log("Page is still loading. Waiting for content...");
        setTimeout(() => {
          isProcessing = false;
          processAndNavigate();
        }, 1500);
        return;
      }
      
      // Check for "No more submissions" message
      const noMoreText = document.querySelector('div.placeholder-text');
      if (noMoreText && noMoreText.textContent.includes('No more submissions')) {
        console.log("🏁 Finished scraping - no more submissions found");
        chrome.storage.local.set({ 
          scrapingCompleted: true,
          scrapingCompletedAt: new Date().toISOString()
        });
        return;
      }
        // Process the current page
      const submissions = parseSubmissionsPage();
      if (submissions.length > 0) {
        retryCount = 0; // Reset retry count on success
        
        // Store the ID of the first submission we encounter during a scan
        // This will be used as a checkpoint for future scans
        if (currentPage === 1 && submissions[0].submissionId) {
          const newestSubmissionId = submissions[0].submissionId;
          console.log(`Storing newest submission ID as checkpoint: ${newestSubmissionId}`);
          chrome.storage.local.set({ 
            lastScrapedSubmissionId: newestSubmissionId
          });
        }
        
        // Check if we've reached a previously scraped submission
        const foundPreviousSubmission = lastScrapedSubmissionId && 
          submissions.some(sub => sub.submissionId === lastScrapedSubmissionId);
          
        if (foundPreviousSubmission) {
          console.log(`🏁 Found previously scraped submission ${lastScrapedSubmissionId}, stopping scan`);
          chrome.storage.local.set({ 
            scrapingCompleted: true,
            scrapingCompletedAt: new Date().toISOString()
          });
          return;
        }
        
        await sendSubmissionsToBackend(username, submissions);
        
        // Check if there's a next page and navigate
        const olderLink = document.querySelector('li.next a');
        if (olderLink) {
          currentPage++;
          console.log(`Navigating to page ${currentPage}`);
          olderLink.click();
          
          // Wait for the new page to load and then process it
          setTimeout(() => {
            isProcessing = false;
            processAndNavigate();
          }, 3000); // Increased timeout for page load
        } else {
          console.log("🏁 Finished scraping - no more pages found");
          chrome.storage.local.set({ 
            scrapingCompleted: true,
            scrapingCompletedAt: new Date().toISOString()
          });
        }
      } else {
        console.log("No submissions found on this page");
        
        // Add retry logic if no submissions found
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`Retry attempt ${retryCount}/${MAX_RETRIES} - waiting for page to fully load`);
          
          // Update the visual indicator
          const indicator = document.getElementById('leetcode-friends-scraping');
          if (indicator) {
            const retryMsg = document.createElement('div');
            retryMsg.style.fontSize = '12px';
            retryMsg.textContent = `Retrying (${retryCount}/${MAX_RETRIES})...`;
            indicator.appendChild(retryMsg);
          }
          
          // Wait longer and try again
          setTimeout(() => {
            isProcessing = false;
            processAndNavigate();
          }, 3000);
        } else {
          console.log("Max retries reached, moving to next page or ending");
          retryCount = 0;
          
          // Try to navigate to next page anyway
          const olderLink = document.querySelector('li.next a');
          if (olderLink) {
            currentPage++;
            console.log(`Moving to page ${currentPage} despite no submissions found`);
            olderLink.click();
            setTimeout(() => {
              isProcessing = false;
              processAndNavigate();
            }, 3000);
          } else {
            console.log("No more pages to navigate to, ending scraper");
            chrome.storage.local.set({ 
              scrapingCompleted: true,
              scrapingCompletedAt: new Date().toISOString()
            });
          }
        }
      }
    } catch (error) {
      console.error("Error during page processing:", error);
      isProcessing = false;
    }
  };
  
  // Setup click listener for any "Older" navigation elements
  document.addEventListener('click', (event) => {
    // Check if this is a navigation event we should handle
    const target = event.target.closest('li.next a') || event.target;
    const isOlderNavigation = 
      target.closest('li.next') || 
      (target.textContent || '').includes('Older');
    
    if (isOlderNavigation) {
      console.log("Navigation event detected");
      // We'll handle the processing in the MutationObserver
    }
  }, true);
  
  // Observe the content area for changes that indicate page loads
  const contentObserver = new MutationObserver(mutations => {
    // Look for significant changes that indicate a page load
    const significantChanges = mutations.some(mutation => {
      // Check if this mutation involves table changes or pagination changes
      return (
        (mutation.target.tagName === 'TABLE') ||
        (mutation.target.className && 
         (mutation.target.className.includes('pagination') || 
          mutation.target.className.includes('table')))
      );
    });
    
    if (significantChanges && !isProcessing) {
      setTimeout(() => {
        processAndNavigate();
      }, 1000);
    }
  });
  
  // Find a suitable container to observe - wider than just the table
  const container = document.querySelector('main') || 
                    document.querySelector('.container') || 
                    document.body;
  
  contentObserver.observe(container, { childList: true, subtree: true });
  console.log("Set up observers for page navigation");
    // Start the process for the first page with an increased timeout
  // to make sure the page is fully loaded
  console.log("Waiting for page to fully load before starting scraper...");
  setTimeout(() => {
    processAndNavigate();
  }, 3000);
};

// Export the functions to be used in content.js
window.LeetCodeScraper = {
  startSubmissionScraping,
  parseSubmissionsPage,
  navigateToNextPage,
  sendSubmissionsToBackend
};
