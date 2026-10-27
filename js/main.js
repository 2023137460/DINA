/**
 * DINA Main Website JavaScript
 * Reveal animations & navigation scrollspy
 * Strictly adheres to /dina-brand-identity
 */

document.addEventListener("DOMContentLoaded", () => {
  // Reveal on scroll (Safe with prefers-reduced-motion)
  const revealElements = document.querySelectorAll(".reveal");
  
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    revealElements.forEach(el => el.classList.add("in"));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealElements.forEach(el => observer.observe(el));
  }

  // Active navigation tracking
  const sections = document.querySelectorAll("section[id], main[id]");
  const navLinks = document.querySelectorAll(".nav-strip a[href^='#']");

  if ("IntersectionObserver" in window && sections.length && navLinks.length) {
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          navLinks.forEach(link => {
            if (link.getAttribute("href") === `#${id}`) {
              link.setAttribute("aria-current", "page");
            } else {
              link.removeAttribute("aria-current");
            }
          });
        }
      });
    }, { rootMargin: "-30% 0px -60% 0px" });

    sections.forEach(sec => navObserver.observe(sec));
  }
});
