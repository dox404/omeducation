
document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("utVslVideo");
  const btn = document.getElementById("utUnmuteBtn");
  if (!video || !btn) return;

  video.muted = true;
  video.playsInline = true;

  const tryPlay = async () => { try { await video.play(); } catch(e){} };
  tryPlay();

  const unmute = async () => {
    try{
      video.muted = false;
      video.volume = 1;
      await video.play();
      btn.style.display = "none";
    }catch(e){
      btn.style.display = "flex";
    }
  };

  btn.addEventListener("click", unmute, { passive:true });
  video.addEventListener("click", () => { if (video.muted) unmute(); }, { passive:true });

  btn.style.display = video.muted ? "flex" : "none";
});


/* ===========================
   proofMedia - FINAL script.js
   - Carousel (desktop 3, mobile 1)
   - Slide 1-by-1 (desktop & mobile)
   - YouTube play/pause overlay
   - Force SOUND ON when play
   =========================== */

document.addEventListener("DOMContentLoaded", () => {
  // ---------- helpers ----------
  const isMobile = () => window.matchMedia("(max-width: 760px)").matches;
  const perView = () => (isMobile() ? 1 : 3);

  // YouTube players map
  const ytPlayers = new Map(); // key: box element, value: YT.Player

  const pauseAllMedia = () => {
    // Pause any HTML5 videos (if present somewhere)
    document.querySelectorAll("video").forEach(v => { try { v.pause(); } catch(e) {} });

    // Pause all YouTube
    ytPlayers.forEach((player, box) => {
      try { player.pauseVideo(); } catch(e) {}
      box.classList.remove("is-playing");
      const btn = box.querySelector("[data-pm-yt-toggle]");
      if (btn) btn.setAttribute("aria-label", "Play video");
    });
  };

  // ---------- Carousel ----------
  function initCarousel(key) {
    const root = document.querySelector(`[data-pm-carousel="${key}"]`);
    if (!root) return;

    const track = root.querySelector(".pmTrack");
    if (!track) return;

    const cards = Array.from(track.children);
    const prevBtn = document.querySelector(`[data-pm-prev="${key}"]`);
    const nextBtn = document.querySelector(`[data-pm-next="${key}"]`);
    const dotsWrap = document.querySelector(`[data-pm-dots="${key}"]`);

    let index = 0;
    let maxIndex = 0;

    const calcMaxIndex = () => {
      const pv = perView();
      maxIndex = Math.max(0, cards.length - pv);
      if (index > maxIndex) index = maxIndex;
    };

    const getGap = () => {
      const gapStr = getComputedStyle(track).gap || "0px";
      const gap = parseFloat(gapStr);
      return Number.isFinite(gap) ? gap : 0;
    };

    const getCardWidth = () => {
      // always read real rendered width
      const first = cards[0];
      if (!first) return 0;
      return first.getBoundingClientRect().width;
    };

    const render = () => {
      calcMaxIndex();

      const cardW = getCardWidth();
      const gap = getGap();
      const shift = index * (cardW + gap);

      track.style.transform = `translate3d(-${shift}px,0,0)`;

      // dots active
      if (dotsWrap) {
        const dots = Array.from(dotsWrap.querySelectorAll(".pmDot"));
        dots.forEach((d, i) => d.classList.toggle("is-active", i === index));
      }

      // disable nav if not needed
      const disabled = maxIndex === 0;
      if (prevBtn) prevBtn.disabled = disabled;
      if (nextBtn) nextBtn.disabled = disabled;
    };

    const buildDots = () => {
      if (!dotsWrap) return;
      calcMaxIndex();
      dotsWrap.innerHTML = "";

      for (let i = 0; i <= maxIndex; i++) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "pmDot" + (i === index ? " is-active" : "");
        b.setAttribute("aria-label", `${key} slide ${i + 1}`);
        b.addEventListener("click", () => {
          pauseAllMedia();
          index = i;
          render();
        });
        dotsWrap.appendChild(b);
      }
    };

    const goTo = (i) => {
      pauseAllMedia();
      calcMaxIndex();

      if (i < 0) i = maxIndex;
      if (i > maxIndex) i = 0;

      index = i;
      render();
    };

    // nav
    if (prevBtn) prevBtn.addEventListener("click", () => goTo(index - 1));
    if (nextBtn) nextBtn.addEventListener("click", () => goTo(index + 1));

    // swipe (mobile)
    let startX = 0;
    root.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
    }, { passive: true });

    root.addEventListener("touchend", (e) => {
      const endX = e.changedTouches[0].clientX;
      const diff = endX - startX;
      if (Math.abs(diff) > 50) {
        diff < 0 ? goTo(index + 1) : goTo(index - 1);
      }
    }, { passive: true });

    // init
    buildDots();
    // wait 1 frame so widths are correct
    requestAnimationFrame(() => {
      goTo(0);
    });

    window.addEventListener("resize", () => {
      buildDots();
      render();
    });
  }

  initCarousel("images");
  initCarousel("videos");

  // ---------- YouTube ----------
  function extractYouTubeId(url) {
    if (!url) return "";
    url = url.trim();

    // youtu.be/ID
    let m = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
    if (m) return m[1];

    // watch?v=ID
    m = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
    if (m) return m[1];

    // shorts/ID
    m = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/);
    if (m) return m[1];

    // embed/ID
    m = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/);
    if (m) return m[1];

    return "";
  }

  function ensureYouTubeAPI() {
    // already ready
    if (window.YT && window.YT.Player) return;

    // if iframe_api script already present, do nothing
    const exists = Array.from(document.scripts).some(s => (s.src || "").includes("youtube.com/iframe_api"));
    if (exists) return;

    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    document.head.appendChild(s);
  }

  function initYouTubePlayers() {
    const boxes = document.querySelectorAll("[data-pm-yt]");
    boxes.forEach((box, idx) => {
      if (ytPlayers.has(box)) return;

      const url = box.getAttribute("data-yturl") || "";
      const vid = extractYouTubeId(url);
      if (!vid) return;

      // stage where iframe will be mounted
      let stage = box.querySelector(".pmYTStage");
      if (!stage) {
        stage = document.createElement("div");
        stage.className = "pmYTStage";
        box.prepend(stage);
      }

      // IMPORTANT: stage must have unique id
      const frameId = `pmYT_${idx}_${vid}`;
      stage.id = frameId;

      const originOk = (location.protocol === "http:" || location.protocol === "https:");
      const playerVars = {
        autoplay: 0,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        enablejsapi: 1
      };
      if (originOk) playerVars.origin = window.location.origin;

      const player = new YT.Player(frameId, {
        videoId: vid,
        host: "https://www.youtube-nocookie.com",
        playerVars,
        events: {
          onReady: () => {
            // keep muted state as-is; we will unmute on user click
          },
          onStateChange: (e) => {
            const btn = box.querySelector("[data-pm-yt-toggle]");
            if (e.data === 1) {
              box.classList.add("is-playing");
              btn?.setAttribute("aria-label", "Pause video");
            } else {
              box.classList.remove("is-playing");
              btn?.setAttribute("aria-label", "Play video");
            }
          }
        }
      });

      ytPlayers.set(box, player);
    });
  }

  // YouTube callback (must be global)
  window.onYouTubeIframeAPIReady = () => {
    initYouTubePlayers();
  };

  // load API if needed
  ensureYouTubeAPI();

  // if API already loaded, init immediately
  if (window.YT && window.YT.Player) {
    initYouTubePlayers();
  }

  // ---------- Play/Pause click (event delegation) ----------
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-pm-yt-toggle]");
    if (!btn) return;

    e.preventDefault();

    const box = btn.closest("[data-pm-yt]");
    if (!box) return;

    const player = ytPlayers.get(box);
    if (!player) return;

    // pause other videos
    ytPlayers.forEach((p, b) => {
      if (b !== box) {
        try { p.pauseVideo(); } catch(err) {}
        b.classList.remove("is-playing");
        b.querySelector("[data-pm-yt-toggle]")?.setAttribute("aria-label", "Play video");
      }
    });

    try {
      const state = player.getPlayerState(); // 1 playing
      if (state === 1) {
        player.pauseVideo();
        box.classList.remove("is-playing");
        btn.setAttribute("aria-label", "Play video");
      } else {
        // âœ… FORCE SOUND ON
        try { player.unMute(); } catch(err) {}
        try { player.setVolume(100); } catch(err) {}

        player.playVideo();
        box.classList.add("is-playing");
        btn.setAttribute("aria-label", "Pause video");
      }
    } catch(err) {}
  });

});







