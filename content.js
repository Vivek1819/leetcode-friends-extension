const getProblemSlug = () => {
  const pathParts = window.location.pathname.split("/");
  return pathParts[1] === "problems" ? pathParts[2] : null;
};

const avatarImg = document.querySelector('img[src*="leetcode.com/users/"]');

if (avatarImg && avatarImg.src) {
  const match = avatarImg.src.match(/users\/([^/]+)\/avatar/);
  const username = match ? match[1] : null;
  const avatarUrl = avatarImg.src;
  console.log("Avatar URL:", avatarUrl);
  if (username) {
    chrome.storage.local.set({ leetcodeUsername: username }, () => {
      console.log("✅ Leetcode username stored:", username);
    });
  }
} else {
  chrome.storage.local.remove("leetcodeUsername", () => {
    console.log(
      "⚠️ Username not found — probably signed out. Removed from storage."
    );
  });
}

// chrome.storage.local.get(["leetcodeUsername"], (result) => {
//   const username = result.leetcodeUsername;

//   if (username) {
//     fetch(`http://localhost:5000/api/users/${username}/friends`)
//       .then((res) => res.json())
//       .then((friendsData) => {
//         console.log("👥 Friends data fetched:", friendsData.friends);

//         const slug = getProblemSlug();
//         console.log("📌 Current problem slug:", slug);

//         if (slug) {
//           const friendsWhoAttempted = friendsData.friends.filter((friend) =>
//             friend.solvedProblems?.includes(slug)
//           );

//           console.log(
//             "✅ Friends who attempted this problem:",
//             friendsWhoAttempted
//           );

//           const container = document.createElement("div");
//           container.id = "leetcode-friends-overlay";

//           friendsWhoAttempted.slice(0, 3).forEach((friend) => {
//             const avatar = document.createElement("img");
//             avatar.src = `https://assets.leetcode.com/users/${friend.username.toLowerCase()}/avatar.png`;
//             avatar.alt = friend.username;
//             avatar.title = friend.username;
//             avatar.className = "friend-avatar";
//             container.appendChild(avatar);
//           });

//           document.body.appendChild(container);
//         }
//       })
//       .catch((err) => console.error("❌ Error fetching friends:", err));
//   } else {
//     console.log("⚠️ No username found in storage yet");
//   }
// });
