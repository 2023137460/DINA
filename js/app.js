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

  // SVG Icons for Toasts & Food Categories
  const ICONS = {
    check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#30d158" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    heat: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff9f0a" stroke-width="2.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`,
    shield: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#30d158" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
    timer: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffb340" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    gear: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
    plus: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`
  };

  const FOOD_ICONS = {
    beef: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12c-1.5 0-3-1.5-3-3s1.5-3 3-3 3 1.5 3 3-1.5 3-3 3z"></path><path d="M5 19c2 0 4-1 5-2.5 1 1.5 3 2.5 5 2.5 3 0 5-2 5-5 0-4-5-8-10-8S0 10 0 14c0 3 2 5 5 5z"></path></svg>`,
    chicken: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1"></path><path d="M18 8a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4"></path></svg>`,
    fish: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 12c.5-2.5 2-4.5 4.5-5 3.5-.5 6.5 1 8.5 4-2 3-5 4.5-8.5 4-2.5-.5-4-2.5-4.5-5z"></path><path d="M18 12c2-1 3.5-3 4-4-1 2-1 4 0 6-.5-1-2-3-4-2z"></path></svg>`,
    shrimp: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 12a4 4 0 0 1 8 0"></path></svg>`,
    lasagna: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    pork: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><path d="M9 10h.01M15 10h.01M10 15c.5.5 1.5.5 2 0"></path></svg>`,
    default: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`
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
    }, 2500);
  }

  // 8-Position Carousel Inventory Database (Clean strings, zero emojis)
  const inventoryItems = {
    "01": { name: "Organic Chicken Breast", category: "chicken", weight: "500g", grams: 500, slot: "01", thawTime: 95 },
    "02": { name: "Prime Angus Ribeye Steak", category: "beef", weight: "450g", grams: 450, slot: "02", thawTime: 85 },
    "03": { name: "Wild Tiger Prawns", category: "shrimp", weight: "300g", grams: 300, slot: "03", thawTime: 45 },
    "04": { name: "Atlantic Salmon Fillet", category: "fish", weight: "320g", grams: 320, slot: "04", thawTime: 65 },
    "05": { name: "Artisanal Lasagna Prep", category: "lasagna", weight: "650g", grams: 650, slot: "05", thawTime: 110 },
    "06": null,
    "07": null,
    "08": null
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

  // Dynamic Slot Containers
  const quickSlotList = document.getElementById("quickSlotList");
  const fullInventorySlotList = document.getElementById("fullInventorySlotList");
  const occupancyPill = document.getElementById("occupancyPill");

  // Inspect / Stage Bottom Sheet
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
    sheetSub.textContent = `Vault Slot ${item.slot} • Deep Frozen (-18°C)`;
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

  function stageItemForDinner(slotId) {
    const item = inventoryItems[slotId];
    if (!item) return;
    appState.selectedSlot = slotId;
    appState.mealName = item.name;
    appState.mealWeight = item.weight;

    if (heroMealName) heroMealName.textContent = item.name;
    if (heroMealSpecs) heroMealSpecs.textContent = `${item.weight} • Vault Slot ${item.slot} • Est: ${item.thawTime}m`;

    renderInventory();
    showToast(`Staged ${item.name} for dinner`, ICONS.check);
    triggerHaptic([20]);
  }

  if (sheetStageBtn) {
    sheetStageBtn.addEventListener("click", () => {
      if (pendingSheetSlot) {
        stageItemForDinner(pendingSheetSlot);
        closeSheet();
      }
    });
  }

  // ==========================================================================
  // Render Inventory (Home Quick Slots + Tab 2 Full 8-Position Grid)
  // ==========================================================================
  function renderInventory() {
    const slots = ["01", "02", "03", "04", "05", "06", "07", "08"];
    let loadedCount = 0;
    slots.forEach(s => { if (inventoryItems[s]) loadedCount++; });

    if (occupancyPill) {
      occupancyPill.textContent = `${loadedCount} of 8 Slots Loaded`;
    }

    // 1. Render Tab 1 Quick Slot List (Occupied items + quick load action)
    if (quickSlotList) {
      let quickHtml = "";
      slots.forEach(slotId => {
        const item = inventoryItems[slotId];
        if (item) {
          const isSelected = slotId === appState.selectedSlot;
          const icon = FOOD_ICONS[item.category] || FOOD_ICONS.default;
          quickHtml += `
            <div class="slot-item ${isSelected ? 'active-selected' : ''}" data-slot="${slotId}">
              <div class="slot-left">
                <div class="slot-icon-box">${icon}</div>
                <div>
                  <div class="slot-name">${item.name}</div>
                  <div class="slot-meta">${item.weight} • Vault Slot ${slotId} • Est: ${item.thawTime}m</div>
                </div>
              </div>
              <button class="slot-btn-thaw" data-slot="${slotId}">${isSelected ? 'Selected' : 'Select'}</button>
            </div>
          `;
        }
      });

      if (loadedCount < 8) {
        quickHtml += `
          <div class="slot-item slot-empty" id="quickAddSlotItem" style="border-style: dashed; cursor: pointer;">
            <div class="slot-left">
              <div class="slot-icon-box empty-icon">
                ${ICONS.plus}
              </div>
              <div>
                <div class="slot-name" style="color: var(--text-secondary);">Add Food to Freezer</div>
                <div class="slot-meta">${8 - loadedCount} empty carousel slots available</div>
              </div>
            </div>
            <button class="slot-btn-load">Load Item</button>
          </div>
        `;
      }

      quickSlotList.innerHTML = quickHtml;

      // Wire quick slots events
      quickSlotList.querySelectorAll(".slot-item:not(.slot-empty)").forEach(el => {
        el.addEventListener("click", (e) => {
          if (e.target.closest(".slot-btn-thaw")) {
            stageItemForDinner(el.dataset.slot);
          } else {
            openSheet(el.dataset.slot);
          }
        });
      });

      const quickAddBtn = document.getElementById("quickAddSlotItem");
      if (quickAddBtn) {
        quickAddBtn.addEventListener("click", () => {
          openLoadSheet();
        });
      }
    }

    // 2. Render Tab 2 Full 8-Position Inventory List
    if (fullInventorySlotList) {
      let fullHtml = "";
      slots.forEach(slotId => {
        const item = inventoryItems[slotId];
        if (item) {
          const isSelected = slotId === appState.selectedSlot;
          const icon = FOOD_ICONS[item.category] || FOOD_ICONS.default;
          fullHtml += `
            <div class="slot-item ${isSelected ? 'active-selected' : ''}" data-slot="${slotId}">
              <div class="slot-left">
                <div class="slot-icon-box">${icon}</div>
                <div>
                  <div class="slot-name">${item.name}</div>
                  <div class="slot-meta">${item.weight} • Vault Slot ${slotId} • Deep Frozen (-18°C)</div>
                </div>
              </div>
              <button class="slot-btn-thaw" data-slot="${slotId}">${item.thawTime} min</button>
            </div>
          `;
        } else {
          fullHtml += `
            <div class="slot-item slot-empty" data-slot="${slotId}">
              <div class="slot-left">
                <div class="slot-icon-box empty-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                </div>
                <div>
                  <div class="slot-name" style="color: var(--text-tertiary);">Compartment Empty</div>
                  <div class="slot-meta">Vault Slot ${slotId} • Ready to load</div>
                </div>
              </div>
              <button class="slot-btn-load" data-slot="${slotId}">Load Food</button>
            </div>
          `;
        }
      });

      fullInventorySlotList.innerHTML = fullHtml;

      // Wire full inventory slots
      fullInventorySlotList.querySelectorAll(".slot-item").forEach(el => {
        const slotId = el.dataset.slot;
        if (inventoryItems[slotId]) {
          el.addEventListener("click", () => openSheet(slotId));
        } else {
          el.addEventListener("click", () => openLoadSheet(slotId));
        }
      });
    }
  }

  // ==========================================================================
  // Vault Loading Mode Engine (Real-Time Defrost Calculation)
  // ==========================================================================
  const loadBackdrop = document.getElementById("loadBackdrop");
  const loadSheet = document.getElementById("loadSheet");
  const loadSheetHandle = document.getElementById("loadSheetHandle");
  const btnCloseLoadSheet = document.getElementById("btnCloseLoadSheet");
  const btnOpenLoadModal = document.getElementById("btnOpenLoadModal");
  const btnQuickLoadHome = document.getElementById("btnQuickLoadHome");

  const carouselSlotGrid = document.getElementById("carouselSlotGrid");
  const selectedSlotText = document.getElementById("selectedSlotText");
  const foodCategoryChips = document.getElementById("foodCategoryChips");
  const loadFoodName = document.getElementById("loadFoodName");
  const loadGramsSlider = document.getElementById("loadGramsSlider");
  const loadGramsDisplay = document.getElementById("loadGramsDisplay");
  const weightPresetChips = document.getElementById("weightPresetChips");
  const calcThawDisplay = document.getElementById("calcThawDisplay");
  const btnConfirmLoad = document.getElementById("btnConfirmLoad");
  const btnConfirmLoadText = document.getElementById("btnConfirmLoadText");

  const loadFormState = {
    selectedSlot: "06",
    category: "beef",
    baseTime: 25,
    factor: 0.13,
    grams: 400,
    thawMinutes: 77
  };

  // Thermodynamic Calculation Formula
  function updateCalculatedThaw() {
    const calculated = Math.round(loadFormState.baseTime + (loadFormState.factor * loadFormState.grams));
    loadFormState.thawMinutes = calculated;
    if (calcThawDisplay) {
      calcThawDisplay.textContent = `${calculated} min`;
    }
  }

  // Render Carousel 8-Slot Chips inside Loading Sheet
  function renderCarouselSlotGrid() {
    if (!carouselSlotGrid) return;
    const slots = ["01", "02", "03", "04", "05", "06", "07", "08"];
    let html = "";
    slots.forEach(slotId => {
      const item = inventoryItems[slotId];
      const isSelected = slotId === loadFormState.selectedSlot;
      const isOccupied = !!item;
      const statusLabel = isOccupied ? item.name.split(" ")[0] : "Empty";

      html += `
        <div class="slot-chip ${isSelected ? 'selected' : ''} ${isOccupied ? 'occupied' : ''}" data-slot="${slotId}">
          <span class="slot-chip-num">${slotId}</span>
          <span class="slot-chip-status">${statusLabel}</span>
        </div>
      `;
    });
    carouselSlotGrid.innerHTML = html;

    carouselSlotGrid.querySelectorAll(".slot-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        selectLoadingSlot(chip.dataset.slot);
      });
    });

    updateSelectedSlotUI();
  }

  function selectLoadingSlot(slotId) {
    loadFormState.selectedSlot = slotId;
    triggerHaptic([10]);

    // If slot already occupied, pre-populate its values
    const existing = inventoryItems[slotId];
    if (existing) {
      if (loadFoodName) loadFoodName.value = existing.name;
      if (existing.grams && loadGramsSlider) {
        loadGramsSlider.value = existing.grams;
        loadFormState.grams = existing.grams;
        if (loadGramsDisplay) loadGramsDisplay.textContent = `${existing.grams}g`;
      }
      if (existing.category) {
        setCategory(existing.category, false);
      }
    }

    renderCarouselSlotGrid();
  }

  function updateSelectedSlotUI() {
    const slotId = loadFormState.selectedSlot;
    const existing = inventoryItems[slotId];
    if (selectedSlotText) {
      if (existing) {
        selectedSlotText.textContent = `Slot ${slotId} (Replace: ${existing.name.substring(0, 16)}...)`;
      } else {
        selectedSlotText.textContent = `Slot ${slotId} (Empty • Ready)`;
      }
    }
    if (btnConfirmLoadText) {
      btnConfirmLoadText.textContent = `Store in Slot ${slotId} & Rotate Vault`;
    }
  }

  function setCategory(catKey, updateNameInput = true) {
    if (!foodCategoryChips) return;
    const btn = foodCategoryChips.querySelector(`[data-cat="${catKey}"]`);
    if (!btn) return;

    foodCategoryChips.querySelectorAll(".food-cat-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    loadFormState.category = catKey;
    loadFormState.baseTime = parseFloat(btn.dataset.base || 25);
    loadFormState.factor = parseFloat(btn.dataset.factor || 0.13);

    if (updateNameInput && loadFoodName && btn.dataset.name) {
      loadFoodName.value = btn.dataset.name;
    }

    updateCalculatedThaw();
  }

  // Category buttons
  if (foodCategoryChips) {
    foodCategoryChips.querySelectorAll(".food-cat-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        setCategory(btn.dataset.cat, true);
        triggerHaptic([10]);
      });
    });
  }

  // Weight Slider
  if (loadGramsSlider) {
    loadGramsSlider.addEventListener("input", () => {
      const g = parseInt(loadGramsSlider.value, 10);
      loadFormState.grams = g;
      if (loadGramsDisplay) loadGramsDisplay.textContent = `${g}g`;

      // Update preset chips active state
      if (weightPresetChips) {
        weightPresetChips.querySelectorAll(".preset-chip").forEach(chip => {
          chip.classList.toggle("active", parseInt(chip.dataset.weight, 10) === g);
        });
      }

      updateCalculatedThaw();
    });
  }

  // Weight Preset Chips
  if (weightPresetChips) {
    weightPresetChips.querySelectorAll(".preset-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const g = parseInt(chip.dataset.weight, 10);
        loadFormState.grams = g;
        if (loadGramsSlider) loadGramsSlider.value = g;
        if (loadGramsDisplay) loadGramsDisplay.textContent = `${g}g`;

        weightPresetChips.querySelectorAll(".preset-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");

        updateCalculatedThaw();
        triggerHaptic([10]);
      });
    });
  }

  function openLoadSheet(preferredSlot = null) {
    // Find first empty slot if none preferred
    if (preferredSlot) {
      loadFormState.selectedSlot = preferredSlot;
    } else {
      const slots = ["01", "02", "03", "04", "05", "06", "07", "08"];
      const firstEmpty = slots.find(s => !inventoryItems[s]);
      loadFormState.selectedSlot = firstEmpty || "01";
    }

    renderCarouselSlotGrid();
    updateCalculatedThaw();

    if (loadBackdrop) loadBackdrop.classList.add("open");
    if (loadSheet) loadSheet.classList.add("open");
    triggerHaptic([12]);
  }

  function closeLoadSheet() {
    if (loadBackdrop) loadBackdrop.classList.remove("open");
    if (loadSheet) loadSheet.classList.remove("open");
  }

  if (btnCloseLoadSheet) btnCloseLoadSheet.addEventListener("click", closeLoadSheet);
  if (loadSheetHandle) loadSheetHandle.addEventListener("click", closeLoadSheet);
  if (loadBackdrop) loadBackdrop.addEventListener("click", closeLoadSheet);
  if (btnOpenLoadModal) btnOpenLoadModal.addEventListener("click", () => openLoadSheet());
  if (btnQuickLoadHome) btnQuickLoadHome.addEventListener("click", () => openLoadSheet());

  // Confirm Load Action
  if (btnConfirmLoad) {
    btnConfirmLoad.addEventListener("click", () => {
      const slotId = loadFormState.selectedSlot;
      const name = (loadFoodName && loadFoodName.value.trim()) || "Loaded Meal Portion";
      const grams = loadFormState.grams;
      const thawTime = loadFormState.thawMinutes;
      const category = loadFormState.category;

      btnConfirmLoad.disabled = true;
      if (btnConfirmLoadText) {
        btnConfirmLoadText.textContent = `Rotating Carousel to Slot ${slotId}...`;
      }
      triggerHaptic([20, 40, 60]);

      setTimeout(() => {
        inventoryItems[slotId] = {
          name: name,
          category: category,
          weight: `${grams}g`,
          grams: grams,
          slot: slotId,
          thawTime: thawTime
        };

        closeLoadSheet();
        btnConfirmLoad.disabled = false;
        if (btnConfirmLoadText) {
          btnConfirmLoadText.textContent = `Store in Slot ${slotId} & Rotate Vault`;
        }

        renderInventory();
        showToast(`Slot ${slotId} loaded: ${name} • Calibrated to ${thawTime}m thaw`, ICONS.check);
        triggerHaptic([30, 20]);
      }, 550);
    });
  }

  // Initial Inventory Render
  renderInventory();

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
    if (thawStatusBadge) thawStatusBadge.textContent = "Transferring Slot " + appState.selectedSlot;
    if (sliderText) {
      sliderText.textContent = "THAWING IN PROGRESS";
      sliderText.style.opacity = "1";
    }

    showToast("Robotic Transfer: Staging to Drawer", ICONS.gear);

    setTimeout(() => {
      if (thawStatusBadge) thawStatusBadge.textContent = "Gentle Plate Thaw Active";

      let temp = -18.0;
      const target = 10.0;
      const tempTimer = setInterval(() => {
        temp += 1.0;
        if (temp >= target) {
          temp = target;
          clearInterval(tempTimer);
        }
        if (drawerTempDisplay) drawerTempDisplay.textContent = `${temp > 0 ? "+" : ""}${temp.toFixed(1)}°C`;
      }, 50);

      let pct = 0;
      const ringTimer = setInterval(() => {
        pct += 2;
        if (pct > 100) {
          pct = 100;
          clearInterval(ringTimer);
        }
        if (ringProgress) ringProgress.style.strokeDashoffset = `${200 - (200 * pct) / 100}`;
        if (ringPctText) ringPctText.textContent = `${pct}%`;
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
        if (drawerTempDisplay) drawerTempDisplay.textContent = "+3.0°C";
        if (thawStatusBadge) thawStatusBadge.textContent = "Safe-Hold Refrigerated (+3°C)";
        showToast("Safe-Hold active: holding at +3°C", ICONS.shield);
      } else {
        if (drawerTempDisplay) drawerTempDisplay.textContent = "+10.0°C";
        if (thawStatusBadge) thawStatusBadge.textContent = "Gentle Plate Thaw Active";
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
