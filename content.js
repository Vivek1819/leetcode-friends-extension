console.log("LeetCode Friends extension loaded!");

// Get the problem slug from URL
const slug = window.location.pathname.split("/")[2];
console.log("Problem slug:", slug);

// Create the container div
const box = document.createElement("div");
box.id = "lc-friends-box";
box.innerHTML = `
  <strong>👥 LeetCode Friends</strong><br>
  Checking which friends solved <em>${slug}</em>...
`;
document.body.appendChild(box);

