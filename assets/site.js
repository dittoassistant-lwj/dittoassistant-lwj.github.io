document.addEventListener("DOMContentLoaded", () => {
  const normalizePath = (path) => {
    const url = new URL(path, window.location.origin);
    let pathname = url.pathname.replace(/\/index\.html$/i, "/");
    if (!pathname.endsWith("/")) pathname += "/";
    return pathname;
  };

  const currentPath = normalizePath(window.location.pathname);
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const targetPath = normalizePath(link.getAttribute("href") || "/");
    if (currentPath === targetPath) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    } else {
      link.classList.remove("active");
      link.removeAttribute("aria-current");
    }
  });

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
});
