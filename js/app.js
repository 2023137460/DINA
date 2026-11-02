/**
 * DINA Companion App — Interactive Connected Appliance Simulator (v10.0)
 * Architecture:
 * - Single reactive store (sim, plan, flags, UI state)
 * - Pure computeTonight(simMins, plan, flags) state function
 * - Simulated afternoon clock engine (1x, 5x, 20x, scrubber)
 * - Three tabs: Tonight, Freezer, Kitchen
 * - Accessible bottom sheets, cutaway cross-section SVG animation, live thaw chart
 * - 6-step guided tour
 * - Strictly follows /dina-brand-identity, /mobile-design, /emil-design-eng
 */

document.addEventListener("DOMContentLoaded", () => {
  // Service Worker Registration for PWA mode
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  // Haptic feedback helper
  function triggerHaptic(pattern = [15]) {
    if ("vibrate" in navigator) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  }

  // Security / HTML Escaping Helper
  function escapeHTML(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Time format helpers (24-hour format everywhere)
  function formatTime(h, m) {
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  function minsToTimeStr(totalMins) {
    const normalized = ((Math.round(totalMins) % 1440) + 1440) % 1440;
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return formatTime(h, m);
  }

  // =========================================================================
  // Thermal Model & Inventory (Decisions Already Made)
  // =========================================================================

  // Thaw times are modelled estimates, pending validation
  const CATEGORY_FORMULAS = {
    beef: {
      name: "Steak & Beef",
      base: 26,
      factor: 0.131,
      holdMinutes: 15,
      densityName: "Dense Protein (1.06 g/cm³)"
    },
    chicken: {
      name: "Chicken & Poultry",
      base: 30,
      factor: 0.130,
      holdMinutes: 20,
      densityName: "Standard Poultry (1.04 g/cm³)"
    },
    fish: {
      name: "Fish Fillets",
      base: 25,
      factor: 0.125,
      holdMinutes: 15,
      densityName: "Tender Fillet (1.05 g/cm³)"
    },
    shrimp: {
      name: "Prawns & Seafood",
      base: 15,
      factor: 0.100,
      holdMinutes: 10,
      densityName: "Shellfish / Porous (1.02 g/cm³)"
    },
    vegetables: {
      name: "Vegetables & Sides",
      base: 15,
      factor: 0.080,
      holdMinutes: 10,
      densityName: "Light / Fibrous (0.92 g/cm³)"
    },
    lasagna: {
      name: "Homemade Lasagna",
      base: 35,
      factor: 0.115,
      holdMinutes: 25,
      densityName: "Dense Layered Batch (1.08 g/cm³)"
    },
    pork: {
      name: "Pork & Medallions",
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

  // 11-Meal Drum Inventory (Aligned with index.html)
  const drumInventory = {
    "01": { id: "01", name: "Organic Chicken Breast", category: "chicken", weight: 500, tier: 2, slot: "01", photo: "assets/images/meal_chicken_breast.jpg" },
    "02": { id: "02", name: "Beef Ribeye", category: "beef", weight: 450, tier: 2, slot: "02", photo: "assets/images/meal_beef_ribeye.jpg" },
    "03": { id: "03", name: "Atlantic Salmon Fillet", category: "fish", weight: 320, tier: 2, slot: "03", photo: "assets/images/meal_salmon_fillet.jpg" },
    "04": { id: "04", name: "Wild Tiger Prawns", category: "shrimp", weight: 250, tier: 2, slot: "04", photo: "assets/images/meal_tiger_prawns.jpg" },
    "05": { id: "05", name: "Homemade Lasagna", category: "lasagna", weight: 600, tier: 2, slot: "05", photo: "assets/images/meal_lasagna.jpg" },
    "06": { id: "06", name: "Pork Tenderloin Medallions", category: "pork", weight: 350, tier: 2, slot: "06", photo: "assets/images/meal_pork_tenderloin.jpg" },
    "07": { id: "07", name: "Atlantic Codfish Loins", category: "fish", weight: 400, tier: 1, slot: "07", photo: "assets/images/meal_salmon_fillet.jpg" },
    "08": { id: "08", name: "Filet Mignon Steak", category: "beef", weight: 300, tier: 1, slot: "08", photo: "assets/images/meal_beef_ribeye.jpg" },
    "09": null,
    "10": null,
    "11": null,
    "12": { id: "12", name: "Drop Path", category: "chimney", isChimney: true, tier: 1, slot: "12" }
  };

  // Compute thaw times for all stocked items through calculateThaw
  Object.keys(drumInventory).forEach(slotKey => {
    const item = drumInventory[slotKey];
    if (item && !item.isChimney) {
      item.thawTime = calculateThaw(item.category, item.weight);
      item.equalizationTime = getEqualizationTime(item.category, item.weight);
    }
  });

  // =========================================================================
  // Pure State Function: computeTonight(simMins, plan, flags)
  // =========================================================================

  function computeTonight(simMins, plan, flags) {
    const readyMins = plan.readyMins;
    const thawMin = plan.thawMin;
    const equalizeMin = plan.equalizeMin;
    const dropMins = readyMins - thawMin - equalizeMin;
    const thawEndMins = dropMins + thawMin;

    const commute = flags.commute || "ontime";
    let etaLabel = "19:20";
    let commuteText = "Route clear &bull; <strong>ETA 19:20</strong> &bull; Scheduled for 19:30";

    if (commute === "traffic") {
      etaLabel = "19:55 (+30m)";
      commuteText = "A5 Bridge Traffic (+30 min) &bull; <strong>New ETA 19:55</strong> &bull; Switched to hold";
    } else if (commute === "atwork") {
      etaLabel = "~20:15 (At work)";
      commuteText = "Still at office past 19:00 &bull; <strong>Estimated 20:15</strong> &bull; Switched to hold";
    } else if (commute === "arrived") {
      etaLabel = "Arrived (Now)";
      commuteText = "Welcome home &bull; <strong>Arrived</strong> &bull; Dinner ready to cook";
    }

    // 1. Skipped override ("Eating out tonight")
    if (flags.skipped) {
      return {
        phase: "skipped",
        progress: 0,
        minsToNext: 0,
        surfaceC: null,
        coreC: null,
        drawerAirC: null,
        drawerZoneC: 3.0,
        led: "blue",
        eta: etaLabel,
        commuteState: commute,
        commuteText: commuteText,
        headline: "Eating Out Tonight",
        subtext: "All 11 meals stay deep-frozen at -18.0 °C in vault. Drawer remains in standby.",
        action: "Resume Dinner Plan"
      };
    }

    // 2. Power-cut safety tiers
    if (flags.powerCutMinutes >= 120) {
      return {
        phase: "lockout",
        progress: 1,
        minsToNext: 0,
        surfaceC: 6.4,
        coreC: 4.8,
        drawerAirC: 6.4,
        drawerZoneC: 6.4,
        led: "red",
        eta: etaLabel,
        commuteState: commute,
        commuteText: commuteText,
        headline: "Tier 2 Safety Lockout: Discard Meal",
        subtext: "Food temperature exceeded +5.0 °C for > 2 hours. Active heating locked out; do not refreeze.",
        action: "Clear Power Cut"
      };
    }

    if (flags.powerCutMinutes >= 30) {
      return {
        phase: "warning",
        progress: 1,
        minsToNext: 0,
        surfaceC: 5.2,
        coreC: 1.2,
        drawerAirC: 5.2,
        drawerZoneC: 5.2,
        led: "amberFast",
        eta: etaLabel,
        commuteState: commute,
        commuteText: commuteText,
        headline: "Tier 1 Safety Warning: Check Dish",
        subtext: "Chamber reached +5.2 °C (> 30 min outage). Active heating paused pending inspection.",
        action: "Inspect & Resume"
      };
    }

    // 3. Dish in drawer ("Smart pause" prevents drop)
    if (flags.drawerOccupied && simMins >= dropMins && simMins < readyMins) {
      return {
        phase: "warning",
        progress: 0,
        minsToNext: 0,
        surfaceC: null,
        coreC: null,
        drawerAirC: null,
        drawerZoneC: 3.0,
        led: "amber",
        eta: etaLabel,
        commuteState: commute,
        commuteText: commuteText,
        headline: "Smart Pause Active",
        subtext: "A dish is still in the lower drawer. Drop hatch kept sealed to prevent collision.",
        action: "Clear Drawer"
      };
    }

    // 4. Normal Progression
    // A. Idle (before 15:00)
    if (simMins < 15 * 60) {
      return {
        phase: "idle",
        progress: 0,
        minsToNext: 15 * 60 - simMins,
        surfaceC: null,
        coreC: null,
        drawerAirC: null,
        drawerZoneC: 3.0,
        led: "blue",
        eta: etaLabel,
        commuteState: commute,
        commuteText: commuteText,
        headline: "Freezer Standby",
        subtext: `All meals deep-frozen at -18.0 °C. Afternoon check-in scheduled for 15:00.`,
        action: "Change Dinner"
      };
    }

    // B. Check-in (at 15:00, unconfirmed)
    if (!plan.isConfirmed && simMins === 15 * 60) {
      return {
        phase: "checkin",
        progress: 0,
        minsToNext: dropMins - simMins,
        surfaceC: null,
        coreC: null,
        drawerAirC: null,
        drawerZoneC: 3.0,
        led: "blue",
        eta: etaLabel,
        commuteState: commute,
        commuteText: commuteText,
        headline: "15:00 Afternoon Check-In",
        subtext: `Ready for ${plan.meal.name} tonight at ${minsToTimeStr(readyMins)}? Tap "Sounds Good" above.`,
        action: "Confirm Dinner"
      };
    }

    // C. Scheduled (confirmed, waiting for dropMins)
    if (simMins < dropMins) {
      const elapsed = simMins - 15 * 60;
      const totalSpan = dropMins - 15 * 60;
      const prog = totalSpan > 0 ? Math.max(0, Math.min(1, elapsed / totalSpan)) : 0;
      return {
        phase: "scheduled",
        progress: prog,
        minsToNext: dropMins - simMins,
        surfaceC: null,
        coreC: null,
        drawerAirC: null,
        drawerZoneC: 3.0,
        led: "blue",
        eta: etaLabel,
        commuteState: commute,
        commuteText: commuteText,
        headline: `Dinner is scheduled. ${plan.meal.name} drops at ${minsToTimeStr(dropMins)}.`,
        subtext: `Drawer starts empty in standby (+3.0 °C zone). Drops at ${minsToTimeStr(dropMins)} for an ${thawMin} min gentle thaw + ${equalizeMin} min equalization.`,
        action: "Change Dinner"
      };
    }

    // D. Drop sequence (2.5s / 1 min window)
    if (simMins < dropMins + 1) {
      return {
        phase: "drop",
        progress: 1.0,
        minsToNext: thawMin,
        surfaceC: -18.0,
        coreC: -18.0,
        drawerAirC: 10.0,
        drawerZoneC: 3.0,
        led: "amber",
        eta: etaLabel,
        commuteState: commute,
        commuteText: commuteText,
        headline: "Airlock Drop Sequence",
        subtext: `Sealed hatch opened (2.5 s). ${plan.meal.name} dropped into +3 °C drawer; convection defrost beginning.`,
        action: "View Cutaway"
      };
    }

    // E. Active thaw (+10.0 °C air until food surface hits +4.0 °C)
    if (simMins < thawEndMins) {
      const u = (simMins - dropMins) / thawMin;
      let surfaceC = -18.0;
      if (u < 0.25) {
        surfaceC = -18.0 + 17.0 * Math.pow(u / 0.25, 0.7);
      } else if (u < 0.75) {
        surfaceC = -1.0 + 2.0 * ((u - 0.25) / 0.5);
      } else {
        surfaceC = 1.0 + 3.0 * ((u - 0.75) / 0.25);
      }

      let coreC = -18.0;
      if (u < 0.35) {
        coreC = -18.0 + 12.0 * (u / 0.35);
      } else {
        coreC = -6.0 + 4.5 * ((u - 0.35) / 0.65);
      }

      const minsLeft = Math.round(thawEndMins - simMins);
      return {
        phase: "thaw",
        progress: u,
        minsToNext: minsLeft,
        surfaceC: Number(surfaceC.toFixed(1)),
        coreC: Number(coreC.toFixed(1)),
        drawerAirC: 10.0,
        drawerZoneC: 3.0,
        led: "amber",
        eta: etaLabel,
        commuteState: commute,
        commuteText: commuteText,
        headline: `Thawing: ${minsLeft} min left until surface cutoff.`,
        subtext: `Convection air +10 °C runs until food surface reaches +4.0 °C limit (currently ${surfaceC.toFixed(1)} °C).`,
        action: "Hold +30 min"
      };
    }

    // F. Conduction Equalization (convection stops, air steps down toward +3.0 °C)
    if (simMins < readyMins) {
      const v = (simMins - thawEndMins) / equalizeMin;
      const surfaceC = 4.0 - 0.8 * v;
      const coreC = -1.5 + 4.5 * v;
      const airC = 10.0 - 7.0 * Math.min(1, v * 1.8);
      const minsLeft = Math.round(readyMins - simMins);

      return {
        phase: "equalize",
        progress: v,
        minsToNext: minsLeft,
        surfaceC: Number(surfaceC.toFixed(1)),
        coreC: Number(coreC.toFixed(1)),
        drawerAirC: Number(airC.toFixed(1)),
        drawerZoneC: 3.0,
        led: "amber",
        eta: etaLabel,
        commuteState: commute,
        commuteText: commuteText,
        headline: `Equalizing: ${minsLeft} min left to core target.`,
        subtext: `Surface reached +4.0 °C cutoff. Air stepped down to +3 °C while core equalizes by conduction.`,
        action: "Hold +30 min"
      };
    }

    // G. Ready or Held (+3.0 °C fridge hold)
    const isHeld = (commute === "traffic" || commute === "atwork" || simMins > readyMins + 15);
    return {
      phase: isHeld ? "held" : "ready",
      progress: 1.0,
      minsToNext: 0,
      surfaceC: 3.0,
      coreC: 3.0,
      drawerAirC: 3.0,
      drawerZoneC: 3.0,
      led: "green",
      eta: etaLabel,
      commuteState: commute,
      commuteText: commuteText,
      headline: isHeld ? "Held Fridge-Fresh at +3.0 °C" : "Dinner Is Ready to Cook",
      subtext: isHeld
        ? `Commute delay active. ${plan.meal.name} is safely held chilled at +3.0 °C (up to 24 h).`
        : `${plan.meal.name} is evenly thawed through to the core at +3.0 °C. Ready for the skillet!`,
      action: "Change Dinner"
    };
  }

  // =========================================================================
  // Central Single Store
  // =========================================================================

  const store = {
    state: {
      sim: {
        mins: 900, // starts at 15:00 (900 minutes)
        speed: 1,  // 1x, 5x, 20x
        playing: true
      },
      plan: {
        slot: "02",
        meal: drumInventory["02"],
        readyMins: 1170, // 19:30
        thawMin: 85,
        equalizeMin: 15,
        dropMins: 1070, // 17:50
        isConfirmed: false
      },
      flags: {
        commute: "ontime", // "ontime" | "traffic" | "atwork" | "arrived"
        powerCutMinutes: 0,
        drawerOccupied: false,
        wifiOffline: false,
        commuteSyncEnabled: true,
        skipped: false
      },
      activeTab: "tab-tonight",
      selectedFreezerSlot: "02",
      targetStockSlot: "09",
      loadingCategory: "beef",
      loadingWeight: 450,
      manualPreviewHalo: null,
      tour: {
        active: false,
        step: 0
      }
    },
    listeners: [],
    subscribe(fn) {
      this.listeners.push(fn);
      return () => {
        this.listeners = this.listeners.filter(l => l !== fn);
      };
    },
    set(partial) {
      if (partial.sim) Object.assign(this.state.sim, partial.sim);
      if (partial.plan) Object.assign(this.state.plan, partial.plan);
      if (partial.flags) Object.assign(this.state.flags, partial.flags);
      if (partial.tour) Object.assign(this.state.tour, partial.tour);
      if (partial.activeTab !== undefined) this.state.activeTab = partial.activeTab;
      if (partial.selectedFreezerSlot !== undefined) this.state.selectedFreezerSlot = partial.selectedFreezerSlot;
      if (partial.targetStockSlot !== undefined) this.state.targetStockSlot = partial.targetStockSlot;
      if (partial.loadingCategory !== undefined) this.state.loadingCategory = partial.loadingCategory;
      if (partial.loadingWeight !== undefined) this.state.loadingWeight = partial.loadingWeight;
      if (partial.manualPreviewHalo !== undefined) this.state.manualPreviewHalo = partial.manualPreviewHalo;

      this.notify();
    },
    notify() {
      const snap = this.state;
      this.listeners.forEach(fn => fn(snap));
    }
  };

  // Toast Functionality (Calm editorial voice, zero emojis)
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

  // =========================================================================
  // DOM References
  // =========================================================================

  // Header Elements
  const simClockDisplay = document.getElementById("simClockDisplay");
  const headerLedDot = document.getElementById("headerLedDot");
  const headerLedText = document.getElementById("headerLedText");
  const headerStatusText = document.getElementById("headerStatusText");
  const headerPulseDot = document.getElementById("headerPulseDot");
  const btnHeaderBell = document.getElementById("btnHeaderBell");
  const btnHeaderSim = document.getElementById("btnHeaderSim");

  // Top Target Schedule Bar
  const topBarTargetDinnerTime = document.getElementById("topBarTargetDinnerTime");
  const topBarCommuteLabel = document.getElementById("topBarCommuteLabel");
  const topBarCommuteDot = document.getElementById("topBarCommuteDot");
  const btnOpenScheduleSheet = document.getElementById("btnOpenScheduleSheet");
  const btnTopBarCommute = document.getElementById("btnTopBarCommute");

  // Tab Navigation Elements
  const bottomTabs = document.querySelectorAll(".bottom-tab-item");
  const tabContents = document.querySelectorAll(".tab-content");

  // Tonight Tab Elements
  const lockNotificationCard = document.getElementById("lockNotificationCard");
  const lockNotifQuestionText = document.getElementById("lockNotifQuestionText");
  const btnNotifYes = document.getElementById("btnNotifYes");
  const btnNotifSwap = document.getElementById("btnNotifSwap");
  const btnNotifSkip = document.getElementById("btnNotifSkip");

  const heroFoodImg = document.getElementById("heroFoodImg");
  const heroFoodSlotLabel = document.getElementById("heroFoodSlotLabel");
  const heroStatusPill = document.getElementById("heroStatusPill");
  const heroTargetDinnerTime = document.getElementById("heroTargetDinnerTime");
  const heroPhaseTag = document.getElementById("heroPhaseTag");
  const heroCountdownVal = document.getElementById("heroCountdownVal");
  const heroHeading = document.getElementById("heroHeading");
  const heroSubtext = document.getElementById("heroSubtext");
  const heroReassuranceText = document.getElementById("heroReassuranceText");
  const btnHeroAction = document.getElementById("btnHeroAction");
  const btnTonightHold30 = document.getElementById("btnTonightHold30");
  const thawConsumerPhaseLabel = document.getElementById("thawConsumerPhaseLabel");
  const thawConsumerReadyTime = document.getElementById("thawConsumerReadyTime");
  const techTelemetryDisclosure = document.getElementById("techTelemetryDisclosure");
  const btnToggleDemoMode = document.getElementById("btnToggleDemoMode");

  // Tonight 3-Step Order Tracker
  const thawOrderTracker = document.getElementById("thawOrderTracker");
  const orderStep1 = document.getElementById("orderStep1");
  const orderStep2 = document.getElementById("orderStep2");
  const orderStep3 = document.getElementById("orderStep3");
  const orderStepFrozenSub = document.getElementById("orderStepFrozenSub");
  const orderStepPreparingSub = document.getElementById("orderStepPreparingSub");
  const orderStepReadySub = document.getElementById("orderStepReadySub");
  const orderTrackerLine1 = document.getElementById("orderTrackerLine1");
  const orderTrackerLine2 = document.getElementById("orderTrackerLine2");

  // Cutaway SVG Elements (CAD Section A-A)
  const cutawayCard = document.getElementById("cutawayCard");
  const cutawaySlotActive = document.getElementById("cutaway-slot-active");
  const cutawayHatch = document.getElementById("cutaway-hatch");
  const cutawayDrawerMeal = document.getElementById("cutaway-drawer-meal");
  const cutawayDrawerStatus = document.getElementById("cutaway-drawer-status");
  const cutawayDropContainer = document.getElementById("cutawayDropContainer");
  const cutawayDrawerTemp = document.getElementById("cutaway-drawer-temp");
  const cutawayDrawerIndicator = document.getElementById("cutaway-drawer-indicator");
  // Legacy references kept safe if queried elsewhere
  const cutawayRotor = document.getElementById("cutawayRotor");
  const cutawaySlotContainer = document.getElementById("cutawaySlotContainer");
  const cutawayHatchFlap = document.getElementById("cutawayHatchFlap");
  const cutawayDrawerContainer = document.getElementById("cutawayDrawerContainer");
  const cutawayFrostLayer = document.getElementById("cutawayFrostLayer");
  const cutawayDrawerGlow = document.getElementById("cutawayDrawerGlow");
  const cutawayHandleGlow = document.getElementById("cutawayHandleGlow");
  const cutawayAirflow = document.getElementById("cutawayAirflow");
  const cutawaySmartPauseTag = document.getElementById("cutawaySmartPauseTag");
  const cutawayDrawerStatusText = document.getElementById("cutawayDrawerStatusText");

  // Four-Stage Pipeline Elements
  const stageStepFrozen = document.getElementById("stageStepFrozen");
  const stageStepActiveThaw = document.getElementById("stageStepActiveThaw");
  const stageStepEqualization = document.getElementById("stageStepEqualization");
  const stageStepHold = document.getElementById("stageStepHold");
  const stageDropTimeLabel = document.getElementById("stageDropTimeLabel");
  const stageThawDurationLabel = document.getElementById("stageThawDurationLabel");
  const stageEqualizeDurationLabel = document.getElementById("stageEqualizeDurationLabel");
  const pipelineProgressBar = document.getElementById("pipelineProgressBar");

  // Live Thaw Card Elements
  const liveThawCard = document.getElementById("liveThawCard");
  const thawRingProgressCircle = document.getElementById("thawRingProgressCircle");
  const thawRingPct = document.getElementById("thawRingPct");
  const thawLiveAirC = document.getElementById("thawLiveAirC");
  const thawLiveSurfaceC = document.getElementById("thawLiveSurfaceC");
  const thawChartScrubberLine = document.getElementById("thawChartScrubberLine");

  // Evening Card Elements
  const eveningCommuteText = document.getElementById("eveningCommuteText");
  const btnOpenMapSheet = document.getElementById("btnOpenMapSheet");

  // Quick Action Buttons
  const btnQuickChangeDinner = document.getElementById("btnQuickChangeDinner");
  const btnQuickEatingOut = document.getElementById("btnQuickEatingOut");
  const btnQuickHold30 = document.getElementById("btnQuickHold30");

  // Freezer Tab Elements
  const freezerStockedCount = document.getElementById("freezerStockedCount");
  const upperRingBadge = document.getElementById("upperRingBadge");
  const lowerRingBadge = document.getElementById("lowerRingBadge");
  const interactiveDrumRotor = document.getElementById("interactiveDrumRotor");
  const drumWheelStatusTitle = document.getElementById("drumWheelStatusTitle");
  const drumSlotButtons = document.querySelectorAll(".drum-slot-btn");
  const slotDetailName = document.getElementById("slotDetailName");
  const slotDetailStatus = document.getElementById("slotDetailStatus");
  const slotDetailInfo = document.getElementById("slotDetailInfo");
  const btnUseSlotForTonight = document.getElementById("btnUseSlotForTonight");
  const btnOpenAddMealSheet = document.getElementById("btnOpenAddMealSheet");

  // Freezer Front-Door Minimap, Filter Pills & Sticky Bar
  const freezerMiniDoorIndicator = document.getElementById("freezerMiniDoorIndicator");
  const btnDoorLoadMeal = document.getElementById("btnDoorLoadMeal");
  const freezerCatPills = document.querySelectorAll(".freezer-cat-pill");
  const freezerMenuCards = document.querySelectorAll(".freezer-menu-card");
  const freezerStickyBar = document.getElementById("freezerStickyBar");
  const stickySlotDish = document.getElementById("stickySlotDish");
  const stickySlotMeta = document.getElementById("stickySlotMeta");
  const btnStickyUseTonight = document.getElementById("btnStickyUseTonight");
  const btnStickyBringToDoor = document.getElementById("btnStickyBringToDoor");

  // Kitchen Tab Elements
  const telemDrawerTemp = document.getElementById("telemDrawerTemp");
  const telemDrawerSub = document.getElementById("telemDrawerSub");
  const telemBlackoutVal = document.getElementById("telemBlackoutVal");
  const telemBlackoutSub = document.getElementById("telemBlackoutSub");
  const clFanState = document.getElementById("clFanState");
  const clFanSub = document.getElementById("clFanSub");
  const clSurfaceTemp = document.getElementById("clSurfaceTemp");
  const clCoreTemp = document.getElementById("clCoreTemp");
  const pcutStepBtns = document.querySelectorAll(".pcut-step-btn");
  const btnSimDrawerOpen = document.getElementById("btnSimDrawerOpen");
  const btnSimDishClean = document.getElementById("btnSimDishClean");
  const scenarioFeedbackBox = document.getElementById("scenarioFeedbackBox");
  const scenarioFeedbackText = document.getElementById("scenarioFeedbackText");
  const haloVisual = document.getElementById("haloRingVisual");
  const haloStateLabel = document.getElementById("haloStateLabel");
  const haloBtns = document.querySelectorAll(".halo-btn");
  const btnToggleCommuteSync = document.getElementById("btnToggleCommuteSync");
  const btnSimulateOffline = document.getElementById("btnSimulateOffline");

  // Bottom Sheets & Backdrop
  const sheetBackdrop = document.getElementById("sheetBackdrop");
  const changeDinnerSheet = document.getElementById("changeDinnerSheet");
  const btnCloseChangeDinner = document.getElementById("btnCloseChangeDinner");
  const sheetMealGrid = document.getElementById("sheetMealGrid");
  const dialContainer = document.getElementById("dialContainer");
  const dialTicksGroup = document.getElementById("dialTicks");
  const dialArc = document.getElementById("dialArc");
  const dialValue = document.getElementById("dialValue");
  const lateRescueNotice = document.getElementById("lateRescueNotice");
  const presetChips = document.querySelectorAll(".time-preset-chip");
  const btnConfirmDinnerSheet = document.getElementById("btnConfirmDinnerSheet");

  const addMealSheet = document.getElementById("addMealSheet");
  const btnCloseAddMeal = document.getElementById("btnCloseAddMeal");
  const sheetTargetSlotDisplay = document.getElementById("sheetTargetSlotDisplay");
  const sheetMealNameInput = document.getElementById("sheetMealNameInput");
  const sheetCategoryChipsGrid = document.getElementById("sheetCategoryChipsGrid");
  const sheetWeightSlider = document.getElementById("sheetWeightSlider");
  const sheetWeightDisplay = document.getElementById("sheetWeightDisplay");
  const sheetDensityName = document.getElementById("sheetDensityName");
  const sheetThawCalcDisplay = document.getElementById("sheetThawCalcDisplay");
  const btnSaveStockMeal = document.getElementById("btnSaveStockMeal");

  const liveMapSheet = document.getElementById("liveMapSheet");
  const btnCloseLiveMap = document.getElementById("btnCloseLiveMap");
  const mapSceneBtns = document.querySelectorAll(".map-scene-btn");
  const mapCanvasWrap = document.getElementById("mapCanvasWrap");
  const mapRouteFlowLine = document.getElementById("mapRouteFlowLine");
  const mapUserMarker = document.getElementById("mapUserMarker");
  const mapUserBubbleText = document.getElementById("mapUserBubbleText");
  const mapHomeBadgeText = document.getElementById("mapHomeBadgeText");
  const mapHomeHaloRing = document.getElementById("mapHomeHaloRing");
  const mapMetricLocation = document.getElementById("mapMetricLocation");
  const mapMetricEta = document.getElementById("mapMetricEta");
  const mapMetricDefrost = document.getElementById("mapMetricDefrost");

  const directorSheet = document.getElementById("directorSheet");
  const btnCloseDirectorSheet = document.getElementById("btnCloseDirectorSheet");
  const btnOpenDemoSheet = document.getElementById("btnOpenDemoSheet");

  // Director Controls (Desktop and Mobile)
  const directorClockVal = document.getElementById("directorClockVal");
  const mobileDirectorClockVal = document.getElementById("mobileDirectorClockVal");
  const simScrubber = document.getElementById("simScrubber");
  const mobileSimScrubber = document.getElementById("mobileSimScrubber");
  const btnDirectorPlayPause = document.getElementById("btnDirectorPlayPause");
  const btnSpeedMobilePlayPause = document.getElementById("btnSpeedMobilePlayPause");
  const speedButtons = document.querySelectorAll(".btn-speed");
  const btnDirectorReset = document.getElementById("btnDirectorReset");
  const btnMobileDirectorReset = document.getElementById("btnMobileDirectorReset");
  const commutePillButtons = document.querySelectorAll("[data-commute]");
  const pcutPillButtons = document.querySelectorAll("[data-pcut]");
  const btnToggleDrawerOccupied = document.getElementById("btnToggleDrawerOccupied");
  const btnMobileToggleDrawerOccupied = document.getElementById("btnMobileToggleDrawerOccupied");
  const btnToggleWifiDesktop = document.getElementById("btnToggleWifiDesktop");
  const btnMobileToggleWifi = document.getElementById("btnMobileToggleWifi");
  const btnLaunchTourDesktop = document.getElementById("btnLaunchTourDesktop");
  const btnLaunchTourMobile = document.getElementById("btnLaunchTourMobile");

  // Director Sub-Tabs & Cutaway Hosts
  const btnDirectorTabScenario = document.getElementById("btnDirectorTabScenario");
  const btnDirectorTabCad = document.getElementById("btnDirectorTabCad");
  const directorScenarioPanel = document.getElementById("directorScenarioPanel");
  const directorCadPanel = document.getElementById("directorCadPanel");
  const btnDesktopTabScenario = document.getElementById("btnDesktopTabScenario");
  const btnDesktopTabCad = document.getElementById("btnDesktopTabCad");
  const desktopScenarioPanel = document.getElementById("desktopScenarioPanel");
  const desktopCadPanel = document.getElementById("desktopCadPanel");
  const mobileCutawayHost = document.getElementById("mobileCutawayHost");
  const desktopCutawayHost = document.getElementById("desktopCutawayHost");

  // Tour Elements
  const tourPromptCard = document.getElementById("tourPromptCard");
  const btnTourPromptStart = document.getElementById("btnTourPromptStart");
  const btnTourPromptSkip = document.getElementById("btnTourPromptSkip");
  const btnTourPromptDismiss = document.getElementById("btnTourPromptDismiss");
  const tourCaptionBar = document.getElementById("tourCaptionBar");
  const tourStepBadge = document.getElementById("tourStepBadge");
  const tourCaptionText = document.getElementById("tourCaptionText");
  const btnTourNext = document.getElementById("btnTourNext");
  const btnTourReplay = document.getElementById("btnTourReplay");
  const btnTourExit = document.getElementById("btnTourExit");

  // Mode Controller Elements (Simple Mode vs. Engineering Mode)
  const btnModeSimple = document.getElementById("btnModeSimple");
  const btnModeEngineering = document.getElementById("btnModeEngineering");
  const btnToggleAppModeSimple = document.getElementById("btnToggleAppModeSimple");
  const currentModeLabel = document.getElementById("currentModeLabel");
  const twinDrawerTempVal = document.getElementById("twinDrawerTempVal");
  const freezerOverviewReady = document.getElementById("freezerOverviewReady");
  const freezerOverviewOpen = document.getElementById("freezerOverviewOpen");

  let currentAppMode = localStorage.getItem("dina_app_mode") || "simple";

  function setAppMode(mode) {
    currentAppMode = mode;
    localStorage.setItem("dina_app_mode", mode);
    document.body.dataset.appMode = mode;
    const isSimple = mode === "simple";
    if (btnModeSimple) {
      btnModeSimple.classList.toggle("active", isSimple);
      btnModeSimple.setAttribute("aria-checked", String(isSimple));
    }
    if (btnModeEngineering) {
      btnModeEngineering.classList.toggle("active", !isSimple);
      btnModeEngineering.setAttribute("aria-checked", String(!isSimple));
    }
    if (currentModeLabel) {
      currentModeLabel.textContent = isSimple ? "Simple Mode" : "Engineering Mode";
    }
    triggerHaptic([12]);
  }

  if (btnModeSimple) {
    btnModeSimple.addEventListener("click", () => setAppMode("simple"));
  }
  if (btnModeEngineering) {
    btnModeEngineering.addEventListener("click", () => setAppMode("engineering"));
  }
  if (btnToggleAppModeSimple) {
    btnToggleAppModeSimple.addEventListener("click", () => {
      setAppMode(currentAppMode === "simple" ? "engineering" : "simple");
    });
  }
  setAppMode(currentAppMode);

  // =========================================================================
  // Dial Tick Generation & Geometry
  // =========================================================================

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

  let tempDialMins = 1170; // 19:30 default
  function updateDialGeometry(readyMins) {
    if (!dialArc || !dialValue) return;
    const cx = 100;
    const cy = 100;
    const r = 88;

    // Map 18:00 (1080) -> 22:00 (1320) to angle 0 -> 360
    const clampedMins = Math.max(1080, Math.min(1320, readyMins));
    const fraction = (clampedMins - 1080) / 240;
    const angleDeg = fraction * 340 + 10;
    const angleRad = angleDeg * (Math.PI / 180);

    const startX = cx + r * Math.cos(0);
    const startY = cy + r * Math.sin(0);
    const endX = cx + r * Math.cos(angleRad);
    const endY = cy + r * Math.sin(angleRad);
    const largeArc = angleDeg > 180 ? 1 : 0;

    dialArc.setAttribute("d", `M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`);

    const displayStr = minsToTimeStr(clampedMins);
    dialValue.textContent = displayStr;

    if (dialContainer) {
      dialContainer.setAttribute("aria-valuenow", String(clampedMins));
      dialContainer.setAttribute("aria-valuetext", `${displayStr} tonight`);
    }

    // Check Late Rescue Logic against simulated clock
    const meal = store.state.plan.meal;
    const thawMin = meal.thawTime;
    const eqMin = meal.equalizationTime;
    const totalDefrost = thawMin + eqMin;
    const earliestSafeMins = store.state.sim.mins + totalDefrost;
    const isTooEarly = clampedMins < earliestSafeMins;

    if (lateRescueNotice) {
      if (isTooEarly) {
        lateRescueNotice.removeAttribute("hidden");
        lateRescueNotice.innerHTML = `<strong>Thermal Window Advisory:</strong> Requires <strong>${thawMin} min</strong> active thaw + <strong>${eqMin} min</strong> equalization (${totalDefrost} min total). Earliest feasible ready time from current simulated ${minsToTimeStr(store.state.sim.mins)} clock is <strong>${minsToTimeStr(earliestSafeMins)}</strong> (instead of requested ${displayStr}).`;
      } else {
        lateRescueNotice.setAttribute("hidden", "");
      }
    }
  }

  // =========================================================================
  // Cutaway Airlock Drop Sequence Animation
  // =========================================================================

  let lastPhase = "idle";
  function triggerAirlockSequence() {
    if (!cutawayHatch && !cutawayHatchFlap) return;

    // Check if motion is reduced
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      if (cutawayHatch) cutawayHatch.style.transform = "rotate(0deg)";
      if (cutawayHatchFlap) cutawayHatchFlap.classList.remove("open");
      if (cutawaySlotActive) cutawaySlotActive.setAttribute("opacity", "0.25");
      if (cutawayDropContainer) cutawayDropContainer.setAttribute("opacity", "0");
      if (cutawayDrawerMeal) {
        cutawayDrawerMeal.setAttribute("opacity", "1");
        const mealRect = cutawayDrawerMeal.querySelector("rect");
        if (mealRect) {
          mealRect.setAttribute("fill", "#C87D55");
          mealRect.setAttribute("stroke", "#191919");
          mealRect.removeAttribute("stroke-dasharray");
        }
        const mealText = cutawayDrawerMeal.querySelector("text");
        if (mealText) {
          mealText.textContent = "Beef Ribeye • 450g";
          mealText.setAttribute("fill", "#FFFFFF");
        }
      }
      if (cutawayDrawerContainer) cutawayDrawerContainer.setAttribute("opacity", "1");
      return;
    }

    // 1. Hatch opens (400ms)
    if (cutawayHatch) cutawayHatch.style.transform = "rotate(30deg)";
    if (cutawayHatchFlap) cutawayHatchFlap.classList.add("open");
    if (cutawaySlotActive) cutawaySlotActive.setAttribute("opacity", "0.25");
    if (cutawayDropContainer) {
      cutawayDropContainer.setAttribute("opacity", "1");
      cutawayDropContainer.style.transition = "none";
      cutawayDropContainer.setAttribute("transform", "translate(0, 0)");
    }

    // 2. Container slides down pass-through chute into Defrost Drawer (900ms)
    setTimeout(() => {
      if (cutawayDropContainer) {
        cutawayDropContainer.style.transition = "transform 900ms cubic-bezier(0.22, 0.61, 0.36, 1)";
        cutawayDropContainer.setAttribute("transform", "translate(0, 256)");
      }
    }, 400);

    // 3. Hatch closes (400ms) and container lands on Defrost Drawer tray
    setTimeout(() => {
      if (cutawayHatch) cutawayHatch.style.transform = "rotate(0deg)";
      if (cutawayHatchFlap) cutawayHatchFlap.classList.remove("open");
      if (cutawayDropContainer) cutawayDropContainer.setAttribute("opacity", "0");
      if (cutawayDrawerMeal) {
        cutawayDrawerMeal.setAttribute("opacity", "1");
        const mealRect = cutawayDrawerMeal.querySelector("rect");
        if (mealRect) {
          mealRect.setAttribute("fill", "#C0775B");
          mealRect.setAttribute("stroke", "#191919");
          mealRect.removeAttribute("stroke-dasharray");
        }
        const mealText = cutawayDrawerMeal.querySelector("text");
        if (mealText) {
          mealText.textContent = "Beef Ribeye · 450 g";
          mealText.setAttribute("fill", "#F1EFE5");
        }
      }
      if (cutawayDrawerContainer) cutawayDrawerContainer.setAttribute("opacity", "1");
    }, 1300);
  }

  // =========================================================================
  // Primary Store Subscription / UI Render Cycle
  // =========================================================================

  store.subscribe(state => {
    const computed = computeTonight(state.sim.mins, state.plan, state.flags);

    // 1. Header Updates
    if (simClockDisplay) {
      simClockDisplay.textContent = minsToTimeStr(state.sim.mins);
    }

    // Effective LED state: manual preview or computed
    const effectiveLed = state.manualPreviewHalo || computed.led;
    if (headerLedDot) {
      headerLedDot.className = `led-indicator-dot ${effectiveLed}`;
    }
    if (headerLedText) {
      const ledLabels = {
        blue: "Standby",
        amber: "Thawing",
        amberFast: "Warning",
        green: "Ready · +3.0°C",
        red: "Lockout"
      };
      headerLedText.textContent = ledLabels[effectiveLed] || "Standby";
    }

    if (headerStatusText) {
      headerStatusText.textContent = state.flags.wifiOffline
        ? "Offline · Schedule Active"
        : "Concept Simulator • Virtual Appliance";
    }
    if (headerPulseDot) {
      headerPulseDot.style.background = state.flags.wifiOffline ? "var(--clay)" : "#4A8B63";
    }

    // Top Target Schedule Bar (Section 3.2)
    if (topBarTargetDinnerTime) {
      topBarTargetDinnerTime.textContent = minsToTimeStr(state.plan.readyMins);
    }
    if (topBarCommuteLabel) {
      const cState = state.flags.commute;
      if (cState === "traffic") {
        topBarCommuteLabel.textContent = "Traffic Delay (+30m)";
        if (topBarCommuteDot) topBarCommuteDot.style.background = "var(--clay)";
      } else if (cState === "atwork") {
        topBarCommuteLabel.textContent = "Still at Work";
        if (topBarCommuteDot) topBarCommuteDot.style.background = "var(--clay)";
      } else if (cState === "arrived") {
        topBarCommuteLabel.textContent = "Arrived Home";
        if (topBarCommuteDot) topBarCommuteDot.style.background = "#4A8B63";
      } else {
        topBarCommuteLabel.textContent = "Commute Sync (ETA 19:20)";
        if (topBarCommuteDot) topBarCommuteDot.style.background = "#4A8B63";
      }
    }

    // 2. Tab 1: Tonight Screen Updates
    // 15:00 Notification Card
    if (lockNotificationCard) {
      const showNotif = (state.sim.mins === 900 && !state.plan.isConfirmed && !state.flags.skipped);
      lockNotificationCard.hidden = !showNotif;
      if (lockNotifQuestionText) {
        lockNotifQuestionText.innerHTML = `Tonight at <strong>${minsToTimeStr(state.plan.readyMins)}</strong>: Ready for <strong>${escapeHTML(state.plan.meal.name)}</strong>?`;
      }
    }

    // Status Hero Food Card
    if (heroFoodImg && state.plan.meal) {
      const targetPhoto = state.plan.meal.photo || "assets/images/meal_beef_ribeye.jpg";
      if (heroFoodImg.getAttribute("src") !== targetPhoto) {
        heroFoodImg.setAttribute("src", targetPhoto);
      }
    }
    if (heroFoodSlotLabel && state.plan.meal) {
      heroFoodSlotLabel.textContent = `Container ${state.plan.slot} \u2022 ${state.plan.meal.weight} g`;
    }
    if (heroTargetDinnerTime) {
      heroTargetDinnerTime.textContent = minsToTimeStr(state.plan.readyMins);
    }
    if (heroStatusPill) {
      const pillMap = {
        scheduled: { text: "On Schedule", cls: "pill-scheduled" },
        drop: { text: "Airlock Drop", cls: "pill-thaw" },
        thaw: { text: "Gentle Thaw (+10\u00B0C)", cls: "pill-thaw" },
        equalize: { text: "Equalizing Core", cls: "pill-equalize" },
        ready: { text: "Ready to Cook", cls: "pill-ready" },
        held: { text: "Chilled Hold (+3.0\u00B0C)", cls: "pill-ready" },
        skipped: { text: "Paused", cls: "pill-scheduled" },
        emergency: { text: "Safety Lockout", cls: "pill-thaw" }
      };
      const pillInfo = pillMap[computed.phase] || { text: "On Schedule", cls: "pill-scheduled" };
      heroStatusPill.className = `hero-food-status-pill ${pillInfo.cls}`;
      heroStatusPill.textContent = pillInfo.text;
    }
    if (heroPhaseTag) {
      heroPhaseTag.textContent = computed.phase.toUpperCase();
    }
    if (heroCountdownVal) {
      if (computed.phase === "scheduled") {
        heroCountdownVal.textContent = `Drops in ${Math.round(computed.minsToNext)} min`;
      } else if (computed.phase === "thaw" || computed.phase === "equalize") {
        heroCountdownVal.textContent = `${Math.round(computed.minsToNext)} min left`;
      } else if (computed.phase === "ready" || computed.phase === "held") {
        heroCountdownVal.textContent = "Ready now";
      } else {
        heroCountdownVal.textContent = minsToTimeStr(state.sim.mins);
      }
    }
    if (heroHeading) {
      heroHeading.textContent = (computed.phase === "scheduled" && state.plan.meal)
        ? state.plan.meal.name
        : computed.headline;
    }
    if (heroSubtext) {
      heroSubtext.textContent = computed.subtext;
    }
    if (heroReassuranceText) {
      if (computed.phase === "scheduled") {
        heroReassuranceText.innerHTML = `<strong>Nothing to do</strong> &mdash; DINA manages your dinner schedule and continuously monitors temperature.`;
      } else if (computed.phase === "drop") {
        heroReassuranceText.innerHTML = `<strong>In progress</strong> &mdash; 2.5 s airlock hatch open. Transferring container into lower defrost drawer.`;
      } else if (computed.phase === "thaw") {
        heroReassuranceText.innerHTML = `<strong>Thawing gently</strong> &mdash; Closed-loop +10 &deg;C air circulation active. Surface monitored below +4.0 &deg;C safe limit.`;
      } else if (computed.phase === "equalize") {
        heroReassuranceText.innerHTML = `<strong>Equalizing core</strong> &mdash; Air stepped down to +3.0 &deg;C while conduction warms center.`;
      } else if (computed.phase === "ready" || computed.phase === "held") {
        heroReassuranceText.innerHTML = `<strong>Dinner is ready!</strong> &mdash; Monitored at +3.0 &deg;C. Open drawer and cook whenever you're ready.`;
      } else if (computed.phase === "eating_out") {
        heroReassuranceText.innerHTML = `<strong>Eating out tonight</strong> &mdash; Carousel remains frozen solid at &minus;18.0 &deg;C. Zero food wasted.`;
      }
    }
    if (heroStatusPill) {
      if (state.flags.powerCutMins > 0) {
        heroStatusPill.textContent = state.flags.powerCutMins >= 120 ? "Safety Lockout" : "Power Advisory";
        heroStatusPill.className = "hero-food-status-pill pill-warning";
      } else if (state.flags.wifiOffline) {
        heroStatusPill.textContent = "Offline (Local Schedule Active)";
        heroStatusPill.className = "hero-food-status-pill pill-offline";
      } else {
        heroStatusPill.textContent = "Scheduled and monitored";
        heroStatusPill.className = "hero-monitored-pill";
      }
    }
    if (twinDrawerTempVal) {
      if (computed.drawerAirC !== null) {
        twinDrawerTempVal.textContent = `+${computed.drawerAirC.toFixed(1)} \u00B0C`;
      } else {
        twinDrawerTempVal.textContent = "+3 \u00B0C";
      }
    }
    if (btnHeroAction) {
      btnHeroAction.textContent = computed.action;
    }

    // Live Thaw Consumer Status
    if (thawConsumerPhaseLabel) {
      if (computed.phase === "thaw") {
        thawConsumerPhaseLabel.textContent = "Gentle Convection Air (+10 \u00B0C)";
      } else if (computed.phase === "equalize") {
        thawConsumerPhaseLabel.textContent = "Conduction Equalization (+3.0 \u00B0C)";
      } else {
        thawConsumerPhaseLabel.textContent = "Standby (+3.0 \u00B0C)";
      }
    }
    if (thawConsumerReadyTime) {
      thawConsumerReadyTime.textContent = minsToTimeStr(state.plan.readyMins);
    }

    // Cutaway Mechanical Section Updates (CAD Vertical Section A-A)
    const isPostDrop = (computed.phase === "thaw" || computed.phase === "equalize" || computed.phase === "ready" || computed.phase === "held");
    const isFrozen = (computed.phase === "idle" || computed.phase === "checkin" || computed.phase === "scheduled" || computed.phase === "skipped");

    // Trigger Airlock sequence once upon entering drop phase
    if (computed.phase === "drop" && lastPhase !== "drop") {
      triggerAirlockSequence();
    } else if (isPostDrop) {
      if (cutawaySlotActive) cutawaySlotActive.setAttribute("opacity", "0.25");
      if (cutawayDropContainer) cutawayDropContainer.setAttribute("opacity", "0");
      if (cutawayHatch) cutawayHatch.style.transform = "rotate(0deg)";
      if (cutawayDrawerMeal) {
        cutawayDrawerMeal.setAttribute("opacity", "1");
        const mealRect = cutawayDrawerMeal.querySelector("rect");
        const mealText = cutawayDrawerMeal.querySelector("text");
        const isHold = (computed.phase === "ready" || computed.phase === "held");
        const color = isHold ? "#DAD8CB" : "#C0775B";
        const textColor = isHold ? "#191919" : "#F1EFE5";
        if (mealRect) {
          mealRect.setAttribute("fill", color);
          mealRect.setAttribute("stroke", "#191919");
          mealRect.removeAttribute("stroke-dasharray");
        }
        if (mealText) {
          mealText.textContent = isHold ? "Beef Ribeye · Ready (+3 °C)" : "Beef Ribeye · Thawing";
          mealText.setAttribute("fill", textColor);
        }
      }
      if (cutawayDrawerContainer) cutawayDrawerContainer.setAttribute("opacity", "1");
    } else if (isFrozen) {
      if (cutawaySlotActive) cutawaySlotActive.setAttribute("opacity", "1");
      if (cutawayDropContainer) cutawayDropContainer.setAttribute("opacity", "0");
      if (cutawayHatch) cutawayHatch.style.transform = "rotate(0deg)";
      if (cutawayDrawerMeal) {
        cutawayDrawerMeal.setAttribute("opacity", "0.35");
        const mealRect = cutawayDrawerMeal.querySelector("rect");
        const mealText = cutawayDrawerMeal.querySelector("text");
        if (mealRect) {
          mealRect.setAttribute("fill", "none");
          mealRect.setAttribute("stroke", "#9E9696");
          mealRect.setAttribute("stroke-dasharray", "4 3");
        }
        if (mealText) {
          mealText.textContent = "Receiving Platter";
          mealText.setAttribute("fill", "#5A5753");
        }
      }
      if (cutawayDrawerContainer) cutawayDrawerContainer.setAttribute("opacity", "0");
    }
    lastPhase = computed.phase;

    // Cutaway Drawer Status & Telemetry Updates
    if (cutawayDrawerStatus) {
      if (computed.phase === "thaw") {
        cutawayDrawerStatus.textContent = `Status: Active Thaw (+10 °C)`;
      } else if (computed.phase === "equalize") {
        cutawayDrawerStatus.textContent = `Status: Equalizing (+3 °C Air)`;
      } else if (computed.phase === "ready" || computed.phase === "held") {
        cutawayDrawerStatus.textContent = `Status: Ready (+3 °C Hold)`;
      } else if (computed.phase === "drop") {
        cutawayDrawerStatus.textContent = `Status: Airlock Drop`;
      } else if (computed.phase === "warning") {
        cutawayDrawerStatus.textContent = `Status: Safety Warning`;
      } else if (computed.phase === "lockout") {
        cutawayDrawerStatus.textContent = `Status: Safety Lockout`;
      } else {
        cutawayDrawerStatus.textContent = `Status: Standby`;
      }
    }

    if (cutawayDrawerTemp) {
      if (computed.phase === "thaw") {
        cutawayDrawerTemp.textContent = "+10 °C Air";
      } else if (computed.phase === "equalize") {
        cutawayDrawerTemp.textContent = "+3 °C Air";
      } else if (computed.phase === "ready" || computed.phase === "held") {
        cutawayDrawerTemp.textContent = "+3 °C Hold";
      } else {
        cutawayDrawerTemp.textContent = "+3 °C Standby";
      }
    }

    if (cutawayDrawerIndicator) {
      const indColors = {
        blue: "#5B82B8",
        amber: "#C87D55",
        amberFast: "#D9822B",
        green: "#2C4C3E",
        red: "#C0392B"
      };
      cutawayDrawerIndicator.setAttribute("fill", indColors[computed.led] || "#5B82B8");
    }

    // Legacy Cutaway Elements (kept safe for backwards compatibility)
    if (cutawayRotor) {
      const slotNum = parseInt(state.plan.slot, 10) || 1;
      const deg = ((slotNum - 1) % 12) * 30;
      cutawayRotor.setAttribute("transform", `rotate(${deg} 190 158)`);
    }
    if (cutawayDrawerGlow) {
      const glowColors = {
        blue: "#EAE6D9",
        amber: "#F4EDE6",
        amberFast: "#F4EDE6",
        green: "#E7F0EB",
        red: "#F9EAE8"
      };
      cutawayDrawerGlow.setAttribute("fill", glowColors[computed.led] || "#EAE6D9");
    }
    if (cutawayHandleGlow) {
      const handleColors = {
        blue: "#5B8EC0",
        amber: "#C0775B",
        amberFast: "#D9822B",
        green: "#4A8B63",
        red: "#C0392B"
      };
      cutawayHandleGlow.setAttribute("fill", handleColors[computed.led] || "#5B8EC0");
    }
    if (cutawayAirflow) {
      cutawayAirflow.setAttribute("opacity", (computed.phase === "thaw" || computed.phase === "equalize") ? "1" : "0");
    }
    if (cutawayFrostLayer && computed.surfaceC !== null) {
      const frostPct = Math.max(0, Math.min(1, (-computed.surfaceC) / 18));
      cutawayFrostLayer.setAttribute("opacity", frostPct.toFixed(2));
    }
    if (cutawaySmartPauseTag) {
      cutawaySmartPauseTag.hidden = !state.flags.drawerOccupied;
    }
    if (cutawayDrawerStatusText) {
      if (computed.drawerAirC === null) {
        cutawayDrawerStatusText.textContent = "Status: Empty • Standby";
      } else {
        cutawayDrawerStatusText.textContent = `Air: +${computed.drawerAirC.toFixed(1)} °C • Surface: ${computed.surfaceC !== null ? (computed.surfaceC > 0 ? '+' : '') + computed.surfaceC.toFixed(1) + ' °C' : 'Standby'}`;
      }
    }

    // Four-Stage Visual Pipeline Updates
    const isFrozenStage = (computed.phase === "idle" || computed.phase === "checkin" || computed.phase === "scheduled");
    const isThawStage = (computed.phase === "drop" || computed.phase === "thaw");
    const isEqualizeStage = (computed.phase === "equalize");
    const isHoldStage = (computed.phase === "ready" || computed.phase === "held");

    if (stageStepFrozen) {
      stageStepFrozen.classList.toggle("active", isFrozenStage);
      stageStepFrozen.classList.toggle("done", !isFrozenStage);
    }
    if (stageStepActiveThaw) {
      stageStepActiveThaw.classList.toggle("active", isThawStage);
      stageStepActiveThaw.classList.toggle("done", isEqualizeStage || isHoldStage);
    }
    if (stageStepEqualization) {
      stageStepEqualization.classList.toggle("active", isEqualizeStage);
      stageStepEqualization.classList.toggle("done", isHoldStage);
    }
    if (stageStepHold) {
      stageStepHold.classList.toggle("active", isHoldStage);
      stageStepHold.classList.toggle("done", false);
    }

    if (stageDropTimeLabel) {
      stageDropTimeLabel.textContent = `-18 °C (Until ${minsToTimeStr(state.plan.dropMins)})`;
    }
    if (stageThawDurationLabel) {
      stageThawDurationLabel.textContent = `+10 °C (~${state.plan.thawMin}m)`;
    }
    if (stageEqualizeDurationLabel) {
      stageEqualizeDurationLabel.textContent = `Soak (~${state.plan.equalizeMin}m)`;
    }

    // 3-Step Horizontal Order Tracker (Section 4.3)
    const isFrozenPhase = (computed.phase === "idle" || computed.phase === "checkin" || computed.phase === "scheduled" || computed.phase === "skipped");
    const isPreparingPhase = (computed.phase === "drop" || computed.phase === "thaw" || computed.phase === "equalize");
    const isReadyPhase = (computed.phase === "ready" || computed.phase === "held");

    if (orderStep1) {
      orderStep1.classList.toggle("active", isFrozenPhase);
      orderStep1.classList.toggle("done", !isFrozenPhase);
    }
    if (orderStepFrozenSub) {
      orderStepFrozenSub.textContent = `-18 °C until ${minsToTimeStr(state.plan.dropMins)}`;
    }

    if (orderStep2) {
      orderStep2.classList.toggle("active", isPreparingPhase);
      orderStep2.classList.toggle("done", isReadyPhase);
    }
    if (orderStepPreparingSub) {
      if (computed.phase === "drop") {
        orderStepPreparingSub.textContent = "Transferring meal";
      } else if (computed.phase === "thaw") {
        orderStepPreparingSub.textContent = `+10 °C Thaw (${Math.round(computed.minsToNext)}m left)`;
      } else if (computed.phase === "equalize") {
        orderStepPreparingSub.textContent = `Core equalize (${Math.round(computed.minsToNext)}m left)`;
      } else if (isReadyPhase) {
        orderStepPreparingSub.textContent = "Completed";
      } else {
        orderStepPreparingSub.textContent = `${minsToTimeStr(state.plan.dropMins)} Gentle Thaw`;
      }
    }

    if (orderStep3) {
      orderStep3.classList.toggle("active", isReadyPhase);
      orderStep3.classList.toggle("done", false);
    }
    if (orderStepReadySub) {
      if (isReadyPhase) {
        orderStepReadySub.textContent = "Ready now (+3 °C Hold)";
      } else {
        orderStepReadySub.textContent = `${minsToTimeStr(state.plan.readyMins)} (+3 °C Hold)`;
      }
    }

    if (orderTrackerLine1) {
      orderTrackerLine1.classList.toggle("active", !isFrozenPhase);
    }
    if (orderTrackerLine2) {
      orderTrackerLine2.classList.toggle("active", isReadyPhase);
    }

    // Pipeline progress bar percentage
    if (pipelineProgressBar) {
      const eveningStart = state.plan.dropMins - 60; // 1 hour before drop
      const eveningEnd = state.plan.readyMins;
      const eveningProg = Math.max(0, Math.min(1, (state.sim.mins - eveningStart) / (eveningEnd - eveningStart)));
      pipelineProgressBar.style.width = `${(eveningProg * 100).toFixed(1)}%`;
    }

    // Live Thaw Card
    if (liveThawCard) {
      const showThawCard = (computed.phase === "drop" || computed.phase === "thaw" || computed.phase === "equalize");
      liveThawCard.hidden = !showThawCard;

      if (thawRingProgressCircle) {
        const circum = 163.36;
        const offset = circum * (1 - computed.progress);
        thawRingProgressCircle.setAttribute("stroke-dashoffset", String(offset.toFixed(1)));
      }
      if (thawRingPct) {
        thawRingPct.textContent = `${Math.round(computed.progress * 100)}%`;
      }
      if (thawLiveAirC) {
        thawLiveAirC.textContent = computed.drawerAirC !== null ? `+${computed.drawerAirC.toFixed(1)} °C` : "Standby";
      }
      if (thawLiveSurfaceC) {
        thawLiveSurfaceC.textContent = computed.surfaceC !== null ? `${computed.surfaceC > 0 ? '+' : ''}${computed.surfaceC.toFixed(1)} °C` : "Standby";
      }
      if (thawChartScrubberLine) {
        // Map dropMins -> readyMins to chart width (30 to 300)
        const tRange = state.plan.readyMins - state.plan.dropMins;
        const currentFraction = Math.max(0, Math.min(1, (state.sim.mins - state.plan.dropMins) / (tRange || 1)));
        const needleX = 30 + currentFraction * 270;
        thawChartScrubberLine.setAttribute("x1", String(needleX.toFixed(1)));
        thawChartScrubberLine.setAttribute("x2", String(needleX.toFixed(1)));
      }
    }

    // Evening Commute Card
    if (eveningCommuteText) {
      eveningCommuteText.innerHTML = computed.commuteText;
    }

    // 3. Tab 2: Freezer Screen Updates
    const stockedKeys = Object.keys(drumInventory).filter(k => drumInventory[k] && !drumInventory[k].isChimney);
    if (freezerStockedCount) freezerStockedCount.textContent = String(stockedKeys.length);
    if (freezerOverviewReady) freezerOverviewReady.textContent = String(stockedKeys.length);
    if (freezerOverviewOpen) freezerOverviewOpen.textContent = String(11 - stockedKeys.length);
    if (upperRingBadge) {
      const upperStocked = ["01", "02", "03", "04", "05", "06"].filter(k => drumInventory[k]).length;
      upperRingBadge.textContent = `${upperStocked} / 6 Stocked`;
    }
    if (lowerRingBadge) {
      const lowerOpen = ["07", "08", "09", "10", "11"].filter(k => !drumInventory[k]).length;
      lowerRingBadge.textContent = `${lowerOpen} Open Spots`;
    }

    // Synchronize slot buttons
    drumSlotButtons.forEach(btn => {
      const slot = btn.dataset.slot;
      const isSelected = slot === state.selectedFreezerSlot;
      const isTonightMeal = slot === state.plan.slot;
      const isDropped = (isTonightMeal && state.sim.mins >= state.plan.dropMins);
      const isThawedReady = (isTonightMeal && (computed.phase === "ready" || computed.phase === "held"));

      btn.classList.toggle("active", isSelected);
      btn.classList.toggle("tonight-scheduled", isTonightMeal && !isDropped);
      btn.classList.toggle("in-drawer", isDropped);
      btn.classList.toggle("thawed-ready", isThawedReady);

      const nameEl = btn.querySelector(".slot-name");
      if (nameEl && drumInventory[slot]) {
        if (isDropped) {
          nameEl.textContent = "In drawer";
        } else {
          const item = drumInventory[slot];
          nameEl.textContent = item.isChimney ? "Drop Path" : `${item.name.split(" ")[0]} (${item.weight}g)`;
        }
      }
    });

    // Carousel Visualizer Rotor
    if (interactiveDrumRotor) {
      const slotNum = parseInt(state.selectedFreezerSlot, 10) || 1;
      const rotDeg = ((slotNum - 1) % 6) * 60;
      interactiveDrumRotor.style.transform = `rotate(${rotDeg}deg)`;
    }
    if (drumWheelStatusTitle) {
      const curItem = drumInventory[state.selectedFreezerSlot];
      if (curItem && !curItem.isChimney) {
        drumWheelStatusTitle.textContent = `Container ${state.selectedFreezerSlot} at Door (${curItem.name}, ${curItem.weight} g)`;
      } else {
        drumWheelStatusTitle.textContent = `Container ${state.selectedFreezerSlot} at Door (Open & Ready to Fill)`;
      }
    }

    // Selected Slot Details Card
    if (slotDetailName && slotDetailInfo) {
      const selItem = drumInventory[state.selectedFreezerSlot];
      if (selItem && !selItem.isChimney) {
        slotDetailName.textContent = selItem.name;
        const isTonight = selItem.slot === state.plan.slot;
        const isDropped = (isTonight && state.sim.mins >= state.plan.dropMins);
        slotDetailStatus.textContent = isDropped ? "In Defrost Drawer" : (isTonight ? "Scheduled for Tonight" : "Stored in -18 °C Vault");
        slotDetailInfo.textContent = `Container ${selItem.slot} • ${selItem.weight} g • Modelled thaw: ~${selItem.thawTime} min (+ ${selItem.equalizationTime} min equalization soak).`;
      } else {
        slotDetailName.textContent = `Open Slot ${state.selectedFreezerSlot}`;
        slotDetailStatus.textContent = "Empty";
        slotDetailInfo.textContent = "This slot is empty. Tap 'Stock New Meal' below to place a 750 ml container into the carousel.";
      }
    }

    // Synchronize Customer Freezer Menu Cards
    freezerMenuCards.forEach(card => {
      const slot = card.dataset.slot;
      const isSelected = (slot === state.selectedFreezerSlot);
      const isTonight = (slot === state.plan.slot);
      const isDropped = (isTonight && state.sim.mins >= state.plan.dropMins);
      const isReady = (isTonight && (computed.phase === "ready" || computed.phase === "held"));
      card.classList.toggle("active", isSelected);
      card.classList.toggle("tonight-scheduled", isTonight && !isDropped);
      card.classList.toggle("in-drawer", isDropped);
      card.classList.toggle("thawed-ready", isReady);
    });

    // Tab 2 Sticky Bottom Confirmation Bar
    const curFreezerMeal = drumInventory[state.selectedFreezerSlot];
    if (stickySlotDish && stickySlotMeta) {
      if (curFreezerMeal && !curFreezerMeal.isChimney) {
        stickySlotDish.textContent = curFreezerMeal.name;
        const isTonight = curFreezerMeal.slot === state.plan.slot;
        const isDropped = isTonight && state.sim.mins >= state.plan.dropMins;
        stickySlotMeta.textContent = isDropped
          ? "In Defrost Drawer (+3.0 °C)"
          : (isTonight ? "Scheduled for tonight" : `Slot ${curFreezerMeal.slot} • ${curFreezerMeal.weight} g • ~${curFreezerMeal.thawTime}m thaw`);
        if (btnStickyUseTonight) {
          btnStickyUseTonight.textContent = isTonight ? "Tonight's Dinner" : "Use for Tonight";
          btnStickyUseTonight.disabled = isTonight;
        }
        if (btnStickyBringToDoor) {
          btnStickyBringToDoor.disabled = false;
        }
      } else {
        stickySlotDish.textContent = `Open Slot ${state.selectedFreezerSlot}`;
        stickySlotMeta.textContent = "Empty slot • Ready to stock meal";
        if (btnStickyUseTonight) {
          btnStickyUseTonight.textContent = "Empty Slot";
          btnStickyUseTonight.disabled = true;
        }
        if (btnStickyBringToDoor) {
          btnStickyBringToDoor.disabled = false;
        }
      }
    }

    // 4. Tab 3: Kitchen & Care Updates
    if (telemDrawerTemp) {
      if (computed.drawerAirC === null) {
        telemDrawerTemp.textContent = "Empty • standby";
        telemDrawerTemp.style.color = "var(--ink)";
      } else {
        telemDrawerTemp.innerHTML = `Air: +${computed.drawerAirC.toFixed(1)} &deg;C<br><span style="font-size:11px; font-weight:normal; color:var(--ink-soft);">Surface: ${computed.surfaceC !== null ? (computed.surfaceC > 0 ? '+' : '') + computed.surfaceC.toFixed(1) + ' °C' : 'Standby'}</span>`;
        telemDrawerTemp.style.color = "var(--clay)";
      }
    }
    if (telemBlackoutVal) {
      if (state.flags.powerCutMinutes >= 120) {
        telemBlackoutVal.textContent = "Tier 2 Lockout";
        telemBlackoutVal.style.color = "var(--clay)";
        if (telemBlackoutSub) telemBlackoutSub.textContent = "Assess condition: limits exceeded (USDA/EFSA)";
      } else if (state.flags.powerCutMinutes >= 30) {
        telemBlackoutVal.textContent = "Tier 1 Warning";
        telemBlackoutVal.style.color = "#D9822B";
        if (telemBlackoutSub) telemBlackoutSub.textContent = "Assess food condition (> 30 min)";
      } else if (state.flags.powerCutMinutes > 0) {
        telemBlackoutVal.textContent = "Safe: Resumed";
        telemBlackoutVal.style.color = "var(--ink)";
        if (telemBlackoutSub) telemBlackoutSub.textContent = "Recovered within limits (< 30 min)";
      } else {
        telemBlackoutVal.textContent = "All Good";
        telemBlackoutVal.style.color = "var(--ink)";
        if (telemBlackoutSub) telemBlackoutSub.textContent = "Temperature monitoring active";
      }
    }

    // Closed-loop card readings
    if (clFanState) {
      if (computed.phase === "thaw") {
        clFanState.textContent = "+10.0 °C (Active)";
        clFanState.style.color = "var(--clay)";
      } else if (computed.phase === "equalize") {
        clFanState.textContent = `+${computed.drawerAirC.toFixed(1)} °C (Soak)`;
        clFanState.style.color = "var(--ink)";
      } else {
        clFanState.textContent = "Standby (+3.0 °C)";
        clFanState.style.color = "var(--ink-soft)";
      }
    }
    if (clSurfaceTemp) {
      clSurfaceTemp.textContent = computed.surfaceC !== null
        ? `${computed.surfaceC > 0 ? '+' : ''}${computed.surfaceC.toFixed(1)} °C`
        : "Standby";
    }
    if (clCoreTemp) {
      clCoreTemp.textContent = computed.coreC !== null
        ? `${computed.coreC > 0 ? '+' : ''}${computed.coreC.toFixed(1)} °C`
        : "Standby";
    }

    // Power-cut selector buttons active state
    pcutStepBtns.forEach(btn => {
      const dur = parseInt(btn.dataset.duration, 10);
      btn.classList.toggle("active", dur === state.flags.powerCutMinutes);
    });

    // Handle light guide
    if (haloVisual) {
      haloVisual.className = `halo-ring-visual ${effectiveLed}`;
    }
    if (haloStateLabel) {
      const haloDescriptions = {
        blue: "Soft Blue — Standby (all meals deep-frozen at -18 °C, drawer empty)",
        amber: "Warm Amber — Gently Thawing Tonight's Dinner (+10.0 °C Convection Air)",
        amberFast: "Fast Amber Pulse — Tier 1 Food Safety Warning (30–120 min Outage)",
        green: "Fresh Green — Dinner Is Ready to Cook (+3.0 °C Fridge Hold)",
        red: "Red Pulse — Tier 2 Safety Lockout (> 2h Outage above +5 °C, Discard Meal)"
      };
      haloStateLabel.textContent = haloDescriptions[effectiveLed] || "Soft Blue — Standby";
    }
    haloBtns.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.mode === effectiveLed);
    });

    // 5. Director Panel Controls (Desktop and Mobile)
    const timeStr = minsToTimeStr(state.sim.mins);
    if (directorClockVal) directorClockVal.textContent = timeStr;
    if (mobileDirectorClockVal) mobileDirectorClockVal.textContent = timeStr;

    if (simScrubber) simScrubber.value = String(state.sim.mins);
    if (mobileSimScrubber) mobileSimScrubber.value = String(state.sim.mins);

    if (btnDirectorPlayPause) btnDirectorPlayPause.textContent = state.sim.playing ? "Pause" : "Play";
    if (btnSpeedMobilePlayPause) btnSpeedMobilePlayPause.textContent = state.sim.playing ? "Pause" : "Play";

    speedButtons.forEach(btn => {
      const spd = parseInt(btn.dataset.speed, 10);
      btn.classList.toggle("active", spd === state.sim.speed);
    });

    commutePillButtons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.commute === state.flags.commute);
    });

    pcutPillButtons.forEach(btn => {
      const dur = parseInt(btn.dataset.pcut, 10);
      btn.classList.toggle("active", dur === state.flags.powerCutMinutes);
    });

    if (btnToggleDrawerOccupied) {
      btnToggleDrawerOccupied.querySelector("strong").textContent = state.flags.drawerOccupied ? "Occupied (Smart Pause)" : "Empty (Normal)";
      btnToggleDrawerOccupied.classList.toggle("active", state.flags.drawerOccupied);
    }
    if (btnMobileToggleDrawerOccupied) {
      btnMobileToggleDrawerOccupied.querySelector("strong").textContent = state.flags.drawerOccupied ? "Occupied (Smart Pause)" : "Empty (Normal)";
      btnMobileToggleDrawerOccupied.classList.toggle("active", state.flags.drawerOccupied);
    }

    if (btnToggleWifiDesktop) {
      btnToggleWifiDesktop.querySelector("strong").textContent = state.flags.wifiOffline ? "Offline" : "Connected";
      btnToggleWifiDesktop.classList.toggle("active", state.flags.wifiOffline);
    }
    if (btnMobileToggleWifi) {
      btnMobileToggleWifi.querySelector("strong").textContent = state.flags.wifiOffline ? "Offline" : "Connected";
      btnMobileToggleWifi.classList.toggle("active", state.flags.wifiOffline);
    }

    // 6. Guided Tour Caption Bar
    if (tourCaptionBar) {
      tourCaptionBar.hidden = !state.tour.active;
      if (state.tour.active) {
        if (tourStepBadge) tourStepBadge.textContent = `Step ${state.tour.step} of 6`;
        if (tourCaptionText) {
          const captions = {
            1: "Sunday Meal Prep: You prepare your meals on Sunday and stock up to 11 portions in the motorized drum at -18 °C.",
            2: "15:00 Check-In: On your weekday commute, DINA asks if you still want tonight's scheduled meal (Ribeye Steak). Tap 'Sounds Good' or swap with one tap.",
            3: "17:50 Timed Transfer: DINA automatically indexes and drops tonight's dish into the defrost drawer while the main freezer stays closed.",
            4: "Gentle Controlled Thaw: Low-temperature +10 °C convection warms the dish, stepping down once surface reaches +4.0 °C to preserve tenderness.",
            5: "Commute Delay Protection: Delayed in traffic? Your phone signals DINA to extend the +3.0 °C safe hold so dinner stays fresh until you arrive.",
            6: "Dinner Ready to Cook: Arrive home to a green halo indicator on the drawer. Collect your chilled, evenly thawed steak ready straight for the pan."
          };
          tourCaptionText.textContent = captions[state.tour.step] || "";
        }
        if (btnTourNext) {
          btnTourNext.innerHTML = state.tour.step >= 6 ? "Finish Tour &check;" : "Next Step &rarr;";
        }
      }
    }
  });

  // =========================================================================
  // Simulated Clock Engine (requestAnimationFrame with delta timing)
  // =========================================================================

  let lastTimestamp = performance.now();
  let accumulatedSeconds = 0;

  function clockTick(now) {
    const elapsedSeconds = Math.max(0, (now - lastTimestamp) / 1000);
    lastTimestamp = now;

    if (store.state.sim.playing && !document.hidden) {
      accumulatedSeconds += elapsedSeconds;
      // 1 real second = speed simulated minutes
      const simMinutesDelta = (accumulatedSeconds * store.state.sim.speed);
      if (simMinutesDelta >= 1) {
        const fullMinutes = Math.floor(simMinutesDelta);
        accumulatedSeconds -= (fullMinutes / store.state.sim.speed);
        let nextMins = store.state.sim.mins + fullMinutes;
        if (nextMins > 1290) { // 21:30 cap
          nextMins = 1290;
          store.set({ sim: { playing: false } });
        }
        store.set({ sim: { mins: nextMins } });
      }
    }

    requestAnimationFrame(clockTick);
  }
  requestAnimationFrame(clockTick);

  // Tab Navigation
  function switchTab(targetId) {
    bottomTabs.forEach(t => t.classList.toggle("active", t.dataset.tab === targetId));
    tabContents.forEach(c => c.classList.toggle("active", c.id === targetId));
    store.set({ activeTab: targetId });
    triggerHaptic([10]);
  }

  bottomTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      switchTab(tab.dataset.tab);
    });
  });

  // =========================================================================
  // Bottom Sheet Controller (Emil Kowalski 280ms ease-drawer, focus trap)
  // =========================================================================

  let activeSheet = null;
  let lastActiveElement = null;

  function openSheet(sheetEl) {
    if (!sheetEl) return;
    lastActiveElement = document.activeElement;
    activeSheet = sheetEl;
    sheetEl.style.transform = "";
    sheetEl.style.transition = "";
    if (sheetBackdrop) {
      sheetBackdrop.style.opacity = "";
      sheetBackdrop.style.transition = "";
      sheetBackdrop.classList.add("open");
    }
    sheetEl.removeAttribute("hidden");
    // Trigger CSS slide-up in next frame
    requestAnimationFrame(() => {
      sheetEl.classList.add("open");
      const focusable = sheetEl.querySelector("button, input, select");
      if (focusable) focusable.focus();
    });
    triggerHaptic([15]);
  }

  function closeSheet(sheetEl) {
    const target = sheetEl || activeSheet;
    if (!target) return;
    target.classList.remove("open");
    target.style.transform = "";
    target.style.transition = "";
    if (sheetBackdrop) {
      sheetBackdrop.classList.remove("open");
      sheetBackdrop.style.opacity = "";
      sheetBackdrop.style.transition = "";
    }
    setTimeout(() => {
      target.setAttribute("hidden", "");
      if (lastActiveElement && typeof lastActiveElement.focus === "function") {
        lastActiveElement.focus();
      }
      if (activeSheet === target) activeSheet = null;
    }, 280);
    triggerHaptic([10]);
  }

  // Emil Kowalski Pull-to-Dismiss Gesture Engine for Bottom Sheets
  function setupSheetDragToDismiss(sheetEl) {
    if (!sheetEl) return;

    let isTracking = false;
    let isDragging = false;
    let startY = 0;
    let currentY = 0;
    let startTime = 0;
    let startScrollTop = 0;

    const sheetBody = sheetEl.querySelector(".sheet-body");

    function getPointerY(e) {
      return (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;
    }

    function onPointerDown(e) {
      if (sheetEl.hasAttribute("hidden") || !sheetEl.classList.contains("open")) return;

      // Ignore interactive controls inside sheet
      if (e.target.closest("button, input, select, textarea, .time-preset-chip, .cat-chip, .dial-container, #dialTicks, .meal-option-card")) {
        return;
      }

      const isHandleZone = !!e.target.closest(".sheet-handle-zone, .sheet-handle-bar, .sheet-header");
      const atTop = sheetBody ? sheetBody.scrollTop <= 0 : true;

      // Only initiate pull-to-dismiss if on the handle/header or at top of scrollable content
      if (!isHandleZone && !atTop) return;

      isTracking = true;
      isDragging = false;
      startY = getPointerY(e);
      currentY = startY;
      startTime = Date.now();
      startScrollTop = sheetBody ? sheetBody.scrollTop : 0;
    }

    function onPointerMove(e) {
      if (!isTracking) return;

      const y = getPointerY(e);
      const deltaY = y - startY;

      if (!isDragging) {
        const isHandleZone = !!e.target.closest(".sheet-handle-zone, .sheet-handle-bar, .sheet-header");
        if (deltaY > 6 && (isHandleZone || startScrollTop <= 0)) {
          isDragging = true;
          sheetEl.style.transition = "none";
          if (sheetBackdrop) sheetBackdrop.style.transition = "none";
        } else if (deltaY < -6 && !isHandleZone) {
          // Normal upward content scrolling
          isTracking = false;
          return;
        }
      }

      if (isDragging) {
        if (e.cancelable) e.preventDefault();
        currentY = y;

        if (deltaY > 0) {
          // Direct 1:1 downward follow
          sheetEl.style.transform = `translateY(${deltaY}px)`;
          if (sheetBackdrop) {
            const opacity = Math.max(0, 1 - (deltaY / 320));
            sheetBackdrop.style.opacity = opacity.toString();
          }
        } else {
          // Rubber-band resistance if dragged up
          const resisted = deltaY * 0.2;
          sheetEl.style.transform = `translateY(${resisted}px)`;
        }
      }
    }

    function onPointerUp() {
      if (!isTracking) return;
      isTracking = false;

      if (!isDragging) return;
      isDragging = false;

      const deltaY = currentY - startY;
      const elapsed = Math.max(1, Date.now() - startTime);
      const velocity = deltaY / elapsed; // px/ms

      // Dismiss if pulled down > 80px or flicked down rapidly (velocity > 0.3 px/ms)
      const shouldDismiss = deltaY > 80 || (deltaY > 30 && velocity > 0.3);

      if (shouldDismiss) {
        sheetEl.style.transition = "transform 240ms cubic-bezier(0.32, 0.72, 0, 1)";
        sheetEl.style.transform = "translateY(100%)";
        if (sheetBackdrop) {
          sheetBackdrop.style.transition = "opacity 240ms ease";
          sheetBackdrop.style.opacity = "0";
        }
        setTimeout(() => {
          closeSheet(sheetEl);
        }, 240);
        triggerHaptic([10]);
      } else {
        // Snap back to open position
        sheetEl.style.transition = "transform 260ms cubic-bezier(0.16, 1, 0.3, 1)";
        sheetEl.style.transform = "translateY(0)";
        if (sheetBackdrop) {
          sheetBackdrop.style.transition = "opacity 260ms ease";
          sheetBackdrop.style.opacity = "1";
        }
        setTimeout(() => {
          sheetEl.style.transition = "";
          sheetEl.style.transform = "";
          if (sheetBackdrop) {
            sheetBackdrop.style.transition = "";
            sheetBackdrop.style.opacity = "";
          }
        }, 260);
      }
    }

    // Pointer events (desktop mice, trackpads, touch screens)
    sheetEl.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    // Touch events for iOS Safari compatibility
    sheetEl.addEventListener("touchstart", onPointerDown, { passive: true });
    window.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("touchend", onPointerUp);
    window.addEventListener("touchcancel", onPointerUp);
  }

  // Bind drag-to-dismiss to all bottom sheets
  [changeDinnerSheet, addMealSheet, liveMapSheet, directorSheet].forEach(sheet => {
    if (sheet) setupSheetDragToDismiss(sheet);
  });

  if (sheetBackdrop) {
    sheetBackdrop.addEventListener("click", () => closeSheet());
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && activeSheet) {
      closeSheet();
    }
  });

  // Sheet Close Buttons
  if (btnCloseChangeDinner) btnCloseChangeDinner.addEventListener("click", () => closeSheet(changeDinnerSheet));
  if (btnCloseAddMeal) btnCloseAddMeal.addEventListener("click", () => closeSheet(addMealSheet));
  if (btnCloseLiveMap) btnCloseLiveMap.addEventListener("click", () => closeSheet(liveMapSheet));
  if (btnCloseDirectorSheet) btnCloseDirectorSheet.addEventListener("click", () => closeSheet(directorSheet));

  // =========================================================================
  // Tab 1: Tonight Screen Interactions
  // =========================================================================

  // 15:00 Notification Card Buttons
  if (btnNotifYes) {
    btnNotifYes.addEventListener("click", () => {
      triggerHaptic([20]);
      store.set({ plan: { isConfirmed: true } });
      showToast(`Confirmed! ${store.state.plan.meal.name} scheduled for ${minsToTimeStr(store.state.plan.readyMins)}.`);
    });
  }

  if (btnNotifSwap) {
    btnNotifSwap.addEventListener("click", () => {
      triggerHaptic([10]);
      openSheet(changeDinnerSheet);
    });
  }

  if (btnNotifSkip) {
    btnNotifSkip.addEventListener("click", () => {
      triggerHaptic([15]);
      store.set({ flags: { skipped: true } });
      showToast("Enjoy your evening out! All 11 meals stay deep-frozen at -18.0 °C.");
    });
  }

  // Hero Card Action Button
  if (btnHeroAction) {
    btnHeroAction.addEventListener("click", () => {
      const computed = computeTonight(store.state.sim.mins, store.state.plan, store.state.flags);
      if (computed.phase === "checkin" || computed.phase === "scheduled" || computed.phase === "ready" || computed.phase === "held") {
        openSheet(changeDinnerSheet);
      } else if (computed.phase === "drop") {
        triggerAirlockSequence();
      } else if (computed.phase === "thaw" || computed.phase === "equalize") {
        const newReady = store.state.plan.readyMins + 30;
        store.set({
          plan: {
            readyMins: newReady,
            dropMins: newReady - store.state.plan.thawMin - store.state.plan.equalizeMin
          }
        });
        showToast(`Dinner pushed by 30 min. Target: ${minsToTimeStr(newReady)}.`);
      } else if (computed.phase === "warning") {
        store.set({ flags: { powerCutMinutes: 0, drawerOccupied: false } });
        showToast("Safety warning resolved. Defrost schedule resumed.");
      } else if (computed.phase === "lockout") {
        store.set({ flags: { powerCutMinutes: 0 } });
        showToast("Lockout cleared. Drawer reset to standby.");
      } else if (computed.phase === "skipped") {
        store.set({ flags: { skipped: false, isConfirmed: true } });
        showToast("Dinner schedule resumed.");
      }
    });
  }

  // Quick Action Buttons
  if (btnQuickChangeDinner) {
    btnQuickChangeDinner.addEventListener("click", () => {
      openSheet(changeDinnerSheet);
    });
  }

  if (btnQuickEatingOut) {
    btnQuickEatingOut.addEventListener("click", () => {
      triggerHaptic([15]);
      store.set({ flags: { skipped: true } });
      showToast("Dinner skipped. All 11 meals stay deep-frozen at -18.0 °C.");
    });
  }

  if (btnQuickHold30) {
    btnQuickHold30.addEventListener("click", () => {
      triggerHaptic([15]);
      const newReady = store.state.plan.readyMins + 30;
      store.set({
        plan: {
          readyMins: newReady,
          dropMins: newReady - store.state.plan.thawMin - store.state.plan.equalizeMin
        }
      });
      showToast(`Added +30 min hold. Ready by ${minsToTimeStr(newReady)}.`);
    });
  }

  if (btnOpenMapSheet) {
    btnOpenMapSheet.addEventListener("click", () => {
      openSheet(liveMapSheet);
    });
  }

  // Running Late (+30m) Action Button on Hero Card
  if (btnTonightHold30) {
    btnTonightHold30.addEventListener("click", () => {
      triggerHaptic([15]);
      const newReady = store.state.plan.readyMins + 30;
      store.set({
        plan: {
          readyMins: newReady,
          dropMins: newReady - store.state.plan.thawMin - store.state.plan.equalizeMin
        }
      });
      showToast(`Dinner pushed by 30 min. Target: ${minsToTimeStr(newReady)}.`);
    });
  }

  // Top Target Schedule Bar Interactions
  if (btnOpenScheduleSheet) {
    btnOpenScheduleSheet.addEventListener("click", () => {
      triggerHaptic([10]);
      openSheet(changeDinnerSheet);
    });
  }

  if (btnTopBarCommute) {
    btnTopBarCommute.addEventListener("click", () => {
      triggerHaptic([10]);
      openSheet(liveMapSheet);
    });
  }

  // =========================================================================
  // Sheet 1: Change Dinner Sheet (8 Stocked Meals & Interactive Dial)
  // =========================================================================

  function renderSheetMealGrid() {
    if (!sheetMealGrid) return;
    sheetMealGrid.innerHTML = "";

    const stockedEntries = Object.keys(drumInventory)
      .filter(k => drumInventory[k] && !drumInventory[k].isChimney)
      .map(k => drumInventory[k]);

    stockedEntries.forEach(meal => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `meal-card ${meal.slot === store.state.plan.slot ? 'selected' : ''}`;
      btn.dataset.slot = meal.slot;
      btn.setAttribute("aria-label", `Select ${meal.name}, ${meal.weight} grams`);

      btn.innerHTML = `
        <span class="badge-tagged">~${meal.thawTime} min</span>
        <div class="meal-thumb-wrap">
          <img src="${meal.photo}" alt="${escapeHTML(meal.name)}" loading="lazy">
        </div>
        <div class="meal-label">${escapeHTML(meal.name)}</div>
        <div class="meal-sublabel">Container ${meal.slot} (${meal.weight} g)</div>
      `;

      btn.addEventListener("click", () => {
        triggerHaptic([10]);
        document.querySelectorAll("#sheetMealGrid .meal-card").forEach(c => c.classList.remove("selected"));
        btn.classList.add("selected");
        store.set({
          plan: {
            slot: meal.slot,
            meal: meal,
            thawMin: meal.thawTime,
            equalizeMin: meal.equalizationTime,
            dropMins: store.state.plan.readyMins - meal.thawTime - meal.equalizationTime
          }
        });
        updateDialGeometry(tempDialMins);
      });

      sheetMealGrid.appendChild(btn);
    });
  }
  renderSheetMealGrid();

  // Dial Drag and Keyboard Pointer Handling
  if (dialContainer) {
    let isDialDragging = false;

    function handleDialEvent(e) {
      const rect = dialContainer.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0].clientX);
      const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0].clientY);

      let dx = clientX - cx;
      let dy = clientY - cy;
      let theta = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (theta < 0) theta += 360;

      // Map theta 10 -> 350 to minutes 1080 (18:00) -> 1320 (22:00)
      const fraction = Math.max(0, Math.min(1, (theta - 10) / 340));
      const rawMins = 1080 + fraction * 240;
      tempDialMins = Math.round(rawMins / 5) * 5;

      presetChips.forEach(c => c.classList.toggle("active", parseInt(c.dataset.mins, 10) === tempDialMins));
      updateDialGeometry(tempDialMins);
    }

    dialContainer.addEventListener("mousedown", (e) => {
      isDialDragging = true;
      handleDialEvent(e);
    });
    window.addEventListener("mousemove", (e) => {
      if (isDialDragging) handleDialEvent(e);
    });
    window.addEventListener("mouseup", () => {
      isDialDragging = false;
    });

    dialContainer.addEventListener("touchstart", (e) => {
      isDialDragging = true;
      handleDialEvent(e);
    }, { passive: true });
    window.addEventListener("touchmove", (e) => {
      if (isDialDragging) handleDialEvent(e);
    }, { passive: true });
    window.addEventListener("touchend", () => {
      isDialDragging = false;
    });

    // Keyboard accessibility for Dial (Arrow keys, PageUp/Down, Home/End)
    dialContainer.addEventListener("keydown", (e) => {
      let delta = 0;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") delta = 5;
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") delta = -5;
      else if (e.key === "PageUp") delta = 30;
      else if (e.key === "PageDown") delta = -30;
      else if (e.key === "Home") { tempDialMins = 1080; delta = 0; }
      else if (e.key === "End") { tempDialMins = 1320; delta = 0; }

      if (delta !== 0 || e.key === "Home" || e.key === "End") {
        tempDialMins = Math.max(1080, Math.min(1320, tempDialMins + delta));
        presetChips.forEach(c => c.classList.toggle("active", parseInt(c.dataset.mins, 10) === tempDialMins));
        updateDialGeometry(tempDialMins);
        triggerHaptic([5]);
        e.preventDefault();
      }
    });

    updateDialGeometry(tempDialMins);
  }

  // Quick Preset Chips
  presetChips.forEach(chip => {
    chip.addEventListener("click", () => {
      triggerHaptic([10]);
      presetChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      tempDialMins = parseInt(chip.dataset.mins, 10);
      updateDialGeometry(tempDialMins);
    });
  });

  // Confirm Change Dinner Button
  if (btnConfirmDinnerSheet) {
    btnConfirmDinnerSheet.addEventListener("click", () => {
      triggerHaptic([20, 60]);
      const meal = store.state.plan.meal;
      const thawMin = meal.thawTime;
      const eqMin = meal.equalizationTime;
      const totalDefrost = thawMin + eqMin;
      const earliestSafeMins = store.state.sim.mins + totalDefrost;

      const finalReadyMins = Math.max(tempDialMins, earliestSafeMins);
      const finalDropMins = finalReadyMins - thawMin - eqMin;

      store.set({
        plan: {
          readyMins: finalReadyMins,
          dropMins: finalDropMins,
          isConfirmed: true
        },
        flags: { skipped: false }
      });

      closeSheet(changeDinnerSheet);
      showToast(`${meal.name} confirmed for ${minsToTimeStr(finalReadyMins)} (drops at ${minsToTimeStr(finalDropMins)}).`);
    });
  }

  // =========================================================================
  // Tab 2: Freezer Tab Interactions & Add Meal Sheet
  // =========================================================================

  drumSlotButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const slot = btn.dataset.slot;
      if (slot === "12") {
        showToast("Slot 12 is the dedicated pass-through chute that lets meals drop into the defrost drawer.");
        return;
      }
      drumSlotButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      store.set({ selectedFreezerSlot: slot });
      triggerHaptic([10]);

      if (!drumInventory[slot]) {
        // Open slot: offer to stock it
        store.set({ targetStockSlot: slot });
        if (sheetTargetSlotDisplay) sheetTargetSlotDisplay.textContent = `Container ${slot}`;
        openSheet(addMealSheet);
      }
    });
  });

  if (btnUseSlotForTonight) {
    btnUseSlotForTonight.addEventListener("click", () => {
      const slot = store.state.selectedFreezerSlot;
      const item = drumInventory[slot];
      if (!item || item.isChimney) {
        showToast("Please choose a stocked container first.");
        return;
      }
      triggerHaptic([20]);
      const thawMin = item.thawTime;
      const eqMin = item.equalizationTime;
      store.set({
        plan: {
          slot: slot,
          meal: item,
          thawMin: thawMin,
          equalizeMin: eqMin,
          dropMins: store.state.plan.readyMins - thawMin - eqMin,
          isConfirmed: true
        },
        flags: { skipped: false }
      });
      switchTab("tab-tonight");
      showToast(`${item.name} set as tonight's dinner.`);
    });
  }

  if (btnOpenAddMealSheet) {
    btnOpenAddMealSheet.addEventListener("click", () => {
      const openSlot = ["09", "10", "11"].find(k => !drumInventory[k]) || "09";
      store.set({ targetStockSlot: openSlot });
      if (sheetTargetSlotDisplay) sheetTargetSlotDisplay.textContent = `Container ${openSlot}`;
      openSheet(addMealSheet);
    });
  }

  // Tab 2 Category Filter Pills
  freezerCatPills.forEach(pill => {
    pill.addEventListener("click", () => {
      triggerHaptic([10]);
      freezerCatPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      const cat = pill.dataset.filterCat;
      freezerMenuCards.forEach(card => {
        if (cat === "all") {
          card.classList.remove("hidden");
        } else {
          const cardCat = card.dataset.cat || "";
          card.classList.toggle("hidden", cardCat !== cat);
        }
      });
    });
  });

  // Tab 2 Sticky Bottom Confirmation Bar Handlers
  if (btnStickyUseTonight) {
    btnStickyUseTonight.addEventListener("click", () => {
      const slot = store.state.selectedFreezerSlot;
      const item = drumInventory[slot];
      if (!item || item.isChimney) {
        showToast("Please choose a stocked container first.");
        return;
      }
      triggerHaptic([20]);
      const thawMin = item.thawTime;
      const eqMin = item.equalizationTime;
      store.set({
        plan: {
          slot: slot,
          meal: item,
          thawMin: thawMin,
          equalizeMin: eqMin,
          dropMins: store.state.plan.readyMins - thawMin - eqMin,
          isConfirmed: true
        },
        flags: { skipped: false }
      });
      switchTab("tab-tonight");
      showToast(`${item.name} set as tonight's dinner.`);
    });
  }

  if (btnStickyBringToDoor) {
    btnStickyBringToDoor.addEventListener("click", () => {
      triggerHaptic([15]);
      showToast(`Carousel indexed. Container ${store.state.selectedFreezerSlot} aligned with front door.`);
    });
  }

  if (btnDoorLoadMeal) {
    btnDoorLoadMeal.addEventListener("click", () => {
      const openSlot = ["09", "10", "11"].find(k => !drumInventory[k]) || "09";
      store.set({ targetStockSlot: openSlot });
      if (sheetTargetSlotDisplay) sheetTargetSlotDisplay.textContent = `Container ${openSlot}`;
      openSheet(addMealSheet);
    });
  }

  // Add Meal Sheet Form Controls
  const sheetCatChips = document.querySelectorAll("#sheetCategoryChipsGrid .cat-chip");
  sheetCatChips.forEach(chip => {
    chip.addEventListener("click", () => {
      sheetCatChips.forEach(c => c.classList.remove("selected"));
      chip.classList.add("selected");
      store.set({ loadingCategory: chip.dataset.cat });
      updateAddMealCalculations();
      triggerHaptic([10]);
    });
  });

  if (sheetWeightSlider) {
    sheetWeightSlider.addEventListener("input", (e) => {
      const grams = Math.min(700, Math.max(100, parseInt(e.target.value, 10)));
      store.set({ loadingWeight: grams });
      if (sheetWeightDisplay) sheetWeightDisplay.textContent = `${grams} g`;
      updateAddMealCalculations();
    });
  }

  function updateAddMealCalculations() {
    const cat = store.state.loadingCategory;
    const grams = store.state.loadingWeight;
    const thaw = calculateThaw(cat, grams);
    const eq = getEqualizationTime(cat, grams);

    if (sheetDensityName) {
      sheetDensityName.textContent = getDensityName(cat);
    }
    if (sheetThawCalcDisplay) {
      sheetThawCalcDisplay.textContent = `~${thaw + eq} min (${thaw}m thaw + ${eq}m soak)`;
    }
  }

  if (btnSaveStockMeal) {
    btnSaveStockMeal.addEventListener("click", () => {
      triggerHaptic([20, 60]);
      const slot = store.state.targetStockSlot;
      const cat = store.state.loadingCategory;
      const weight = store.state.loadingWeight;
      const thaw = calculateThaw(cat, weight);
      const eq = getEqualizationTime(cat, weight);

      const customName = sheetMealNameInput ? sheetMealNameInput.value.trim() : "";
      const formula = CATEGORY_FORMULAS[cat] || CATEGORY_FORMULAS.beef;
      const finalName = customName || formula.name.split("&")[0].trim();
      const photo = getCategoryPhoto(cat);

      drumInventory[slot] = {
        id: slot,
        name: finalName,
        category: cat,
        weight: weight,
        tier: parseInt(slot, 10) <= 6 ? 2 : 1,
        slot: slot,
        thawTime: thaw,
        equalizationTime: eq,
        photo: photo
      };

      // Update button on freezer screen
      const slotBtn = document.querySelector(`.drum-slot-btn[data-slot="${slot}"]`);
      if (slotBtn) {
        slotBtn.classList.remove("empty");
        const nameEl = slotBtn.querySelector(".slot-name");
        if (nameEl) nameEl.textContent = `${finalName.split(" ")[0]} (${weight}g)`;
      }

      if (sheetMealNameInput) sheetMealNameInput.value = "";
      renderSheetMealGrid();
      store.notify(); // Re-render store with new inventory
      closeSheet(addMealSheet);
      showToast(`Container ${slot} stocked with ${finalName} (${weight} g).`);
    });
  }

  // =========================================================================
  // Sheet 3: Live Commute Map Sheet
  // =========================================================================

  const MAP_MARKER_POSITIONS = {
    ontime: { t: 0.45, bubble: "YOU • ETA 19:20", loc: "Driving Home (Clear)", eta: "19:20 (in 15 min)", defrost: "Active Thaw (+10.0 °C air) • Surface ≤ +4.0 °C", halo: "amber" },
    traffic: { t: 0.50, bubble: "TRAFFIC • +30M DELAY", loc: "A5 Bridge (Traffic Jam)", eta: "19:55 (+30 min delay)", defrost: "Auto-Switched to +3.0 °C Fridge Hold", halo: "green" },
    atwork: { t: 0.05, bubble: "STILL AT WORK • 19:20", loc: "Still at Office (Late Meeting)", eta: "~20:15 (Not departed yet)", defrost: "Held at +3.0 °C (Safe up to 24 h)", halo: "green" },
    arrived: { t: 0.95, bubble: "ARRIVED HOME!", loc: "Home Driveway", eta: "Arrived (Now)", defrost: "Green Handle • Ready for Pan!", halo: "green" }
  };

  function applyMapScene(sceneKey) {
    const data = MAP_MARKER_POSITIONS[sceneKey] || MAP_MARKER_POSITIONS.ontime;
    store.set({ flags: { commute: sceneKey } });

    mapSceneBtns.forEach(b => b.classList.toggle("active", b.dataset.scene === sceneKey));
    if (mapCanvasWrap) mapCanvasWrap.setAttribute("data-scene-state", sceneKey);

    if (mapRouteFlowLine && mapUserMarker && typeof mapRouteFlowLine.getTotalLength === "function") {
      try {
        const totalLen = mapRouteFlowLine.getTotalLength();
        const pt = mapRouteFlowLine.getPointAtLength(data.t * totalLen);
        mapUserMarker.setAttribute("transform", `translate(${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})`);
      } catch (e) {}
    }

    if (mapUserBubbleText) mapUserBubbleText.textContent = data.bubble;
    if (mapHomeBadgeText) mapHomeBadgeText.textContent = (data.halo === "green" ? "HOME • +3°C HOLD" : "HOME • +10°C THAW");
    if (mapHomeHaloRing) mapHomeHaloRing.setAttribute("class", `map-home-halo ${data.halo}`);
    if (mapMetricLocation) mapMetricLocation.textContent = data.loc;
    if (mapMetricEta) mapMetricEta.textContent = data.eta;
    if (mapMetricDefrost) mapMetricDefrost.textContent = data.defrostLabel || data.defrost;
  }

  mapSceneBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      triggerHaptic([10]);
      applyMapScene(btn.dataset.scene);
    });
  });

  // =========================================================================
  // Tab 3: Kitchen & Care Screen Controls
  // =========================================================================

  // Power Cut Stepper (20 min, 45 min, 130 min)
  pcutStepBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      triggerHaptic([15]);
      const dur = parseInt(btn.dataset.duration, 10);
      store.set({ flags: { powerCutMinutes: dur } });

      if (scenarioFeedbackBox && scenarioFeedbackText) {
        scenarioFeedbackBox.removeAttribute("hidden");
        if (dur === 0) {
          scenarioFeedbackText.innerHTML = "<strong>Normal Operation:</strong> Continuous power supply. Insulated chamber maintains setpoint temperature.";
        } else if (dur === 20) {
          scenarioFeedbackText.innerHTML = "<strong>Recoverable Outage (&lt; 30 min):</strong> Insulated drawer held temperature safely below +5.0 °C. Active defrost resumes safely.";
        } else if (dur === 45) {
          scenarioFeedbackText.innerHTML = "<strong>Tier 1 Safety Warning (30–120 min):</strong> Chamber reached +5.2 °C. Active heating paused; inspect dish before cooking.";
        } else if (dur === 130) {
          scenarioFeedbackText.innerHTML = "<strong>Tier 2 Safety Lockout (&gt; 120 min):</strong> Food temperature exceeded +5.0 °C for > 2 hours (USDA danger zone). Discard meal; do not refreeze.";
        }
      }
    });
  });

  // Peace-of-Mind Demo Buttons
  if (btnSimDrawerOpen) {
    btnSimDrawerOpen.addEventListener("click", () => {
      triggerHaptic([15]);
      const newState = !store.state.flags.drawerOccupied;
      store.set({ flags: { drawerOccupied: newState } });
      if (scenarioFeedbackBox && scenarioFeedbackText) {
        scenarioFeedbackBox.removeAttribute("hidden");
        scenarioFeedbackText.innerHTML = newState
          ? "<strong>Smart Pause Active:</strong> A dish is still in the lower drawer. DINA keeps the drop hatch sealed to prevent collision until cleared."
          : "<strong>Smart Pause Cleared:</strong> Defrost drawer confirmed empty. Drop path open.";
      }
      showToast(newState ? "Smart Pause: Drawer occupied. Drop hatch kept sealed." : "Drawer cleared.");
    });
  }

  if (btnSimDishClean) {
    btnSimDishClean.addEventListener("click", () => {
      triggerHaptic([10]);
      if (scenarioFeedbackBox && scenarioFeedbackText) {
        scenarioFeedbackBox.removeAttribute("hidden");
        scenarioFeedbackText.innerHTML = "<strong>Condensate Tray Hygiene:</strong> Removable condensate drip tray slides effortlessly from the front. Dishwasher-safe up to 70 °C.";
      }
      showToast("Dishwasher-safe drip tray slides out effortlessly from front.");
    });
  }

  // Handle Light Guide 5-second Auto-Reverting Preview
  let previewTimer = null;
  haloBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      triggerHaptic([10]);
      const mode = btn.dataset.mode;
      clearTimeout(previewTimer);
      store.set({ manualPreviewHalo: mode });
      showToast(`Handle Light: ${mode.toUpperCase()} preview (reverts in 5 s).`);

      previewTimer = setTimeout(() => {
        store.set({ manualPreviewHalo: null });
      }, 5000);
    });
  });

  // Commute Sync Privacy Toggle
  if (btnToggleCommuteSync) {
    btnToggleCommuteSync.addEventListener("click", () => {
      const newState = !store.state.flags.commuteSyncEnabled;
      store.set({ flags: { commuteSyncEnabled: newState } });
      btnToggleCommuteSync.classList.toggle("active", newState);
      btnToggleCommuteSync.setAttribute("aria-pressed", String(newState));
      btnToggleCommuteSync.textContent = newState ? "ON" : "OFF";
      showToast(newState ? "Location stays on phone (privacy-first sync active)." : "Commute sync disabled.");
    });
  }

  // Wi-Fi Offline Test
  if (btnSimulateOffline) {
    btnSimulateOffline.addEventListener("click", () => {
      triggerHaptic([15]);
      const newOffline = !store.state.flags.wifiOffline;
      store.set({ flags: { wifiOffline: newOffline } });
      btnSimulateOffline.classList.toggle("active", newOffline);
      btnSimulateOffline.textContent = newOffline ? "Reconnect Wi-Fi" : "Test Offline";
      showToast(newOffline ? "Wi-Fi disconnected: DINA runs dinner schedule locally." : "Wi-Fi reconnected.");
    });
  }

  // Top Bar Bell Button
  if (btnHeaderBell) {
    btnHeaderBell.addEventListener("click", () => {
      triggerHaptic([15]);
      const computed = computeTonight(store.state.sim.mins, store.state.plan, store.state.flags);
      showToast(`DINA Status: ${computed.headline}`);
    });
  }

  // =========================================================================
  // Director Controls (Desktop Column & Mobile Sheet)
  // =========================================================================

  // Consolidated Header Simulator Button (Section 3.1)
  if (btnHeaderSim) {
    btnHeaderSim.addEventListener("click", () => {
      triggerHaptic([12]);
      if (window.innerWidth >= 900) {
        const appWrapper = document.querySelector(".app-layout-wrapper");
        if (appWrapper) appWrapper.classList.remove("demo-controls-hidden");
        const desktopPanel = document.getElementById("directorPanelDesktop");
        if (desktopPanel) desktopPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
        showToast("Concept Director evaluation panel active.");
      } else {
        openSheet(directorSheet);
      }
    });
  }

  // Director Sub-Tab Switching (Scenarios vs CAD & Cutaway)
  function setupDirectorTabs(btnScenario, btnCad, panelScenario, panelCad, targetHost, isDesktop) {
    if (!btnScenario || !btnCad || !panelScenario || !panelCad) return;
    const desktopPanel = document.getElementById("directorPanelDesktop");

    btnScenario.addEventListener("click", () => {
      triggerHaptic([10]);
      btnScenario.classList.add("active");
      btnScenario.setAttribute("aria-selected", "true");
      btnCad.classList.remove("active");
      btnCad.setAttribute("aria-selected", "false");
      panelScenario.classList.add("active");
      panelCad.classList.remove("active");
      if (isDesktop && desktopPanel) {
        desktopPanel.classList.remove("cad-active");
      }
    });

    btnCad.addEventListener("click", () => {
      triggerHaptic([10]);
      btnCad.classList.add("active");
      btnCad.setAttribute("aria-selected", "true");
      btnScenario.classList.remove("active");
      btnScenario.setAttribute("aria-selected", "false");
      panelCad.classList.add("active");
      panelScenario.classList.remove("active");
      if (isDesktop && desktopPanel) {
        desktopPanel.classList.add("cad-active");
      }

      // Dynamically mount cutawayCard into targetHost if needed
      if (cutawayCard && targetHost && !targetHost.contains(cutawayCard)) {
        targetHost.appendChild(cutawayCard);
      }
    });
  }

  // Mobile Director Sub-Tabs
  setupDirectorTabs(
    btnDirectorTabScenario,
    btnDirectorTabCad,
    directorScenarioPanel,
    directorCadPanel,
    mobileCutawayHost,
    false
  );

  // Desktop Director Sub-Tabs
  setupDirectorTabs(
    btnDesktopTabScenario,
    btnDesktopTabCad,
    desktopScenarioPanel,
    desktopCadPanel,
    desktopCutawayHost,
    true
  );

  // Cutaway Enlarge / Full View Toggle
  const btnCutawayZoom = document.getElementById("btnCutawayZoom");
  if (btnCutawayZoom && cutawayCard) {
    function toggleCutawayEnlarge(enlarge) {
      const willEnlarge = enlarge !== undefined ? enlarge : !cutawayCard.classList.contains("enlarged");
      triggerHaptic([12]);
      const zoomInIcon = btnCutawayZoom.querySelector(".zoom-in-icon");
      const zoomOutIcon = btnCutawayZoom.querySelector(".zoom-out-icon");
      const zoomLabel = btnCutawayZoom.querySelector(".zoom-label");

      if (willEnlarge) {
        cutawayCard.classList.add("enlarged");
        if (zoomInIcon) zoomInIcon.style.display = "none";
        if (zoomOutIcon) zoomOutIcon.style.display = "inline-block";
        if (zoomLabel) zoomLabel.textContent = "Close";
        btnCutawayZoom.setAttribute("aria-label", "Close Fullscreen Cutaway View");
      } else {
        cutawayCard.classList.remove("enlarged");
        if (zoomInIcon) zoomInIcon.style.display = "inline-block";
        if (zoomOutIcon) zoomOutIcon.style.display = "none";
        if (zoomLabel) zoomLabel.textContent = "Enlarge";
        btnCutawayZoom.setAttribute("aria-label", "Open Fullscreen Cutaway View");
      }
    }

    btnCutawayZoom.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCutawayEnlarge();
    });

    // Close on backdrop click (when clicking outside the inner modal content)
    cutawayCard.addEventListener("click", (e) => {
      if (cutawayCard.classList.contains("enlarged") && e.target === cutawayCard) {
        toggleCutawayEnlarge(false);
      }
    });

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && cutawayCard.classList.contains("enlarged")) {
        toggleCutawayEnlarge(false);
      }
    });
  }

  // Open Mobile Director Sheet (Legacy compatibility)
  if (btnOpenDemoSheet) {
    btnOpenDemoSheet.addEventListener("click", () => {
      openSheet(directorSheet);
    });
  }

  // Scrubber Listener
  function handleScrubberInput(e) {
    const mins = parseInt(e.target.value, 10);
    store.set({ sim: { mins: mins } });
  }

  if (simScrubber) simScrubber.addEventListener("input", handleScrubberInput);
  if (mobileSimScrubber) mobileSimScrubber.addEventListener("input", handleScrubberInput);

  // Play/Pause Toggle
  function togglePlayPause() {
    triggerHaptic([10]);
    store.set({ sim: { playing: !store.state.sim.playing } });
  }
  if (btnDirectorPlayPause) btnDirectorPlayPause.addEventListener("click", togglePlayPause);
  if (btnSpeedMobilePlayPause) btnSpeedMobilePlayPause.addEventListener("click", togglePlayPause);

  // Speed Toggles (1x, 5x, 20x)
  speedButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      triggerHaptic([10]);
      const spd = parseInt(btn.dataset.speed, 10);
      store.set({ sim: { speed: spd, playing: true } });
    });
  });

  // Reset Evening Button
  function resetEvening() {
    triggerHaptic([20]);
    store.set({
      sim: { mins: 900, speed: 1, playing: true },
      plan: {
        slot: "02",
        meal: drumInventory["02"],
        readyMins: 1170,
        thawMin: 85,
        equalizeMin: 15,
        dropMins: 1070,
        isConfirmed: false
      },
      flags: {
        commute: "ontime",
        powerCutMinutes: 0,
        drawerOccupied: false,
        wifiOffline: false,
        commuteSyncEnabled: true,
        skipped: false
      },
      activeTab: "tab-tonight",
      tour: { active: false, step: 0 }
    });
    switchTab("tab-tonight");
  }

  if (btnDirectorReset) btnDirectorReset.addEventListener("click", resetEvening);
  if (btnMobileDirectorReset) btnMobileDirectorReset.addEventListener("click", resetEvening);

  // Commute Scenario Buttons
  commutePillButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      triggerHaptic([10]);
      const sc = btn.dataset.commute;
      applyMapScene(sc);
    });
  });

  // Safety Scenario Buttons
  pcutPillButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      triggerHaptic([15]);
      const dur = parseInt(btn.dataset.pcut, 10);
      store.set({ flags: { powerCutMinutes: dur } });
    });
  });

  function toggleDrawerOccupied() {
    triggerHaptic([10]);
    const newState = !store.state.flags.drawerOccupied;
    store.set({ flags: { drawerOccupied: newState } });
  }
  if (btnToggleDrawerOccupied) btnToggleDrawerOccupied.addEventListener("click", toggleDrawerOccupied);
  if (btnMobileToggleDrawerOccupied) btnMobileToggleDrawerOccupied.addEventListener("click", toggleDrawerOccupied);

  function toggleWifi() {
    triggerHaptic([10]);
    const newOffline = !store.state.flags.wifiOffline;
    store.set({ flags: { wifiOffline: newOffline } });
  }
  if (btnToggleWifiDesktop) btnToggleWifiDesktop.addEventListener("click", toggleWifi);
  if (btnMobileToggleWifi) btnMobileToggleWifi.addEventListener("click", toggleWifi);

  // Toggle Concept Director Demo Panel
  if (btnToggleDemoMode) {
    btnToggleDemoMode.addEventListener("click", () => {
      const appWrapper = document.querySelector(".app-layout-wrapper");
      if (appWrapper) {
        const isHidden = appWrapper.classList.toggle("demo-controls-hidden");
        triggerHaptic([12]);
        const label = btnToggleDemoMode.querySelector(".demo-toggle-label");
        if (label) {
          label.textContent = isHidden ? "Demo: Off" : "Demo Controls";
        }
        showToast(isHidden ? "Demo panel collapsed. Focused app view active." : "Demo controls panel visible.");
      }
    });
  }

  // Tour Prompt Persistence
  if (sessionStorage.getItem("dina_tour_dismissed") === "true") {
    if (tourPromptCard) tourPromptCard.setAttribute("hidden", "");
  }

  // =========================================================================
  // Guided Tour Engine (6 Steps)
  // =========================================================================

  function runTourStep(stepNum) {
    triggerHaptic([15]);
    store.set({ tour: { active: true, step: stepNum } });

    switch (stepNum) {
      case 1:
        // 15:00 Check-In
        store.set({
          sim: { mins: 900, playing: false },
          plan: { isConfirmed: false },
          flags: { commute: "ontime", powerCutMinutes: 0, drawerOccupied: false, skipped: false },
          activeTab: "tab-tonight"
        });
        switchTab("tab-tonight");
        break;

      case 2:
        // Scheduled (confirmed, clock fast-forwards to 17:40)
        store.set({
          sim: { mins: 1060, playing: false },
          plan: { isConfirmed: true },
          activeTab: "tab-tonight"
        });
        switchTab("tab-tonight");
        break;

      case 3:
        // Airlock Drop (17:50)
        store.set({
          sim: { mins: 1070, playing: false },
          activeTab: "tab-tonight"
        });
        switchTab("tab-tonight");
        triggerAirlockSequence();
        break;

      case 4:
        // Thaw and +4 °C limit (18:40)
        store.set({
          sim: { mins: 1120, playing: false },
          activeTab: "tab-tonight"
        });
        switchTab("tab-tonight");
        break;

      case 5:
        // Disruption: Traffic +30m (19:30)
        store.set({
          sim: { mins: 1170, playing: false },
          flags: { commute: "traffic" },
          activeTab: "tab-tonight"
        });
        switchTab("tab-tonight");
        break;

      case 6:
        // Arrival (19:55)
        store.set({
          sim: { mins: 1195, playing: false },
          flags: { commute: "arrived" },
          activeTab: "tab-tonight"
        });
        switchTab("tab-tonight");
        break;

      default:
        store.set({ tour: { active: false, step: 0 } });
        break;
    }
  }

  function startGuidedTour() {
    closeSheet();
    sessionStorage.setItem("dina_tour_dismissed", "true");
    if (tourPromptCard) tourPromptCard.setAttribute("hidden", "");
    runTourStep(1);
  }

  function dismissTourPrompt() {
    sessionStorage.setItem("dina_tour_dismissed", "true");
    if (tourPromptCard) tourPromptCard.setAttribute("hidden", "");
    triggerHaptic([10]);
  }

  if (btnTourPromptStart) btnTourPromptStart.addEventListener("click", startGuidedTour);
  if (btnTourPromptSkip) btnTourPromptSkip.addEventListener("click", dismissTourPrompt);
  if (btnTourPromptDismiss) btnTourPromptDismiss.addEventListener("click", dismissTourPrompt);

  if (btnLaunchTourDesktop) btnLaunchTourDesktop.addEventListener("click", startGuidedTour);
  if (btnLaunchTourMobile) btnLaunchTourMobile.addEventListener("click", startGuidedTour);

  if (btnTourNext) {
    btnTourNext.addEventListener("click", () => {
      const current = store.state.tour.step;
      if (current >= 6) {
        store.set({ tour: { active: false, step: 0 } });
        showToast("Guided tour complete! App is fully interactive.");
      } else {
        runTourStep(current + 1);
      }
    });
  }

  if (btnTourReplay) {
    btnTourReplay.addEventListener("click", () => {
      runTourStep(store.state.tour.step);
    });
  }

  if (btnTourExit) {
    btnTourExit.addEventListener("click", () => {
      store.set({ tour: { active: false, step: 0 } });
      showToast("Exited guided tour.");
    });
  }

  // Initial State Announcement
  store.notify();
});