document.addEventListener("DOMContentLoaded", function () {
    const totalSeconds = 5 * 60; // 5 minutes
    let remaining = totalSeconds;

    const timerEl = document.getElementById("sdStickyTimer");
    const btnEl = document.getElementById("sdStickyBtn");
    const barEl = document.getElementById("sdStickyBar");
    if (!timerEl || !btnEl || !barEl) return;

    function formatTime(sec) {
      const m = String(Math.floor(sec / 60)).padStart(2, "0");
      const s = String(sec % 60).padStart(2, "0");
      return `${m}:${s}`;
    }

    // Initial display
    timerEl.textContent = formatTime(remaining);

    const interval = setInterval(() => {
      remaining--;

      if (remaining <= 0) {
        clearInterval(interval);
        timerEl.textContent = "00:00";
        // Disable CTA once time is up
        btnEl.classList.add("sd-sticky-btn--disabled");
        btnEl.textContent = "Offer expired";
        btnEl.removeAttribute("href");
        return;
      }

      timerEl.textContent = formatTime(remaining);
    }, 1000);
  });
  
  (() => {
  const cards = [...document.querySelectorAll(".pvid__card")];

  function setState(card, state){
    card.dataset.state = state; // playing/paused
  }

  function pauseAll(exceptCard){
    cards.forEach(c => {
      if (c === exceptCard) return;
      const v = c.querySelector(".pvid__video");
      if (!v) return;
      v.pause();
      setState(c, "paused");
    });
  }

  async function toggle(card){
    const v = card.querySelector(".pvid__video");
    if (!v) return;

    // always keep sound ON
    v.muted = false;
    v.volume = 1;

    if (card.dataset.state === "playing"){
      v.pause();
      setState(card, "paused");
      return;
    }

    pauseAll(card);

    try{
      await v.play(); // user click => should work with sound
      setState(card, "playing");
    } catch(err){
      // fallback: show native controls if browser blocks for some reason
      v.controls = true;
      console.log("Play blocked:", err);
    }
  }

  cards.forEach(card => {
    setState(card, "paused");

    const btn = card.querySelector(".pvid__btn");
    const v = card.querySelector(".pvid__video");

    btn.addEventListener("click", () => toggle(card));

    // if video ends -> set paused
    v.addEventListener("ended", () => setState(card, "paused"));
    v.addEventListener("pause", () => setState(card, "paused"));
    v.addEventListener("play", () => setState(card, "playing"));
  });
})();

