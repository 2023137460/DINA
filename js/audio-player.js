/**
 * DINA Promo Audio Player & Live Storyboard Synchronizer
 * Handles real-time playback, audio scrubber, waveform visualization,
 * and synchronized storyboard subtitles based on the 33-second voiceover.
 */

document.addEventListener("DOMContentLoaded", () => {
  const audio = document.getElementById("dinaAudio");
  const playBtn = document.getElementById("playPromoBtn");
  const playIcon = document.getElementById("playIcon");
  const heroAudioTrigger = document.getElementById("heroAudioTrigger");
  const navAudioTrigger = document.getElementById("navAudioTrigger");
  const progressFill = document.getElementById("audioProgressFill");
  const progressBar = document.getElementById("audioProgressBar");
  const currentTimeEl = document.getElementById("audioCurrentTime");
  const totalDurationEl = document.getElementById("audioTotalDuration");
  const waveformWrap = document.getElementById("waveformBars");
  const consoleCard = document.getElementById("audioConsole");
  const storyCards = document.querySelectorAll(".story-card");

  if (!audio) return;

  // Exact scene timestamps from the voiceover
  const scenes = [
    { id: "scene1", start: 0, end: 6.8, title: "The Office Panic" },
    { id: "scene2", start: 6.8, end: 18.5, title: "The Broken Workarounds" },
    { id: "scene3", start: 18.5, end: 26.8, title: "Presenting DINA" },
    { id: "scene4", start: 26.8, end: 34.0, title: "Dinner, Handled" }
  ];

  // Generate 48 procedural waveform bars
  if (waveformWrap) {
    waveformWrap.innerHTML = "";
    const barCount = 48;
    for (let i = 0; i < barCount; i++) {
      const bar = document.createElement("div");
      bar.className = "wave-bar";
      // Natural speech-like waveform distribution
      const baseHeight = 15 + Math.sin((i / barCount) * Math.PI) * 55 + (Math.random() * 20);
      bar.style.height = `${Math.min(95, Math.max(15, baseHeight))}%`;
      waveformWrap.appendChild(bar);
    }
  }

  const waveBars = document.querySelectorAll(".wave-bar");

  // Format seconds to mm:ss
  function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }

  // Update total duration once metadata is loaded
  audio.addEventListener("loadedmetadata", () => {
    totalDurationEl.textContent = formatTime(audio.duration);
  });

  // Toggle Play / Pause
  function togglePlay() {
    if (audio.paused) {
      audio.play().then(() => {
        updatePlayState(true);
      }).catch(err => {
        console.warn("Audio playback prevented:", err);
      });
    } else {
      audio.pause();
      updatePlayState(false);
    }
  }

  function updatePlayState(isPlaying) {
    if (isPlaying) {
      playIcon.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
      consoleCard.classList.add("audio-playing");
    } else {
      playIcon.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
      consoleCard.classList.remove("audio-playing");
    }
  }

  playBtn.addEventListener("click", togglePlay);

  if (heroAudioTrigger) {
    heroAudioTrigger.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("promo-audio").scrollIntoView({ behavior: "smooth" });
      if (audio.paused) {
        setTimeout(() => {
          audio.play().then(() => updatePlayState(true));
        }, 500);
      }
    });
  }

  if (navAudioTrigger) {
    navAudioTrigger.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("promo-audio").scrollIntoView({ behavior: "smooth" });
      if (audio.paused) {
        setTimeout(() => {
          audio.play().then(() => updatePlayState(true));
        }, 500);
      }
    });
  }

  // Update Progress & Synchronize Scenes
  audio.addEventListener("timeupdate", () => {
    const current = audio.currentTime;
    const duration = audio.duration || 33.5;
    const pct = (current / duration) * 100;

    progressFill.style.width = `${pct}%`;
    currentTimeEl.textContent = formatTime(current);

    // Waveform illumination progress
    if (waveBars.length > 0) {
      const activeBarIndex = Math.floor((current / duration) * waveBars.length);
      waveBars.forEach((b, idx) => {
        if (idx <= activeBarIndex) {
          b.style.backgroundColor = "var(--cyan-primary)";
        } else {
          b.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
        }
      });
    }

    // Active Storyboard Card Highlighting
    scenes.forEach(scene => {
      const card = document.getElementById(scene.id);
      if (card) {
        if (current >= scene.start && current < scene.end) {
          if (!card.classList.contains("active-scene")) {
            storyCards.forEach(c => c.classList.remove("active-scene"));
            card.classList.add("active-scene");
          }
        }
      }
    });
  });

  // End of audio playback
  audio.addEventListener("ended", () => {
    updatePlayState(false);
    progressFill.style.width = "0%";
    currentTimeEl.textContent = "0:00";
    storyCards.forEach(c => c.classList.remove("active-scene"));
  });

  // Seek bar scrub
  progressBar.addEventListener("click", (e) => {
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const duration = audio.duration || 33.5;
    const seekTime = (clickX / width) * duration;
    audio.currentTime = seekTime;
    if (audio.paused) {
      audio.play().then(() => updatePlayState(true));
    }
  });

  // Clicking a storyboard card jumps straight to that scene!
  storyCards.forEach(card => {
    card.addEventListener("click", () => {
      const timestamp = parseFloat(card.dataset.start);
      if (!isNaN(timestamp)) {
        audio.currentTime = timestamp;
        if (audio.paused) {
          audio.play().then(() => updatePlayState(true));
        }
        storyCards.forEach(c => c.classList.remove("active-scene"));
        card.classList.add("active-scene");
      }
    });
  });
});
