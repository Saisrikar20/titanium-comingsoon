(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (p) => 1 - Math.pow(1 - p, 3);
  const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

  const els = {
    stage: $("stage"),
    hero: $("hero"), heroImg: $("heroImg"), cam: $("cam"), rushA: $("rushA"), rushB: $("rushB"), core: $("core"), heroFill: $("heroFill"), heroGlow: $("heroGlow"),
    hud: $("hud"),
    cs: $("cs"), csTitle: $("csTitle"), csYear: $("csYear"),
    earthWrap: $("earthWrap"),
  };

  /* Logo mask geometry ------------------------------------------------ */
  const LOGO_AR = 294 / 1218;            // height / width of logo-titanium.png
  const ANCHOR = { x: 0.546, y: 0.486 }; // solid point inside the letters — the zoom pivots here
  const ANCHOR_R = 39 / 1218;            // radius of solid area around it, as a fraction of logo width

  let vw = innerWidth, vh = innerHeight;
  function finalLogo() {
    const w = Math.min(560, vw * (vw <= 640 ? 0.84 : 0.6));
    const cy = vh * (vw <= 640 ? 0.3 : 0.27);
    return { w, left: (vw - w) / 2, top: cy - (w * LOGO_AR) / 2 };
  }

  /* Starfield --------------------------------------------------------- */
  class Starfield {
    constructor(canvas, count) {
      this.c = canvas; this.ctx = canvas.getContext("2d");
      this.speed = 0.03;
      this.resize();
      this.stars = Array.from({ length: count }, () => this.spawn(true));
    }
    resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      this.w = this.c.clientWidth; this.h = this.c.clientHeight;
      this.c.width = this.w * dpr; this.c.height = this.h * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    spawn(any) {
      return { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: any ? Math.random() : 1, pz: 1, tw: Math.random() * 6.28 };
    }
    frame(dt) {
      const { ctx, w, h } = this, cx = w / 2, cy = h / 2, f = Math.max(w, h) * 0.5;
      ctx.clearRect(0, 0, w, h);
      const streak = this.speed > 0.6;
      for (const s of this.stars) {
        s.pz = s.z; s.z -= this.speed * dt * 0.25; s.tw += dt * 2;
        if (s.z <= 0.02) { Object.assign(s, this.spawn(false)); continue; }
        const sx = cx + (s.x / s.z) * f, sy = cy + (s.y / s.z) * f;
        if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) { Object.assign(s, this.spawn(false)); continue; }
        const a = clamp((1 - s.z) * 1.3) * (0.75 + 0.25 * Math.sin(s.tw));
        const size = (1 - s.z) * 1.7 + 0.3;
        if (streak) {
          const px = cx + (s.x / s.pz) * f, py = cy + (s.y / s.pz) * f;
          ctx.strokeStyle = `rgba(210,230,255,${a})`; ctx.lineWidth = size;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(230,240,255,${a})`;
          ctx.beginPath(); ctx.arc(sx, sy, size, 0, 6.283); ctx.fill();
        }
      }
    }
  }
  const stars = new Starfield($("stars"), 420);

  /* Timeline: plays on its own ---------------------------------------- */
  const HOLD = 1.6;  // seconds on the station before the transition starts
  const DUR = 6.5;   // seconds for the whole transition
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let t0 = performance.now();
  let cur = 0;
  let rushPhase = 0;

  /* Render ------------------------------------------------------------ */
  let last = performance.now();
  function render(now) {
    const realDt = Math.max(0.001, (now - last) / 1000); last = now;
    const dt = Math.min(0.05, realDt);
    const prev = cur;
    cur = reduceMotion ? 1 : seg((now - t0) / 1000, HOLD, HOLD + DUR);
    const p = cur;
    const vel = Math.abs(cur - prev) / realDt;

    /* 1. the station shrinks into the TITANIUM letters (0.02 → 0.55) */
    const mp = easeInOut(seg(p, 0.02, 0.55));
    const fin = finalLogo();
    const startW = (Math.hypot(vw, vh) * 0.62) / ANCHOR_R; // big enough that one solid stem covers the screen
    const w = Math.exp(lerp(Math.log(startW), Math.log(fin.w), mp));
    const ax = lerp(vw / 2, fin.left + ANCHOR.x * fin.w, mp);
    const ay = lerp(vh / 2, fin.top + ANCHOR.y * fin.w * LOGO_AR, mp);
    const mx = ax - ANCHOR.x * w, my = ay - ANCHOR.y * w * LOGO_AR;

    // until the solid stem stops covering the whole screen, the mask would change nothing — skip it
    const masked = w * ANCHOR_R < Math.hypot(vw, vh) * 0.55;
    els.hero.classList.toggle("unmasked", !masked);
    if (masked) {
      const size = `${w.toFixed(1)}px auto`, pos = `${mx.toFixed(1)}px ${my.toFixed(1)}px`;
      els.hero.style.webkitMaskSize = size; els.hero.style.maskSize = size;
      els.hero.style.webkitMaskPosition = pos; els.hero.style.maskPosition = pos;
    }
    const fp = easeOut(seg(p, 0.42, 0.62)); // silver-fill progress (used below too)

    /* first-person flight: you accelerate down the tunnel and keep flying into the letters */
    const secs = (now - t0) / 1000;
    const thrust = easeInOut(clamp(secs / (HOLD + DUR * 0.55))); // 0 → 1 as you reach the logo
    const settle = 1 - fp;                                       // calms once the letters turn silver
    const push = Math.exp(0.55 * thrust) * (1 + 0.015 * Math.sin(secs * 1.3));
    // slow, smooth roll like drifting in zero-g
    const roll = 0.6 * Math.sin(secs * 0.8) * settle;
    els.cam.style.transform = reduceMotion ? "none"
      : `rotate(${roll.toFixed(3)}deg) scale(${push.toFixed(4)})`;

    // streaks rush past faster and faster
    rushPhase += dt * lerp(0.9, 2.8, thrust);
    for (const [el, off] of [[els.rushA, 0], [els.rushB, 0.5]]) {
      const f = (rushPhase + off) % 1;
      el.style.transform = `scale(${(1 + (0.25 + 0.2 * thrust) * f).toFixed(4)})`;
      el.style.opacity = (Math.sin(Math.PI * f) * lerp(0.28, 0.5, thrust) * settle).toFixed(3);
    }
    els.core.style.opacity = (lerp(0.45, 0.8, thrust) * (0.9 + 0.1 * Math.sin(secs * 9))).toFixed(3);

    /* 2. letters turn to polished titanium (0.42 → 0.62) */
    els.heroFill.style.opacity = fp.toFixed(3);
    els.heroGlow.style.filter = fp > 0.01
      ? `drop-shadow(0 0 ${(18 * fp).toFixed(1)}px rgba(106,216,255,${(0.45 * fp).toFixed(2)}))`
      : "none";

    /* HUD fades as docking begins */
    els.hud.style.opacity = 1 - seg(p, 0, 0.12);

    /* 2027 sits just under the finished logo */
    const yp = easeOut(seg(p, 0.55, 0.78));
    els.csYear.style.top = `${(fin.top + fin.w * LOGO_AR + Math.max(10, fin.w * 0.035)).toFixed(1)}px`;
    els.csYear.style.opacity = yp.toFixed(3);
    els.csYear.style.letterSpacing = `${lerp(1.2, 0.55, yp).toFixed(3)}em`;

    /* 3. Earth rises (0.4 → 0.95) */
    const ep = easeOut(seg(p, 0.4, 0.95));
    els.earthWrap.style.opacity = ep;
    els.earthWrap.style.transform = `translateX(-50%) translateY(${((1 - ep) * 30).toFixed(2)}vh)`;

    /* 4. COMING SOON with a travelling gradient (0.58 → 0.95) */
    const cp = seg(p, 0.58, 0.95);
    const ce = easeOut(cp);
    els.cs.style.opacity = clamp(cp * 2.2);
    els.cs.style.transform = `translateY(${((1 - ce) * 8).toFixed(2)}vh)`;
    const gy = lerp(200, 52, ce);
    els.csTitle.style.backgroundImage =
      `radial-gradient(circle at 50% ${gy.toFixed(1)}vh, #f2fbff 0, #6ad8ff 30vh, #4d6bff 62vh, #9a46ff 95vh, rgba(40,20,90,0) 130vh)`;

    /* stars streak while the transition is moving */
    stars.speed = 0.03 + Math.min(3, vel * 6);
    stars.frame(dt);

    requestAnimationFrame(render);
  }

  addEventListener("resize", () => {
    vw = innerWidth; vh = innerHeight; stars.resize();
  });

  // start once the station image is ready, so the opening frame isn't blank
  const go = () => { t0 = performance.now(); last = t0; requestAnimationFrame(render); };
  const img = els.heroImg;
  if (img.complete) go();
  else { img.addEventListener("load", go, { once: true }); img.addEventListener("error", go, { once: true }); }
})();