// âœ… 5-minute countdown timer (persists on refresh)
(() => {
  const el = document.getElementById("utTimer");
  if (!el) return;

  const KEY = "ut_turn_timer_end_v1";
  const now = Date.now();

  // set end time once (persist)
  let end = Number(localStorage.getItem(KEY));
  if (!end || end < now) {
    end = now + 5 * 60 * 1000; // 5 minutes
    localStorage.setItem(KEY, String(end));
  }

  const pad = (n) => String(n).padStart(2, "0");

  const tick = () => {
    const left = Math.max(0, end - Date.now());
    const s = Math.floor(left / 1000);
    const mm = Math.floor(s / 60);
    const ss = s % 60;

    el.textContent = `${pad(mm)}:${pad(ss)}`;

    // optional: when finished, reset again (keep running)
    if (left <= 0) {
      end = Date.now() + 5 * 60 * 1000;
      localStorage.setItem(KEY, String(end));
    }
  };

  tick();
  setInterval(tick, 1000);
})();

document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("[data-pp-carousel]");
  if (!root) return;

  const track = root.querySelector(".ppTrack");
  const cards = Array.from(track.children);
  const prevBtn = document.querySelector("[data-pp-prev]");
  const nextBtn = document.querySelector("[data-pp-next]");
  const dotsWrap = document.querySelector("[data-pp-dots]");

  const isMobile = () => window.matchMedia("(max-width: 760px)").matches;
  const perView  = () => (isMobile() ? 1 : 3);

  let index = 0;
  let maxIndex = 0;

  const calcMaxIndex = () => {
    const pv = perView();
    maxIndex = Math.max(0, cards.length - pv);
    if (index > maxIndex) index = maxIndex;
  };

  const getGap = () => {
    const gapStr = getComputedStyle(track).gap || "0px";
    const gap = parseFloat(gapStr);
    return Number.isFinite(gap) ? gap : 0;
  };

  const render = () => {
    calcMaxIndex();
    const cardW = cards[0]?.getBoundingClientRect().width || 0;
    const shift = index * (cardW + getGap());
    track.style.transform = `translate3d(-${shift}px,0,0)`;

    // dots
    if (dotsWrap) {
      dotsWrap.querySelectorAll(".ppDot").forEach((d, i) => {
        d.classList.toggle("is-active", i === index);
      });
    }

    // disable btns
    if (prevBtn) prevBtn.disabled = (maxIndex === 0);
    if (nextBtn) nextBtn.disabled = (maxIndex === 0);
  };

  const buildDots = () => {
    if (!dotsWrap) return;
    calcMaxIndex();
    dotsWrap.innerHTML = "";
    for (let i = 0; i <= maxIndex; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ppDot" + (i === index ? " is-active" : "");
      b.addEventListener("click", () => { index = i; render(); });
      dotsWrap.appendChild(b);
    }
  };

  const goTo = (i) => {
    calcMaxIndex();
    if (i < 0) i = maxIndex;
    if (i > maxIndex) i = 0;
    index = i;
    render();
  };

  prevBtn?.addEventListener("click", () => goTo(index - 1));
  nextBtn?.addEventListener("click", () => goTo(index + 1));

  // swipe (mobile)
  let sx = 0;
  root.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
  root.addEventListener("touchend", (e) => {
    const ex = e.changedTouches[0].clientX;
    const diff = ex - sx;
    if (Math.abs(diff) > 50) diff < 0 ? goTo(index + 1) : goTo(index - 1);
  }, { passive: true });

  // init
  buildDots();
  requestAnimationFrame(() => { goTo(0); });

  window.addEventListener("resize", () => {
    buildDots();
    render();
  });
});

