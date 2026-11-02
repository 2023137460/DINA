/**
 * DINA "When's Dinner?" Interactive Calculator (v9.2)
 * Recalculated convective heat-transfer model (forced air at +10 °C, h ≈ 20 W/(m²·K))
 * Two-stage timeline: Active Thaw (+10 °C air until surface reads +4.0 °C) -> Equalization Hold (+3.0 °C)
 * Zero LaTeX, plain text units, calm editorial voice
 */

document.addEventListener("DOMContentLoaded", () => {
  // Recalculated Convective Thermal Model for 750 ml Container in +10 °C Forced Air
  // Q_thaw = m * (c_frozen*ΔT_sens1 + L_eff + c_thawed*ΔT_sens2)
  // q_dot ≈ h * A * ΔT_m (h ≈ 20 W/(m²·K), A ≈ 0.070 m², ΔT_m ≈ 10 K => ~14 W)
  const CATEGORIES = {
    salmon: {
      name: "Atlantic Salmon Fillet",
      base: 45,
      factor: 0.13,
      defaultGrams: 320,
      holdMinutes: 15,
      benefit: "Gentle low-temperature thaw preserves tender, flaky restaurant texture"
    },
    chicken: {
      name: "Organic Chicken Breast",
      base: 50,
      factor: 0.12,
      defaultGrams: 500,
      holdMinutes: 20,
      benefit: "Even circulating warmth with zero dry or rubbery microwave borders"
    },
    ribeye: {
      name: "Prime Angus Ribeye",
      base: 45,
      factor: 0.13,
      defaultGrams: 450,
      holdMinutes: 20,
      benefit: "Convective thaw preserves marbling, tenderness, and natural juices"
    },
    prawns: {
      name: "Wild Tiger Prawns",
      base: 35,
      factor: 0.12,
      defaultGrams: 250,
      holdMinutes: 10,
      benefit: "Crisp defrost preserving natural sweetness and firm bite"
    },
    vegetables: {
      name: "Fresh Garden Vegetables",
      base: 32,
      factor: 0.08,
      defaultGrams: 350,
      holdMinutes: 10,
      benefit: "Gentle warming keeps cellular structure and fresh crispness intact"
    },
    lasagna: {
      name: "Artisanal Lasagna Prep",
      base: 55,
      factor: 0.125,
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
