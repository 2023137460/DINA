/**
 * DINA Main Website JavaScript
 * Reveal animations, mobile menu toggle, & navigation scrollspy
 * Strictly adheres to /dina-brand-identity. Zero emojis.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Mobile Navigation Drawer Toggle
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const mobileNavMenu = document.getElementById("mobileNavMenu");

  if (mobileMenuBtn && mobileNavMenu) {
    // Ensure hidden by default on mobile load
    if (!mobileNavMenu.classList.contains("open")) {
      mobileNavMenu.style.display = "none";
    }

    function toggleMobileMenu() {
      const isOpen = mobileNavMenu.classList.contains("open");
      if (isOpen) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    }

    function openMobileMenu() {
      mobileNavMenu.style.display = "block";
      requestAnimationFrame(() => {
        mobileNavMenu.classList.add("open");
        mobileMenuBtn.classList.add("active");
        mobileMenuBtn.setAttribute("aria-expanded", "true");
        const label = mobileMenuBtn.querySelector(".menu-btn-label");
        if (label) label.textContent = "Close";
      });
    }

    function closeMobileMenu() {
      mobileNavMenu.classList.remove("open");
      mobileMenuBtn.classList.remove("active");
      mobileMenuBtn.setAttribute("aria-expanded", "false");
      const label = mobileMenuBtn.querySelector(".menu-btn-label");
      if (label) label.textContent = "Menu";
      setTimeout(() => {
        if (!mobileNavMenu.classList.contains("open")) {
          mobileNavMenu.style.display = "none";
        }
      }, 250);
    }

    mobileMenuBtn.addEventListener("click", toggleMobileMenu);

    // Close menu when tapping any navigation link
    mobileNavMenu.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        closeMobileMenu();
      });
    });

    // Close on click outside
    document.addEventListener("click", (e) => {
      if (mobileNavMenu.classList.contains("open")) {
        if (!mobileNavMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
          closeMobileMenu();
        }
      }
    });
  }

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

  // Active navigation tracking for both desktop & mobile links
  const sections = document.querySelectorAll("section[id], main[id]");
  const allNavLinks = document.querySelectorAll(".nav-strip a[href^='#'], .mobile-nav-link[href^='#']");

  if ("IntersectionObserver" in window && sections.length && allNavLinks.length) {
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          allNavLinks.forEach(link => {
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
