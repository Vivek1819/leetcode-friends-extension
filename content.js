const getProblemSlug = () => {
  const pathParts = window.location.pathname.split("/");
  return pathParts[1] === "problems" ? pathParts[2] : null;
};

const avatarImg = document.querySelector('img[src*="/users/"]');

if (avatarImg && avatarImg.src) {
  const match = avatarImg.src.match(/users\/([^/]+)\//);
  const username = match ? match[1] : null;
  const avatarUrl = avatarImg.src;
  if (username) {
    chrome.storage.local.set({ leetcodeUsername: username }, () => {
      console.log("✅ Leetcode username stored:", username);
    });
  }
}

chrome.storage.local.get(["leetcodeUsername"], (result) => {
  const username = result.leetcodeUsername;

  if (username) {
    fetch(`http://localhost:5000/api/users/${username}/friends`)
      .then((res) => res.json())
      .then((friendsData) => {
        console.log("👥 Friends data fetched:", friendsData.friends);

        const slug = getProblemSlug();
        console.log("📌 Current problem slug:", slug);
        if (slug) {
          const friendsWhoAttempted = friendsData.friends.filter((friend) =>
            friend.solvedProblems?.includes(slug)
          );

          console.log(
            "✅ Friends who attempted this problem:",
            friendsWhoAttempted
          );
        }
      })
      .catch((err) => console.error("❌ Error fetching friends:", err));
  } else {
    console.log("⚠️ No username found in storage yet");
  }
});
