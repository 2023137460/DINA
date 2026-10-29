/**
 * DINA Main Website JavaScript
 * Reveal animations, mobile menu toggle, navigation scrollspy, & launch sign-up counter
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

  // Interactive Defrost Drawer Halo Handle Simulator
  const haloRing = document.getElementById("webHaloRing");
  const haloStatus = document.getElementById("webHaloStatus");
  const haloBtns = document.querySelectorAll(".halo-chip-btn");

  if (haloRing && haloStatus && haloBtns.length) {
    haloBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        haloBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const state = btn.getAttribute("data-state");
        if (state === "ready") {
          haloRing.classList.remove("amber");
          haloRing.classList.add("green");
          haloStatus.textContent = "Handle Glow: Fresh Green — Dinner Is Ready to Cook (Chilled at +3 °C up to 24 h)";
        } else {
          haloRing.classList.remove("green");
          haloRing.classList.add("amber");
          haloStatus.textContent = "Handle Glow: Warm Amber — Gently Thawing Tonight's Dinner";
        }
      });
    });
  }

  // Kitchen Appliance View Toggle (3/4 Perspective vs Front View)
  const kitchenImg = document.getElementById("kitchenMainImg");
  const kitchenBtns = document.querySelectorAll(".kitchen-view-btn");

  if (kitchenImg && kitchenBtns.length) {
    kitchenBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const newSrc = btn.getAttribute("data-img");
        if (newSrc && kitchenImg.getAttribute("src") !== newSrc) {
          kitchenBtns.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          kitchenImg.style.transition = "opacity 0.18s ease";
          kitchenImg.style.opacity = "0.3";
          setTimeout(() => {
            kitchenImg.src = newSrc;
            kitchenImg.style.opacity = "1";
          }, 180);
        }
      });
    });
  }

  // "Notify Me at Launch" Email Sign-Up & Demand Evidence Counter
  const notifyForm = document.getElementById("notifyLaunchForm");
  const notifyInput = document.getElementById("notifyEmailInput");
  const notifyBtn = document.getElementById("notifySubmitBtn");
  const notifyFeedback = document.getElementById("notifyFeedback");
  const waitlistCountEl = document.getElementById("waitlistCountDisplay");

  const BASE_WAITLIST_COUNT = 142;
  const STORAGE_KEY_EMAILS = "dina_launch_waitlist_emails";

  function getSavedEmails() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_EMAILS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function updateWaitlistCounter() {
    if (!waitlistCountEl) return;
    const saved = getSavedEmails();
    waitlistCountEl.textContent = String(BASE_WAITLIST_COUNT + saved.length);
  }

  updateWaitlistCounter();

  if (notifyForm && notifyInput && notifyFeedback) {
    notifyForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = (notifyInput.value || "").trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      notifyFeedback.classList.remove("error", "success");

      if (!email || !emailRegex.test(email)) {
        notifyFeedback.textContent = "Please enter a valid email address.";
        notifyFeedback.classList.add("error");
        notifyInput.focus();
        return;
      }

      const saved = getSavedEmails();
      if (saved.includes(email)) {
        notifyFeedback.textContent = "You are already on the priority launch list for Q4 2027.";
        notifyFeedback.classList.add("success");
        return;
      }

      saved.push(email);
      try {
        localStorage.setItem(STORAGE_KEY_EMAILS, JSON.stringify(saved));
      } catch (err) {}

      updateWaitlistCounter();
      notifyInput.value = "";
      if (notifyBtn) {
        notifyBtn.textContent = "Registered";
      }
      notifyFeedback.textContent = `Thank you. ${email} has been added to the Q4 2027 launch list.`;
      notifyFeedback.classList.add("success");
    });
  }
});

// Inline Web App Toggle on Main Website (Allows using app.html directly inside index.html)
document.addEventListener("DOMContentLoaded", () => {
  const btnToggleInlineApp = document.getElementById("btnToggleInlineApp");
  const btnCloseInlineApp = document.getElementById("btnCloseInlineApp");
  const inlineAppContainer = document.getElementById("inlineAppContainer");
  const inlineAppIframe = document.getElementById("inlineAppIframe");

  if (btnToggleInlineApp && inlineAppContainer && inlineAppIframe) {
    btnToggleInlineApp.addEventListener("click", () => {
      const isHidden = inlineAppContainer.hasAttribute("hidden");
      if (isHidden) {
        if (!inlineAppIframe.getAttribute("src")) {
          inlineAppIframe.setAttribute("src", "app.html");
        }
        inlineAppContainer.removeAttribute("hidden");
        btnToggleInlineApp.setAttribute("aria-expanded", "true");
        btnToggleInlineApp.textContent = "Hide Inline App";
        inlineAppContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else {
        inlineAppContainer.setAttribute("hidden", "");
        btnToggleInlineApp.setAttribute("aria-expanded", "false");
        btnToggleInlineApp.textContent = "Preview App Right Here";
      }
    });
  }

  if (btnCloseInlineApp && inlineAppContainer && btnToggleInlineApp) {
    btnCloseInlineApp.addEventListener("click", () => {
      inlineAppContainer.setAttribute("hidden", "");
      btnToggleInlineApp.setAttribute("aria-expanded", "false");
      btnToggleInlineApp.textContent = "Preview App Right Here";
    });
  }
});