(function () {
    const bar = document.getElementById("stickyCta");
    const pageFooter = document.querySelector("footer");
    if (!bar || !pageFooter) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        bar.classList.toggle("is-hidden", e.isIntersecting);
      });
    }, { threshold: 0.1 });

    io.observe(pageFooter);
  })();
  



(function(){
  const root = document.querySelector("[data-ws-carousel]");
  if (!root) return;

  const track = root.querySelector(".wsVideos__track");
  const cards = Array.from(track?.children || []);
  const prevBtn = document.querySelector("[data-ws-prev]");
  const nextBtn = document.querySelector("[data-ws-next]");
  const dotsWrap = document.querySelector("[data-ws-dots]");
  if (!track || !cards.length) return;

  const perView = () => {
    if (window.matchMedia("(max-width: 560px)").matches) return 1;
    if (window.matchMedia("(max-width: 1080px)").matches) return 2;
    return 3;
  };

  let index = 0;
  let maxIndex = 0;
  let autoTimer = null;
  let resumeTimer = null;
  let startX = 0;

  const isHovered = () => root.matches(":hover");
  const isFocused = () => root.matches(":focus-within");
  const hasPlayingCard = () => cards.some((card) => card.classList.contains("is-playing"));

  const getGap = () => {
    const gapStr = getComputedStyle(track).gap || "0px";
    const gap = parseFloat(gapStr);
    return Number.isFinite(gap) ? gap : 0;
  };

  const getCardWidth = () => cards[0]?.getBoundingClientRect().width || 0;

  const calcMaxIndex = () => {
    maxIndex = Math.max(0, cards.length - perView());
    if (index > maxIndex) index = maxIndex;
  };

  const pauseCard = (card) => {
    const video = card.querySelector(".wsVidCard__video");
    if (!video) return;

    if (!video.paused) video.pause();
    video.controls = false;
    card.classList.remove("is-playing");
  };

  const pauseAllCards = () => {
    cards.forEach(pauseCard);
  };

  const pauseOtherCards = (activeCard) => {
    cards.forEach((card) => {
      if (card !== activeCard) pauseCard(card);
    });
  };

  const render = () => {
    calcMaxIndex();

    const shift = index * (getCardWidth() + getGap());
    track.style.transform = `translate3d(-${shift}px,0,0)`;

    if (dotsWrap) {
      dotsWrap.querySelectorAll(".wsVideos__dot").forEach((dot, dotIndex) => {
        dot.classList.toggle("is-active", dotIndex === index);
      });
    }

    const disabled = maxIndex === 0;
    if (prevBtn) prevBtn.disabled = disabled;
    if (nextBtn) nextBtn.disabled = disabled;
  };

  const buildDots = () => {
    if (!dotsWrap) return;

    calcMaxIndex();
    dotsWrap.innerHTML = "";

    for (let i = 0; i <= maxIndex; i++) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "wsVideos__dot" + (i === index ? " is-active" : "");
      dot.setAttribute("aria-label", `Feedback slide ${i + 1}`);
      dot.addEventListener("click", () => {
        goTo(i);
        restartAuto();
      });
      dotsWrap.appendChild(dot);
    }
  };

  const goTo = (targetIndex, { pauseMedia = true } = {}) => {
    calcMaxIndex();

    if (targetIndex < 0) targetIndex = maxIndex;
    if (targetIndex > maxIndex) targetIndex = 0;

    if (pauseMedia) pauseAllCards();

    index = targetIndex;
    render();
  };

  const stopAuto = () => {
    clearInterval(autoTimer);
    autoTimer = null;
  };

  const startAuto = () => {
    stopAuto();
    autoTimer = setInterval(() => {
      if (document.hidden || isHovered() || isFocused() || hasPlayingCard()) return;
      goTo(index + 1, { pauseMedia: false });
    }, 4000);
  };

  const restartAuto = () => {
    clearTimeout(resumeTimer);
    startAuto();
  };

  const queueAutoResume = () => {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      if (!hasPlayingCard()) startAuto();
    }, 2500);
  };

  prevBtn?.addEventListener("click", () => {
    goTo(index - 1);
    restartAuto();
  });

  nextBtn?.addEventListener("click", () => {
    goTo(index + 1);
    restartAuto();
  });

  root.addEventListener("mouseenter", stopAuto);
  root.addEventListener("mouseleave", () => {
    if (!hasPlayingCard()) startAuto();
  });
  root.addEventListener("focusin", stopAuto);
  root.addEventListener("focusout", () => {
    setTimeout(() => {
      if (!root.matches(":focus-within") && !hasPlayingCard()) startAuto();
    }, 0);
  });

  root.addEventListener("touchstart", (event) => {
    startX = event.touches[0].clientX;
    stopAuto();
  }, { passive: true });

  root.addEventListener("touchend", (event) => {
    const endX = event.changedTouches[0].clientX;
    const diff = endX - startX;
    if (Math.abs(diff) > 50) {
      diff < 0 ? goTo(index + 1) : goTo(index - 1);
    }
    queueAutoResume();
  }, { passive: true });

  cards.forEach((card) => {
    const video = card.querySelector(".wsVidCard__video");
    const playButton = card.querySelector(".wsVidCard__play");
    if (!video || !playButton) return;

    video.autoplay = false;
    video.loop = false;
    video.muted = false;
    video.playsInline = true;
    video.controls = false;
    video.pause();

    playButton.addEventListener("click", async () => {
      pauseOtherCards(card);
      stopAuto();

      try {
        video.controls = true;
        await video.play();
      } catch (error) {
        video.controls = false;
        card.classList.remove("is-playing");
        queueAutoResume();
      }
    });

    video.addEventListener("play", () => {
      stopAuto();
      pauseOtherCards(card);
      video.controls = true;
      card.classList.add("is-playing");
    });

    video.addEventListener("pause", () => {
      if (!video.ended) {
        video.controls = false;
        card.classList.remove("is-playing");
        queueAutoResume();
      }
    });

    video.addEventListener("ended", () => {
      video.controls = false;
      card.classList.remove("is-playing");
      video.currentTime = 0;
      queueAutoResume();
    });
  });

  buildDots();
  requestAnimationFrame(() => goTo(0, { pauseMedia: false }));
  startAuto();

  window.addEventListener("resize", () => {
    buildDots();
    render();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAuto();
      pauseAllCards();
    } else {
      queueAutoResume();
    }
  });
})();


