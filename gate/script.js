(() => {
  "use strict";

  const prizes = {
    47: { rank: "الجائزة الكبرى", title: "سنة كاملة", duration: "اشتراك سيرفر مجاني لمدة 12 شهرًا", code: "SHAMIL-1Y-47", theme: "gold" },
    26: { rank: "الجائزة الثانية", title: "6 أشهر", duration: "اشتراك سيرفر مجاني لمدة 6 أشهر", code: "SHAMIL-6M-26", theme: "magenta" },
    9: { rank: "الجائزة الثالثة", title: "3 أشهر", duration: "اشتراك سيرفر مجاني لمدة 3 أشهر", code: "SHAMIL-3M-09", theme: "blue" }
  };

  const storageKey = "al-shamil-contest-choice-v4-60";
  const $ = (id) => document.getElementById(id);
  const audio = $("music");
  const musicButton = $("musicButton");
  let musicDisabled = false;
  let musicStarted = false;

  let selected = Number(localStorage.getItem(storageKey));
  if (!(selected >= 1 && selected <= 60)) selected = null;

  /* Fewer particles on touch devices. */
  const particles = $("particles");
  const particleCount = matchMedia("(max-width: 560px)").matches ? 8 : 18;
  for (let i = 0; i < particleCount; i += 1) {
    const particle = document.createElement("i");
    particle.className = "particle";
    particle.style.cssText =
      `left:${(i * 43) % 100}%;top:${(i * 29) % 100}%;` +
      `width:${2 + (i % 3)}px;height:${2 + (i % 3)}px;` +
      `animation-delay:${(i % 9) * -0.7}s;animation-duration:${7 + (i % 5)}s`;
    particles.appendChild(particle);
  }

  function setMusicState(playing) {
    musicButton.classList.toggle("is-playing", playing);
    musicButton.setAttribute("aria-label", playing ? "إيقاف الموسيقى" : "تشغيل الموسيقى");
    $("musicTitle").textContent = playing ? "الموسيقى تعمل" : "تشغيل الموسيقى";
    $("musicHint").textContent = playing ? "اضغط للإيقاف" : "اضغط للتشغيل";
  }

  async function playMusic() {
    if (musicDisabled || musicStarted) return;
    try {
      audio.volume = 0.34;
      await audio.play();
      musicStarted = true;
      setMusicState(true);
    } catch (_) {
      setMusicState(false);
    }
  }

  musicButton.addEventListener("click", async () => {
    if (audio.paused) {
      musicDisabled = false;
      musicStarted = false;
      await playMusic();
    } else {
      musicDisabled = true;
      audio.pause();
      musicStarted = false;
      setMusicState(false);
    }
  });

  audio.addEventListener("play", () => setMusicState(true));
  audio.addEventListener("pause", () => setMusicState(false));

  /* Enter first; audio is a secondary action and can never block the page. */
  const enterGate = $("enterGate");
  enterGate.addEventListener("click", () => {
    $("boot").classList.add("is-open");
    setTimeout(() => $("boot")?.remove(), 180);
    playMusic();
  });

  /* First real interaction can start music, without timers/retries. */
  const unlock = () => {
    playMusic();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  };
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
  window.addEventListener("touchstart", unlock, { passive: true });

  const vault = $("gateVault");
  for (let gate = 1; gate <= 60; gate += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "door";
    button.setAttribute("aria-label", `اختيار البوابة ${gate} من 60`);
    button.dataset.gateStyle = String((gate - 1) % 12 + 1);
    button.innerHTML = `<span class="door-top">SH</span><b>${String(gate).padStart(2, "0")}</b><i class="door-handle"></i><span class="door-glint" aria-hidden="true"></span>`;
    button.addEventListener("click", () => chooseGate(gate));
    vault.appendChild(button);
  }

  function updateGates() {
    const doors = vault.querySelectorAll(".door");
    vault.classList.toggle("locked", selected !== null);

    doors.forEach((door, index) => {
      const gate = index + 1;
      const isSelected = selected === gate;
      door.classList.toggle("selected", isSelected);
      door.disabled = selected !== null && !isSelected;
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
    if (selected !== null) return;
    selected = gate;
    localStorage.setItem(storageKey, String(gate));
    updateGates();
    openResult();
  }

  function makeConfetti() {
    const container = $("confetti");
    container.replaceChildren();

    const count = matchMedia("(max-width: 560px)").matches ? 35 : 70;
    const colors = ["#ffd45c", "#ff4dc4", "#51e4ff", "#8c63ff", "#61f49f", "#ff794d"];

    for (let i = 0; i < count; i += 1) {
      const piece = document.createElement("i");
      piece.style.cssText =
        `left:${(i * 47) % 100}%;background:${colors[i % colors.length]};` +
        `animation-delay:${(i % 18) * 0.07}s;animation-duration:${2.6 + (i % 7) * 0.2}s`;
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
      $("resultContent").innerHTML =
        `<div class="won-rank">${prize.rank}</div>` +
        `<h3>${prize.title}</h3>` +
        `<p>${prize.duration}</p>` +
        `<div class="code-ticket"><span>كود الفوز الخاص بك</span>` +
        `<b>${prize.code}</b><small>احتفظ بصورة لهذه الشاشة</small></div>`;
    } else {
      $("resultContent").innerHTML =
        `<p>نأسف، هذه المرة لم تكن من البوابات الفائزة 💜 هذه البوابة لم تُخفِ أحد الأكواد الفائزة، لكن نتمنى أن يكون حظك أجمل في مسابقات متجر الشامل القادمة.</p>` +
        `<div class="locked-note">تم إغلاق بقية البوابات بعد اختيارك</div>`;
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
  $("resultOverlay").addEventListener("click", (event) => {
    if (event.target === $("resultOverlay")) closeResult();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeResult();
  });

  /*
   * وضع الاختبار للمالك:
   * اضغط Ctrl + Shift + Alt + R ثم أكد العملية.
   * سيُمسح اختيار هذا الجهاز فقط وتُعاد البوابات للاختيار.
   */
  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.shiftKey && event.altKey && event.key.toLowerCase() === "r") {
      const ok = window.confirm("إعادة الاختيار للاختبار؟ سيتم حذف اختيار البوابة من هذا الجهاز فقط.");
      if (!ok) return;
      localStorage.removeItem(storageKey);
      window.location.reload();
    }
  });

  updateGates();
})();
