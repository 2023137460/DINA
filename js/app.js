/**
 * DINA Companion App — Interactive Consumer Web App & Demo Logic (v9.3)
 * Engineering & sensory fidelity aligned with PRD 3.1.0, DINA Brand Identity,
 * Apple Design principles, and mobile/anti-slop guidelines.
 * Responsive across Mobile, iPad/Tablet, and PC; works in browser or installed as PWA.
 *
 * Thermal Model Assumptions & Boundary Conditions:
 * 1. Geometry: Shallow 750 ml container (210 x 130 x 28 mm, total convective area A ≈ 0.074 m²).
 *    Flatter profile reduces conduction distance to core (D/2 ≈ 10–14 mm).
 * 2. Convective Power: Forced air at +10.0 °C duct setpoint with dual-crossflow circulation
 *    delivers net 18–22 W heat flux into food container (overall U ≈ 16.3 W/(m²·K)).
 * 3. Sensing & Closed-Loop Control: Lid-contact food surface thermistor probe (NTC) with hermetic seal
 *    interface monitors boundary layer; +10.0 °C air shuts off at +4.0 °C (±0.5 °C hysteresis band).
 * 4. Four-Stage Defrost Cycle: Frozen (-18 °C) -> Active Thaw (+10 °C air until surface +4.0 °C)
 *    -> Equalization (conduction soak at +3.0 °C) -> Fridge Hold (+3.0 °C, up to 24 h).
 */

