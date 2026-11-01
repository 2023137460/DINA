/**
 * DINA Main Website JavaScript (v9.0)
 * Clean, quiet editorial interaction: split-stage crossfade, mobile drawer, email waitlist
 * Strictly adheres to /dina-brand-identity. Zero emojis.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Mobile Navigation Drawer Toggle
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const mobileNavDrawer = document.getElementById("mobileNavDrawer");

  if (mobileMenuBtn && mobileNavDrawer) {
    function openMenu() {
      mobileNavDrawer.classList.add("open");
      mobileMenuBtn.classList.add("active");
      mobileMenuBtn.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
      const label = mobileMenuBtn.querySelector(".menu-btn-label");
      if (label) label.textContent = "Close";
    }

    function closeMenu() {
      mobileNavDrawer.classList.remove("open");
      mobileMenuBtn.classList.remove("active");
      mobileMenuBtn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      const label = mobileMenuBtn.querySelector(".menu-btn-label");
      if (label) label.textContent = "Menu";
    }

    mobileMenuBtn.addEventListener("click", () => {
      const isOpen = mobileNavDrawer.classList.contains("open");
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Close on navigation link click
    mobileNavDrawer.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", closeMenu);
    });

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && mobileNavDrawer.classList.contains("open")) {
        closeMenu();
      }
    });
  }

  // Split-Stage Dynamic Visual Transition
  // Crossfades the sticky stage picture depending on which editorial section is in view
  const stageLayers = {
    kitchen: document.getElementById("stageSceneKitchen"),
    drum: document.getElementById("stageSceneDrum"),
    drawer: document.getElementById("stageSceneDrawer"),
    display: document.getElementById("stageSceneDisplay")
  };

  const sectionStageMap = {
    hero: "kitchen",
    intro: "kitchen",
    "how-it-works": "drum",
    calculator: "drum",
    drawer: "drawer",
    kitchen: "drawer",
    app: "display",
    faq: "display",
    pricing: "kitchen"
  };

  function setStageScene(sceneKey) {
    Object.keys(stageLayers).forEach(key => {
      const el = stageLayers[key];
      if (!el) return;
      if (key === sceneKey) {
        el.classList.add("active");
      } else {
        el.classList.remove("active");
      }
    });
  }

  const observedSections = document.querySelectorAll("section[id]");
  if ("IntersectionObserver" in window && observedSections.length) {
    const stageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.getAttribute("id");
          const targetScene = sectionStageMap[sectionId] || "kitchen";
          setStageScene(targetScene);
        }
      });
    }, { rootMargin: "-25% 0px -45% 0px" });

    observedSections.forEach(sec => stageObserver.observe(sec));
  }

  // Active navigation tracking for desktop & mobile
  const allNavLinks = document.querySelectorAll(".desktop-nav a[href^='#'], .mobile-nav-links a[href^='#']");
  if ("IntersectionObserver" in window && observedSections.length && allNavLinks.length) {
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

    observedSections.forEach(sec => navObserver.observe(sec));
  }

  // Reveal on scroll (Safe with prefers-reduced-motion)
  const revealElements = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    revealElements.forEach(el => el.classList.add("in"));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    revealElements.forEach(el => revealObserver.observe(el));
  }

  // "Notify Me at Launch" Priority Waitlist Form
  const notifyForm = document.getElementById("notifyLaunchForm");
  const notifyInput = document.getElementById("notifyEmailInput");
  const notifyBtn = document.getElementById("notifySubmitBtn");
  const notifyFeedback = document.getElementById("notifyFeedback");
  const STORAGE_KEY_EMAILS = "dina_launch_waitlist_emails";

  function getSavedEmails() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_EMAILS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

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

      notifyInput.value = "";
      if (notifyBtn) {
        notifyBtn.textContent = "Registered";
      }
      notifyFeedback.textContent = `Thank you. ${email} has been added to the Q4 2027 launch list.`;
      notifyFeedback.classList.add("success");
    });
  }
});
