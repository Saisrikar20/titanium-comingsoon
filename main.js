(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (p) => 1 - Math.pow(1 - p, 3);
  const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const rand = (a, b) => a + Math.random() * (b - a);

  const els = {
    stage: $("stage"), bg: $("bg"), bgVideo: document.querySelector(".backdrop"), sky: $("sky"),
    logo: $("logo"),
    cs: $("cs"), csTitle: $("csTitle"), csText: $("csText"), energy: $("energy"),
    snd: $("snd"),
  };

  /* ------------------------------------------------------------------
   * COMING SOON scramble: the letters decrypt from random symbols, left to right.
   * Every letter lives in a fixed-width cell, so the text never moves or changes width.
   * ------------------------------------------------------------------ */
  const CS_TEXT = "Coming Soon";
  const SCRAMBLE_CHARS = "0123456789ABCDEF/\\<>[]{}=+*#";
  els.csText.textContent = "";
  const csCells = [...CS_TEXT].map((ch) => {
    const s = document.createElement("span");
    s.className = "ch";
    s.textContent = ch === " " ? "\u00a0" : ch;
    els.csText.appendChild(s);
    return s;
  });
  const csChar = (i) => (CS_TEXT[i] === " " ? "\u00a0" : CS_TEXT[i]);
  function lockCellWidths() { // measure each final letter once, then fix its cell to that width
    const fs = parseFloat(getComputedStyle(els.csTitle).fontSize) || 16;
    csCells.forEach((c, i) => { c.style.width = ""; c.textContent = csChar(i); });
    const ws = csCells.map((c) => c.getBoundingClientRect().width / fs);
    csCells.forEach((c, i) => { c.style.width = `${ws[i].toFixed(4)}em`; });
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(lockCellWidths);

  let scrambledCS = false, scrambleId = 0;
  function showFinalCS() { csCells.forEach((c, i) => { c.textContent = csChar(i); c.classList.remove("scr"); }); }
  function scrambleCS(duration = 1400) {
    const start = performance.now(); let lastRoll = 0;
    const id = ++scrambleId;
    function tick(now) {
      if (id !== scrambleId) return;                     // a newer run (or a restart) took over
      const prog = clamp((now - start) / duration);
      const locked = Math.floor(prog * csCells.length);
      const roll = now - lastRoll > 50; if (roll) lastRoll = now;
      csCells.forEach((c, i) => {
        if (CS_TEXT[i] === " " || i < locked) { c.textContent = csChar(i); c.classList.remove("scr"); }
        else if (roll || !c.classList.contains("scr")) { c.textContent = SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0]; c.classList.add("scr"); }
      });
      if (prog < 1) requestAnimationFrame(tick); else showFinalCS();
    }
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------------
   * Timeline (seconds). The scene appears at once; the logo and COMING SOON ease in.
   * ------------------------------------------------------------------ */
  const T_BG = 1.6;                       // backdrop fully faded in
  const T_LOGO = 0.5;                     // logo starts to appear
  const T_HIT = 1.4;                      // the logo lands (soft low hit)
  const T_LOGO_FULL = 2.0;                // logo fully in
  const T_CS = 2.0;                       // COMING SOON starts to decrypt
  const T_CS_FULL = 3.2;                  // COMING SOON fully revealed
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Layout -------------------------------------------------------------- */
  const LOGO_AR = 520 / 1280;            // height / width of logo-titanium.png
  let vw = innerWidth, vh = innerHeight;
  const mobile = () => vw <= 640;
  function finalLogo() {
    const w = Math.min(560, vw * (mobile() ? 0.84 : 0.6));
    const cy = vh * 0.47;                                  // the logo sits in the middle of the screen
    return { w, h: w * LOGO_AR, left: (vw - w) / 2, top: cy - (w * LOGO_AR) / 2 };
  }

  function sizeCanvas(c) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr;
    const ctx = c.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  /* ------------------------------------------------------------------
   * Live sky: twinkling stars drifting at different depths (with a touch of pointer parallax),
   * and now and then a faint shooting star
   * ------------------------------------------------------------------ */
  const STAR_TINTS = ["255,255,255", "205,240,255", "150,225,245", "255,225,190", "255,205,160"];
  class LiveSky {
    constructor(canvas, n) {
      this.c = canvas; this.resize();
      this.stars = Array.from({ length: n }, () => {
        const d = Math.pow(Math.random(), 1.6);              // depth: most stars far, a few near
        return {
          x: Math.random(), y: Math.random(), d,
          r: 0.35 + d * 1.5 + Math.pow(Math.random(), 4) * 1.1,
          a: 0.25 + 0.75 * Math.random() * (0.4 + d),
          tw: rand(0, 6.28), tws: rand(0.4, 1.4),
          tint: STAR_TINTS[(Math.random() * STAR_TINTS.length) | 0],
        };
      });
      this.shot = null; this.nextShot = rand(3.5, 6);
      this.px = 0; this.py = 0;
    }
    resize() { this.ctx = sizeCanvas(this.c); this.w = this.c.clientWidth; this.h = this.c.clientHeight; }
    frame(dt, secs, still) {
      const { ctx, w, h } = this;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const s of this.stars) {
        if (!still) {
          s.x += (0.0035 + 0.012 * s.d) * dt * 0.5; s.y += 0.0012 * dt * s.d * 0.5; s.tw += dt * s.tws;
          if (s.x > 1.02) s.x -= 1.04; if (s.y > 1.02) s.y -= 1.04;
        }
        const sx = s.x * w + this.px * s.d * 16, sy = s.y * h + this.py * s.d * 10;
        const a = s.a * (0.78 + 0.22 * Math.sin(s.tw));
        ctx.fillStyle = `rgba(${s.tint},${a.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(sx, sy, s.r * 0.7, 0, 6.283); ctx.fill();
        if (s.r > 1.9) {                                     // only the brightest get a soft halo
          const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, s.r * 4.5);
          g.addColorStop(0, `rgba(${s.tint},${(a * 0.3).toFixed(3)})`); g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, s.r * 4.5, 0, 6.283); ctx.fill();
        }
      }
      if (!still) {
        if (!this.shot && secs > this.nextShot) {            // launch a shooting star every so often
          const ang = rand(0.35, 0.6);
          this.shot = { x: rand(0.05, 0.7) * w, y: rand(0.02, 0.35) * h, vx: Math.cos(ang), vy: Math.sin(ang), t: 0, life: rand(0.7, 1.1), len: rand(120, 200) };
          this.nextShot = secs + rand(7, 13);
        }
        const s = this.shot;
        if (s) {
          s.t += dt;
          const k = s.t / s.life, head = k * 900, tail = Math.max(0, head - s.len);
          const x1 = s.x + s.vx * head, y1 = s.y + s.vy * head, x0 = s.x + s.vx * tail, y0 = s.y + s.vy * tail;
          const fade = Math.sin(Math.PI * clamp(k)) * 0.8;
          const g = ctx.createLinearGradient(x0, y0, x1, y1);
          g.addColorStop(0, "rgba(180,235,255,0)"); g.addColorStop(1, `rgba(235,250,255,${fade.toFixed(3)})`);
          ctx.strokeStyle = g; ctx.lineWidth = 1.4; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
          if (k >= 1) this.shot = null;
        }
      }
      ctx.globalCompositeOperation = "source-over";
    }
  }

  /* ------------------------------------------------------------------
   * Sound design — synthesised live with the Web Audio API (no files)
   * ------------------------------------------------------------------ */
  class Sound {
    constructor() { this.ctx = null; this.on = false; this.nodes = []; }
    init() {
      if (this.ctx) return true;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain(); this.master.gain.value = 0;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.25;
      this.master.connect(comp); comp.connect(ctx.destination);
      this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(3.6);
      const wet = ctx.createGain(); wet.gain.value = 0.45; this.verb.connect(wet); wet.connect(this.master);
      this.noiseBuf = this.noise(4);
      return true;
    }
    noise(sec) {
      const b = this.ctx.createBuffer(1, sec * this.ctx.sampleRate, this.ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return b;
    }
    impulse(sec) {
      const sr = this.ctx.sampleRate, len = sec * sr, b = this.ctx.createBuffer(2, len, sr);
      for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
      return b;
    }
    track(n) { this.nodes.push(n); return n; }
    stopAll() {
      const now = this.ctx.currentTime;
      for (const n of this.nodes) { try { n.stop(now + 0.05); } catch (e) {} }
      this.nodes = [];
    }
    out(node, dry = 1, wet = 0, bus = this.master) {
      const g = this.ctx.createGain(); g.gain.value = dry; node.connect(g); g.connect(bus);
      if (wet) { const s = this.ctx.createGain(); s.gain.value = wet; node.connect(s); s.connect(this.verb); }
    }
    noiseSrc(loop = true) { const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = loop; return this.track(s); }
    osc(type, f) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; return this.track(o); }

    // schedule the whole score; t = context time at which the visual timeline is at 0 s
    play(t) {
      const ctx = this.ctx;
      this.stopAll();

      // 1. atmospheric ambience: deep filtered rumble + low drone that breathes
      const bed = ctx.createGain(); bed.gain.setValueAtTime(1, t); bed.connect(this.master);
      this.bed = bed;
      const amb = this.noiseSrc(); const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 260;
      const ag = ctx.createGain(); ag.gain.setValueAtTime(0, t); ag.gain.linearRampToValueAtTime(0.09, t + 1.2);
      amb.connect(lp); lp.connect(ag); this.out(ag, 1, 0.3, bed); amb.start(t);
      for (const [f, v] of [[41.2, 0.05], [61.8, 0.035], [82.4, 0.02]]) {
        const o = this.osc("sine", f), g = ctx.createGain();
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 2);
        const lfo = this.osc("sine", 0.08 + Math.random() * 0.05), lg = ctx.createGain(); lg.gain.value = v * 0.4;
        lfo.connect(lg); lg.connect(g.gain);
        o.connect(g); this.out(g, 1, 0.2, bed); o.start(t); lfo.start(t);
      }

      // 2. a soft airy swell that carries the logo in, then a gentle low hit as it lands
      this.whoosh(t + T_LOGO - 0.2, 1.6, 400, 3600, 0.12, bed);
      this.impact(t + T_HIT, 0.5);

      // 3. whoosh and shimmer as COMING SOON appears
      this.whoosh(t + T_CS - 0.1, 1.6, 3000, 400, 0.07, bed);
      this.shimmer(t + T_CS + 0.2);
    }
    whoosh(t, dur, f0, f1, vol, bus) {
      const ctx = this.ctx, n = this.noiseSrc(false), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      bp.type = "bandpass"; bp.Q.value = 1.1;
      bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.65); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      n.connect(bp); bp.connect(g); this.out(g, 1, 0.5, bus); n.start(t); n.stop(t + dur + 0.1);
    }
    impact(t, vol = 0.95) {
      const ctx = this.ctx;
      const o = this.osc("sine", 95), g = ctx.createGain();
      o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(28, t + 1.1);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
      o.connect(g); this.out(g, 1, 0.35); o.start(t); o.stop(t + 2.8);
      const n = this.noiseSrc(false), lp = ctx.createBiquadFilter(), ng = ctx.createGain();
      lp.type = "lowpass"; lp.frequency.setValueAtTime(1800, t); lp.frequency.exponentialRampToValueAtTime(120, t + 0.6);
      ng.gain.setValueAtTime(0.5 * (vol / 0.95), t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      n.connect(lp); lp.connect(ng); this.out(ng, 1, 0.6); n.start(t); n.stop(t + 1);
    }
    shimmer(t) {
      const ctx = this.ctx;
      for (const f of [659.3, 987.8, 1318.5, 1975.5]) {
        const o = this.osc("sine", f), g = ctx.createGain();
        o.detune.value = rand(-6, 6);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.022, t + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5);
        o.connect(g); this.out(g, 0.4, 0.9); o.start(t); o.stop(t + 4.7);
      }
    }
    setOn(on) {
      this.on = on;
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(on ? 0.85 : 0, now, 0.08);
    }
  }

  /* ------------------------------------------------------------------ */
  const sky = new LiveSky(els.sky, 520);
  const sound = new Sound();

  let t0 = performance.now(), last = t0;
  let tpx = 0, tpy = 0, px = 0, py = 0;          // pointer parallax (target and smoothed)
  function restart() { t0 = performance.now(); last = t0; scrambledCS = false; scrambleId++; showFinalCS(); }

  addEventListener("pointermove", (e) => { tpx = (e.clientX / innerWidth - 0.5) * 2; tpy = (e.clientY / innerHeight - 0.5) * 2; });
  addEventListener("pointerleave", () => { tpx = 0; tpy = 0; });

  /* Render ------------------------------------------------------------ */
  function render(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now;
    const secs = reduceMotion ? 99 : (now - t0) / 1000;
    const fin = finalLogo();

    /* live background: slow drift handled in CSS, plus a little pointer parallax */
    const k = 1 - Math.exp(-dt * 3);
    px += (tpx - px) * k; py += (tpy - py) * k;
    const bgIn = easeOut(seg(secs, 0, T_BG));
    els.bg.style.opacity = bgIn.toFixed(3);
    sky.px = px; sky.py = py;
    els.sky.style.opacity = bgIn.toFixed(3);
    sky.frame(dt, secs, reduceMotion);

    /* the logo eases in: fades up out of a soft blur, settling to full size */
    const lp = easeOut(seg(secs, T_LOGO, T_LOGO_FULL));
    const kick = secs >= T_HIT ? Math.exp(-(secs - T_HIT) / 0.5) : 0;
    els.logo.style.left = `${fin.left.toFixed(1)}px`; els.logo.style.top = `${fin.top.toFixed(1)}px`;
    els.logo.style.width = `${fin.w.toFixed(1)}px`; els.logo.style.height = `${fin.h.toFixed(1)}px`;
    els.logo.style.opacity = lp.toFixed(3);
    els.logo.style.transform = `scale(${(1.05 - 0.05 * lp).toFixed(4)})`;
    els.logo.style.filter = `blur(${((1 - lp) * 6).toFixed(1)}px) brightness(1.14) contrast(1.1) drop-shadow(0 6px 8px rgba(0,0,0,${(0.55 * lp).toFixed(2)})) drop-shadow(0 0 ${(14 * lp + 16 * kick).toFixed(1)}px rgba(106,216,255,${(0.36 * lp + 0.3 * kick).toFixed(2)}))`;

    /* COMING SOON sits directly below the logo, fades in and decrypts in place */
    els.cs.style.top = `${(fin.top + fin.h + Math.max(28, fin.w * 0.1)).toFixed(1)}px`;
    const cp = seg(secs, T_CS, T_CS + 0.9), ce = easeOut(cp);
    els.cs.style.opacity = clamp(cp * 2.2);
    const since = secs - T_CS_FULL;
    const glow = (since > 0 ? Math.exp(-since / 0.9) : 0) + 0.18 * (0.5 + 0.5 * Math.sin(secs * 0.9)) * ce;
    els.cs.style.filter = `drop-shadow(0 0 ${(3 + 6 * glow).toFixed(1)}px rgba(200,225,255,${(0.35 + 0.3 * glow).toFixed(2)})) drop-shadow(0 0 ${(14 + 14 * glow).toFixed(1)}px rgba(40,150,230,${(0.35 + 0.3 * glow).toFixed(2)}))`;
    if (!reduceMotion && !scrambledCS && secs >= T_CS) { scrambledCS = true; scrambleCS(1400); }
    const ep = easeOut(seg(secs, T_CS + 0.6, T_CS + 2.2));
    els.energy.style.transform = `scaleX(${ep.toFixed(3)})`;
    els.energy.style.opacity = (ep * 0.6).toFixed(3);

    requestAnimationFrame(render);
  }

  /* Sound toggle: first click turns sound on and replays the entrance in sync */
  els.snd.addEventListener("click", () => {
    if (!sound.init()) return;
    if (!sound.on) {
      sound.ctx.resume().then(() => {
        restart();
        sound.play(sound.ctx.currentTime + 0.02);
        sound.setOn(true);
        els.snd.setAttribute("aria-pressed", "true");
        els.snd.setAttribute("aria-label", "Turn sound off");
      });
    } else {
      sound.setOn(false);
      els.snd.setAttribute("aria-pressed", "false");
      els.snd.setAttribute("aria-label", "Turn sound on");
    }
  });

  // belt and braces for browsers without overflow: clip — never let the stage scroll
  els.stage.addEventListener("scroll", () => { els.stage.scrollTop = 0; els.stage.scrollLeft = 0; });

  addEventListener("resize", () => { vw = innerWidth; vh = innerHeight; sky.resize(); });

  // make sure the backdrop video is playing (some phones hold back autoplay until the first touch)
  const playBg = () => { if (els.bgVideo && els.bgVideo.paused && !reduceMotion) els.bgVideo.play().catch(() => {}); };
  playBg();
  ["pointerdown", "touchstart", "keydown"].forEach((ev) => addEventListener(ev, playBg, { passive: true }));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) playBg(); });
  if (reduceMotion && els.bgVideo) { els.bgVideo.removeAttribute("autoplay"); els.bgVideo.pause(); }

  restart();
  requestAnimationFrame(render);
})();
