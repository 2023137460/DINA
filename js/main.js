/**
 * DINA Main Website JavaScript (v9.2)
 * Clean, quiet editorial interaction: split-stage crossfade, mobile drawer, simulated reservation
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
    experience: "drawer",
    drawer: "drawer",
    intro: "kitchen",
    "how-it-works": "drum",
    calculator: "drum",
    kitchen: "kitchen",
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

  // Production Priority Waitlist Form (Persistent Local Queue + Academic Concept Demo)
  const notifyForm = document.getElementById("notifyLaunchForm");
  const notifyName = document.getElementById("waitlistNameInput");
  const notifyEmail = document.getElementById("notifyEmailInput");
  const notifyCountry = document.getElementById("waitlistCountrySelect");
  const notifyBtn = document.getElementById("notifySubmitBtn");
  const notifyFeedback = document.getElementById("notifyFeedback");

  function renderWaitlistConfirmation(data) {
    if (!notifyFeedback) return;
    notifyFeedback.innerHTML = `
      <div class="waitlist-success-badge">
        <strong>Reservation Confirmed: #${data.queueNum} on Priority Waitlist</strong>
        <p>Thank you, ${data.name}. You are allocated to Production Wave 1 (${data.region}). Early-backer pricing of &euro;799 is reserved for <em>${data.email}</em>. We will notify you 90 days prior to tooling completion with early batch access. (Concept demo &bull; No deposit required).</p>
      </div>
    `;
    notifyFeedback.className = "notify-feedback success";
    if (notifyBtn) {
      notifyBtn.textContent = "Priority Confirmed \u2713";
      notifyBtn.disabled = true;
      notifyBtn.style.opacity = "0.75";
    }
    if (notifyName) notifyName.value = data.name;
    if (notifyEmail) notifyEmail.value = data.email;
  }

  // Restore saved reservation on load if present
  try {
    const saved = localStorage.getItem("dina_waitlist_entry");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.email) {
        renderWaitlistConfirmation(parsed);
      }
    }
  } catch (e) {
    // Ignore storage issues in private modes
  }

  if (notifyForm && notifyEmail && notifyFeedback) {
    notifyForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = (notifyName ? notifyName.value : "").trim();
      const email = (notifyEmail.value || "").trim().toLowerCase();
      const countrySelect = notifyCountry ? notifyCountry.options[notifyCountry.selectedIndex].text : "European Union";
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      notifyFeedback.classList.remove("error", "success");

      if (!name) {
        notifyFeedback.textContent = "Please enter your full name.";
        notifyFeedback.className = "notify-feedback error";
        if (notifyName) notifyName.focus();
        return;
      }

      if (!email || !emailRegex.test(email)) {
        notifyFeedback.textContent = "Please enter a valid email address.";
        notifyFeedback.className = "notify-feedback error";
        notifyEmail.focus();
        return;
      }

      const queueNum = Math.floor(Math.random() * 40) + 215; // Realistic initial cohort (#215–254)
      const entry = {
        name: name,
        email: email,
        region: countrySelect,
        queueNum: queueNum,
        timestamp: new Date().toISOString()
      };

      try {
        localStorage.setItem("dina_waitlist_entry", JSON.stringify(entry));
      } catch (err) {
        // storage fallback
      }

      renderWaitlistConfirmation(entry);
    });
  }
});
