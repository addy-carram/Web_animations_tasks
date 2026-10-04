const cursor = document.querySelector(".cursor");

window.addEventListener("pointermove", (e) => {
  cursor.style.setProperty("--x", e.clientX + "px");
  cursor.style.setProperty("--y", e.clientY + "px");
});
