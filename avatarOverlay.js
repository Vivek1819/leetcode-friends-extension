/**
 * Creates and shows an overlay of friends who have solved the current problem
 * @param {string} problemSlug - The slug of the current problem
 * @param {Array} friends - Array of friend objects containing username and avatar info
 */
const showFriendsAvatarOverlay = (problemSlug, friends) => {
  console.log("showFriendsAvatarOverlay called with:", {
    problemSlug,
    friendsCount: friends ? friends.length : 0,
  });

  if (!problemSlug || !friends || !friends.length) {
    console.log("No problem slug or friends data available for overlay");
    return;
  }

  chrome.storage.local.get(["leetcodeUsername"], async (result) => {
    const currentUsername = result.leetcodeUsername;
    console.log("Current username from storage:", currentUsername);

    if (!currentUsername) {
      console.log("Cannot show friends overlay - current username not found");
      return;
    }

    try {
      const response = await fetch(
        `${window.LeetCodeFriendsConfig.API_BASE_URL}/${currentUsername}/solved/${problemSlug}`
      );

      if (!response.ok) {
        console.error(
          `Failed to fetch solved friends for problem ${problemSlug}: ${response.statusText}`
        );
        return;
      }

      const friendsData = await response.json();
      console.log(
        `API reports ${friendsData.length} friends solved problem ${problemSlug}`
      );
      console.log("Detailed response data:", friendsData);

      const solvedUsernames = friendsData.map((data) => data.username);
      const friendsWhoSolved = friends.filter((friend) =>
        solvedUsernames.includes(friend.username)
      );

      console.log(
        `${friendsWhoSolved.length} friends have solved problem ${problemSlug}`
      );

      if (!friendsWhoSolved.length) {
        const existingOverlay = document.getElementById(
          "leetcode-friends-solved-overlay"
        );
        if (existingOverlay) {
          existingOverlay.remove();
        }
        return;
      }
      const existingOverlays = document.querySelectorAll(
        ".leetcode-friends-overlay"
      );
      existingOverlays.forEach((overlay) => overlay.remove());

      console.log("Creating new overlay container");

      const overlayContainer = document.createElement("div");
      overlayContainer.id = "leetcode-friends-solved-overlay";
      overlayContainer.className = "leetcode-friends-overlay";

      document.body.appendChild(overlayContainer);
      console.log("Overlay container added to document body");
      let isDragging = false;
      let offsetX, offsetY;
      let dragJustEnded = false;

      overlayContainer.addEventListener("mousedown", (e) => {
        if (
          e.target === overlayContainer ||
          e.target.className === "overlay-heading" ||
          e.target.className === "friend-avatar" ||
          (e.target.tagName === "IMG" &&
            e.target.parentElement &&
            e.target.parentElement.className === "overlay-heading")
        ) {
          isDragging = true;

          const rect = overlayContainer.getBoundingClientRect();

          offsetX = e.clientX - rect.left;
          offsetY = e.clientY - rect.top;

          e.preventDefault();
        }
      });

      document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;

        const left = e.clientX - offsetX;
        const top = e.clientY - offsetY;

        overlayContainer.style.left = left + "px";
        overlayContainer.style.top = top + "px";
        overlayContainer.style.transform = "none";

        e.preventDefault();
      });

      document.addEventListener("mouseup", () => {
        if (isDragging) {
          isDragging = false;
          overlayContainer.classList.add("dragged");

          dragJustEnded = true;

          setTimeout(() => {
            dragJustEnded = false;
          }, 100);
        }
      });
      const applyStyles = () => {
        if (!isDragging) {
          overlayContainer.style.position = "fixed";
          overlayContainer.style.top = "50%";
          overlayContainer.style.left = "50%";
          overlayContainer.style.transform = "translate(-50%, -50%)";
        }
        overlayContainer.style.zIndex = "2147483647";
        overlayContainer.style.display = "flex";
        overlayContainer.style.flexDirection = "column";
        overlayContainer.style.alignItems = "center";
        overlayContainer.style.padding = "10px";
        overlayContainer.style.maxHeight = "80vh";
        overlayContainer.style.backgroundColor = "transparent";
        overlayContainer.style.opacity = "1";
        overlayContainer.style.pointerEvents = "auto";
        overlayContainer.style.minWidth = "120px";
        overlayContainer.style.transition = "opacity 0.3s ease-in-out";

        const cssText = `
          position: fixed !important;
          z-index: 2147483647 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          padding: 10px !important;
          max-height: 80vh !important;
          background-color: transparent !important;
          opacity: 1 !important;
          pointer-events: auto !important;
          min-width: 120px !important;
        `;
        overlayContainer.style.cssText += cssText;
        console.log("Critical overlay styles applied");
      };

      setTimeout(applyStyles, 10);

      overlayContainer.addEventListener("click", (e) => {
        if (isDragging || dragJustEnded) return;

        const isHeadingOrLogo =
          e.target === overlayContainer ||
          e.target.className === "overlay-heading" ||
          (e.target.tagName === "IMG" &&
            e.target.parentElement &&
            e.target.parentElement.className === "overlay-heading");

        if (
          isHeadingOrLogo ||
          (e.target.tagName !== "IMG" && e.target.tagName !== "A")
        ) {
          const isMinimized = overlayContainer.classList.contains("minimized");

          if (isMinimized) {
            overlayContainer.classList.remove("minimized");
            overlayContainer.style.opacity = "1";
            const vFormation = overlayContainer.querySelector(
              ".friends-v-formation"
            );
            if (vFormation) vFormation.style.display = "block";
            const moreInfo = overlayContainer.querySelector(".more-info");
            if (moreInfo) moreInfo.style.display = "block";
            const heading = overlayContainer.querySelector(".overlay-heading");
            if (heading) {
              heading.style.display = "none";
            }
          } else {
            overlayContainer.classList.add("minimized");
            overlayContainer.style.opacity = "0.9";
            const vFormation = overlayContainer.querySelector(
              ".friends-v-formation"
            );
            if (vFormation) vFormation.style.display = "none";
            const moreInfo = overlayContainer.querySelector(".more-info");
            if (moreInfo) moreInfo.style.display = "none";
            const heading = overlayContainer.querySelector(".overlay-heading");
            if (heading) {
              heading.style.display = "block";
              heading.innerHTML = "";
              const headingImg = document.createElement("img");
              headingImg.src = chrome.runtime.getURL(
                "public/leetcode-friends-logo.svg"
              );
              headingImg.style.height = "60px";
              headingImg.style.width = "60px";
              headingImg.style.display = "inline-block";
              heading.appendChild(headingImg);
            }
          }
        }
      });

      const isDarkMode =
        document.querySelector("html").classList.contains("dark") ||
        document.documentElement.getAttribute("data-theme") === "dark" ||
        document.body.classList.contains("dark-theme");

      overlayContainer.style.backgroundColor = isDarkMode
        ? "rgba(40, 40, 40, 0.95)"
        : "rgba(245, 245, 245, 0.95)";

      overlayContainer.innerHTML = "";

      const vFormation = document.createElement("div");
      vFormation.className = "friends-v-formation";
      vFormation.style.position = "relative";
      vFormation.style.width = "110px";
      vFormation.style.height = "110px";
      vFormation.style.margin = "8px";

      const displayedFriends = friendsWhoSolved.slice(0, 3);

      if (displayedFriends.length === 1) {
        addAvatarToFormation(vFormation, displayedFriends[0], "center");
      } else if (displayedFriends.length === 2) {
        addAvatarToFormation(vFormation, displayedFriends[0], "top-left");
        addAvatarToFormation(vFormation, displayedFriends[1], "top-right");
      } else if (displayedFriends.length === 3) {
        addAvatarToFormation(vFormation, displayedFriends[0], "top-left");
        addAvatarToFormation(vFormation, displayedFriends[1], "bottom-middle");
        addAvatarToFormation(vFormation, displayedFriends[2], "top-right");
      }

      const heading = document.createElement("div");
      heading.className = "overlay-heading";
      heading.style.marginBottom = "12px";
      heading.style.textAlign = "center";
      heading.style.cursor = "pointer";
      heading.style.padding = "4px";
      heading.title = "Click to minimize/expand";
      heading.style.display = "none";

      const toggleButton = document.createElement("div");
      toggleButton.style.position = "absolute";
      toggleButton.style.top = "5px";
      toggleButton.style.right = "5px";
      toggleButton.style.width = "15px";
      toggleButton.style.height = "15px";
      toggleButton.style.cursor = "pointer";
      toggleButton.style.borderRadius = "50%";
      toggleButton.style.backgroundColor = isDarkMode
        ? "rgba(255, 255, 255, 0.3)"
        : "rgba(10, 25, 47, 0.3)";
      toggleButton.style.display = "flex";
      toggleButton.style.justifyContent = "center";
      toggleButton.style.alignItems = "center";
      toggleButton.style.fontSize = "12px";
      toggleButton.style.fontWeight = "bold";
      toggleButton.textContent = "−";
      toggleButton.title = "Minimize/Maximize";

      toggleButton.addEventListener("click", (e) => {
        e.stopPropagation();
        if (dragJustEnded) return;

        const isMinimized = overlayContainer.classList.contains("minimized");
        const heading = overlayContainer.querySelector(".overlay-heading");

        if (isMinimized) {
          overlayContainer.classList.remove("minimized");
          toggleButton.textContent = "−";
          const vFormation = overlayContainer.querySelector(
            ".friends-v-formation"
          );
          if (vFormation) vFormation.style.display = "block";
          const moreInfo = overlayContainer.querySelector(".more-info");
          if (moreInfo) moreInfo.style.display = "block";
          if (heading) heading.style.display = "none";
        } else {
          overlayContainer.classList.add("minimized");
          toggleButton.textContent = "+";
          const vFormation = overlayContainer.querySelector(
            ".friends-v-formation"
          );
          if (vFormation) vFormation.style.display = "none";
          const moreInfo = overlayContainer.querySelector(".more-info");
          if (moreInfo) moreInfo.style.display = "none";
          if (heading) {
            heading.style.display = "block";
            heading.innerHTML = "";
            const headingImg = document.createElement("img");
            headingImg.src = chrome.runtime.getURL(
              "public/leetcode-friends-logo.svg"
            );
            headingImg.style.height = "48px";
            headingImg.style.width = "48px";
            headingImg.style.display = "inline-block";
            heading.appendChild(headingImg);
          }
        }
      });

      overlayContainer.style.position = "relative";
      overlayContainer.appendChild(toggleButton);
      overlayContainer.appendChild(heading);
      overlayContainer.appendChild(vFormation);
      if (friendsWhoSolved.length > 3) {
        const moreInfo = document.createElement("div");
        moreInfo.textContent = `+${friendsWhoSolved.length - 3} more`;
        moreInfo.className = "more-info";
        moreInfo.style.color = isDarkMode ? "#ffffff" : "#333333";
        moreInfo.style.fontSize = "12px";
        moreInfo.style.marginTop = "8px";
        moreInfo.style.backgroundColor = isDarkMode
          ? "rgba(0,0,0,0.5)"
          : "rgba(200,200,200,0.7)";
        moreInfo.style.padding = "4px 8px";
        moreInfo.style.borderRadius = "10px";
        moreInfo.style.textAlign = "center";
        overlayContainer.appendChild(moreInfo);
      }
    } catch (error) {
      console.error("Error showing avatar overlay:", error);
    }
  });
};

