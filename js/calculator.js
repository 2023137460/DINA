/**
 * DINA "When's Dinner?" Interactive Calculator (v9.0)
 * Customer-centric, appetizing, and based strictly on PRD Section 4.1 thermodynamic formulas
 * Zero emojis, calm editorial voice
 */

document.addEventListener("DOMContentLoaded", () => {
  // PRD 4.1 Thermodynamic Formulas: Base Time + (Factor * Weight in grams)
  const CATEGORIES = {
    salmon: {
      name: "Atlantic Salmon Fillet",
      base: 20,
      factor: 0.14,
      defaultGrams: 320,
      benefit: "Delicate low-temperature thaw preserves tender, flaky restaurant texture"
    },
    chicken: {
      name: "Organic Chicken Breast",
      base: 30,
      factor: 0.13,
      defaultGrams: 500,
      benefit: "Even circulating warmth with zero dry or rubbery microwave borders"
    },
    ribeye: {
      name: "Prime Angus Ribeye",
      base: 25,
      factor: 0.13,
      defaultGrams: 450,
      benefit: "Gentle convective thaw locks in marbling, tenderness, and natural savory juices"
    },
    prawns: {
      name: "Wild Tiger Prawns",
      base: 15,
      factor: 0.10,
      defaultGrams: 250,
      benefit: "Quick, crisp defrost preserving natural sweetness and firm bite"
    },
    vegetables: {
      name: "Fresh Garden Vegetables",
      base: 15,
      factor: 0.08,
      defaultGrams: 350,
      benefit: "Gentle warming keeps cellular structure and fresh crispness intact"
    },
    lasagna: {
      name: "Artisanal Lasagna Prep",
      base: 35,
      factor: 0.115,
      defaultGrams: 600,
      benefit: "Even heat distribution through every savory, cheesy layer"
    }
  };

  let currentCategory = "salmon";
  let currentWeight = 320;
  let targetDinnerMinutes = 19 * 60 + 30; // 19:30

  const mealChips = document.querySelectorAll(".calc-meal-chip");
  const timeInput = document.getElementById("calcTimeInput");
  const weightSelect = document.getElementById("calcWeightSelect");

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
    const thawMinutes = Math.round(config.base + (config.factor * currentWeight));
    const dropMinutes = targetDinnerMinutes - thawMinutes;

    const dropTimeStr = formatTime(dropMinutes);
    const dinnerTimeStr = formatTime(targetDinnerMinutes);

    if (resultSentence) {
      resultSentence.textContent = `Tonight's ${config.name} (${currentWeight} g): DINA drops it into the drawer at ${dropTimeStr} and holds it fridge-fresh at +3.0 °C at ${dinnerTimeStr}.`;
    }

    if (resultMeta) {
      resultMeta.textContent = `${config.benefit} · ${thawMinutes} min gentle thaw.`;
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
