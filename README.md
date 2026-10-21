# DINA — Defrost Is Now Automatic ❄️➔🔥

> *"Never come home to a frozen dinner again."*

**DINA** is the world's first smart companion freezer that brings dinner from deep freeze ($-18^\circ\text{C}$) to gentle, chef-grade thaw ($+10^\circ\text{C}$) with a single tap from your phone.

This repository contains the complete **buyer-focused SaaS & consumer hardware website** and the interactive **Mobile App Demo**, optimized for instantaneous deployment on **GitHub Pages**.

---

## 🚀 Live Demo & Pages

- **Main Store & Landing Page**: [`index.html`](index.html) — Consumer-first product showcase, everyday lifestyle routine, savings calculator, customer stories, and pre-order reservation.
- **Interactive Mobile App Demo**: [`app.html`](app.html) — Emil Kowalski inspired mobile companion app simulator. Features touch-first gestures, tactile slide-to-thaw, live temperature telemetry, meal inventory explorer, and dynamic island notifications.

---

## 🌟 Buyer-Focused Value Propositions

1. **Chef-Grade Flavor & Tenderness**:
   - Replaces the "gray rubber boot" microwave defrost with gentle, solid-state stainless conduction plate thawing.
   - Cellular membranes stay intact; moisture, tenderness, and natural juices are preserved 100%.

2. **Effortless 3-Step Daily Routine**:
   - **Load on Sunday**: Store 8 prepped meals or vacuum-sealed butcher cuts in the rotating vault.
   - **Tap at 4:30 PM from Work**: Pick tonight's dinner on your smartphone. DINA begins thawing right on cue.
   - **Walk In, Sear & Enjoy**: Arrive home at 7:00 PM to a perfectly thawed, tender meal ready to cook in 15 minutes.

3. **Commute & Traffic Delay Guard**:
   - If traffic delays your evening commute, DINA automatically cools down to a $+3^\circ\text{C}$ holding refrigerator so your dinner stays fresh and food-safe for hours.

4. **Massive Takeout Savings**:
   - Eliminates emergency $35 delivery apps. Saves the average household over **$2,100/year**.

5. **Customer Confidence**:
   - 30-Day Risk-Free In-Home Trial (100% money-back guarantee).
   - 2-Year Comprehensive Hardware Warranty.
   - Free White-Glove Curbside Delivery.

---

## 📱 Interactive Mobile App (`app.html`) Highlights

Built with **Emil Kowalski's Design Engineering** principles:
- **Touch-First Thumb Zone**: Minimum 48px touch targets located in the lower ergonomic reach area.
- **Tactile Gesture Physics**: Custom spring easing curves (`cubic-bezier(0.23, 1, 0.32, 1)` and `--ease-drawer`), boundary damping, and velocity-based triggers on the "Slide to Thaw" handle.
- **Sensory & Haptic Feedback**: `navigator.vibrate` integration, visual tactile compression (`scale(0.97)` on press), and Sonner-style animated status toasts.
- **Dual-Zone Telemetry**: Live temperature gauges animating smoothly between $-18^\circ\text{C}$ deep freeze and $+10^\circ\text{C}$ thaw.
- **Device Frame Switcher**: On desktop, toggle between iPhone, Android, and Fullscreen views; on mobile devices, seamlessly renders in full-screen touch mode.

---

## 📦 Directory Structure

```text
Site/
├── index.html                   # Main customer-facing landing page
├── app.html                     # Interactive Mobile App demo (Emil design system)
├── css/
│   ├── styles.css               # Consumer SaaS design system
│   └── app.css                  # Mobile app touch & animation styles
├── js/
│   ├── main.js                  # Navigation, modals, FAQ, lightbox
│   ├── calculator.js            # Thaw schedule & takeout savings calculator
│   └── app.js                   # Mobile app state, slide gestures & bottom sheet
├── assets/
│   └── images/                  # High-definition 3D product renders
├── .github/
│   └── workflows/
│       └── deploy.yml           # Automated GitHub Pages CI/CD workflow
├── .gitignore
└── README.md
```

---

## 🌐 How to Deploy to GitHub Pages

### Option A: Automated via GitHub Actions
1. Push this folder to a GitHub repository (e.g. `your-username/dina-website`).
2. In GitHub, navigate to **Settings** ➔ **Pages**.
3. Under **Build and deployment** ➔ **Source**, select **GitHub Actions**.
4. The included workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) will deploy the site live to `https://your-username.github.io/dina-website/`.

### Option B: Deploy from Branch
1. Navigate to **Settings** ➔ **Pages**.
2. Select **Deploy from a branch** ➔ Branch: `main` ➔ Folder: `/ (root)`.
3. Save to publish.

---

## 💻 Local Preview

Run any static server from the project directory:

```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve .
```

Open your browser to `http://localhost:8000`.