/**
 * Add an avatar to the V formation with the specified position
 * @param {HTMLElement} container - The container element for the formation
 * @param {Object} friend - Friend object with avatar information
 * @param {string} position - Position in the formation ('top-left', 'bottom-middle', 'top-right', 'center')
 */
const addAvatarToFormation = (container, friend, position) => {
  const avatarWrapper = document.createElement("div");
  avatarWrapper.className = "friend-avatar-wrapper";
  avatarWrapper.style.position = "absolute";
  avatarWrapper.style.transition = "all 0.2s ease-in-out";
  const avatar = document.createElement("img");
  avatar.className = "friend-avatar";
  avatar.src =
    friend.avatar || `https://leetcode.com/users/${friend.username}/avatar`;
  avatar.alt = `${friend.username}'s avatar`;
  avatar.title = `${friend.username} has solved this problem`;

  avatar.onerror = function () {
    this.style.display = "none";

    const fallbackAvatar = document.createElement("div");
    fallbackAvatar.className = "friend-avatar-fallback";
    fallbackAvatar.style.width = "42px";
    fallbackAvatar.style.height = "42px";
    fallbackAvatar.style.borderRadius = "50%";
    fallbackAvatar.style.backgroundColor = isDarkMode
      ? "rgba(255, 255, 255, 0.5)"
      : "rgba(10, 25, 47, 0.5)";
    fallbackAvatar.style.color = "white";
    fallbackAvatar.style.display = "flex";
    fallbackAvatar.style.justifyContent = "center";
    fallbackAvatar.style.alignItems = "center";
    fallbackAvatar.style.fontWeight = "bold";
    fallbackAvatar.style.fontSize = "20px";
    fallbackAvatar.textContent = friend.username.charAt(0).toUpperCase();

    this.parentNode.appendChild(fallbackAvatar);
  };
  avatar.style.width = "42px";
  avatar.style.height = "42px";
  avatar.style.borderRadius = "50%";
  avatar.style.objectFit = "cover";
  avatar.style.border = "1px solid rgba(255, 255, 255, 0.3)";
  avatar.style.boxShadow = "none";

  const usernameTooltip = document.createElement("div");
  usernameTooltip.className = "friend-username-tooltip";
  usernameTooltip.textContent = friend.username;
  usernameTooltip.style.position = "absolute";
  usernameTooltip.style.backgroundColor = "rgba(40, 40, 40, 0.9)";
  usernameTooltip.style.color = "white";
  usernameTooltip.style.padding = "3px 6px";
  usernameTooltip.style.borderRadius = "4px";
  usernameTooltip.style.fontSize = "12px";
  usernameTooltip.style.left = "50%";
  usernameTooltip.style.bottom = "-25px";
  usernameTooltip.style.transform = "translateX(-50%)";
  usernameTooltip.style.whiteSpace = "nowrap";
  usernameTooltip.style.opacity = "0";
  usernameTooltip.style.transition = "opacity 0.2s ease-in-out";
  usernameTooltip.style.zIndex = "11";
  usernameTooltip.style.pointerEvents = "none";

  switch (position) {
    case "top-left":
      avatarWrapper.style.top = "0";
      avatarWrapper.style.left = "0";
      break;
    case "bottom-middle":
      avatarWrapper.style.bottom = "0";
      avatarWrapper.style.left = "50%";
      avatarWrapper.style.transform = "translateX(-50%)";
      break;
    case "top-right":
      avatarWrapper.style.top = "0";
      avatarWrapper.style.right = "0";
      break;
    case "center":
      avatarWrapper.style.top = "50%";
      avatarWrapper.style.left = "50%";
      avatarWrapper.style.transform = "translate(-50%, -50%)";
      break;
  }

  avatarWrapper.addEventListener("mouseenter", () => {
    let baseTransform = "";

    switch (position) {
      case "top-left":
        baseTransform = "";
        break;
      case "bottom-middle":
        baseTransform = "translateX(-50%)";
        break;
      case "top-right":
        baseTransform = "";
        break;
      case "center":
        baseTransform = "translate(-50%, -50%)";
        break;
    }

    avatarWrapper.style.transform = baseTransform
      ? `${baseTransform} scale(1.15)`
      : "scale(1.15)";
    avatarWrapper.style.zIndex = "10";
    avatar.style.border = "1px solid rgba(255, 161, 22, 0.8)";
    usernameTooltip.style.opacity = "1";
  });

  avatarWrapper.addEventListener("mouseleave", () => {
    let baseTransform = "";

    switch (position) {
      case "top-left":
        baseTransform = "";
        break;
      case "bottom-middle":
        baseTransform = "translateX(-50%)";
        break;
      case "top-right":
        baseTransform = "";
        break;
      case "center":
        baseTransform = "translate(-50%, -50%)";
        break;
    }

    avatarWrapper.style.transform = baseTransform || "";
    avatarWrapper.style.zIndex = "";
    avatar.style.border = "1px solid rgba(255, 255, 255, 0.3)";
    usernameTooltip.style.opacity = "0";
  });

  avatarWrapper.style.cursor = "pointer";
  avatarWrapper.addEventListener("click", (e) => {
    e.stopPropagation();
    window.open(`https://leetcode.com/${friend.username}/`, "_blank");
  });

  avatarWrapper.appendChild(avatar);
  avatarWrapper.appendChild(usernameTooltip);
  container.appendChild(avatarWrapper);
};

window.LeetCodeFriendsAvatarOverlay = {
  showFriendsAvatarOverlay,
};
