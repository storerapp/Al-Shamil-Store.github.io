(() => {
  "use strict";

  const prizes = {
    73: { rank: "الجائزة الكبرى", title: "سنة كاملة", duration: "اشتراك سيرفر مجاني لمدة 12 شهرًا", code: "SHAMIL-1Y-73", theme: "gold" },
    46: { rank: "الجائزة الثانية", title: "6 أشهر", duration: "اشتراك سيرفر مجاني لمدة 6 أشهر", code: "SHAMIL-6M-46", theme: "magenta" },
    19: { rank: "الجائزة الثالثة", title: "3 أشهر", duration: "اشتراك سيرفر مجاني لمدة 3 أشهر", code: "SHAMIL-3M-19", theme: "blue" }
  };
  const storageKey = "al-shamil-contest-choice-v3";
  const $ = (id) => document.getElementById(id);
  const audio = $("music");
  const musicButton = $("musicButton");
  let musicDisabled = false;
  let selected = Number(localStorage.getItem(storageKey));
  if (!(selected >= 1 && selected <= 100)) selected = null;

  const particles = $("particles");
  for (let i = 0; i < 28; i += 1) {
    const particle = document.createElement("i");
    particle.className = "particle";
    particle.style.cssText = `left:${(i * 43) % 100}%;top:${(i * 29) % 100}%;width:${2 + (i % 4)}px;height:${2 + (i % 4)}px;animation-delay:${(i % 9) * -0.7}s;animation-duration:${5 + (i % 8)}s`;
    particles.appendChild(particle);
  }

  function setMusicState(playing) {
    musicButton.classList.toggle("is-playing", playing);
    musicButton.setAttribute("aria-label", playing ? "إيقاف الموسيقى" : "تشغيل الموسيقى");
    $("musicTitle").textContent = playing ? "الموسيقى تعمل" : "تشغيل الموسيقى";
    $("musicHint").textContent = playing ? "اضغط للإيقاف" : "اضغط للتشغيل";
  }

  async function playMusic() {
    if (musicDisabled) return;
    audio.volume = 0.34;
    try { await audio.play(); setMusicState(true); } catch (_) { setMusicState(false); }
  }

  musicButton.addEventListener("click", async () => {
    if (audio.paused) { musicDisabled = false; await playMusic(); }
    else { musicDisabled = true; audio.pause(); setMusicState(false); }
  });
  audio.addEventListener("play", () => setMusicState(true));
  audio.addEventListener("pause", () => setMusicState(false));

  const unlock = () => { playMusic(); removeUnlock(); };
  function removeUnlock() {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  }
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
  window.addEventListener("touchstart", unlock, { passive: true });
  playMusic();
  [250, 900, 1800].forEach((delay) => setTimeout(playMusic, delay));
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") playMusic(); });

  const vault = $("gateVault");
  for (let gate = 1; gate <= 100; gate += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "door";
    button.setAttribute("aria-label", `اختيار البوابة ${gate}`);
    button.innerHTML = `<span class="door-top">SH</span><b>${String(gate).padStart(2, "0")}</b><i class="door-handle"></i>`;
    button.addEventListener("click", () => chooseGate(gate));
    vault.appendChild(button);
  }

  function updateGates() {
    const doors = [...vault.querySelectorAll(".door")];
    vault.classList.toggle("locked", selected !== null);
    doors.forEach((door, index) => {
      const gate = index + 1;
      door.classList.toggle("selected", selected === gate);
      door.disabled = selected !== null && selected !== gate;
    });
    if (selected !== null) {
      $("gateKicker").textContent = "تم اعتماد اختيارك";
      $("gateTitle").textContent = `بوابتك رقم ${String(selected).padStart(2, "0")}`;
      $("attemptState").classList.add("done");
      $("attemptState").querySelector("span").textContent = "تم استخدام المحاولة";
      $("showResult").classList.remove("hidden");
    }
  }

  function chooseGate(gate) {
    if (selected === null) {
      selected = gate;
      localStorage.setItem(storageKey, String(gate));
      updateGates();
    }
    openResult();
  }

  function makeConfetti() {
    const container = $("confetti");
    container.replaceChildren();
    const colors = ["#ffd45c", "#ff4dc4", "#51e4ff", "#8c63ff", "#61f49f", "#ff794d"];
    for (let i = 0; i < 110; i += 1) {
      const piece = document.createElement("i");
      piece.style.cssText = `left:${(i * 47) % 100}%;background:${colors[i % colors.length]};animation-delay:${(i % 18) * 0.07}s;animation-duration:${2.6 + (i % 7) * 0.2}s`;
      container.appendChild(piece);
    }
  }

  function openResult() {
    if (selected === null) return;
    const prize = prizes[selected];
    const panel = $("resultPanel");
    panel.className = `result-panel ${prize ? `winner ${prize.theme}` : "not-winner"}`;
    $("resultIcon").textContent = prize ? "★" : "✦";
    $("resultNumber").textContent = `نتيجة البوابة ${String(selected).padStart(2, "0")}`;
    $("resultTitle").textContent = prize ? "مبروك… البوابة لك!" : "كانت تجربة جميلة";
    $("confetti").classList.toggle("hidden", !prize);
    if (prize) {
      makeConfetti();
      audio.volume = 0.5;
      $("resultContent").innerHTML = `<div class="won-rank">${prize.rank}</div><h3>${prize.title}</h3><p>${prize.duration}</p><div class="code-ticket"><span>كود الفوز الخاص بك</span><b>${prize.code}</b><small>احتفظ بصورة لهذه الشاشة</small></div>`;
    } else {
      $("resultContent").innerHTML = `<p>هذه البوابة لا تخفي أحد الأكواد الفائزة. تم تثبيت اختيارك، ونتمنى لك حظًا أجمل في مسابقات متجر الشامل القادمة.</p><div class="locked-note">تم إغلاق بقية البوابات بعد اختيارك</div>`;
    }
    $("resultOverlay").classList.remove("hidden");
    document.body.classList.add("modal-open");
  }

  function closeResult() {
    $("resultOverlay").classList.add("hidden");
    document.body.classList.remove("modal-open");
    audio.volume = 0.34;
  }
  $("showResult").addEventListener("click", openResult);
  $("resultClose").addEventListener("click", closeResult);
  $("resultAction").addEventListener("click", closeResult);
  $("resultOverlay").addEventListener("click", (event) => { if (event.target === $("resultOverlay")) closeResult(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeResult(); });

  updateGates();
  setTimeout(() => $("boot").remove(), 1550);
})();
