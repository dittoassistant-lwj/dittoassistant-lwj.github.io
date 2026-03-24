document.addEventListener("DOMContentLoaded", () => {
  const current = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const target = (link.getAttribute("href") || "").split("/").pop().toLowerCase() || "index.html";
    const isIndexAlias = current === "" || current === "index.html";
    if ((isIndexAlias && target === "index.html") || current === target) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
  });

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
});
