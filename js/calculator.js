/**
 * DINA "When's Dinner?" Interactive Calculator (v9.3)
 * Physically validated convective heat-transfer model (forced air at +10.0 °C, h ≈ 24 W/(m²·K), shallow 750 ml container)
 * Four-stage timeline: Frozen (-18.0 °C) -> Active Thaw (+10.0 °C air until surface reads +4.0 °C) -> Equalization Hold (+3.0 °C) -> Ready to Cook (+3.0 °C)
 * Zero LaTeX, plain text units, calm editorial voice
 */

document.addEventListener("DOMContentLoaded", () => {
  // Modified Plank-Type Convective Model for Shallow 750 ml Container (210x130x28mm, A_tot ≈ 0.074 m²)
  // Air setpoint: +10.0 °C forced air crossflow. Delivered heat transfer: ~18–22 W.
  // Surface sensor limit: ≤ +4.0 °C (±0.5 °C deadband). Core equalizes at +3.0 °C.
  const CATEGORIES = {
    salmon: {
      name: "Atlantic Salmon Fillet",
      base: 25,
      factor: 0.125, // 320g => 65 min active thaw
      defaultGrams: 320,
      holdMinutes: 15,
      benefit: "Gentle low-temperature thaw preserves tender, flaky restaurant texture"
    },
    chicken: {
      name: "Organic Chicken Breast",
      base: 30,
      factor: 0.130, // 500g => 95 min active thaw
      defaultGrams: 500,
      holdMinutes: 20,
      benefit: "Even circulating warmth with zero dry or rubbery microwave borders"
    },
    ribeye: {
      name: "Prime Angus Ribeye",
      base: 26,
      factor: 0.131, // 450g => 85 min active thaw
      defaultGrams: 450,
      holdMinutes: 20,
      benefit: "Convective thaw preserves marbling, tenderness, and natural juices"
    },
    prawns: {
      name: "Wild Tiger Prawns",
      base: 15,
      factor: 0.100, // 250g => 40 min active thaw
      defaultGrams: 250,
      holdMinutes: 10,
      benefit: "Crisp defrost preserving natural sweetness and firm bite"
    },
    vegetables: {
      name: "Fresh Garden Vegetables",
      base: 15,
      factor: 0.080, // 350g => 43 min active thaw
      defaultGrams: 350,
      holdMinutes: 10,
      benefit: "Gentle warming keeps cellular structure and fresh crispness intact"
    },
    lasagna: {
      name: "Artisanal Lasagna Prep",
      base: 35,
      factor: 0.115, // 600g => 104 min active thaw
      defaultGrams: 600,
      holdMinutes: 25,
      benefit: "Even heat distribution through every savory, cheesy layer"
    }
  };

  let currentCategory = "salmon";
  let currentWeight = 320;
  let targetDinnerMinutes = 19 * 60 + 30; // 19:30

  const mealChips = document.querySelectorAll(".calc-meal-chip");
  const timeInput = document.getElementById("calcTimeInput");
  const weightSelect = document.getElementById("calcWeightSelect");

  const calcDropTime = document.getElementById("calcDropTime");
  const calcActiveTime = document.getElementById("calcActiveTime");
  const calcHoldTime = document.getElementById("calcHoldTime");
  const calcDinnerTime = document.getElementById("calcDinnerTime");
  const calcThawDuration = document.getElementById("calcThawDuration");
  const resultSentence = document.getElementById("calcResultSentence");
  const resultMeta = document.getElementById("calcResultMeta");

  function formatTime(totalMins) {
    let normalized = totalMins;
    while (normalized < 0) normalized += 24 * 60;
    while (normalized >= 24 * 60) normalized -= 24 * 60;
    const h = Math.floor(normalized / 60);
    const m = Math.floor(normalized % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  function updateOutput() {
    const config = CATEGORIES[currentCategory] || CATEGORIES.salmon;
    const activeThawMinutes = Math.round(config.base + (config.factor * currentWeight));
    const holdMinutes = config.holdMinutes || 15;
    const totalCycleMinutes = activeThawMinutes + holdMinutes;

    const dropMinutes = targetDinnerMinutes - totalCycleMinutes;
    const cutoffMinutes = dropMinutes + activeThawMinutes;

    const dropTimeStr = formatTime(dropMinutes);
    const cutoffTimeStr = formatTime(cutoffMinutes);
    const dinnerTimeStr = formatTime(targetDinnerMinutes);

    if (calcDropTime) calcDropTime.textContent = dropTimeStr;
    if (calcActiveTime) calcActiveTime.textContent = `${dropTimeStr} – ${cutoffTimeStr}`;
    if (calcHoldTime) calcHoldTime.textContent = `${cutoffTimeStr} – ${dinnerTimeStr}`;
    if (calcDinnerTime) calcDinnerTime.textContent = dinnerTimeStr;
    if (calcThawDuration) calcThawDuration.textContent = String(activeThawMinutes);

    if (resultSentence) {
      resultSentence.textContent = `Tonight's ${config.name} (${currentWeight} g): DINA drops the container at ${dropTimeStr}, runs active thaw (+10 °C air) for ${activeThawMinutes} min until surface reaches +4.0 °C (${cutoffTimeStr}), then holds at +3.0 °C until ${dinnerTimeStr}.`;
    }

    if (resultMeta) {
      resultMeta.textContent = `${config.benefit} · ${activeThawMinutes} min active thaw (+10 °C air until +4.0 °C surface cutoff), followed by ${holdMinutes} min conduction equalization at +3.0 °C.`;
    }
  }

  mealChips.forEach(chip => {
    chip.addEventListener("click", () => {
      mealChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentCategory = chip.dataset.cat;
      const config = CATEGORIES[currentCategory];
      if (config) {
        currentWeight = config.defaultGrams;
        if (weightSelect) {
          weightSelect.value = String(currentWeight);
        }
      }
      updateOutput();
    });
  });

  if (timeInput) {
    timeInput.addEventListener("change", (e) => {
      const val = e.target.value;
      if (val && val.includes(":")) {
        const [h, m] = val.split(":").map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          targetDinnerMinutes = (h * 60) + m;
          updateOutput();
        }
      }
    });
  }

  if (weightSelect) {
    weightSelect.addEventListener("change", (e) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val)) {
        currentWeight = val;
        updateOutput();
      }
    });
  }

  // Initial calculation
  updateOutput();
});