document.addEventListener("DOMContentLoaded", () => {
  // Register Service Worker for optional standalone PWA Web App mode
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  // Haptic Helper (Apple WWDC 2026 Multimodal Feedback Principle)
  function triggerHaptic(pattern = [15]) {
    if ("vibrate" in navigator) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  }

  // Modified Plank-Type Convective Model Parameters
  // Synchronized identically with calculator.js and main-site validation specs
  const CATEGORY_FORMULAS = {
    beef: {
      name: "Prime Angus Steak & Beef",
      base: 26,
      factor: 0.131,
      holdMinutes: 20,
      densityName: "Dense Protein (1.06 g/cm³)"
    },
    chicken: {
      name: "Organic Poultry & Chicken",
      base: 30,
      factor: 0.130,
      holdMinutes: 20,
      densityName: "Standard Poultry (1.04 g/cm³)"
    },
    fish: {
      name: "Fish Fillets & Whitefish",
      base: 25,
      factor: 0.125,
      holdMinutes: 15,
      densityName: "Tender Fillet (1.05 g/cm³)"
    },
    shrimp: {
      name: "Wild Prawns & Shellfish",
      base: 15,
      factor: 0.100,
      holdMinutes: 10,
      densityName: "Shellfish / Porous (1.02 g/cm³)"
    },
    vegetables: {
      name: "Fresh Garden Vegetables",
      base: 15,
      factor: 0.080,
      holdMinutes: 10,
      densityName: "Light / Fibrous (0.92 g/cm³)"
    },
    lasagna: {
      name: "Artisanal Lasagna & Batch Dish",
      base: 35,
      factor: 0.115,
      holdMinutes: 25,
      densityName: "Dense Layered Batch (1.08 g/cm³)"
    },
    pork: {
      name: "Pork Tenderloin & Medallions",
      base: 28,
      factor: 0.131,
      holdMinutes: 15,
      densityName: "Lean Cut (1.05 g/cm³)"
    }
  };

  function calculateThaw(catKey, grams) {
    const formula = CATEGORY_FORMULAS[catKey] || CATEGORY_FORMULAS.beef;
    return Math.round(formula.base + (formula.factor * grams));
  }

  function getEqualizationTime(catKey, grams) {
    const formula = CATEGORY_FORMULAS[catKey] || CATEGORY_FORMULAS.beef;
    return formula.holdMinutes || 15;
  }

  function getDensityName(catKey) {
    const formula = CATEGORY_FORMULAS[catKey] || CATEGORY_FORMULAS.beef;
    return formula.densityName || "Standard (1.04 g/cm³)";
  }

  // 11-Meal Revolving Carousel Inventory (Aligned with main site and validation table)
  // Upper Ring: Containers 01 - 06 (6 meal containers)
  // Lower Ring: Containers 07 - 11 (5 meal containers) + Slot 12 (Auto-Drop Path)
  const drumInventory = {
    "01": { id: "01", name: "Organic Chicken Breast", category: "chicken", weight: 500, tier: 2, slot: "01", photo: "assets/images/meal_chicken_breast.jpg" },
    "02": { id: "02", name: "Prime Angus Ribeye", category: "beef", weight: 450, tier: 2, slot: "02", photo: "assets/images/meal_beef_ribeye.jpg" },
    "03": { id: "03", name: "Atlantic Salmon Fillet", category: "fish", weight: 320, tier: 2, slot: "03", photo: "assets/images/meal_salmon_fillet.jpg" },
    "04": { id: "04", name: "Wild Tiger Prawns", category: "shrimp", weight: 250, tier: 2, slot: "04", photo: "assets/images/meal_tiger_prawns.jpg" },
    "05": { id: "05", name: "Artisanal Lasagna", category: "lasagna", weight: 600, tier: 2, slot: "05", photo: "assets/images/meal_lasagna.jpg" },
    "06": { id: "06", name: "Pork Tenderloin Medallions", category: "pork", weight: 350, tier: 2, slot: "06", photo: "assets/images/meal_pork_tenderloin.jpg" },
    "07": { id: "07", name: "Atlantic Codfish Loins", category: "fish", weight: 400, tier: 1, slot: "07", photo: "assets/images/meal_salmon_fillet.jpg" },
    "08": { id: "08", name: "Filet Mignon Steak", category: "beef", weight: 300, tier: 1, slot: "08", photo: "assets/images/meal_beef_ribeye.jpg" },
    "09": null,
    "10": null,
    "11": null,
    "12": { id: "12", name: "Auto-Drop Path", category: "chimney", isChimney: true, tier: 1, slot: "12" }
  };

  // Dynamically compute thawTime and equalizationTime for all stocked inventory items
  Object.keys(drumInventory).forEach(slotKey => {
    const item = drumInventory[slotKey];
    if (item && !item.isChimney) {
      item.thawTime = calculateThaw(item.category, item.weight);
      item.equalizationTime = getEqualizationTime(item.category, item.weight);
    }
  });

  function getCategoryPhoto(cat) {
    const photos = {
      beef: "assets/images/meal_beef_ribeye.jpg",
      chicken: "assets/images/meal_chicken_breast.jpg",
      fish: "assets/images/meal_salmon_fillet.jpg",
      shrimp: "assets/images/meal_tiger_prawns.jpg",
      lasagna: "assets/images/meal_lasagna.jpg",
      pork: "assets/images/meal_pork_tenderloin.jpg",
      vegetables: "assets/images/meal_vegetables.jpg"
    };
    return photos[cat] || "assets/images/meal_beef_ribeye.jpg";
  }

  // Simulated current afternoon time (17:20) so visitors can test both usual and early dinner times
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
    hasThawed: false,
    drawerTemp: 3.0, // Drawer starts in standby at +3.0 °C (NOT -18.0 °C)
    haloState: "amber",
    commuteDelayActive: false,
    commuteSyncEnabled: true,
    wifiOffline: false,
    loadingTargetSlot: "09",
    loadingCategory: "beef",
    loadingWeight: 450,
    drumRotationDeg: 0,
    closedLoopStep: 2,
    powerCutDurationMins: 15
  };

  // Toast Functionality (Zero emojis, warm consumer voice)
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

  // Ensure automatic responsive layout across Phone, iPad/Tablet, and PC
  const appRoot = document.getElementById("appRoot");
  if (appRoot) {
    appRoot.setAttribute("data-viewport", "auto");
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
  const summaryActiveThaw = document.getElementById("summaryActiveThaw");
  const summaryEqualization = document.getElementById("summaryEqualization");
  const lateRescueNotice = document.getElementById("lateRescueNotice");
  const oneTapQuestionText = document.getElementById("oneTapQuestionText");
  const stageDropTimeLabel = document.getElementById("stageDropTimeLabel");
  const stageThawDurationLabel = document.getElementById("stageThawDurationLabel");
  const stageEqualizeDurationLabel = document.getElementById("stageEqualizeDurationLabel");
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

    // Four-Stage Defrost Cycle calculation:
    // Total defrost duration = active thaw minutes (+10 °C air) + conduction equalization minutes (+3 °C soak)
    const activeThawMins = meal.thawTime || calculateThaw(meal.category, meal.weight);
    const equalizationMins = meal.equalizationTime || getEqualizationTime(meal.category, meal.weight);
    const totalDefrostMins = activeThawMins + equalizationMins;

    const earliestSafeReadyMins = DEMO_NOW_MINS + totalDefrostMins;
    const isLateRescue = requestedMins < earliestSafeReadyMins;

    const effectiveReadyMins = isLateRescue ? earliestSafeReadyMins : requestedMins;
    const dropMins = effectiveReadyMins - totalDefrostMins;
    const activeCutoffMins = dropMins + activeThawMins;

    const displayTimeStr = minsToTimeStr(effectiveReadyMins);
    dialValue.textContent = displayTimeStr;

    // Accessibility ARIA values
    if (dialContainer) {
      dialContainer.setAttribute("aria-valuenow", String(requestedMins));
      dialContainer.setAttribute("aria-valuetext", `${displayTimeStr} tonight`);
    }

    if (summaryMealName) {
      summaryMealName.textContent = `${meal.name} (${meal.weight} g)`;
    }
    if (summaryDropTime) {
      summaryDropTime.textContent = isLateRescue
        ? `Right away (${minsToTimeStr(DEMO_NOW_MINS)}) • ${totalDefrostMins} min cycle`
        : `${minsToTimeStr(dropMins)} (while you finish work)`;
    }
    if (summaryActiveThaw) {
      summaryActiveThaw.textContent = `~${activeThawMins} min (cutoff at +4.0 °C surface at ${minsToTimeStr(activeCutoffMins)})`;
    }
    if (summaryEqualization) {
      summaryEqualization.textContent = `~${equalizationMins} min (+3.0 °C soak until ready at ${displayTimeStr})`;
    }

    // Four-Stage Visual Pipeline Labels
    if (stageDropTimeLabel) {
      stageDropTimeLabel.textContent = isLateRescue ? "Drops now" : `-18 °C (Until ${minsToTimeStr(dropMins)})`;
    }
    if (stageThawDurationLabel) {
      stageThawDurationLabel.textContent = `+10 °C (~${activeThawMins}m)`;
    }
    if (stageEqualizeDurationLabel) {
      stageEqualizeDurationLabel.textContent = `Soak (~${equalizationMins}m)`;
    }

    if (lateRescueNotice) {
      if (isLateRescue) {
        lateRescueNotice.removeAttribute("hidden");
        lateRescueNotice.innerHTML = `<strong>Thermal Window Advisory:</strong> Requires <strong>${activeThawMins} min</strong> active thaw + <strong>${equalizationMins} min</strong> conduction equalization (${totalDefrostMins} min total). Earliest safe ready time from current simulated 17:20 clock is <strong>${displayTimeStr}</strong> (instead of requested ${minsToTimeStr(requestedMins)}).`;
      } else {
        lateRescueNotice.setAttribute("hidden", "");
      }
    }
    if (oneTapQuestionText) {
      oneTapQuestionText.innerHTML = `Tonight at <strong>${displayTimeStr}</strong>: Ready for <strong>${meal.name}</strong>?`;
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

    // Keyboard Accessibility for Dial
    dialContainer.addEventListener("keydown", (e) => {
      let deltaAngle = 0;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        deltaAngle = 15; // ~10 min step
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        deltaAngle = -15;
      } else if (e.key === "PageUp") {
        deltaAngle = 45; // ~30 min step
      } else if (e.key === "PageDown") {
        deltaAngle = -45;
      } else if (e.key === "Home") {
        state.dialAngle = 15;
        presetChips.forEach(c => c.classList.remove("active"));
        updateDialUI();
        triggerHaptic([10]);
        e.preventDefault();
        return;
      } else if (e.key === "End") {
        state.dialAngle = 345;
        presetChips.forEach(c => c.classList.remove("active"));
        updateDialUI();
        triggerHaptic([10]);
        e.preventDefault();
        return;
      }

      if (deltaAngle !== 0) {
        state.dialAngle = Math.max(15, Math.min(345, state.dialAngle + deltaAngle));
        presetChips.forEach(c => c.classList.remove("active"));
        updateDialUI();
        triggerHaptic([5]);
        e.preventDefault();
      }
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

  // Meal Cards Selection in TAB 1: Tonight's Dinner
  const mealCards = document.querySelectorAll(".meal-card");
  function selectMealCard(card) {
    mealCards.forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");
    const slot = card.dataset.slot;
    state.selectedSlot = slot;
    state.selectedMeal = drumInventory[slot];
    updateDialUI();

    if (state.selectedMeal) {
      showToast(`${state.selectedMeal.name} selected for tonight (~${state.selectedMeal.thawTime} min gentle thaw).`);
    }
  }

  mealCards.forEach(card => {
    card.addEventListener("click", () => {
      triggerHaptic([10]);
      selectMealCard(card);
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        triggerHaptic([10]);
        selectMealCard(card);
      }
    });
  });

  // 3:00 PM One-Tap Check-In Buttons
  const btnOneTapYes = document.getElementById("btnOneTapYes");
  const btnOneTapSwap = document.getElementById("btnOneTapSwap");
  const btnOneTapSkip = document.getElementById("btnOneTapSkip");

  if (btnOneTapYes) {
    btnOneTapYes.addEventListener("click", () => {
      triggerHaptic([20]);
      const meal = state.selectedMeal || drumInventory["02"];
      const readyStr = dialValue ? dialValue.textContent : "19:30";
      showToast(`All set! Your ${meal.name} will be thawed and ready to cook at ${readyStr}.`);
      setHaloState("amber");
    });
  }

  if (btnOneTapSwap) {
    btnOneTapSwap.addEventListener("click", () => {
      triggerHaptic([10]);
      const order = ["02", "03", "01", "04", "05", "06", "07", "08"];
      const nextIdx = (order.indexOf(state.selectedSlot) + 1) % order.length;
      const nextSlot = order[nextIdx];
      const nextCard = document.querySelector(`.meal-card[data-slot="${nextSlot}"]`);
      if (nextCard) {
        nextCard.focus();
        nextCard.click();
      }
    });
  }

  if (btnOneTapSkip) {
    btnOneTapSkip.addEventListener("click", () => {
      triggerHaptic([15]);
      showToast("Enjoy your night out! All 11 meals stay deep-frozen at -18.0 °C.");
      setHaloState("cyan");
    });
  }

  // Action Button ("Schedule Tonight's Dinner")
  const btnContinueAction = document.getElementById("btnContinueAction");
  if (btnContinueAction) {
    btnContinueAction.addEventListener("click", () => {
      triggerHaptic([20, 50, 20]);
      const meal = state.selectedMeal || drumInventory["02"];
      const readyStr = dialValue ? dialValue.textContent : "19:30";

      showToast(`${meal.name} scheduled for ${readyStr}. Kept fridge-fresh at +3.0 °C if you arrive late.`);

      setTimeout(() => {
        const chatTab = document.querySelector('[data-tab="tab-chat"]');
        if (chatTab) chatTab.click();
        setHaloState("amber");
      }, 1200);
    });
  }

  // TAB 2: MY FREEZER (Interactive Carousel Wheel & Stocking Mode)
  const drumSlotButtons = document.querySelectorAll(".drum-slot-btn");
  const selectedSlotDisplay = document.getElementById("selectedSlotDisplay");
  const interactiveDrumRotor = document.getElementById("interactiveDrumRotor");
  const drumWheelStatusTitle = document.getElementById("drumWheelStatusTitle");
  const loadCategoryChips = document.querySelectorAll(".cat-chip");
  const loadWeightSlider = document.getElementById("loadWeightSlider");
  const loadWeightValue = document.getElementById("loadWeightValue");
  const loadThawCalcDisplay = document.getElementById("loadThawCalcDisplay");
  const btnConfirmStore = document.getElementById("btnConfirmStore");

  function rotateCarouselToSlot(slotStr) {
    const slotNum = parseInt(slotStr, 10) || 1;
    state.drumRotationDeg = ((slotNum - 1) % 6) * 60;
    if (interactiveDrumRotor) {
      interactiveDrumRotor.style.transform = `rotate(${state.drumRotationDeg}deg)`;
    }
    const item = drumInventory[slotStr];
    if (drumWheelStatusTitle) {
      if (item && !item.isChimney) {
        drumWheelStatusTitle.textContent = `Container ${slotStr} at Front Door (${item.name}, ${item.weight} g)`;
      } else {
        drumWheelStatusTitle.textContent = `Container ${slotStr} at Front Door (Open & Ready to Fill)`;
      }
    }
  }

  const loadMealNameInput = document.getElementById("loadMealNameInput");
  const btnToggleCustomType = document.getElementById("btnToggleCustomType");
  const chipAddCustomType = document.getElementById("chipAddCustomType");
  const customTypePanel = document.getElementById("customTypePanel");
  const customTypeNameInput = document.getElementById("customTypeNameInput");
  const btnSaveCustomType = document.getElementById("btnSaveCustomType");
  const btnCancelCustomType = document.getElementById("btnCancelCustomType");
  const categoryChipsGrid = document.getElementById("categoryChipsGrid");

  function openCustomTypePanel() {
    if (customTypePanel) {
      customTypePanel.removeAttribute("hidden");
      if (customTypeNameInput) {
        customTypeNameInput.focus();
      }
    }
  }

  function closeCustomTypePanel() {
    if (customTypePanel) {
      customTypePanel.setAttribute("hidden", "");
      if (customTypeNameInput) customTypeNameInput.value = "";
    }
  }

  if (btnToggleCustomType) {
    btnToggleCustomType.addEventListener("click", () => {
      triggerHaptic([10]);
      openCustomTypePanel();
    });
  }

  if (chipAddCustomType) {
    chipAddCustomType.addEventListener("click", () => {
      triggerHaptic([10]);
      openCustomTypePanel();
    });
  }

  if (btnCancelCustomType) {
    btnCancelCustomType.addEventListener("click", () => {
      triggerHaptic([10]);
      closeCustomTypePanel();
    });
  }

  if (btnSaveCustomType) {
    btnSaveCustomType.addEventListener("click", () => {
      const typeName = customTypeNameInput ? customTypeNameInput.value.trim() : "";
      if (!typeName) {
        showToast("Please enter a name for the new food type.");
        if (customTypeNameInput) customTypeNameInput.focus();
        return;
      }

      // Check selected thaw density
      const densityRadio = document.querySelector('input[name="customThawDensity"]:checked');
      const density = densityRadio ? densityRadio.value : "medium";
      let base = 26;
      let factor = 0.125;
      if (density === "light") {
        base = 18;
        factor = 0.10;
      } else if (density === "dense") {
        base = 32;
        factor = 0.135;
      }

      const catKey = "custom_" + Date.now().toString(36);
      const densityNameStr = density === "dense"
        ? "Dense Protein (1.06 g/cm³)"
        : (density === "light" ? "Light / Porous (0.65 g/cm³)" : "Medium density (lean fish & poultry)");
      const holdMinsVal = density === "dense" ? 20 : (density === "light" ? 10 : 15);

      CATEGORY_FORMULAS[catKey] = {
        name: typeName,
        base: base,
        factor: factor,
        holdMinutes: holdMinsVal,
        densityName: densityNameStr
      };

      // Create new category chip button in the grid
      const newChip = document.createElement("button");
      newChip.className = "cat-chip selected";
      newChip.dataset.cat = catKey;
      newChip.type = "button";
      newChip.textContent = typeName;

      // Deselect all existing category chips
      document.querySelectorAll(".cat-chip").forEach(c => c.classList.remove("selected"));

      // Attach selection handler to new chip
      newChip.addEventListener("click", () => {
        document.querySelectorAll(".cat-chip").forEach(c => c.classList.remove("selected"));
        newChip.classList.add("selected");
        state.loadingCategory = catKey;
        updateLoadingThawDisplay();
        triggerHaptic([10]);
      });

      if (categoryChipsGrid && chipAddCustomType) {
        categoryChipsGrid.insertBefore(newChip, chipAddCustomType);
      } else if (categoryChipsGrid) {
        categoryChipsGrid.appendChild(newChip);
      }

      state.loadingCategory = catKey;
      updateLoadingThawDisplay();
      closeCustomTypePanel();
      triggerHaptic([20]);
      showToast(`Added new food type: "${typeName}".`);
    });
  }

  const densityClassName = document.getElementById("densityClassName");

  drumSlotButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const slot = btn.dataset.slot;
      if (slot === "12") {
        showToast("This is the automatic drop path that lets upper meals slide down into the defrost drawer.");
        return;
      }
      drumSlotButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.loadingTargetSlot = slot;
      if (selectedSlotDisplay) {
        selectedSlotDisplay.textContent = `Container ${slot}`;
      }
      rotateCarouselToSlot(slot);
      triggerHaptic([10]);
    });
  });

  loadCategoryChips.forEach(chip => {
    chip.addEventListener("click", () => {
      if (chip.id === "chipAddCustomType") return;
      document.querySelectorAll(".cat-chip").forEach(c => c.classList.remove("selected"));
      chip.classList.add("selected");
      state.loadingCategory = chip.dataset.cat;
      updateLoadingThawDisplay();
      triggerHaptic([10]);
    });
  });

  if (loadWeightSlider) {
    loadWeightSlider.addEventListener("input", (e) => {
      state.loadingWeight = Math.min(700, Math.max(100, parseInt(e.target.value, 10)));
      if (loadWeightValue) loadWeightValue.textContent = `${state.loadingWeight} g`;
      updateLoadingThawDisplay();
    });
  }

  function updateLoadingThawDisplay() {
    const mins = calculateThaw(state.loadingCategory, state.loadingWeight);
    const catFormula = CATEGORY_FORMULAS[state.loadingCategory] || CATEGORY_FORMULAS.beef;
    const holdMins = catFormula.holdMinutes || 15;
    const totalCycle = mins + holdMins;

    if (loadThawCalcDisplay) {
      loadThawCalcDisplay.textContent = `~${totalCycle} min (${mins}m thaw + ${holdMins}m soak)`;
    }

    if (densityClassName) {
      densityClassName.textContent = catFormula.densityName || "Medium density (lean fish & poultry)";
    }
  }
  updateLoadingThawDisplay();

  if (btnConfirmStore) {
    btnConfirmStore.addEventListener("click", () => {
      triggerHaptic([20, 60]);
      const slot = state.loadingTargetSlot;
      const mins = calculateThaw(state.loadingCategory, state.loadingWeight);
      const catFormula = CATEGORY_FORMULAS[state.loadingCategory] || CATEGORY_FORMULAS.beef;
      const holdMins = catFormula.holdMinutes || 15;
      const totalCycle = mins + holdMins;
      const customMealName = loadMealNameInput ? loadMealNameInput.value.trim() : "";
      const finalMealName = customMealName || catFormula.name.split("&")[0].trim();
      const photoPath = getCategoryPhoto(state.loadingCategory);

      drumInventory[slot] = {
        id: slot,
        name: finalMealName,
        category: state.loadingCategory,
        weight: state.loadingWeight,
        tier: parseInt(slot, 10) <= 6 ? 2 : 1,
        slot: slot,
        thawTime: mins,
        equalizationTime: holdMins,
        photo: photoPath
      };

      const slotBtn = document.querySelector(`.drum-slot-btn[data-slot="${slot}"]`);
      if (slotBtn) {
        slotBtn.classList.remove("empty");
        const nameEl = slotBtn.querySelector(".slot-name");
        if (nameEl) nameEl.textContent = `${finalMealName} (${state.loadingWeight}g)`;
      }

      // Update or add meal card to Tab 1: Tonight's Dinner grid
      const existingMealCard = document.querySelector(`.meal-card[data-slot="${slot}"]`);
      if (existingMealCard) {
        const thumbImg = existingMealCard.querySelector(".meal-thumb-wrap img");
        if (thumbImg) {
          thumbImg.src = photoPath;
          thumbImg.alt = finalMealName;
        }
        const badge = existingMealCard.querySelector(".badge-tagged");
        if (badge) badge.textContent = `~${mins} min`;
        const label = existingMealCard.querySelector(".meal-label");
        if (label) label.textContent = finalMealName;
        const sublabel = existingMealCard.querySelector(".meal-sublabel");
        if (sublabel) sublabel.textContent = `${state.loadingWeight} g`;
      } else {
        const mealGrid = document.getElementById("mealGrid");
        if (mealGrid) {
          const newCard = document.createElement("article");
          newCard.className = "meal-card";
          newCard.dataset.slot = slot;
          newCard.tabIndex = 0;
          newCard.setAttribute("role", "button");

          const badge = document.createElement("span");
          badge.className = "badge-tagged";
          badge.textContent = `~${mins} min`;

          const thumbWrap = document.createElement("div");
          thumbWrap.className = "meal-thumb-wrap";
          const thumbImg = document.createElement("img");
          thumbImg.src = photoPath;
          thumbImg.alt = finalMealName;
          thumbImg.loading = "lazy";
          thumbWrap.appendChild(thumbImg);

          const labelEl = document.createElement("div");
          labelEl.className = "meal-label";
          labelEl.textContent = finalMealName;

          const sublabelEl = document.createElement("div");
          sublabelEl.className = "meal-sublabel";
          sublabelEl.textContent = `Container ${slot} (${state.loadingWeight} g)`;

          newCard.appendChild(badge);
          newCard.appendChild(thumbWrap);
          newCard.appendChild(labelEl);
          newCard.appendChild(sublabelEl);

          const selectThisMeal = () => {
            triggerHaptic([10]);
            document.querySelectorAll(".meal-card").forEach(c => c.classList.remove("selected"));
            newCard.classList.add("selected");
            state.selectedSlot = slot;
            state.selectedMeal = drumInventory[slot];
            updateDialUI();
            showToast(`${finalMealName} selected for tonight (~${mins} min gentle thaw).`);
          };

          newCard.addEventListener("click", selectThisMeal);
          newCard.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              selectThisMeal();
            }
          });

          mealGrid.appendChild(newCard);
        }
      }

      if (loadMealNameInput) loadMealNameInput.value = "";
      rotateCarouselToSlot(slot);
      showToast(`Container ${slot} rotated to the door and stocked with ${finalMealName} (${state.loadingWeight} g).`);
    });
  }

  // TAB 4: KITCHEN & CARE (Initialized before map scenes to avoid TDZ)
  const haloVisual = document.getElementById("haloRingVisual");
  const haloStateLabel = document.getElementById("haloStateLabel");
  const haloBtns = document.querySelectorAll(".halo-btn");
  const telemDrawerTemp = document.getElementById("telemDrawerTemp");
  const telemBlackoutVal = document.getElementById("telemBlackoutVal");
  const btnSimDrawerOpen = document.getElementById("btnSimDrawerOpen");
  const btnSimDishClean = document.getElementById("btnSimDishClean");
  const scenarioBtns = document.querySelectorAll(".scenario-btn");
  const scenarioFeedbackBox = document.getElementById("scenarioFeedbackBox");
  const scenarioFeedbackText = document.getElementById("scenarioFeedbackText");

  // Closed-Loop Surface Sensing & Control Elements
  const clStepBtns = document.querySelectorAll(".closed-loop-step-btn");
  const clFanState = document.getElementById("clFanState");
  const clFanSub = document.getElementById("clFanSub");
  const clSurfaceTemp = document.getElementById("clSurfaceTemp");
  const clCoreTemp = document.getElementById("clCoreTemp");

  const CLOSED_LOOP_STEPS = {
    1: {
      fanState: "+10.0 °C (Active)",
      fanColor: "var(--clay)",
      fanSub: "Forced Air ON • Crossflow",
      surfaceTemp: "-18.0 °C",
      coreTemp: "-18.0 °C",
      toast: "Step 1: Meal drops from -18.0 °C carousel. Crossflow +10.0 °C convection starts."
    },
    2: {
      fanState: "+10.0 °C (Active)",
      fanColor: "var(--clay)",
      fanSub: "Forced Air ON • Melting",
      surfaceTemp: "+1.8 °C",
      coreTemp: "-1.5 °C",
      toast: "Step 2: Latent phase change plateau at -1.5 °C core. Food surface safely at +1.8 °C (well below +4.0 °C limit)."
    },
    3: {
      fanState: "Standby (+3.0 °C)",
      fanColor: "var(--ink-soft)",
      fanSub: "Forced Air OFF • Cutoff Hit",
      surfaceTemp: "+4.0 °C",
      coreTemp: "-0.4 °C",
      toast: "Step 3: Surface reached +4.0 °C! Closed-loop sensor triggers heater cutoff (deadband ±0.5 °C) to prevent edge cooking."
    },
    4: {
      fanState: "Standby (+3.0 °C)",
      fanColor: "var(--ink-soft)",
      fanSub: "Forced Air OFF • Equalizing",
      surfaceTemp: "+3.2 °C",
      coreTemp: "+3.0 °C",
      toast: "Step 4: Conduction equalization completed. Uniform +3.0 °C core throughout container. Drawer glows fresh green."
    }
  };

  function applyClosedLoopStep(stepNum) {
    state.closedLoopStep = stepNum;
    const data = CLOSED_LOOP_STEPS[stepNum];
    if (!data) return;

    clStepBtns.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.step === String(stepNum));
    });

    if (clFanState) {
      clFanState.textContent = data.fanState;
      clFanState.style.color = data.fanColor;
    }
    if (clFanSub) clFanSub.textContent = data.fanSub;
    if (clSurfaceTemp) clSurfaceTemp.textContent = data.surfaceTemp;
    if (clCoreTemp) clCoreTemp.textContent = data.coreTemp;

    if (stepNum === 4) {
      setHaloState("green", false);
    } else if (stepNum === 1 || stepNum === 2) {
      setHaloState("amber", false);
    }
  }

  clStepBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      triggerHaptic([10]);
      const step = parseInt(btn.dataset.step, 10);
      applyClosedLoopStep(step);
      const data = CLOSED_LOOP_STEPS[step];
      if (data) showToast(data.toast);
    });
  });

  function setHaloState(mode, isUserManual = false) {
    if (isUserManual) {
      state.userManualHalo = true;
    }
    if (haloVisual) {
      haloVisual.className = "halo-ring-visual " + mode;
    }
    state.haloState = mode;

    haloBtns.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    });

    let desc = "Warm Amber — Gently Thawing Tonight's Dinner";
    if (mode === "cyan") {
      desc = "Soft Blue — Standby • All Meals Kept at -18.0 °C (Drawer Standby at +3.0 °C)";
      if (telemDrawerTemp) telemDrawerTemp.textContent = "+3.0 °C";
      if (telemBlackoutVal) telemBlackoutVal.textContent = "All Good";
    } else if (mode === "amber") {
      desc = "Warm Amber — Gently Thawing Tonight's Dinner (+10.0 °C Convection)";
      if (telemDrawerTemp) telemDrawerTemp.textContent = "+10.0 °C";
      if (telemBlackoutVal) telemBlackoutVal.textContent = "All Good";
    } else if (mode === "green") {
      desc = "Fresh Green — Dinner Is Ready to Cook (+3.0 °C Fridge Hold)";
      if (telemDrawerTemp) telemDrawerTemp.textContent = "+3.0 °C";
      if (telemBlackoutVal) telemBlackoutVal.textContent = "All Good";
    } else if (mode === "red") {
      desc = "Red Pulse — Food Safety Lockout (Check Phone)";
      if (telemDrawerTemp) telemDrawerTemp.textContent = "+6.4 °C";
      if (telemBlackoutVal) telemBlackoutVal.textContent = "Tier 2 Lockout: Discard";
    }

    if (haloStateLabel) haloStateLabel.textContent = desc;
  }

  haloBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;
      setHaloState(mode, true);
      triggerHaptic([10]);
      if (scenarioFeedbackBox) scenarioFeedbackBox.setAttribute("hidden", "");
      scenarioBtns.forEach(b => b.classList.remove("active"));
      showToast(`Handle Light: ${mode.toUpperCase()} mode preview`);
    });
  });

  // Two-Tier Power-Cut Stepper Simulation
  const pcutStepBtns = document.querySelectorAll(".pcut-step-btn");

  const PCUT_CONFIGS = {
    15: {
      temp: "+3.8 °C",
      blackoutVal: "Safe: Resumed",
      halo: "amber",
      text: "<strong>Outage &lt; 30 min (15 min simulated):</strong> Power was restored after 15 minutes. The insulated drawer remained safely at +3.8 °C (well below the conservative +5.0 °C advisory threshold). Active defrost safely resumed under DINA's thermal lag margin.",
      toast: "Power restored at 15m (< 30m): Chamber at +3.8 °C. Active thaw safely resumed."
    },
    45: {
      temp: "+5.2 °C",
      blackoutVal: "Tier 1 Warning",
      halo: "amber",
      text: "<strong>Tier 1 Warning (30–119 min, 45 min simulated):</strong> Chamber temperature reached +5.2 °C (&gt; +5.0 °C for &gt; 30 min). While still well within EFSA microbial guidelines, DINA's conservative advisory rule pauses active heating pending user inspection to account for sensor lag and thermal inertia.",
      toast: "Tier 1 Warning: Drawer > +5.0 °C for > 30 min. Heating paused for safety."
    },
    150: {
      temp: "+6.4 °C",
      blackoutVal: "Tier 2 Lockout: Discard",
      halo: "red",
      text: "<strong>Tier 2 Food Safety Lockout (&ge; 120 min, 2.5 h simulated):</strong> Food temperature exceeded +5.0 °C for more than 2 hours (USDA / EFSA microbial proliferation danger zone). Active heating is permanently locked out, handle light pulses red, and an emergency phone notification is sent recommending safe disposal.",
      toast: "Tier 2 Lockout: Food exceeded +5.0 °C for > 2 hours. Active heating locked out; discard meal."
    }
  };

  function applyPowerCutDuration(durationMins) {
    state.powerCutDurationMins = durationMins;
    const config = PCUT_CONFIGS[durationMins] || PCUT_CONFIGS[15];

    pcutStepBtns.forEach(b => {
      b.classList.toggle("active", b.dataset.duration === String(durationMins));
    });

    if (telemDrawerTemp) telemDrawerTemp.textContent = config.temp;
    if (telemBlackoutVal) telemBlackoutVal.textContent = config.blackoutVal;
    setHaloState(config.halo, true);

    if (scenarioFeedbackBox) scenarioFeedbackBox.removeAttribute("hidden");
    if (scenarioFeedbackText) scenarioFeedbackText.innerHTML = config.text;
  }

  pcutStepBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      triggerHaptic([20]);
      const duration = parseInt(btn.dataset.duration, 10);
      applyPowerCutDuration(duration);
      const config = PCUT_CONFIGS[duration];
      if (config) showToast(config.toast);
    });
  });

  // Customer-Friendly Peace-of-Mind Scenarios
  if (btnSimDrawerOpen) {
    btnSimDrawerOpen.addEventListener("click", () => {
      triggerHaptic([20]);
      scenarioBtns.forEach(b => b.classList.remove("active"));
      btnSimDrawerOpen.classList.add("active");
      if (scenarioFeedbackBox) scenarioFeedbackBox.removeAttribute("hidden");
      if (scenarioFeedbackText) {
        scenarioFeedbackText.innerHTML = "<strong>Smart Pause Active:</strong> A dish is still in the lower drawer (or the drawer is slightly open). DINA keeps the upper drop hatch securely closed to prevent any collisions until you slide the drawer shut.";
      }
      showToast("Smart Pause: Lower drawer is occupied or open. Drop hatch kept sealed safely.");
    });
  }

  if (btnSimDishClean) {
    btnSimDishClean.addEventListener("click", () => {
      triggerHaptic([15]);
      scenarioBtns.forEach(b => b.classList.remove("active"));
      btnSimDishClean.classList.add("active");
      if (scenarioFeedbackBox) scenarioFeedbackBox.removeAttribute("hidden");
      if (scenarioFeedbackText) {
        scenarioFeedbackText.innerHTML = "<strong>Easy Care & Hygiene:</strong> Any moisture from gentle convection defrosting channels into the removable drip tray beneath the drawer. It slides out effortlessly from the front and is 100% dishwasher-safe (tested to 70 °C, EU 10/2011 food-contact compliant).";
      }
      showToast("Removable drip tray slides out from front — dishwasher-safe up to 70 °C.");
    });
  }

  // TAB 3: RUNNING LATE — Live Animated Mock Location Map & Auto-Cycling Scenarios
  const btnSimulateDelay = document.getElementById("btnSimulateDelay");
  const commuteStatusText = document.getElementById("commuteStatusText");
  const commuteArrivalText = document.getElementById("commuteArrivalText");
  const commuteClockDisplay = document.getElementById("commuteClockDisplay");
  const btnToggleCommuteSync = document.getElementById("btnToggleCommuteSync");
  const btnSimulateOffline = document.getElementById("btnSimulateOffline");
  const offlineStatusText = document.getElementById("offlineStatusText");
  const headerStatusText = document.getElementById("headerStatusText");

  const mapCanvasWrap = document.getElementById("mapCanvasWrap");
  const mapRouteFlowLine = document.getElementById("mapRouteFlowLine");
  const mapUserMarker = document.getElementById("mapUserMarker");
  const mapUserBubbleGroup = document.getElementById("mapUserBubbleGroup");
  const mapUserBubbleText = document.getElementById("mapUserBubbleText");
  const mapHomeBadgeText = document.getElementById("mapHomeBadgeText");
  const mapHomeHaloRing = document.getElementById("mapHomeHaloRing");
  const mapHomeDot = document.getElementById("mapHomeDot");
  const mapMetricLocation = document.getElementById("mapMetricLocation");
  const mapMetricEta = document.getElementById("mapMetricEta");
  const mapMetricDefrost = document.getElementById("mapMetricDefrost");
  const mapSceneBtns = document.querySelectorAll(".map-scene-btn");
  const btnToggleMapCycle = document.getElementById("btnToggleMapCycle");
  const mapCycleBtnLabel = document.getElementById("mapCycleBtnLabel");
  const mapCycleProgressBar = document.getElementById("mapCycleProgressBar");

  const MAP_SCENES_ORDER = ["ontime", "traffic", "atwork", "arrived"];
  const MAP_SCENES = {
    ontime: {
      key: "ontime",
      clockStr: "19:05",
      startT: 0.14,
      endT: 0.66,
      bubbleOffsetX: 0,
      bubble: "YOU • ETA 19:20",
      homeBadge: "HOME • +10°C THAW",
      homeHalo: "amber",
      locationLabel: "Driving Home (Clear Route)",
      etaLabel: "19:20 (in 15 min)",
      defrostLabel: "Active Thaw (+10.0 °C air) • Surface ≤ +4.0 °C",
      statusText: "Route clear (15 min drive from 19:05): Active thaw finishes at 19:10, then conduction equalizes at +3.0 °C so dinner is ready right as you walk in at 19:30.",
      arrivalText: "Commute Clock: 19:05 • ETA: 19:20 • Drawer: Convection Thaw Active",
      statusColor: "var(--ink-soft)"
    },
    traffic: {
      key: "traffic",
      clockStr: "19:15",
      startT: 0.36,
      endT: 0.54,
      bubbleOffsetX: 0,
      bubble: "TRAFFIC • +30M DELAY",
      homeBadge: "HOME • +3°C HOLD",
      homeHalo: "green",
      locationLabel: "A5 Bridge (Traffic Jam)",
      etaLabel: "19:55 (+30 min delay)",
      defrostLabel: "Auto-Switched to +3.0 °C Fridge Hold",
      statusText: "Traffic jam detected at 19:15 (+30 min delay): DINA finishes equalization at 19:30 and holds the drawer at +3.0 °C so dinner waits safely without drying out or spoiling.",
      arrivalText: "Commute Clock: 19:15 • New ETA: 19:55 • Held at +3.0 °C (Up to 24 h)",
      statusColor: "var(--clay)"
    },
    atwork: {
      key: "atwork",
      clockStr: "19:20",
      startT: 0.0,
      endT: 0.0,
      bubbleOffsetX: 18,
      bubble: "STILL AT WORK • 19:20",
      homeBadge: "HOME • +3°C HOLD",
      homeHalo: "green",
      locationLabel: "Still at Office (Late Meeting)",
      etaLabel: "~20:15 (Not departed yet)",
      defrostLabel: "Held at +3.0 °C (Safe up to 24 h)",
      statusText: "Still at work past 19:00? Because departure has not been logged at 19:20, DINA holds dinner chilled at +3.0 °C with zero danger-zone exposure.",
      arrivalText: "Commute Clock: 19:20 • Est. Arrival: ~20:15 • Held at +3.0 °C (Up to 24 h)",
      statusColor: "var(--clay)"
    },
    arrived: {
      key: "arrived",
      clockStr: "19:25",
      startT: 0.66,
      endT: 0.85,
      bubbleOffsetX: -14,
      bubble: "ARRIVED HOME!",
      homeBadge: "READY TO COOK!",
      homeHalo: "green",
      locationLabel: "Home Driveway",
      etaLabel: "Arrived (Now)",
      defrostLabel: "Green Handle • Ready for Pan!",
      statusText: "Welcome home! Drawer handle is glowing soft green (+3.0 °C hold). Your meal is evenly thawed through to the core and ready for a hot skillet.",
      arrivalText: "Commute Clock: 19:25 • Drawer: +3.0 °C • Ready to Cook!",
      statusColor: "#4A8B63"
    }
  };

  let currentMapSceneIdx = 0;
  let mapAutoCycle = true;
  const MAP_SCENE_DURATION_MS = 8500;
  let sceneStartTimestamp = performance.now();

  function easeInOutSine(x) {
    return -(Math.cos(Math.PI * x) - 1) / 2;
  }

  function setMarkerAlongRoute(fractionT) {
    if (!mapUserMarker) return;
    const clampedT = Math.max(0, Math.min(1, fractionT));
    if (mapRouteFlowLine && typeof mapRouteFlowLine.getTotalLength === "function") {
      try {
        const totalLen = mapRouteFlowLine.getTotalLength();
        const pt = mapRouteFlowLine.getPointAtLength(clampedT * totalLen);
        mapUserMarker.setAttribute("transform", `translate(${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})`);
        return;
      } catch (e) {}
    }
    const fallbackX = 78 + clampedT * (482 - 78);
    const fallbackY = 196 + clampedT * (88 - 196);
    mapUserMarker.setAttribute("transform", `translate(${fallbackX.toFixed(1)}, ${fallbackY.toFixed(1)})`);
  }

  function applyMapScene(sceneKey, announceToast = false) {
    const scene = MAP_SCENES[sceneKey] || MAP_SCENES.ontime;
    currentMapSceneIdx = MAP_SCENES_ORDER.indexOf(scene.key);
    if (currentMapSceneIdx < 0) currentMapSceneIdx = 0;
    sceneStartTimestamp = performance.now();

    mapSceneBtns.forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-scene") === scene.key);
    });

    if (mapCanvasWrap) {
      mapCanvasWrap.setAttribute("data-scene-state", scene.key);
    }

    if (mapUserBubbleGroup) {
      mapUserBubbleGroup.setAttribute("transform", `translate(${scene.bubbleOffsetX || 0}, -30)`);
    }

    setMarkerAlongRoute(scene.startT);

    if (commuteClockDisplay && scene.clockStr) {
      commuteClockDisplay.textContent = scene.clockStr;
    }

    if (mapUserBubbleText) mapUserBubbleText.textContent = scene.bubble;
    if (mapHomeBadgeText) mapHomeBadgeText.textContent = scene.homeBadge;
    if (mapHomeHaloRing) {
      mapHomeHaloRing.setAttribute("class", `map-home-halo ${scene.homeHalo}`);
    }
    if (mapHomeDot) {
      mapHomeDot.setAttribute("fill", scene.homeHalo === "green" ? "#4A8B63" : "#C0775B");
    }

    if (mapMetricLocation) mapMetricLocation.textContent = scene.locationLabel;
    if (mapMetricEta) mapMetricEta.textContent = scene.etaLabel;
    if (mapMetricDefrost) mapMetricDefrost.textContent = scene.defrostLabel;

    if (commuteStatusText) {
      commuteStatusText.textContent = scene.statusText;
      commuteStatusText.style.color = scene.statusColor;
    }
    if (commuteArrivalText) {
      commuteArrivalText.textContent = scene.arrivalText;
    }

    if (!state.userManualHalo || state.activeTab === "tab-map") {
      setHaloState(scene.homeHalo === "green" ? "green" : "amber", false);
    }

    if (announceToast) {
      showToast(`${scene.locationLabel} • ${scene.defrostLabel}`);
    }
  }

  mapSceneBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      triggerHaptic([10]);
      const sceneKey = btn.getAttribute("data-scene") || "ontime";
      applyMapScene(sceneKey, true);
    });
  });

  if (btnToggleMapCycle) {
    btnToggleMapCycle.addEventListener("click", () => {
      triggerHaptic([10]);
      mapAutoCycle = !mapAutoCycle;
      sceneStartTimestamp = performance.now();
      btnToggleMapCycle.classList.toggle("active", mapAutoCycle);
      if (mapCycleBtnLabel) {
        mapCycleBtnLabel.textContent = mapAutoCycle ? "Auto-Cycle: ON" : "Auto-Cycle: PAUSED";
      }
    });
  }

  // Silky 60fps Continuous Path Glide & Auto-Cycle Loop
  function tickMapAnimation(now) {
    const sceneKey = MAP_SCENES_ORDER[currentMapSceneIdx] || "ontime";
    const scene = MAP_SCENES[sceneKey];
    const elapsed = Math.max(0, now - sceneStartTimestamp);
    const rawProgress = Math.min(1, elapsed / MAP_SCENE_DURATION_MS);

    // Move user marker smoothly along the Bezier curve over the first 78% of the scene duration
    const moveProgress = Math.min(1, elapsed / (MAP_SCENE_DURATION_MS * 0.78));
    const easedMove = easeInOutSine(moveProgress);
    const currentT = scene.startT + (scene.endT - scene.startT) * easedMove;
    setMarkerAlongRoute(currentT);

    if (mapAutoCycle) {
      if (mapCycleProgressBar) {
        mapCycleProgressBar.style.width = `${(rawProgress * 100).toFixed(1)}%`;
      }
      if (elapsed >= MAP_SCENE_DURATION_MS) {
        const nextIdx = (currentMapSceneIdx + 1) % MAP_SCENES_ORDER.length;
        applyMapScene(MAP_SCENES_ORDER[nextIdx], false);
      }
    }

    requestAnimationFrame(tickMapAnimation);
  }

  applyMapScene("ontime", false);
  requestAnimationFrame(tickMapAnimation);

  if (btnToggleCommuteSync) {
    btnToggleCommuteSync.addEventListener("click", () => {
      state.commuteSyncEnabled = !state.commuteSyncEnabled;
      btnToggleCommuteSync.classList.toggle("active", state.commuteSyncEnabled);
      btnToggleCommuteSync.setAttribute("aria-pressed", String(state.commuteSyncEnabled));
      btnToggleCommuteSync.textContent = state.commuteSyncEnabled ? "ON" : "OFF";
      showToast(state.commuteSyncEnabled
        ? "On-Phone Location Privacy is ON (your map never leaves your phone)."
        : "Automatic Traffic Hold is OFF. Your scheduled dinner time still runs on its own.");
    });
  }

  if (btnSimulateDelay) {
    btnSimulateDelay.addEventListener("click", () => {
      triggerHaptic([20]);
      const nextIdx = (currentMapSceneIdx + 1) % MAP_SCENES_ORDER.length;
      applyMapScene(MAP_SCENES_ORDER[nextIdx], true);
    });
  }

  if (btnSimulateOffline) {
    btnSimulateOffline.addEventListener("click", () => {
      triggerHaptic([15]);
      state.wifiOffline = !state.wifiOffline;
      if (state.wifiOffline) {
        btnSimulateOffline.textContent = "Reconnect Home Wi-Fi";
        if (offlineStatusText) {
          offlineStatusText.textContent = "Home Wi-Fi is offline — no problem! DINA remembers your weekly plan and keeps dinner chilled at +3.0 °C.";
          offlineStatusText.style.color = "var(--clay)";
        }
        if (headerStatusText) headerStatusText.textContent = "Offline • Schedule Active";
        showToast("Home Wi-Fi offline: DINA is running your dinner schedule automatically on its own.");
      } else {
        btnSimulateOffline.textContent = "Test With Home Wi-Fi Offline";
        if (offlineStatusText) {
          offlineStatusText.textContent = "Home Wi-Fi connected. Even if your internet goes down, DINA remembers your dinner plan on its own.";
          offlineStatusText.style.color = "var(--ink-soft)";
        }
        if (headerStatusText) headerStatusText.textContent = "My Kitchen • Connected";
        showToast("Home Wi-Fi reconnected.");
      }
    });
  }

  // Top Bar Bell Button
  const btnRefresh = document.getElementById("btnRefresh");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      triggerHaptic([15]);
      showToast("Your kitchen is connected and tonight's dinner is right on schedule.");
    });
  }
});
