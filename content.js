const extractUsername = () => {
  const avatarImg = document.querySelector('img[src*="leetcode.com/users/"]');
  
  if (avatarImg && avatarImg.src) {
    const match = avatarImg.src.match(/users\/([^/]+)\/avatar/);
    const username = match ? match[1] : null;
    
    if (username) {
      chrome.storage.local.set({ leetcodeUsername: username }, () => {
        console.log("✅ LeetCode username stored:", username);
      });
      return username;
    }
  }
  
  chrome.storage.local.remove("leetcodeUsername", () => {
    console.log("⚠️ Username not found — probably signed out. Removed from storage.");
  });
  
  return null;
};


const getProblemSlug = () => {
  const pathParts = window.location.pathname.split("/");
  return pathParts[1] === "problems" ? pathParts[2] : null;
};

const checkUserExists = async (username) => {
  try {
    const response = await fetch(`${window.LeetCodeFriendsConfig.API_BASE_URL}/${username}`);
    return response.status === 200;
  } catch (error) {
    console.error("❌ Error checking if user exists:", error);
    return false;
  }
};

const registerUser = async (username) => {
  try {
    const response = await fetch(`${window.LeetCodeFriendsConfig.API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });
    
    if (response.status === 201) {
      console.log("✅ User registered successfully:", username);
      return true;
    } else {
      console.error("❌ Failed to register user:", response.statusText);
      return false;
    }
  } catch (error) {
    console.error("❌ Error registering user:", error);
    return false;
  }
};

const main = async () => {
  let username;
  
  await new Promise(resolve => {
    chrome.storage.local.get(['leetcodeUsername'], result => {
      username = result.leetcodeUsername;
      resolve();
    });
  });
  
  if (!username) {
    username = extractUsername();
    if (!username) {
      console.log("Could not find or extract username");
      return;
    }
  }
    console.log(`Username: ${username}`);
  
  const problemSlug = getProblemSlug();
  if (problemSlug) {
    console.log(`Current problem slug: ${problemSlug}`);
  }
  
  const isSubmissionsPage = window.location.href.includes('/submissions/');
  const hasScrapingFlag = window.location.href.includes('?scrape=true');
  const forceFullScan = window.location.href.includes('&full=true');
  
  if (isSubmissionsPage && hasScrapingFlag) {
    console.log("On submissions page with scraping flag, starting scraper");
    if (window.LeetCodeScraper) {
      window.LeetCodeScraper.startSubmissionScraping(username, forceFullScan);
    } else {
      console.error("LeetCode Scraper module not loaded");
    }
    return;
  }
  
  chrome.storage.local.set({ leetcodeUsername: username });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
