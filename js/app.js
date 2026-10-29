/**
 * DINA Companion App — Interactive Consumer Web App & Demo Logic
 * Warm, buyer-focused experience aligned with PRD 3.1.0 and DINA Brand Identity
 * Responsive across Mobile, iPad/Tablet, and PC; works in browser or installed as PWA
 */

document.addEventListener("DOMContentLoaded", () => {
  // Register Service Worker for optional standalone PWA Web App mode
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  // Haptic Helper
  function triggerHaptic(pattern = [15]) {
    if ("vibrate" in navigator) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  }

  // 11-Meal Revolving Carousel Inventory
  // Upper Ring: Containers 01 - 06 (6 meal containers)
  // Lower Ring: Containers 07 - 11 (5 meal containers) + Slot 12 (Auto-Drop Path)
  const drumInventory = {
    "01": { id: "01", name: "Chicken Breast", category: "chicken", weight: 500, tier: 2, slot: "01", thawTime: 95 },
    "02": { id: "02", name: "Beef Ribeye", category: "beef", weight: 450, tier: 2, slot: "02", thawTime: 85 },
    "03": { id: "03", name: "Atlantic Salmon", category: "fish", weight: 320, tier: 2, slot: "03", thawTime: 65 },
    "04": { id: "04", name: "Tiger Prawns", category: "shrimp", weight: 250, tier: 2, slot: "04", thawTime: 40 },
    "05": { id: "05", name: "Homemade Lasagna", category: "lasagna", weight: 600, tier: 2, slot: "05", thawTime: 104 },
    "06": { id: "06", name: "Pork Tenderloin", category: "pork", weight: 350, tier: 2, slot: "06", thawTime: 74 },
    "07": { id: "07", name: "Codfish Loins", category: "fish", weight: 400, tier: 1, slot: "07", thawTime: 76 },
    "08": { id: "08", name: "Steak Mignon", category: "beef", weight: 300, tier: 1, slot: "08", thawTime: 64 },
    "09": null,
    "10": null,
    "11": null,
    "12": { id: "12", name: "Auto-Drop Path", category: "chimney", isChimney: true, tier: 1, slot: "12" }
  };

  // Gentle Thaw Category Curves
  const CATEGORY_FORMULAS = {
    beef: { name: "Steak & Beef", base: 25, factor: 0.13 },
    chicken: { name: "Chicken & Poultry", base: 30, factor: 0.13 },
    fish: { name: "Fish Fillets", base: 20, factor: 0.14 },
    shrimp: { name: "Prawns & Seafood", base: 15, factor: 0.10 },
    vegetables: { name: "Vegetables & Sides", base: 15, factor: 0.08 },
    lasagna: { name: "Lasagna & Batch Dish", base: 35, factor: 0.115 },
    pork: { name: "Pork & Medallions", base: 28, factor: 0.13 }
  };

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
    drawerTemp: -18.0,
    haloState: "amber",
    commuteDelayActive: false,
    commuteSyncEnabled: true,
    wifiOffline: false,
    loadingTargetSlot: "09",
    loadingCategory: "beef",
    loadingWeight: 450,
    drumRotationDeg: 0
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

  function calculateThaw(catKey, grams) {
    const formula = CATEGORY_FORMULAS[catKey] || CATEGORY_FORMULAS.beef;
    return Math.round(formula.base + (formula.factor * grams));
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
  const lateRescueNotice = document.getElementById("lateRescueNotice");
  const oneTapQuestionText = document.getElementById("oneTapQuestionText");
  const stageDropTimeLabel = document.getElementById("stageDropTimeLabel");
  const stageThawDurationLabel = document.getElementById("stageThawDurationLabel");
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
        ? `Right away (${minsToTimeStr(DEMO_NOW_MINS)}) • ~${meal.thawTime} mins`
        : `${minsToTimeStr(dropMins)} (while you finish work)`;
    }
    if (stageDropTimeLabel) {
      stageDropTimeLabel.textContent = isLateRescue ? "Drops now" : `Until ${minsToTimeStr(dropMins)}`;
    }
    if (stageThawDurationLabel) {
      stageThawDurationLabel.textContent = `~${meal.thawTime} mins`;
    }
    if (lateRescueNotice) {
      if (isLateRescue) {
        lateRescueNotice.removeAttribute("hidden");
        lateRescueNotice.innerHTML = `<strong>Starting Right Away:</strong> To thaw your ${meal.name} gently without cooking the edges, it will be ready for the pan at <strong>${displayTimeStr}</strong> (instead of ${minsToTimeStr(requestedMins)}).`;
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
        showToast(`${state.selectedMeal.name} selected for tonight (~${state.selectedMeal.thawTime} min gentle thaw).`);
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
      const catName = CATEGORY_FORMULAS[state.loadingCategory].name.split("&")[0].trim();

      drumInventory[slot] = {
        id: slot,
        name: `${catName}`,
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

      rotateCarouselToSlot(slot);
      showToast(`Container ${slot} rotated to the door and stocked with ${catName} (${state.loadingWeight} g).`);
    });
  }

  // TAB 3: RUNNING LATE — Live Animated Mock Location Map & Auto-Cycling Scenarios
  const btnSimulateDelay = document.getElementById("btnSimulateDelay");
  const commuteStatusText = document.getElementById("commuteStatusText");
  const commuteArrivalText = document.getElementById("commuteArrivalText");
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
      startT: 0.14,
      endT: 0.66,
      bubbleOffsetX: 0,
      bubble: "YOU • ETA 19:20",
      homeBadge: "HOME • +10°C THAW",
      homeHalo: "amber",
      locationLabel: "Driving Home (Clear Route)",
      etaLabel: "19:20 (In 20 mins)",
      defrostLabel: "Thawing (+10 °C) • 10m left",
      statusText: "Route clear: Your meal is gently thawing (+10 °C) so it finishes right as you walk in at 19:30.",
      arrivalText: "Target Dinner: 19:30 • ETA: 19:20 • Drawer: Gently Thawing",
      statusColor: "var(--ink-soft)"
    },
    traffic: {
      key: "traffic",
      startT: 0.36,
      endT: 0.54,
      bubbleOffsetX: 0,
      bubble: "TRAFFIC • +30M DELAY",
      homeBadge: "HOME • +3°C HOLD",
      homeHalo: "green",
      locationLabel: "A5 Bridge (Traffic Jam)",
      etaLabel: "19:55 (+30 min delay)",
      defrostLabel: "Switched to +3.0 °C Fridge Hold",
      statusText: "Traffic jam ahead (+30 mins): DINA automatically switched the lower drawer to a +3.0 °C fridge hold so dinner waits safely for you.",
      arrivalText: "Target Dinner: 19:30 • New ETA: 19:55 • Held at +3.0 °C (Up to 24 h)",
      statusColor: "var(--clay)"
    },
    atwork: {
      key: "atwork",
      startT: 0.0,
      endT: 0.0,
      bubbleOffsetX: 18,
      bubble: "STILL AT WORK • 19:15",
      homeBadge: "HOME • +3°C HOLD",
      homeHalo: "green",
      locationLabel: "Still at Office (Late Meeting)",
      etaLabel: "~20:15 (Not left work yet)",
      defrostLabel: "Chilled at +3.0 °C (Up to 24 h)",
      statusText: "Still at work past 19:00? Because you haven't left the office yet, DINA keeps tonight's meal fridge-fresh at +3.0 °C until you get home.",
      arrivalText: "Still at Office • Est. Arrival: 20:15 • Held at +3.0 °C (Up to 24 h)",
      statusColor: "var(--clay)"
    },
    arrived: {
      key: "arrived",
      startT: 0.66,
      endT: 0.85,
      bubbleOffsetX: -14,
      bubble: "ARRIVED HOME!",
      homeBadge: "READY TO COOK!",
      homeHalo: "green",
      locationLabel: "Home Driveway",
      etaLabel: "Arrived (Now)",
      defrostLabel: "Green Handle • Ready for Pan!",
      statusText: "Welcome home! The drawer handle is glowing soft green — slide it open and your meal is evenly thawed, chilled, and ready for a hot pan.",
      arrivalText: "Arrived Home • Drawer: +3.0 °C • Ready to Cook!",
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

    setHaloState(scene.homeHalo === "green" ? "green" : "amber");

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

  // TAB 4: KITCHEN & CARE
  const haloVisual = document.getElementById("haloRingVisual");
  const haloStateLabel = document.getElementById("haloStateLabel");
  const haloBtns = document.querySelectorAll(".halo-btn");
  const telemDrawerTemp = document.getElementById("telemDrawerTemp");
  const telemBlackoutVal = document.getElementById("telemBlackoutVal");

  function setHaloState(mode) {
    if (!haloVisual) return;
    haloVisual.className = "halo-ring-visual " + mode;
    state.haloState = mode;

    let desc = "Warm Amber — Gently Thawing Tonight's Dinner";
    if (mode === "cyan") {
      desc = "Soft Blue — All Meals Deep-Frozen (-18.0 °C)";
      if (telemDrawerTemp) telemDrawerTemp.textContent = "+3.0 °C";
    } else if (mode === "amber") {
      if (telemDrawerTemp) telemDrawerTemp.textContent = "+10.0 °C";
      if (telemBlackoutVal) telemBlackoutVal.textContent = "All Good";
    } else if (mode === "green") {
      desc = "Fresh Green — Dinner Is Ready to Cook (+3.0 °C Fridge Hold)";
      if (telemDrawerTemp) telemDrawerTemp.textContent = "+3.0 °C";
      if (telemBlackoutVal) telemBlackoutVal.textContent = "All Good";
    } else if (mode === "red") {
      desc = "Red Pulse — Food Safety Alert (Check Phone)";
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

  // Customer-Friendly Peace-of-Mind Scenarios
  const btnSimPowerCut = document.getElementById("btnSimPowerCut");
  const btnSimDrawerOpen = document.getElementById("btnSimDrawerOpen");
  const btnSimDishClean = document.getElementById("btnSimDishClean");

  if (btnSimPowerCut) {
    btnSimPowerCut.addEventListener("click", () => {
      triggerHaptic([30, 40, 30]);
      setHaloState("red");
      if (telemBlackoutVal) telemBlackoutVal.textContent = "Do Not Cook";
      if (haloStateLabel) {
        haloStateLabel.textContent = "Red Pulse — Power Was Out Over 2 Hours (Above +5 °C): Please Discard Meal";
      }
      showToast("Power-Cut Protection: The drawer warmed above +5 °C for over 2 hours. DINA paused thawing and alerted your phone.");
    });
  }

  if (btnSimDrawerOpen) {
    btnSimDrawerOpen.addEventListener("click", () => {
      triggerHaptic([20]);
      showToast("Smart Pause: A dish is still in the drawer (or the drawer is open), so DINA kept the upper hatch closed and sent you a reminder.");
    });
  }

  if (btnSimDishClean) {
    btnSimDishClean.addEventListener("click", () => {
      triggerHaptic([15]);
      showToast("Easy Care Reminder: Time to pop the removable drip tray into the dishwasher for a quick rinse.");
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
