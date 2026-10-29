/**
 * DINA Mobile OS — Interactive Web App & Demo Logic
 * Strictly adheres to PRD 3.1.0 and DINA Brand Identity
 * Responsive across Mobile, iPad/Tablet, and PC; works in browser or installed as PWA
 */

document.addEventListener("DOMContentLoaded", () => {
  // Register Service Worker for optional standalone PWA Web App mode
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  // Sound / Haptic Helper
  function triggerHaptic(pattern = [15]) {
    if ("vibrate" in navigator) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  }

  // PRD 3.1.0 Baselined 11-Slot 2-Tier Revolving Drum Inventory
  // Tier 2 (Top Drum): Slots 01 - 06 (6 full meal spaces)
  // Tier 1 (Bottom Drum): Slots 07 - 11 (5 meal spaces) + Slot 12 ("Espaço Vazio" pass-through drop chimney)
  const drumInventory = {
    "01": { id: "01", name: "Chicken Breast", category: "chicken", weight: 500, tier: 2, slot: "01", thawTime: 95 },
    "02": { id: "02", name: "Beef Ribeye", category: "beef", weight: 450, tier: 2, slot: "02", thawTime: 85 },
    "03": { id: "03", name: "Atlantic Salmon", category: "fish", weight: 320, tier: 2, slot: "03", thawTime: 65 },
    "04": { id: "04", name: "Tiger Prawns", category: "shrimp", weight: 250, tier: 2, slot: "04", thawTime: 40 },
    "05": { id: "05", name: "Lasagna Prep", category: "lasagna", weight: 600, tier: 2, slot: "05", thawTime: 104 },
    "06": { id: "06", name: "Pork Tenderloin", category: "pork", weight: 350, tier: 2, slot: "06", thawTime: 74 },
    "07": { id: "07", name: "Codfish Loins", category: "fish", weight: 400, tier: 1, slot: "07", thawTime: 76 },
    "08": { id: "08", name: "Steak Mignon", category: "beef", weight: 300, tier: 1, slot: "08", thawTime: 64 },
    "09": null,
    "10": null,
    "11": null,
    "12": { id: "12", name: "Espaço Vazio (Drop Chimney)", category: "chimney", isChimney: true, tier: 1, slot: "12" }
  };

  // PRD 4.1 Thermodynamic Category Formulas (Estimated targets until MS-4 bench verification)
  const CATEGORY_FORMULAS = {
    beef: { name: "Meat / Beef / Steak (Carne)", base: 25, factor: 0.13 },
    chicken: { name: "Poultry / Chicken", base: 30, factor: 0.13 },
    fish: { name: "Fish / Fillet (Peixe)", base: 20, factor: 0.14 },
    shrimp: { name: "Seafood / Prawns", base: 15, factor: 0.10 },
    vegetables: { name: "Vegetables / Sides (Vegetais)", base: 15, factor: 0.08 },
    lasagna: { name: "Prepared Dishes / Lasagna", base: 35, factor: 0.115 },
    pork: { name: "Pork / Lamb (Carne)", base: 28, factor: 0.13 }
  };

  // Simulated reference clock for demo (17:20) so users can test normal vs Late-Rescue scheduling
  const DEMO_NOW_MINS = 17 * 60 + 20;

  // Active App State
  const state = {
    activeTab: "tab-frozen",
    selectedSlot: "02",
    selectedMeal: drumInventory["02"],
    targetDinnerHour: 19,
    targetDinnerMinute: 30,
    dialAngle: 135,
    isThawing: false,
    drawerTemp: -18.0,
    haloState: "amber",
    commuteDelayActive: false,
    commuteSyncEnabled: true,
    wifiOffline: false,
    loadingTargetSlot: "09",
    loadingCategory: "beef",
    loadingWeight: 450
  };

  // Toast Functionality (Zero emojis, calm voice)
  const toastEl = document.getElementById("toastMsg");
  let toastTimer = null;
  function showToast(text) {
    if (!toastEl) return;
    clearTimeout(toastTimer);
    toastEl.querySelector(".toast-text").textContent = text;
    toastEl.classList.add("visible");
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("visible");
    }, 3600);
  }

  function formatTime(h, m) {
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  function minsToTimeStr(totalMins) {
    const normalized = ((totalMins % 1440) + 1440) % 1440;
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return formatTime(h, m);
  }

  function calculateThaw(catKey, grams) {
    const formula = CATEGORY_FORMULAS[catKey] || CATEGORY_FORMULAS.beef;
    return Math.round(formula.base + (formula.factor * grams));
  }

  // Viewport Switcher for Live Demos (Auto / Phone / iPad / PC)
  const appRoot = document.getElementById("appRoot");
  const vpBtns = document.querySelectorAll(".vp-btn");
  vpBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-vp") || "auto";
      vpBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      if (appRoot) {
        appRoot.setAttribute("data-viewport", mode);
      }
      const modeLabel = mode === "auto" ? "Automatic responsive" : mode.toUpperCase();
      showToast(`Layout view: ${modeLabel} mode.`);
    });
  });

  // Optional PWA Install Prompt & Banner
  let deferredInstallPrompt = null;
  const btnInstallApp = document.getElementById("btnInstallApp");
  const pwaInstallBanner = document.getElementById("pwaInstallBanner");
  const btnTriggerNativeInstall = document.getElementById("btnTriggerNativeInstall");
  const btnCloseInstallBanner = document.getElementById("btnCloseInstallBanner");

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (btnTriggerNativeInstall) {
      btnTriggerNativeInstall.hidden = false;
    }
  });

  if (btnInstallApp && pwaInstallBanner) {
    btnInstallApp.addEventListener("click", () => {
      const isHidden = pwaInstallBanner.hasAttribute("hidden");
      if (isHidden) {
        pwaInstallBanner.removeAttribute("hidden");
      } else {
        pwaInstallBanner.setAttribute("hidden", "");
      }
    });
  }

  if (btnCloseInstallBanner && pwaInstallBanner) {
    btnCloseInstallBanner.addEventListener("click", () => {
      pwaInstallBanner.setAttribute("hidden", "");
    });
  }

  if (btnTriggerNativeInstall) {
    btnTriggerNativeInstall.addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      btnTriggerNativeInstall.hidden = true;
      if (pwaInstallBanner) pwaInstallBanner.setAttribute("hidden", "");
    });
  }

  // Tab Navigation
  const pillTabs = document.querySelectorAll(".pill-tab");
  const tabContents = document.querySelectorAll(".tab-content");

  pillTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      triggerHaptic([10]);
      const targetId = tab.dataset.tab;
      pillTabs.forEach(t => t.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add("active");
      state.activeTab = targetId;
    });
  });

  // Dial SVG Generation & Drag Handling
  const dialContainer = document.getElementById("dialContainer");
  const dialTicksGroup = document.getElementById("dialTicks");
  const dialArc = document.getElementById("dialArc");
  const dialValue = document.getElementById("dialValue");
  const summaryMealName = document.getElementById("summaryMealName");
  const summaryDropTime = document.getElementById("summaryDropTime");
  const lateRescueNotice = document.getElementById("lateRescueNotice");
  const oneTapQuestionText = document.getElementById("oneTapQuestionText");
  const presetChips = document.querySelectorAll(".time-preset-chip");

  function renderDialTicks() {
    if (!dialTicksGroup) return;
    dialTicksGroup.innerHTML = "";
    const totalTicks = 48;
    const cx = 100;
    const cy = 100;
    const rOuter = 95;
    const rInner = 84;
    const rInnerMajor = 78;

    for (let i = 0; i < totalTicks; i++) {
      const angle = (i * 360 / totalTicks) * (Math.PI / 180);
      const isMajor = (i % 4 === 0);
      const rIn = isMajor ? rInnerMajor : rInner;

      const x1 = cx + rOuter * Math.cos(angle);
      const y1 = cy + rOuter * Math.sin(angle);
      const x2 = cx + rIn * Math.cos(angle);
      const y2 = cy + rIn * Math.sin(angle);

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x1);
      line.setAttribute("y1", y1);
      line.setAttribute("x2", x2);
      line.setAttribute("y2", y2);
      line.setAttribute("stroke", isMajor ? "#5A5753" : "#9E9696");
      line.setAttribute("stroke-width", isMajor ? "1.5" : "1");
      dialTicksGroup.appendChild(line);
    }
  }
  renderDialTicks();

  function updateDialUI() {
    if (!dialArc || !dialValue) return;
    const cx = 100;
    const cy = 100;
    const r = 88;

    const angleRad = (state.dialAngle) * (Math.PI / 180);
    const startX = cx + r * Math.cos(0);
    const startY = cy + r * Math.sin(0);
    const endX = cx + r * Math.cos(angleRad);
    const endY = cy + r * Math.sin(angleRad);
    const largeArc = state.dialAngle > 180 ? 1 : 0;

    const pathD = `M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`;
    dialArc.setAttribute("d", pathD);

    // Map dial angle (0 - 360) to dinner hour range (18:00 to 22:00)
    const minutesTotal = Math.round(18 * 60 + (state.dialAngle / 360) * 240);
    state.targetDinnerHour = Math.floor(minutesTotal / 60);
    state.targetDinnerMinute = Math.round((minutesTotal % 60) / 5) * 5;
    if (state.targetDinnerMinute === 60) {
      state.targetDinnerHour += 1;
      state.targetDinnerMinute = 0;
    }

    const meal = state.selectedMeal || drumInventory["02"];
    const requestedMins = state.targetDinnerHour * 60 + state.targetDinnerMinute;
    const earliestSafeReadyMins = DEMO_NOW_MINS + meal.thawTime;
    const isLateRescue = requestedMins < earliestSafeReadyMins;

    const effectiveReadyMins = isLateRescue ? earliestSafeReadyMins : requestedMins;
    const dropMins = effectiveReadyMins - meal.thawTime;

    const displayTimeStr = minsToTimeStr(effectiveReadyMins);
    dialValue.textContent = displayTimeStr;

    if (summaryMealName) {
      summaryMealName.textContent = `${meal.name} (${meal.weight} g)`;
    }
    if (summaryDropTime) {
      summaryDropTime.textContent = isLateRescue
        ? `Immediate drop (${minsToTimeStr(DEMO_NOW_MINS)}) • ~${meal.thawTime} min est.`
        : `${minsToTimeStr(dropMins)} (-${meal.thawTime} min est.)`;
    }
    if (lateRescueNotice) {
      if (isLateRescue) {
        lateRescueNotice.removeAttribute("hidden");
        lateRescueNotice.innerHTML = `<strong>Late-Rescue Mode (REQ-F-02):</strong> Requested ${minsToTimeStr(requestedMins)} is earlier than minimum safe thaw (~${meal.thawTime} min). Earliest safe ready time <strong>${displayTimeStr}</strong> set instead of an unsafe fast thaw.`;
      } else {
        lateRescueNotice.setAttribute("hidden", "");
      }
    }
    if (oneTapQuestionText) {
      oneTapQuestionText.innerHTML = `Dinner tonight: <strong>${meal.name}</strong> (Slot ${meal.slot}) ready at <strong>${displayTimeStr}</strong>?`;
    }
  }

  if (dialContainer) {
    let isDragging = false;

    function handleDialPointer(e) {
      const rect = dialContainer.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0].clientX);
      const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0].clientY);

      let dx = clientX - cx;
      let dy = clientY - cy;
      let theta = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (theta < 0) theta += 360;

      state.dialAngle = Math.max(15, Math.min(345, theta));
      presetChips.forEach(c => c.classList.remove("active"));
      updateDialUI();
    }

    dialContainer.addEventListener("mousedown", (e) => {
      isDragging = true;
      handleDialPointer(e);
    });
    window.addEventListener("mousemove", (e) => {
      if (isDragging) handleDialPointer(e);
    });
    window.addEventListener("mouseup", () => {
      isDragging = false;
    });

    dialContainer.addEventListener("touchstart", (e) => {
      isDragging = true;
      handleDialPointer(e);
    }, { passive: true });
    window.addEventListener("touchmove", (e) => {
      if (isDragging) handleDialPointer(e);
    }, { passive: true });
    window.addEventListener("touchend", () => {
      isDragging = false;
    });

    updateDialUI();
  }

  // Quick Time Preset Chips
  presetChips.forEach(chip => {
    chip.addEventListener("click", () => {
      triggerHaptic([10]);
      presetChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      state.dialAngle = parseFloat(chip.dataset.angle || "135");
      updateDialUI();
    });
  });

  // Meal Cards Selection in TAB 1: Frozen
  const mealCards = document.querySelectorAll(".meal-card");
  mealCards.forEach(card => {
    card.addEventListener("click", () => {
      triggerHaptic([10]);
      mealCards.forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      const slot = card.dataset.slot;
      state.selectedSlot = slot;
      state.selectedMeal = drumInventory[slot];
      updateDialUI();

      if (state.selectedMeal) {
        showToast(`Selected: ${state.selectedMeal.name} (${state.selectedMeal.weight} g, ~${state.selectedMeal.thawTime} min est.)`);
      }
    });
  });

  // 15:00 One-Tap Confirmation Buttons (REQ-F-03)
  const btnOneTapYes = document.getElementById("btnOneTapYes");
  const btnOneTapSwap = document.getElementById("btnOneTapSwap");
  const btnOneTapSkip = document.getElementById("btnOneTapSkip");

  if (btnOneTapYes) {
    btnOneTapYes.addEventListener("click", () => {
      triggerHaptic([20]);
      const meal = state.selectedMeal || drumInventory["02"];
      const readyStr = dialValue ? dialValue.textContent : "19:30";
      showToast(`Confirmed in 1 tap: ${meal.name} scheduled for ${readyStr}.`);
      setHaloState("amber");
    });
  }

  if (btnOneTapSwap) {
    btnOneTapSwap.addEventListener("click", () => {
      triggerHaptic([10]);
      const order = ["02", "03", "01", "04", "05", "06"];
      const nextIdx = (order.indexOf(state.selectedSlot) + 1) % order.length;
      const nextSlot = order[nextIdx];
      const nextCard = document.querySelector(`.meal-card[data-slot="${nextSlot}"]`);
      if (nextCard) nextCard.click();
    });
  }

  if (btnOneTapSkip) {
    btnOneTapSkip.addEventListener("click", () => {
      triggerHaptic([15]);
      showToast("Tonight's automatic drop skipped. Drum remains sealed at -18.0 °C.");
      setHaloState("cyan");
    });
  }

  // Action Button ("Confirm Dinner Schedule")
  const btnContinueAction = document.getElementById("btnContinueAction");
  if (btnContinueAction) {
    btnContinueAction.addEventListener("click", () => {
      triggerHaptic([20, 50, 20]);
      const meal = state.selectedMeal || drumInventory["02"];
      const readyStr = dialValue ? dialValue.textContent : "19:30";

      showToast(`${meal.name} scheduled for ${readyStr}. Surface cutoff <= +4.0 °C; Safe-Hold +3.0 °C (max 24 h).`);

      setTimeout(() => {
        const chatTab = document.querySelector('[data-tab="tab-chat"]');
        if (chatTab) chatTab.click();
        setHaloState("amber");
      }, 1200);
    });
  }

  // TAB 2: MEALS (2-Tier Drum & Loading Mode)
  const drumSlotButtons = document.querySelectorAll(".drum-slot-btn");
  const selectedSlotDisplay = document.getElementById("selectedSlotDisplay");
  const loadCategoryChips = document.querySelectorAll(".cat-chip");
  const loadWeightSlider = document.getElementById("loadWeightSlider");
  const loadWeightValue = document.getElementById("loadWeightValue");
  const loadThawCalcDisplay = document.getElementById("loadThawCalcDisplay");
  const btnConfirmStore = document.getElementById("btnConfirmStore");

  drumSlotButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const slot = btn.dataset.slot;
      if (slot === "12") {
        showToast("Slot 12 is 'Espaço Vazio' — Pass-through drop chimney for Tier 2.");
        return;
      }
      drumSlotButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.loadingTargetSlot = slot;
      if (selectedSlotDisplay) {
        selectedSlotDisplay.textContent = `Slot ${slot}`;
      }
      triggerHaptic([10]);
    });
  });

  loadCategoryChips.forEach(chip => {
    chip.addEventListener("click", () => {
      loadCategoryChips.forEach(c => c.classList.remove("selected"));
      chip.classList.add("selected");
      state.loadingCategory = chip.dataset.cat;
      updateLoadingThawDisplay();
      triggerHaptic([10]);
    });
  });

  if (loadWeightSlider) {
    loadWeightSlider.addEventListener("input", (e) => {
      state.loadingWeight = parseInt(e.target.value, 10);
      if (loadWeightValue) loadWeightValue.textContent = `${state.loadingWeight} g`;
      updateLoadingThawDisplay();
    });
  }

  function updateLoadingThawDisplay() {
    const mins = calculateThaw(state.loadingCategory, state.loadingWeight);
    if (loadThawCalcDisplay) {
      loadThawCalcDisplay.textContent = `~${mins} min`;
    }
  }
  updateLoadingThawDisplay();

  if (btnConfirmStore) {
    btnConfirmStore.addEventListener("click", () => {
      triggerHaptic([20, 60]);
      const slot = state.loadingTargetSlot;
      const mins = calculateThaw(state.loadingCategory, state.loadingWeight);
      const catName = CATEGORY_FORMULAS[state.loadingCategory].name.split("(")[0].trim();

      drumInventory[slot] = {
        id: slot,
        name: `${catName} Prep`,
        category: state.loadingCategory,
        weight: state.loadingWeight,
        tier: parseInt(slot, 10) <= 6 ? 2 : 1,
        slot: slot,
        thawTime: mins
      };

      const slotBtn = document.querySelector(`.drum-slot-btn[data-slot="${slot}"]`);
      if (slotBtn) {
        slotBtn.classList.remove("empty");
        const nameEl = slotBtn.querySelector(".slot-name");
        if (nameEl) nameEl.textContent = `${catName} (${state.loadingWeight}g)`;
      }

      showToast(`Slot ${slot} rotated to front loading window and saved to NVS (~${mins} min est.).`);
    });
  }

  // TAB 3: COMMUTE SYNC & OFFLINE AUTONOMY
  const btnSimulateDelay = document.getElementById("btnSimulateDelay");
  const commuteStatusText = document.getElementById("commuteStatusText");
  const commuteArrivalText = document.getElementById("commuteArrivalText");
  const btnToggleCommuteSync = document.getElementById("btnToggleCommuteSync");
  const btnSimulateOffline = document.getElementById("btnSimulateOffline");
  const offlineStatusText = document.getElementById("offlineStatusText");
  const headerStatusText = document.getElementById("headerStatusText");

  if (btnToggleCommuteSync) {
    btnToggleCommuteSync.addEventListener("click", () => {
      state.commuteSyncEnabled = !state.commuteSyncEnabled;
      btnToggleCommuteSync.classList.toggle("active", state.commuteSyncEnabled);
      btnToggleCommuteSync.setAttribute("aria-pressed", String(state.commuteSyncEnabled));
      btnToggleCommuteSync.textContent = state.commuteSyncEnabled ? "ON" : "OFF";
      showToast(state.commuteSyncEnabled
        ? "On-device Commute Sync enabled (zero location data sent to cloud)."
        : "Commute Sync disabled. Cached dinner schedule runs autonomously.");
    });
  }

  if (btnSimulateDelay) {
    btnSimulateDelay.addEventListener("click", () => {
      triggerHaptic([25]);
      state.commuteDelayActive = !state.commuteDelayActive;
      if (state.commuteDelayActive) {
        btnSimulateDelay.textContent = "Reset Traffic Schedule";
        if (commuteStatusText) {
          commuteStatusText.textContent = "Delay signal received (+30m). Drawer switched to +3.0 °C Chilled Safe-Hold (max 24 h).";
          commuteStatusText.style.color = "var(--clay)";
        }
        if (commuteArrivalText) {
          commuteArrivalText.textContent = "19:35 CET • Held safely at +3.0 °C (max 24 h)";
        }
        showToast("Delay signal received: Defrost drawer locked into +3.0 °C Safe-Hold.");
        setHaloState("green");
      } else {
        btnSimulateDelay.textContent = "Simulate +30m Commute Delay";
        if (commuteStatusText) {
          commuteStatusText.textContent = "Route clear. Normal thaw schedule active.";
          commuteStatusText.style.color = "var(--ink-soft)";
        }
        if (commuteArrivalText) {
          commuteArrivalText.textContent = "19:05 CET • Ready at 19:30 target (Core >= -1 °C)";
        }
        showToast("Schedule restored to normal arrival.");
      }
    });
  }

  if (btnSimulateOffline) {
    btnSimulateOffline.addEventListener("click", () => {
      triggerHaptic([15]);
      state.wifiOffline = !state.wifiOffline;
      if (state.wifiOffline) {
        btnSimulateOffline.textContent = "Restore Home Wi-Fi";
        if (offlineStatusText) {
          offlineStatusText.textContent = "Wi-Fi offline (REQ-F-06): Running cached schedule from ESP32-S3 NVS, then +3.0 °C Safe-Hold.";
          offlineStatusText.style.color = "var(--clay)";
        }
        if (headerStatusText) headerStatusText.textContent = "Offline • NVS Active";
        showToast("Wi-Fi disconnected: Onboard controller running cached schedule autonomously.");
      } else {
        btnSimulateOffline.textContent = "Simulate Wi-Fi Offline";
        if (offlineStatusText) {
          offlineStatusText.textContent = "Home Wi-Fi connected. Schedule cached in ESP32-S3 NVS.";
          offlineStatusText.style.color = "var(--ink-soft)";
        }
        if (headerStatusText) headerStatusText.textContent = "Matter Online";
        showToast("Wi-Fi reconnected: Matter telemetry synchronized.");
      }
    });
  }

  // TAB 4: STATUS, HALO RING & PRD 3.1.0 SAFETY / HYGIENE CHECKS
  const haloVisual = document.getElementById("haloRingVisual");
  const haloStateLabel = document.getElementById("haloStateLabel");
  const haloBtns = document.querySelectorAll(".halo-btn");
  const telemDrawerTemp = document.getElementById("telemDrawerTemp");
  const telemBlackoutVal = document.getElementById("telemBlackoutVal");

  function setHaloState(mode) {
    if (!haloVisual) return;
    haloVisual.className = "halo-ring-visual " + mode;
    state.haloState = mode;

    let desc = "Pulsing Amber — Defrost Active (+10 °C, Surface <= +4.0 °C)";
    if (mode === "cyan") {
      desc = "Pulsing Cyan — Deep Freeze Standby (-18.0 °C)";
      if (telemDrawerTemp) telemDrawerTemp.textContent = "+3.0 °C";
    } else if (mode === "amber") {
      if (telemDrawerTemp) telemDrawerTemp.textContent = "+10.0 °C";
      if (telemBlackoutVal) telemBlackoutVal.textContent = "NVS OK";
    } else if (mode === "green") {
      desc = "Solid Green — Core >= -1 °C, Chilled at +3.0 °C (Max 24 h)";
      if (telemDrawerTemp) telemDrawerTemp.textContent = "+3.0 °C";
      if (telemBlackoutVal) telemBlackoutVal.textContent = "NVS OK";
    } else if (mode === "red") {
      desc = "Flashing Red — Safety Alert (Check App)";
    }

    if (haloStateLabel) haloStateLabel.textContent = desc;
  }

  haloBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;
      setHaloState(mode);
      triggerHaptic([10]);
    });
  });

  // PRD 3.1.0 Demo Scenario Controls
  const btnSimPowerCut = document.getElementById("btnSimPowerCut");
  const btnSimDrawerOpen = document.getElementById("btnSimDrawerOpen");
  const btnSimDishClean = document.getElementById("btnSimDishClean");

  if (btnSimPowerCut) {
    btnSimPowerCut.addEventListener("click", () => {
      triggerHaptic([30, 40, 30]);
      setHaloState("red");
      if (telemBlackoutVal) telemBlackoutVal.textContent = "DISCARD";
      if (haloStateLabel) {
        haloStateLabel.textContent = "Flashing Red — Power Cut Alert: Surface > +5.0 °C for > 2 h (Discard Meal)";
      }
      showToast("Power-Cut Rule (REQ-S-04): Surface exceeded +5 °C for > 2 h cumulatively. Discard alert triggered.");
    });
  }

  if (btnSimDrawerOpen) {
    btnSimDrawerOpen.addEventListener("click", () => {
      triggerHaptic([20]);
      showToast("Airlock Interlock (REQ-F-05): Drawer open or occupied. Hatch stays sealed; drop delayed.");
    });
  }

  if (btnSimDishClean) {
    btnSimDishClean.addEventListener("click", () => {
      triggerHaptic([15]);
      showToast("Hygiene Reminder (REQ-H-01): Please wipe or dishwasher-clean the removable condensate dish.");
    });
  }

  // Top Bar Refresh Button
  const btnRefresh = document.getElementById("btnRefresh");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      triggerHaptic([15]);
      showToast("Appliance telemetry synchronized via Matter over Wi-Fi.");
    });
  }
});
