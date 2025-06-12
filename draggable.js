function makeDraggable(element) {
  if (!element) return;

  let isDragging = false;
  let offsetX, offsetY;

  element.addEventListener("mousedown", (e) => {
    if (
      e.target.tagName === "BUTTON" ||
      e.target.tagName === "A" ||
      e.target.tagName === "IMG" ||
      e.target.tagName === "INPUT"
    ) {
      return;
    }

    isDragging = true;

    const rect = element.getBoundingClientRect();

    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const left = e.clientX - offsetX;
    const top = e.clientY - offsetY;

    element.style.left = left + "px";
    element.style.top = top + "px";
    element.style.right = "auto";

    e.preventDefault();
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      element.classList.add("dragged");
    }
  });
}

window.makeDraggable = makeDraggable;
