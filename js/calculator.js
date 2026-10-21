/**
 * DINA Interactive Thaw Calculator & Mobile OS Simulator
 * Real-time thermodynamic thaw estimation & interactive IoT dispatch simulation
 */

document.addEventListener("DOMContentLoaded", () => {
  // Meal Presets & Thermodynamic Parameters (Euro pricing for Portugal / EU)
  const meals = {
    steak: {
      name: "Prime Ribeye Steak",
      weight: "450g",
      peltierTimeMinutes: 85,
      roomTempMinutes: 360,
      slot: "02",
      takeoutCost: 26.00
    },
    salmon: {
      name: "Atlantic Salmon Fillet",
      weight: "320g",
      peltierTimeMinutes: 60,
      roomTempMinutes: 240,
      slot: "04",
      takeoutCost: 22.50
    },
    chicken: {
      name: "Organic Chicken Breast",
      weight: "500g",
      peltierTimeMinutes: 95,
      roomTempMinutes: 420,
      slot: "01",
      takeoutCost: 17.00
    },
    lasagna: {
      name: "Artisanal Lasagna Prep",
      weight: "650g",
      peltierTimeMinutes: 110,
      roomTempMinutes: 480,
      slot: "05",
      takeoutCost: 19.50
    },
    shrimp: {
      name: "Wild Tiger Prawns",
      weight: "300g",
      peltierTimeMinutes: 45,
      roomTempMinutes: 180,
      slot: "03",
      takeoutCost: 23.00
    }
  };

  let selectedMeal = "steak";
  let targetDinnerMinutes = 19 * 60 + 30; // 19:30 default (in minutes from midnight)

  // DOM Elements
  const mealButtons = document.querySelectorAll(".meal-pill-btn");
  const timeSlider = document.getElementById("dinnerTimeSlider");
  const dinnerTimeDisplay = document.getElementById("dinnerTimeDisplay");
  
  // Results
  const triggerTimeEl = document.getElementById("calcTriggerTime");
  const durationEl = document.getElementById("calcDuration");
  const savingsEl = document.getElementById("calcSavings");

  // Phone App Simulator DOM
  const appMealName = document.getElementById("appMealName");
  const appMealMeta = document.getElementById("appMealMeta");
  const appDrawerTemp = document.getElementById("appDrawerTemp");
  const appStatusText = document.getElementById("appStatusText");
  const appProgressBar = document.getElementById("appProgressRing");
  const triggerBtn = document.getElementById("simulateTriggerBtn");
  const phoneSlider = document.getElementById("phoneSlider");

  function formatMinutesToTime(totalMins) {
    let normalized = totalMins;
    if (normalized < 0) normalized += 24 * 60;
    const hrs = Math.floor(normalized / 60) % 24;
    const mins = Math.floor(normalized % 60);
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  }

  function recalculate() {
    const meal = meals[selectedMeal];
    const thawTime = meal.peltierTimeMinutes;
    const triggerMinutes = targetDinnerMinutes - thawTime;

    dinnerTimeDisplay.textContent = formatMinutesToTime(targetDinnerMinutes);
    triggerTimeEl.textContent = formatMinutesToTime(triggerMinutes);
    durationEl.textContent = `${thawTime} min`;
    savingsEl.textContent = `€${meal.takeoutCost.toFixed(2)}`;

    // Update phone screen UI
    if (appMealName) appMealName.textContent = meal.name;
    if (appMealMeta) appMealMeta.textContent = `${meal.weight} • Vault Slot ${meal.slot}`;
  }

  // Meal selection clicks
  mealButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      mealButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedMeal = btn.dataset.meal;
      recalculate();
    });
  });

  // Slider change
  if (timeSlider) {
    timeSlider.addEventListener("input", (e) => {
      targetDinnerMinutes = parseInt(e.target.value, 10);
      recalculate();
    });
  }

  // IoT Simulation Trigger
  let isSimulating = false;
  function triggerSimulation() {
    if (isSimulating) return;
    isSimulating = true;

    const meal = meals[selectedMeal];
    triggerBtn.disabled = true;
    triggerBtn.innerHTML = `
      <svg class="spin-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
      </svg>
      Sending Cloud Command...
    `;

    appStatusText.textContent = `Staging Slot ${meal.slot} • Moving to Thaw Drawer`;
    appStatusText.style.color = "var(--accent-warm-light)";

    setTimeout(() => {
      triggerBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Active Thaw in Progress</span>
      `;
      triggerBtn.style.background = "linear-gradient(180deg, #1f4228 0%, #15301c 100%)";
      triggerBtn.style.borderColor = "var(--accent-green)";
      triggerBtn.style.color = "var(--accent-green)";

      appStatusText.textContent = `Active Thaw • Ready at ${formatMinutesToTime(targetDinnerMinutes)}`;
      appStatusText.style.color = "var(--accent-warm)";
      
      // Animate temperature from -18°C up to +10°C
      let currentTemp = -18.0;
      const targetTemp = 10.0;
      const tempStep = 1.0;
      
      const tempInterval = setInterval(() => {
        currentTemp += tempStep;
        if (currentTemp >= targetTemp) {
          currentTemp = targetTemp;
          clearInterval(tempInterval);
        }
        appDrawerTemp.textContent = `${currentTemp > 0 ? "+" : ""}${currentTemp.toFixed(1)}°C`;
        appDrawerTemp.style.color = currentTemp > 0 ? "var(--accent-warm-light)" : "#ffffff";
      }, 50);

      // Reset after 8 seconds
      setTimeout(() => {
        triggerBtn.disabled = false;
        triggerBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          <span>Simulate 1-Tap Cloud Trigger</span>
        `;
        triggerBtn.style.background = "";
        triggerBtn.style.borderColor = "";
        triggerBtn.style.color = "";
        appStatusText.textContent = "Standby • Connected to Matter";
        appStatusText.style.color = "var(--accent-green)";
        appDrawerTemp.textContent = "-18.0°C";
        appDrawerTemp.style.color = "var(--accent-warm-light)";
        isSimulating = false;
      }, 7000);

    }, 1200);
  }

  if (triggerBtn) {
    triggerBtn.addEventListener("click", triggerSimulation);
  }

  if (phoneSlider) {
    phoneSlider.addEventListener("click", triggerSimulation);
  }

  // Initial calculation
  recalculate();
});
