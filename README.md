# DINA — Defrosting Is Now Automatic

> "Dinner, scheduled."

DINA is an upright smart companion freezer (60 cm standard kitchen width) that stores 11 prepped meals at -18 °C, gently thaws tonight's dish while you finish work, and holds it fridge-fresh at +3.0 °C until you walk into the kitchen.

This repository contains the complete buyer-facing product website and the interactive Mobile App Demo, optimized for instantaneous deployment on GitHub Pages.

---

## Live Demo & Pages

- **Main Store & Landing Page**: [`index.html`](index.html) — Quiet editorial product showcase designed with the `design-taste-frontend` skill (split-stage direction), live "When's dinner?" thermodynamic calculator, and launch reservation list.
- **Interactive Mobile App Demo**: [`app.html`](app.html) — Mobile companion app simulator featuring touch-first gestures, tactile slide-to-thaw, live temperature telemetry, meal inventory explorer, and dynamic notifications.

---

## Core Value Propositions

1. **Chef-Grade Flavor & Tenderness**:
   - Replaces the "gray rubber boot" microwave defrost with gentle, convective air thawing.
   - Cellular membranes stay intact; moisture, tenderness, and natural juices are preserved.

2. **Effortless Weekly Routine**:
   - **Load on Sunday**: Store 11 prepped meals in the revolving carousel drum, keeping 110 L of classic freezer shelves above.
   - **Check-In at 15:00**: Quick notification on your phone: confirm tonight's dish, swap meals, or let your default dinner plan run.
   - **Walk In & Sear**: Arrive home at 19:30 to an evenly thawed meal chilled at +3.0 °C, ready to cook.

3. **Commute & Traffic Delay Guard**:
   - If traffic delays your evening commute, your phone tells DINA to keep dinner safely chilled at +3.0 °C without sharing live location to external servers.

4. **Two Thermally Isolated Zones**:
   - Grab tonight's dinner from the independent lower defrost drawer without opening the main freezer door, keeping frozen groceries locked at -18 °C.

5. **No Subscription**:
   - Core companion app features (scheduling, commute sync, smart home Matter over Wi-Fi integration) are free with zero monthly fees.

---

## Directory Structure

```text
Site/
├── index.html                   # Main customer-facing landing page (split-stage design)
├── app.html                     # Interactive Mobile App demo
├── css/
│   ├── tokens.css               # DINA brand design tokens
│   ├── site.css                 # Editorial website stylesheet
│   └── app.css                  # Mobile app touch & animation styles
├── js/
│   ├── main.js                  # Navigation, split-stage crossfade, waitlist form
│   ├── calculator.js            # "When's dinner?" PRD 4.1 thermodynamic calculator
│   └── app.js                   # Mobile app state, slide gestures & bottom sheet
├── assets/
│   ├── icons/                   # Animated line SVG icon suite
│   ├── icons-static/            # Static icon fallbacks
│   └── images/                  # High-definition authentic 3D product photography
├── .github/
│   └── workflows/
│       └── deploy.yml           # Automated GitHub Pages CI/CD workflow
├── manifest.json                # PWA manifest
├── sw.js                        # Service worker (v9.0)
└── README.md
```

---

## How to Deploy to GitHub Pages

### Option A: Automated via GitHub Actions
1. Push this folder to a GitHub repository.
2. In GitHub, navigate to **Settings** -> **Pages**.
3. Under **Build and deployment** -> **Source**, select **GitHub Actions**.
4. The included workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) will deploy the site live.

### Option B: Deploy from Branch
1. Navigate to **Settings** -> **Pages**.
2. Select **Deploy from a branch** -> Branch: `main` -> Folder: `/ (root)`.
3. Save to publish.
