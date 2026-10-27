/**
 * DINA Mobile OS — Interactive Application Logic
 * Strictly adheres to PRD 3.0.0 and DINA Brand Identity
 * Closed palette, zero emojis, exact thermodynamic calculations
 */

document.addEventListener("DOMContentLoaded", () => {
  // Sound / Haptic Helper
  function triggerHaptic(pattern = [15]) {
    if ("vibrate" in navigator) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  }

  // PRD 3.0.0 Baselined 11-Slot 2-Tier Revolving Drum Inventory
  // Tier 2 (Top Drum): Slots 01 - 06 (6 full meal spaces)
  // Tier 1 (Bottom Drum): Slots 07 - 11 (5 meal spaces) + Slot 12 ("Espaço Vazio" pass-through drop chimney)
  const drumInventory = {
    "01": { id: "01", name: "Organic Chicken Breast", category: "chicken", weight: 500, tier: 2, slot: "01", thawTime: 95 },
    "02": { id: "02", name: "Prime Angus Beef Ribeye", category: "beef", weight: 450, tier: 2, slot: "02", thawTime: 85 },
    "03": { id: "03", name: "Atlantic Salmon Fillet", category: "fish", weight: 320, tier: 2, slot: "03", thawTime: 65 },
    "04": { id: "04", name: "Wild Tiger Prawns", category: "shrimp", weight: 250, tier: 2, slot: "04", thawTime: 40 },
    "05": { id: "05", name: "Artisanal Lasagna Prep", category: "lasagna", weight: 600, tier: 2, slot: "05", thawTime: 104 },
    "06": { id: "06", name: "Iberian Pork Tenderloin", category: "pork", weight: 350, tier: 2, slot: "06", thawTime: 74 },
    "07": { id: "07", name: "Codfish Loins (Bacalhau)", category: "fish", weight: 400, tier: 1, slot: "07", thawTime: 76 },
    "08": { id: "08", name: "Steak Mignon Portions", category: "beef", weight: 300, tier: 1, slot: "08", thawTime: 64 },
    "09": null, // Empty slot ready for loading
    "10": null, // Empty slot ready for loading
    "11": null, // Empty slot ready for loading
    "12": { id: "12", name: "Espaço Vazio (Drop Chimney)", category: "chimney", isChimney: true, tier: 1, slot: "12" }
  };

  // PRD 4.1 Thermodynamic Category Formulas
  // Thaw Duration [min] = Base Time + (Category Factor * Weight [g])
  const CATEGORY_FORMULAS = {
    beef: { name: "Meat / Beef / Steak (Carne)", base: 25, factor: 0.13 },
    chicken: { name: "Poultry / Chicken", base: 30, factor: 0.13 },
    fish: { name: "Fish / Fillet (Peixe)", base: 20, factor: 0.14 },
    shrimp: { name: "Seafood / Prawns", base: 15, factor: 0.10 },
    vegetables: { name: "Vegetables / Sides (Vegetais)", base: 15, factor: 0.08 },
    lasagna: { name: "Prepared Dishes / Lasagna", base: 35, factor: 0.115 },
    pork: { name: "Pork / Lamb (Carne)", base: 28, factor: 0.13 }
  };

  // Active App State
  const state = {
    activeTab: "tab-frozen",
    selectedSlot: "02", // Default to Beef Ribeye as shown in screenshot
    selectedMeal: drumInventory["02"],
    targetDinnerHour: 19,
    targetDinnerMinute: 30,
    dialAngle: 120, // corresponding to approx 19:30 or thaw duration
    isThawing: false,
    drawerTemp: -18.0,
    haloState: "amber", // cyan, amber, green, red
    commuteDelayActive: false,
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
    }, 3200);
  }

  // Format Time Helper
  function formatTime(h, m) {
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  // Calculate Thermodynamic Thaw Time
  function calculateThaw(catKey, grams) {
    const formula = CATEGORY_FORMULAS[catKey] || CATEGORY_FORMULAS.beef;
    const minutes = Math.round(formula.base + (formula.factor * grams));
    return minutes;
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

  // Desktop Device Frame Toggle
  const btnToggleView = document.getElementById("btnToggleView");
  if (btnToggleView) {
    btnToggleView.addEventListener("click", () => {
      document.body.classList.toggle("full-mode");
      if (document.body.classList.contains("full-mode")) {
        btnToggleView.textContent = "Phone Frame";
      } else {
        btnToggleView.textContent = "Full View";
      }
    });
  }

  // Dial SVG Generation & Drag Handling
  const dialContainer = document.getElementById("dialContainer");
  const dialTicksGroup = document.getElementById("dialTicks");
  const dialArc = document.getElementById("dialArc");
  const dialValue = document.getElementById("dialValue");

  // Render 48 radial tick marks around dial
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

  // Update Dial Display (Clock or duration arc)
  function updateDialUI() {
    if (!dialArc || !dialValue) return;
    const cx = 100;
    const cy = 100;
    const r = 88;

    // Arc from angle 0 to state.dialAngle
    const angleRad = (state.dialAngle) * (Math.PI / 180);
    const startX = cx + r * Math.cos(0);
    const startY = cy + r * Math.sin(0);
    const endX = cx + r * Math.cos(angleRad);
    const endY = cy + r * Math.sin(angleRad);
    const largeArc = state.dialAngle > 180 ? 1 : 0;

    const pathD = `M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`;
    dialArc.setAttribute("d", pathD);

    // Map dial angle (0 - 360) to dinner hour range (18:00 to 22:00)
    const minutesTotal = Math.round(18 * 60 + (state.dialAngle / 360) * 240); // 18:00 to 22:00
    state.targetDinnerHour = Math.floor(minutesTotal / 60);
    state.targetDinnerMinute = Math.round((minutesTotal % 60) / 5) * 5;
    if (state.targetDinnerMinute === 60) {
      state.targetDinnerHour += 1;
      state.targetDinnerMinute = 0;
    }

    dialValue.textContent = formatTime(state.targetDinnerHour, state.targetDinnerMinute);
  }

  // Dial Drag / Pointer Interaction
  if (dialContainer) {
    let isDragging = false;

    function handleDialPointer(e) {
      const rect = dialContainer.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);

      // Dial is rotated -90deg in CSS
      let dx = clientX - cx;
      let dy = clientY - cy;
      let theta = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (theta < 0) theta += 360;

      state.dialAngle = Math.max(15, Math.min(345, theta));
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

      if (state.selectedMeal) {
        showToast(`Selected: ${state.selectedMeal.name} (${state.selectedMeal.weight}g, ${state.selectedMeal.thawTime} min)`);
      }
    });
  });

  // Action Button ("Continue action" / Schedule Defrost)
  const btnContinueAction = document.getElementById("btnContinueAction");
  if (btnContinueAction) {
    btnContinueAction.addEventListener("click", () => {
      triggerHaptic([20, 50, 20]);
      const meal = state.selectedMeal || drumInventory["02"];
      const targetTime = formatTime(state.targetDinnerHour, state.targetDinnerMinute);
      
      // Calculate drop onset time
      const totalMins = state.targetDinnerHour * 60 + state.targetDinnerMinute;
      const dropMins = totalMins - meal.thawTime;
      const dropH = Math.floor(dropMins / 60);
      const dropM = dropMins % 60;
      const dropTimeStr = formatTime(dropH, dropM);

      showToast(`Dinner scheduled for ${targetTime}. Gravity drop triggers at ${dropTimeStr} (-18 °C to +10 °C).`);

      // Switch to Telemetry tab after 1.2s to show active sequence
      setTimeout(() => {
        const chatTab = document.querySelector('[data-tab="tab-chat"]');
        if (chatTab) chatTab.click();
        setHaloState("amber");
      }, 1400);
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
      loadThawCalcDisplay.textContent = `${mins} min`;
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

      // Update button label
      const slotBtn = document.querySelector(`.drum-slot-btn[data-slot="${slot}"]`);
      if (slotBtn) {
        slotBtn.classList.remove("empty");
        const nameEl = slotBtn.querySelector(".slot-name");
        if (nameEl) nameEl.textContent = `${catName} (${state.loadingWeight}g)`;
      }

      showToast(`Slot ${slot} loaded: Front aperture rotated drum. Saved to NVS.`);
    });
  }

  // TAB 3: COMMUTE SYNC
  const btnSimulateDelay = document.getElementById("btnSimulateDelay");
  const commuteStatusText = document.getElementById("commuteStatusText");

  if (btnSimulateDelay) {
    btnSimulateDelay.addEventListener("click", () => {
      triggerHaptic([25]);
      state.commuteDelayActive = !state.commuteDelayActive;
      if (state.commuteDelayActive) {
        btnSimulateDelay.textContent = "Reset Traffic Schedule";
        if (commuteStatusText) {
          commuteStatusText.textContent = "Traffic detected (+35m). Thaw delayed; +3.0 °C Chilled Safe-Hold engaged.";
          commuteStatusText.style.color = "var(--clay)";
        }
        showToast("Commute delayed: Defrost drawer transitioned to +3.0 °C Safe-Hold.");
        setHaloState("green");
      } else {
        btnSimulateDelay.textContent = "Simulate +30m Commute Delay";
        if (commuteStatusText) {
          commuteStatusText.textContent = "Route clear. Normal thaw schedule active.";
          commuteStatusText.style.color = "var(--ink-soft)";
        }
        showToast("Schedule restored to normal arrival.");
      }
    });
  }

  // TAB 4: CHAT / APPLIANCE TELEMETRY & HALO RING
  const haloVisual = document.getElementById("haloRingVisual");
  const haloStateLabel = document.getElementById("haloStateLabel");
  const haloBtns = document.querySelectorAll(".halo-btn");

  function setHaloState(mode) {
    if (!haloVisual) return;
    haloVisual.className = "halo-ring-visual " + mode;
    state.haloState = mode;

    let desc = "Pulsing Amber — Defrost Active (+10 °C)";
    if (mode === "cyan") desc = "Pulsing Cyan — Deep Freeze (-18 °C)";
    if (mode === "green") desc = "Solid Green — Ready, Chilled at +3.0 °C";
    if (mode === "red") desc = "Flashing Red — Temperature Alert";

    if (haloStateLabel) haloStateLabel.textContent = desc;
  }

  haloBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;
      setHaloState(mode);
      triggerHaptic([10]);
    });
  });

  // Top Bar Refresh Button
  const btnRefresh = document.getElementById("btnRefresh");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      triggerHaptic([15]);
      showToast("Appliance telemetry synchronized via Matter over Wi-Fi.");
    });
  }
});
