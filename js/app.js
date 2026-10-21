/**
 * DINA Mobile OS — Interactive Application Logic
 * Apple Human Interface Guidelines & Touch Ergonomics
 * Zero emojis: Uses clean inline SVGs
 */

document.addEventListener("DOMContentLoaded", () => {
  // Sound / Haptic Helper
  function triggerHaptic(pattern = [15]) {
    if ("vibrate" in navigator) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  }

  // SVG Icons for Toasts
  const ICONS = {
    check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#30d158" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    heat: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff9f0a" stroke-width="2.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`,
    shield: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#30d158" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
    timer: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffb340" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    gear: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`
  };

  // Toast Engine
  const toastContainer = document.getElementById("toastContainer");
  function showToast(message, iconSvg = ICONS.check) {
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = "app-toast";
    toast.innerHTML = `<span style="display:flex; align-items:center;">${iconSvg}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("visible");
    });

    setTimeout(() => {
      toast.classList.remove("visible");
      setTimeout(() => {
        toast.remove();
      }, 220);
    }, 2400);
  }

  // Inventory Database (Clean strings, zero emojis)
  const inventoryItems = {
    "01": { name: "Organic Chicken Breast", weight: "500g", slot: "01", thawTime: 95 },
    "02": { name: "Prime Angus Ribeye Steak", weight: "450g", slot: "02", thawTime: 85 },
    "03": { name: "Wild Tiger Prawns", weight: "300g", slot: "03", thawTime: 45 },
    "04": { name: "Atlantic Salmon Fillet", weight: "320g", slot: "04", thawTime: 65 },
    "05": { name: "Artisanal Lasagna Prep", weight: "650g", slot: "05", thawTime: 110 }
  };

  const appState = {
    selectedSlot: "02",
    mealName: "Prime Angus Ribeye Steak",
    mealWeight: "450g",
    targetDinnerTime: "19:30",
    isThawing: false,
    drawerTemp: -18.0,
    safeHoldActive: false
  };

  // DOM Elements
  const heroMealName = document.getElementById("heroMealName");
  const heroMealSpecs = document.getElementById("heroMealSpecs");
  const drawerTempDisplay = document.getElementById("drawerTempDisplay");
  const ringProgress = document.getElementById("ringProgress");
  const ringPctText = document.getElementById("ringPctText");
  const thawStatusBadge = document.getElementById("thawStatusBadge");

  // Bottom Sheet
  const sheetBackdrop = document.getElementById("sheetBackdrop");
  const bottomSheet = document.getElementById("bottomSheet");
  const sheetHandle = document.getElementById("sheetHandle");
  const sheetTitle = document.getElementById("sheetTitle");
  const sheetSub = document.getElementById("sheetSub");
  const sheetTime = document.getElementById("sheetTime");
  const sheetWeight = document.getElementById("sheetWeight");
  const sheetStageBtn = document.getElementById("sheetStageBtn");
  let pendingSheetSlot = null;

  function openSheet(slotId) {
    const item = inventoryItems[slotId];
    if (!item) return;
    pendingSheetSlot = slotId;
    sheetTitle.textContent = item.name;
    sheetSub.textContent = `Vault Slot ${item.slot} • Deep Frozen`;
    sheetTime.textContent = `${item.thawTime} min`;
    sheetWeight.textContent = item.weight;

    sheetBackdrop.classList.add("open");
    bottomSheet.classList.add("open");
    triggerHaptic([10]);
  }

  function closeSheet() {
    sheetBackdrop.classList.remove("open");
    bottomSheet.classList.remove("open");
    pendingSheetSlot = null;
  }

  if (sheetHandle) sheetHandle.addEventListener("click", closeSheet);
  if (sheetBackdrop) sheetBackdrop.addEventListener("click", closeSheet);

  if (sheetStageBtn) {
    sheetStageBtn.addEventListener("click", () => {
      if (pendingSheetSlot && inventoryItems[pendingSheetSlot]) {
        const item = inventoryItems[pendingSheetSlot];
        appState.selectedSlot = pendingSheetSlot;
        appState.mealName = item.name;
        appState.mealWeight = item.weight;

        heroMealName.textContent = item.name;
        heroMealSpecs.textContent = `${item.weight} • Vault Slot ${item.slot} • Est: ${item.thawTime}m`;

        document.querySelectorAll(".slot-item").forEach(el => {
          el.classList.toggle("active-selected", el.dataset.slot === pendingSheetSlot);
        });

        closeSheet();
        showToast(`Staged ${item.name} for dinner`, ICONS.check);
        triggerHaptic([20]);
      }
    });
  }

  document.querySelectorAll(".slot-item").forEach(item => {
    item.addEventListener("click", () => {
      openSheet(item.dataset.slot);
    });
  });

  // ==========================================================================
  // Touch-First Slide-to-Thaw Gesture Engine
  // ==========================================================================
  const sliderTrack = document.getElementById("sliderTrack");
  const sliderThumb = document.getElementById("sliderThumb");
  const sliderFill = document.getElementById("sliderFill");
  const sliderText = document.getElementById("sliderText");

  let isDragging = false;
  let startX = 0;
  let currentX = 0;
  let maxDistance = 0;
  let dragStartTime = 0;

  function initSlider() {
    if (!sliderTrack || !sliderThumb) return;
    maxDistance = sliderTrack.clientWidth - sliderThumb.clientWidth - 8;
  }
  window.addEventListener("resize", initSlider);
  initSlider();

  function onPointerDown(e) {
    if (appState.isThawing) return;
    isDragging = true;
    startX = e.clientX || (e.touches && e.touches[0].clientX);
    dragStartTime = Date.now();
    sliderThumb.setPointerCapture?.(e.pointerId);
    sliderThumb.style.transition = "none";
    sliderFill.style.transition = "none";
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    let delta = clientX - startX;

    if (delta < 0) delta = 0;
    if (delta > maxDistance) {
      const overDrag = delta - maxDistance;
      delta = maxDistance + Math.pow(overDrag, 0.6);
    }

    currentX = delta;
    sliderThumb.style.transform = `translateX(${delta}px)`;
    const progress = Math.min(1, delta / maxDistance);
    sliderFill.style.width = `${progress * 100}%`;
    sliderText.style.opacity = `${1 - progress * 1.5}`;
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;

    const dragTime = Date.now() - dragStartTime;
    const velocity = currentX / dragTime;
    const progress = currentX / maxDistance;

    if (progress >= 0.75 || velocity > 0.35) {
      sliderThumb.style.transition = "transform 140ms var(--ease-apple)";
      sliderThumb.style.transform = `translateX(${maxDistance}px)`;
      sliderFill.style.transition = "width 140ms var(--ease-apple)";
      sliderFill.style.width = "100%";
      triggerHaptic([25, 50]);
      startThawSequence();
    } else {
      sliderThumb.style.transition = "transform 220ms var(--ease-drawer)";
      sliderThumb.style.transform = "translateX(0px)";
      sliderFill.style.transition = "width 220ms var(--ease-drawer)";
      sliderFill.style.width = "0%";
      sliderText.style.opacity = "1";
    }
  }

  if (sliderThumb) {
    sliderThumb.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }

  function startThawSequence() {
    appState.isThawing = true;
    thawStatusBadge.textContent = "Transferring Slot " + appState.selectedSlot;
    sliderText.textContent = "THAWING IN PROGRESS";
    sliderText.style.opacity = "1";

    showToast("Robotic Transfer: Staging to Drawer", ICONS.gear);

    setTimeout(() => {
      thawStatusBadge.textContent = "Gentle Plate Thaw Active";

      let temp = -18.0;
      const target = 10.0;
      const tempTimer = setInterval(() => {
        temp += 1.0;
        if (temp >= target) {
          temp = target;
          clearInterval(tempTimer);
        }
        drawerTempDisplay.textContent = `${temp > 0 ? "+" : ""}${temp.toFixed(1)}°C`;
      }, 50);

      let pct = 0;
      const ringTimer = setInterval(() => {
        pct += 2;
        if (pct > 100) {
          pct = 100;
          clearInterval(ringTimer);
        }
        ringProgress.style.strokeDashoffset = `${200 - (200 * pct) / 100}`;
        ringPctText.textContent = `${pct}%`;
      }, 80);

      showToast("Conduction plate active at +10°C", ICONS.heat);
    }, 1200);
  }

  // Quick Action Delay
  const btnDelay = document.getElementById("btnDelay");
  if (btnDelay) {
    btnDelay.addEventListener("click", () => {
      showToast("Delay applied: Thaw scheduled for 20:00", ICONS.timer);
      triggerHaptic([15]);
      const targetEl = document.getElementById("targetTimeLabel");
      if (targetEl) targetEl.textContent = "20:00";
    });
  }

  // Quick Action Safe-Hold
  const btnSafeHold = document.getElementById("btnSafeHold");
  if (btnSafeHold) {
    btnSafeHold.addEventListener("click", () => {
      appState.safeHoldActive = !appState.safeHoldActive;
      if (appState.safeHoldActive) {
        drawerTempDisplay.textContent = "+3.0°C";
        thawStatusBadge.textContent = "Safe-Hold Refrigerated (+3°C)";
        showToast("Safe-Hold active: holding at +3°C", ICONS.shield);
      } else {
        drawerTempDisplay.textContent = "+10.0°C";
        thawStatusBadge.textContent = "Gentle Plate Thaw Active";
        showToast("Active Thaw resumed (+10°C)", ICONS.heat);
      }
      triggerHaptic([15]);
    });
  }

  // Refresh Button Sync
  const btnRefreshApp = document.getElementById("btnRefreshApp");
  if (btnRefreshApp) {
    btnRefreshApp.addEventListener("click", () => {
      showToast("Kitchen DINA synchronized", ICONS.check);
      triggerHaptic([10]);
    });
  }

  // Bottom Navigation Tabs
  const navTabs = document.querySelectorAll(".nav-tab-btn");
  const tabViews = document.querySelectorAll(".tab-view");

  navTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetTabId = tab.dataset.tab;
      triggerHaptic([10]);

      navTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      tabViews.forEach(view => {
        view.classList.toggle("active", view.id === targetTabId);
      });
    });
  });
});
