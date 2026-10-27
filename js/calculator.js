/**
 * DINA Thermodynamic Thaw Calculator
 * Strictly follows PRD 3.0.0 Section 4.1 formulas
 * Zero emojis, calm editorial voice
 */

document.addEventListener("DOMContentLoaded", () => {
  // PRD 4.1 Thermodynamic Formulas
  const CATEGORIES = {
    beef: { name: "Prime Angus Beef Ribeye (Carne)", base: 25, factor: 0.13, defaultGrams: 450 },
    chicken: { name: "Organic Chicken Breast", base: 30, factor: 0.13, defaultGrams: 500 },
    fish: { name: "Atlantic Salmon Fillet (Peixe)", base: 20, factor: 0.14, defaultGrams: 320 },
    shrimp: { name: "Wild Tiger Prawns", base: 15, factor: 0.10, defaultGrams: 250 },
    vegetables: { name: "Steamed Vegetables / Sides (Vegetais)", base: 15, factor: 0.08, defaultGrams: 350 },
    lasagna: { name: "Artisanal Lasagna Prep", base: 35, factor: 0.115, defaultGrams: 600 }
  };

  let currentCategory = "beef";
  let currentWeight = 450;
  let targetDinnerMinutes = 19 * 60 + 30; // 19:30

  // Elements
  const chipButtons = document.querySelectorAll(".calc-chip-btn");
  const weightSlider = document.getElementById("calcWeightSlider");
  const weightValDisplay = document.getElementById("calcWeightDisplay");
  const timeSlider = document.getElementById("calcTimeSlider");
  const timeValDisplay = document.getElementById("calcTimeDisplay");

  const thawDurationDisplay = document.getElementById("calcThawDuration");
  const dropTriggerDisplay = document.getElementById("calcDropTrigger");
  const formulaCaption = document.getElementById("calcFormulaCaption");

  function formatMinutes(totalMins) {
    let normalized = totalMins;
    if (normalized < 0) normalized += 24 * 60;
    const h = Math.floor(normalized / 60) % 24;
    const m = Math.floor(normalized % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  function recalculate() {
    const config = CATEGORIES[currentCategory] || CATEGORIES.beef;
    // PRD formula: Base Time + (Factor * Weight)
    const thawMins = Math.round(config.base + (config.factor * currentWeight));
    const triggerMins = targetDinnerMinutes - thawMins;

    if (thawDurationDisplay) {
      thawDurationDisplay.textContent = `${thawMins} min`;
    }
    if (dropTriggerDisplay) {
      dropTriggerDisplay.textContent = formatMinutes(triggerMins);
    }
    if (formulaCaption) {
      formulaCaption.textContent = `${config.base} min base + (${config.factor} min/g \u00d7 ${currentWeight} g) = ${thawMins} min convective thaw`;
    }
  }

  chipButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      chipButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.dataset.cat;
      const catData = CATEGORIES[currentCategory];
      if (catData && weightSlider) {
        currentWeight = catData.defaultGrams;
        weightSlider.value = currentWeight;
        if (weightValDisplay) weightValDisplay.textContent = `${currentWeight} g`;
      }
      recalculate();
    });
  });

  if (weightSlider) {
    weightSlider.addEventListener("input", (e) => {
      currentWeight = parseInt(e.target.value, 10);
      if (weightValDisplay) weightValDisplay.textContent = `${currentWeight} g`;
      recalculate();
    });
  }

  if (timeSlider) {
    timeSlider.addEventListener("input", (e) => {
      targetDinnerMinutes = parseInt(e.target.value, 10);
      if (timeValDisplay) timeValDisplay.textContent = formatMinutes(targetDinnerMinutes);
      recalculate();
    });
  }

  // Initial calculation
  recalculate();
});
