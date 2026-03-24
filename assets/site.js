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

  const header = document.querySelector(".site-header");
  if (header) {
    let lastScrollY = window.scrollY;
    const hideThreshold = 12;

    const syncHeader = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollY;
      const farFromTop = currentScrollY > 96;

      if (scrollingDown && farFromTop && currentScrollY - lastScrollY > hideThreshold) {
        header.classList.add("is-hidden");
      } else if (!scrollingDown || currentScrollY <= 48) {
        header.classList.remove("is-hidden");
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", syncHeader, { passive: true });
    syncHeader();
  }

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
});