// Popup"

(function () {
  const PAYMENT_URL = "https://pages.razorpay.com/pl_S8OBIJu3lLPWPq/view";

  const overlay = document.getElementById("upgroOverlay");
  const closeBtn = document.getElementById("upgroCloseBtn");

  const form = document.getElementById("upgroLeadForm");
  const errBox = document.getElementById("upgroError");
  const submitBtn = document.getElementById("upgroSubmitBtn");

  if (!overlay || !closeBtn || !form) return;

  function openModal() {
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(() => document.getElementById("upgroName")?.focus(), 50);
  }

  function closeModal() {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    errBox.classList.remove("show");
    errBox.textContent = "";
    submitBtn.disabled = false;
    submitBtn.textContent = "Proceed to Payment";
  }

  closeBtn.addEventListener("click", closeModal);

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) closeModal();
  });

  // ✅ All your buttons selector (covers all 14 cases)
  const POPUP_SELECTORS = [
    "a.ctaBtn",                // #1
    "a.faqCards__btn",         // #2-7, #9-12
    "a.wsVideos__btn",         // #8
    "a.imagine__cta",          // #13
    "a.stickyCta__btn",        // #14
    "a.js-open-popup",         // #2
    "#openPopup"               // just in case you keep id in some places
  ].join(", ");

  // ✅ Event delegation: page par jitne bhi aise buttons hon, popup open
  document.addEventListener("click", function (e) {
    const btn = e.target.closest(POPUP_SELECTORS);
    if (!btn) return;

    // ✅ Stop direct navigation (href="#" / javascript:void(0) / razorpay link)
    e.preventDefault();

    openModal();
  });

  function showError(msg) {
    errBox.textContent = msg;
    errBox.classList.add("show");
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  }

  function cleanPhone(phone) {
    return phone.replace(/\D/g, "");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    errBox.classList.remove("show");
    errBox.textContent = "";

    const name = document.getElementById("upgroName").value.trim();
    const phoneRaw = document.getElementById("upgroPhone").value.trim();
    const email = document.getElementById("upgroEmail").value.trim();
    const city = document.getElementById("upgroCity").value.trim();

    const phone = cleanPhone(phoneRaw);

    if (name.length < 2) return showError("Please enter a valid name.");
    if (phone.length !== 10) return showError("Please enter a valid 10-digit mobile number.");
    if (!isValidEmail(email)) return showError("Please enter a valid email address.");
    if (city.length < 2) return showError("Please enter your city.");

    const params = new URLSearchParams({ name, phone, email, city });

    submitBtn.disabled = true;
    submitBtn.textContent = "Redirecting...";

    // ✅ Redirect to Razorpay payment page
    window.location.href =
      PAYMENT_URL + (PAYMENT_URL.includes("?") ? "&" : "?") + params.toString();
  });
})();

