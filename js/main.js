/**
 * DINA Main Application Script
 * Navigation, Engineering Tabs, Lightbox Modal, FAQ, and Pre-Order flows
 */

document.addEventListener("DOMContentLoaded", () => {
  // Mobile Nav Dropdown Overlay Toggle
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const mobileNavOverlay = document.getElementById("mobileNavOverlay");

  if (mobileMenuBtn && mobileNavOverlay) {
    mobileMenuBtn.addEventListener("click", () => {
      const isOpen = mobileNavOverlay.classList.contains("open");
      if (isOpen) {
        mobileNavOverlay.classList.remove("open");
        mobileMenuBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        `;
      } else {
        mobileNavOverlay.classList.add("open");
        mobileMenuBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;
      }
    });

    // Close mobile overlay on link click
    mobileNavOverlay.querySelectorAll("a, button").forEach(item => {
      item.addEventListener("click", () => {
        mobileNavOverlay.classList.remove("open");
        mobileMenuBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        `;
      });
    });
  }

  // Engineering Section Tab Switching
  const tabButtons = document.querySelectorAll(".eng-tab-btn");
  const panels = document.querySelectorAll(".eng-panel");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.tab;

      tabButtons.forEach(b => b.classList.remove("active"));
      panels.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add("active");
      }
    });
  });

  // Lightbox Modal for HD Images & FEA Charts
  const lightboxModal = document.getElementById("lightboxModal");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxClose = document.getElementById("lightboxClose");
  const zoomTriggers = document.querySelectorAll("[data-zoom]");

  zoomTriggers.forEach(el => {
    el.addEventListener("click", () => {
      const src = el.getAttribute("src") || el.dataset.zoom;
      if (src && lightboxImg && lightboxModal) {
        lightboxImg.src = src;
        lightboxModal.classList.add("open");
      }
    });
  });

  if (lightboxClose && lightboxModal) {
    lightboxClose.addEventListener("click", () => {
      lightboxModal.classList.remove("open");
    });
    lightboxModal.addEventListener("click", (e) => {
      if (e.target === lightboxModal) {
        lightboxModal.classList.remove("open");
      }
    });
  }

  // FAQ Accordion
  const faqItems = document.querySelectorAll(".faq-item");
  faqItems.forEach(item => {
    const question = item.querySelector(".faq-question");
    if (question) {
      question.addEventListener("click", () => {
        const isOpen = item.classList.contains("open");
        faqItems.forEach(i => i.classList.remove("open"));
        if (!isOpen) {
          item.classList.add("open");
        }
      });
    }
  });

  // Pre-Order Modal
  const preorderModal = document.getElementById("preorderModal");
  const preorderClose = document.getElementById("preorderClose");
  const preorderTriggers = document.querySelectorAll(".open-preorder");
  const preorderForm = document.getElementById("preorderForm");
  const preorderSuccess = document.getElementById("preorderSuccess");

  preorderTriggers.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (preorderModal) {
        preorderModal.classList.add("open");
        if (preorderForm) preorderForm.style.display = "block";
        if (preorderSuccess) preorderSuccess.style.display = "none";
      }
    });
  });

  if (preorderClose && preorderModal) {
    preorderClose.addEventListener("click", () => {
      preorderModal.classList.remove("open");
    });
    preorderModal.addEventListener("click", (e) => {
      if (e.target === preorderModal) {
        preorderModal.classList.remove("open");
      }
    });
  }

  if (preorderForm) {
    preorderForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const emailInput = document.getElementById("preorderEmail");
      if (emailInput && emailInput.value) {
        preorderForm.style.display = "none";
        if (preorderSuccess) preorderSuccess.style.display = "block";
      }
    });
  }

  // Keyboard escape key to close modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (lightboxModal) lightboxModal.classList.remove("open");
      if (preorderModal) preorderModal.classList.remove("open");
    }
  });
});