(function () {
  const form = document.getElementById("registrationForm");
  const submitBtn = document.getElementById("registrationSubmitBtn");
  const errorBox = document.getElementById("registrationError");
  const successBox = document.getElementById("registrationSuccess");
  const config = window.webinarRegistrationConfig || {};

  if (!form || !submitBtn || !errorBox || !successBox) return;

  const originalBtnText = submitBtn.textContent;

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.add("show");
    successBox.classList.remove("show");
    successBox.style.display = "none";
    successBox.textContent = "";
  }

  function showSuccess(message) {
    errorBox.classList.remove("show");
    errorBox.textContent = "";
    successBox.classList.add("show");
    successBox.style.display = "block";

    if (config.whatsappGroupLink) {
      successBox.innerHTML =
        `${message} <a href="${config.whatsappGroupLink}" target="_blank" rel="noopener">Join the WhatsApp group</a>.`;
      return;
    }

    successBox.textContent = message;
  }

  function cleanPhone(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function normalizeIndianPhone(value) {
    const digits = cleanPhone(value);

    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 12 && digits.startsWith("91")) return digits;
    if (digits.length > 10 && digits.length <= 15) return digits;

    return "";
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || "").trim());
  }

  async function sendRegistrationEmails(data) {
    if (
      !window.emailjs ||
      !config.emailjsServiceId ||
      !config.emailjsAdminTemplateId ||
      !config.emailjsConfirmationTemplateId ||
      !config.adminEmail
    ) {
      throw new Error("Email service is not configured.");
    }

    const adminPayload = {
      ...data,
      to_email: config.adminEmail,
      email_type: "admin_notification",
      message_title: "New Workshop Registration",
      group_link: config.whatsappGroupLink || ""
    };

    const confirmationPayload = {
      ...data,
      to_email: data.from_email,
      email_type: "student_confirmation",
      message_title: "Workshop Registration Confirmed",
      group_link: config.whatsappGroupLink || ""
    };

    await Promise.all([
      window.emailjs.send(
        config.emailjsServiceId,
        config.emailjsAdminTemplateId,
        adminPayload
      ),
      window.emailjs.send(
        config.emailjsServiceId,
        config.emailjsConfirmationTemplateId,
        confirmationPayload
      )
    ]);
  }

  async function sendWhatsAppConfirmation(data) {
    const apiUrl =
      config.whatsappApiUrl ||
      ((window.location.protocol === "http:" || window.location.protocol === "https:")
        ? `${window.location.origin}/api/send-whatsapp`
        : "http://localhost:3000/api/send-whatsapp");

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: data.from_name,
        phone: normalizeIndianPhone(data.whatsapp),
        eventDate: config.eventDate || "",
        eventTime: config.eventTime || "",
        groupLink: config.whatsappGroupLink || ""
      })
    });

    if (!response.ok) {
      let payload = null;

      try {
        payload = await response.json();
      } catch (error) {
        payload = null;
      }

      throw new Error(payload?.error || "WhatsApp confirmation could not be sent.");
    }
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const data = {
      from_name: form.full_name.value.trim(),
      phone: form.phone.value.trim(),
      whatsapp: form.whatsapp.value.trim(),
      from_email: form.email.value.trim(),
      city: form.city.value.trim(),
      student_class: form.student_class.value,
      reply_to: form.email.value.trim()
    };

    const mobile = normalizeIndianPhone(data.phone);
    const whatsapp = normalizeIndianPhone(data.whatsapp);

    errorBox.classList.remove("show");
    errorBox.textContent = "";
    successBox.classList.remove("show");
    successBox.style.display = "none";
    successBox.textContent = "";

    if (data.from_name.length < 2) return showError("Please enter your full name.");
    if (!mobile) return showError("Please enter a valid mobile number.");
    if (!whatsapp) return showError("Please enter a valid WhatsApp number.");
    if (!isValidEmail(data.from_email)) return showError("Please enter a valid email address.");
    if (data.city.length < 2) return showError("Please enter your city.");
    if (!data.student_class) return showError("Please select your class or status.");

    submitBtn.disabled = true;
    submitBtn.textContent = "Registering...";

    try {
      await sendRegistrationEmails(data);

      // WhatsApp confirmation is helpful, but the registration should still succeed
      // if the local API server is not running or not configured yet.
      try {
        await sendWhatsAppConfirmation(data);
      } catch (whatsappError) {
        console.warn("WhatsApp confirmation warning:", whatsappError);
      }

      form.reset();
      showSuccess("Registration successful. Check your email for confirmation and workshop details.");
    } catch (error) {
      console.error("Registration error:", error);
      showError(error.message || "Registration failed. Please try again.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
})();
