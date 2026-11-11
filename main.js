(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (p) => 1 - Math.pow(1 - p, 3);
  const easeIn = (p) => p * p * p;
  const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  // long build, fast middle, short smooth landing — used for the flight into the letters
  const easeFlight = (p) => (p < 0.5 ? 16 * p ** 5 : 1 - Math.pow(-2 * p + 2, 5) / 2);
  const rand = (a, b) => a + Math.random() * (b - a);

  const els = {
    stage: $("stage"),
    hero: $("hero"), cam: $("cam"),
    heroFill: $("heroFill"), heroGlow: $("heroGlow"), flare: $("flare"),
    hud: $("hud"), vel: $("vel"),
    cs: $("cs"), csTitle: $("csTitle"), csYear: $("csYear"), energy: $("energy"),
    galaxy: $("galaxy"), snd: $("snd"),
  };

  /* ------------------------------------------------------------------
   * Timeline (seconds). The page holds, then plays the transition once.
   * ------------------------------------------------------------------ */
  const HOLD = 1.6;                       // seconds in the tunnel before the transition starts
  const DUR = 6.5;                        // seconds for the whole transition
  const at = (p) => HOLD + p * DUR;       // transition progress → seconds
  const T_IMPACT = at(0.48);              // the title locks in: flare, glow, bass hit
  const T_CS = at(0.56);                  // COMING SOON starts to appear
  const T_CS_FULL = at(0.9);              // COMING SOON fully revealed
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Logo mask geometry ------------------------------------------------ */
  const LOGO_AR = 294 / 1218;            // height / width of logo-titanium.png
  const ANCHOR = { x: 0.546, y: 0.486 }; // solid point inside the letters — the zoom pivots here
  const ANCHOR_R = 39 / 1218;            // radius of solid area around it, as a fraction of logo width

  let vw = innerWidth, vh = innerHeight;
  const mobile = () => vw <= 640;
  function finalLogo() {
    const w = Math.min(560, vw * (mobile() ? 0.84 : 0.6));
    const cy = vh * (mobile() ? 0.3 : 0.27);
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
   * Deep space: coloured stars with twinkle + slow drifting dust
   * ------------------------------------------------------------------ */
  const STAR_TINTS = ["255,255,255", "214,228,255", "180,205,255", "200,190,255", "255,236,214"];
  class Space {
    constructor(canvas, stars = 520, dust = 40, boost = 0) {
      this.c = canvas; this.speed = 0.03; this.boost = boost;
      this.resize();
      this.stars = Array.from({ length: stars }, () => this.spawn(true));
      this.dust = Array.from({ length: dust }, () => this.spawnDust());
    }
    resize() { this.ctx = sizeCanvas(this.c); this.w = this.c.clientWidth; this.h = this.c.clientHeight; }
    spawn(any) {
      const mag = Math.pow(Math.random(), 3.2); // most stars faint, a few bright
      return {
        x: rand(-1, 1), y: rand(-1, 1), z: any ? Math.random() : 1, pz: 1,
        tw: rand(0, 6.28), tws: rand(0.3, 0.9), mag,
        tint: STAR_TINTS[(Math.random() * STAR_TINTS.length) | 0],
      };
    }
    spawnDust() {
      return { x: Math.random(), y: Math.random(), d: rand(0.3, 1), vx: rand(-0.004, 0.004), vy: rand(-0.008, -0.002), r: rand(0.6, 1.8) };
    }
    frame(dt) {
      const { ctx, w, h } = this, cx = w / 2, cy = h / 2, f = Math.max(w, h) * 0.5;
      ctx.clearRect(0, 0, w, h);
      const streak = this.speed > 0.5;
      ctx.globalCompositeOperation = "lighter";
      for (const s of this.stars) {
        s.pz = s.z; s.z -= this.speed * dt * 0.25; s.tw += dt * s.tws;
        if (s.z <= 0.02) { Object.assign(s, this.spawn(false)); continue; }
        const sx = cx + (s.x / s.z) * f, sy = cy + (s.y / s.z) * f;
        if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) { Object.assign(s, this.spawn(false)); continue; }
        const near = 1 - s.z;
        const a = clamp((near * 1.2 + this.boost) * (0.35 + 0.65 * s.mag + 0.25)) * (0.92 + 0.08 * Math.sin(s.tw));
        const size = 0.35 + near * 1.1 + s.mag * 1.6;
        if (streak) {
          const px = cx + (s.x / s.pz) * f, py = cy + (s.y / s.pz) * f;
          ctx.strokeStyle = `rgba(${s.tint},${a})`; ctx.lineWidth = size;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(${s.tint},${a})`;
          ctx.beginPath(); ctx.arc(sx, sy, size * 0.6, 0, 6.283); ctx.fill();
          if (s.mag > 0.6) { // only the brightest stars get a soft halo
            const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 4);
            g.addColorStop(0, `rgba(${s.tint},${a * 0.22})`); g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, size * 4, 0, 6.283); ctx.fill();
          }
        }
      }
      // cosmic dust: tiny out-of-focus motes drifting upward with parallax
      for (const d of this.dust) {
        d.x += d.vx * dt * d.d; d.y += d.vy * dt * d.d;
        if (d.y < -0.05) { d.y = 1.05; d.x = Math.random(); }
        if (d.x < -0.05) d.x = 1.05; else if (d.x > 1.05) d.x = -0.05;
        const x = d.x * w, y = d.y * h, r = d.r * (1 + d.d);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
        g.addColorStop(0, `rgba(170,190,255,${0.1 * d.d})`); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, 6.283); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }
  }

  /* ------------------------------------------------------------------
   * Effects layer: hyperspace streaks
   * ------------------------------------------------------------------ */
  const STREAK_COLS = ["120,220,255", "150,170,255", "175,120,255", "220,240,255"];
  class FX {
    constructor(canvas) {
      this.c = canvas;
      this.resize();
      this.streaks = Array.from({ length: 240 }, () => this.spawnStreak(true));
    }
    resize() { this.ctx = sizeCanvas(this.c); this.w = this.c.clientWidth; this.h = this.c.clientHeight; }
    spawnStreak(any) {
      const a = rand(0, 6.283), r = Math.sqrt(Math.random()) * 0.9 + 0.08;
      return { x: Math.cos(a) * r, y: Math.sin(a) * r, z: any ? rand(0.05, 1) : 1, pz: 1, col: STREAK_COLS[(Math.random() * 4) | 0], wd: rand(0.6, 2.2) };
    }
    frame(dt, s) {
      const { ctx, w, h } = this;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      // hyperspace streaks: length grows with speed → reads as motion blur and acceleration
      if (s.streakA > 0.01) {
        const cx = w / 2, cy = h * 0.44, f = Math.max(w, h) * 0.55;
        for (const k of this.streaks) {
          k.pz = k.z; k.z -= s.streakV * dt;
          if (k.z <= 0.03) { Object.assign(k, this.spawnStreak(false)); k.pz = k.z; continue; }
          const sx = cx + (k.x / k.z) * f, sy = cy + (k.y / k.z) * f;
          const tail = Math.min(1, k.z + s.streakV * 0.06 + 0.02);
          const px = cx + (k.x / tail) * f, py = cy + (k.y / tail) * f;
          if (sx < -200 || sx > w + 200 || sy < -200 || sy > h + 200) { Object.assign(k, this.spawnStreak(false)); continue; }
          const a = clamp((1 - k.z) * 1.4) * s.streakA;
          const g = ctx.createLinearGradient(px, py, sx, sy);
          g.addColorStop(0, `rgba(${k.col},0)`); g.addColorStop(1, `rgba(${k.col},${a})`);
          ctx.strokeStyle = g; ctx.lineWidth = k.wd * (0.4 + (1 - k.z) * 1.6); ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke();
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
      // a bus for everything except the hit, so it can drop out for a beat before the impact
      const bed = ctx.createGain(); bed.gain.setValueAtTime(1, t);
      bed.gain.setValueAtTime(1, t + T_IMPACT - 0.22);
      bed.gain.linearRampToValueAtTime(0.12, t + T_IMPACT - 0.04);
      bed.gain.linearRampToValueAtTime(0.85, t + T_IMPACT + 1.2);
      bed.connect(this.master);
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

      // 2. rising engine: detuned saws through a slowly opening filter, peaking at the title lock
      const eg = ctx.createGain(), ef = ctx.createBiquadFilter(); ef.type = "lowpass"; ef.Q.value = 4;
      ef.frequency.setValueAtTime(120, t); ef.frequency.exponentialRampToValueAtTime(2600, t + T_IMPACT);
      ef.frequency.exponentialRampToValueAtTime(220, t + T_IMPACT + 2.5);
      eg.gain.setValueAtTime(0.0001, t); eg.gain.exponentialRampToValueAtTime(0.05, t + HOLD);
      eg.gain.exponentialRampToValueAtTime(0.2, t + T_IMPACT - 0.05);
      eg.gain.exponentialRampToValueAtTime(0.03, t + T_IMPACT + 0.5);
      eg.gain.exponentialRampToValueAtTime(0.008, t + T_IMPACT + 5);
      for (const det of [0, 7, -9]) {
        const o = this.osc("sawtooth", 34);
        o.detune.value = det;
        o.frequency.setValueAtTime(34, t); o.frequency.exponentialRampToValueAtTime(118, t + T_IMPACT);
        o.frequency.exponentialRampToValueAtTime(52, t + T_IMPACT + 3);
        o.connect(ef); o.start(t);
      }
      ef.connect(eg); this.out(eg, 1, 0.25, bed);

      // 3. tension riser: airy noise climbing in pitch and level all the way to the hit
      const rn = this.noiseSrc(false), rf = ctx.createBiquadFilter(), rg = ctx.createGain();
      rf.type = "bandpass"; rf.Q.value = 2.2;
      rf.frequency.setValueAtTime(300, t + 0.4); rf.frequency.exponentialRampToValueAtTime(5200, t + T_IMPACT - 0.05);
      rg.gain.setValueAtTime(0.0001, t + 0.4); rg.gain.exponentialRampToValueAtTime(0.16, t + T_IMPACT - 0.08);
      rg.gain.linearRampToValueAtTime(0.0001, t + T_IMPACT);
      rn.connect(rf); rf.connect(rg); this.out(rg, 1, 0.4, bed); rn.start(t + 0.4); rn.stop(t + T_IMPACT + 0.1);

      // 4. transition whooshes
      this.whoosh(t + HOLD - 0.3, 2.4, 220, 3800, 0.2, bed);    // into the jump
      this.whoosh(t + T_CS - 0.1, 1.6, 3000, 400, 0.07, bed);   // COMING SOON settles in

      // 5. bass impact as the title locks (bypasses the drop-out so it lands at full weight)
      this.impact(t + T_IMPACT);

      // 6. soft shimmer as COMING SOON appears
      this.shimmer(t + T_CS + 0.2);
    }
    whoosh(t, dur, f0, f1, vol, bus) {
      const ctx = this.ctx, n = this.noiseSrc(false), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      bp.type = "bandpass"; bp.Q.value = 1.1;
      bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.65); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      n.connect(bp); bp.connect(g); this.out(g, 1, 0.5, bus); n.start(t); n.stop(t + dur + 0.1);
    }
    impact(t) {
      const ctx = this.ctx;
      const o = this.osc("sine", 95), g = ctx.createGain();
      o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(28, t + 1.1);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.95, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
      o.connect(g); this.out(g, 1, 0.35); o.start(t); o.stop(t + 2.8);
      const n = this.noiseSrc(false), lp = ctx.createBiquadFilter(), ng = ctx.createGain();
      lp.type = "lowpass"; lp.frequency.setValueAtTime(1800, t); lp.frequency.exponentialRampToValueAtTime(120, t + 0.6);
      ng.gain.setValueAtTime(0.5, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
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
  const space = new Space($("stars"), 1500, 40, 0.15);
  const flight = new Space($("heroStars"), 4500, 60, 0.45); // the starfield you fly through at the start
  const fx = new FX($("fx"));
  const sound = new Sound();

  let t0 = performance.now(), last = t0;
  function restart() { t0 = performance.now(); last = t0; }

  /* Render ------------------------------------------------------------ */
  function render(now) {
    const realDt = Math.max(0.001, (now - last) / 1000); last = now;
    const dt = Math.min(0.05, realDt);
    const secs = reduceMotion ? 99 : (now - t0) / 1000;
    const p = seg(secs, HOLD, HOLD + DUR);
    const fin = finalLogo();

    /* 1. the tunnel shrinks into the TITANIUM letters (0.02 → 0.48), landing on the title lock */
    const mp = easeFlight(seg(p, 0.02, 0.48));
    const startW = (Math.hypot(vw, vh) * 0.62) / ANCHOR_R; // big enough that one solid stem covers the screen
    const w = Math.exp(lerp(Math.log(startW), Math.log(fin.w), mp));
    const ax = lerp(vw / 2, fin.left + ANCHOR.x * fin.w, mp);
    const ay = lerp(vh / 2, fin.top + ANCHOR.y * fin.h, mp);
    const mx = ax - ANCHOR.x * w, my = ay - ANCHOR.y * w * LOGO_AR;
    const masked = w * ANCHOR_R < Math.hypot(vw, vh) * 0.55; // before this, one solid stem covers everything
    els.hero.classList.toggle("unmasked", !masked);
    if (masked) {
      const size = `${w.toFixed(1)}px auto`, pos = `${mx.toFixed(1)}px ${my.toFixed(1)}px`;
      els.hero.style.webkitMaskSize = size; els.hero.style.maskSize = size;
      els.hero.style.webkitMaskPosition = pos; els.hero.style.maskPosition = pos;
    }
    const fp = easeOut(seg(p, 0.36, 0.54)); // silver-fill progress
    const settle = 1 - fp;

    /* first-person flight: cruise through the stars, then accelerate into the letters */
    const thrust = easeInOut(clamp(secs / T_IMPACT));            // 0 → 1 as you reach the logo
    const roll = 0.6 * Math.sin(secs * 0.8) * settle;           // slow zero-g drift
    els.cam.style.transform = reduceMotion ? "none" : `rotate(${roll.toFixed(3)}deg)`;
    if (fp < 1) { // hidden under the silver fill once the title has locked
      flight.speed = reduceMotion ? 0.03 : lerp(0.35, 3.4, easeIn(thrust));
      flight.frame(dt);
    }
    els.vel.textContent = (0.99 * thrust * settle + 0.12 * (1 - settle)).toFixed(2);

    /* 2. title locks in: polished titanium, depth shadow, a short glow kick and lens flare */
    const kick = secs >= T_IMPACT ? Math.exp(-(secs - T_IMPACT) / 0.45) : 0;
    els.heroFill.style.opacity = fp.toFixed(3);
    els.heroGlow.style.filter = fp > 0.01
      ? `drop-shadow(0 6px 8px rgba(0,0,0,${(0.55 * fp).toFixed(2)})) drop-shadow(0 0 ${(14 * fp + 20 * kick).toFixed(1)}px rgba(106,216,255,${(0.36 * fp + 0.35 * kick).toFixed(2)}))`
      : "none";
    const logoCy = fin.top + fin.h / 2;
    els.flare.style.top = `${logoCy.toFixed(1)}px`;
    els.flare.style.opacity = (kick * 0.6).toFixed(3);
    els.flare.style.transform = `translate(-50%, -50%) scaleX(${(0.25 + 0.75 * easeOut(seg(secs, T_IMPACT, T_IMPACT + 0.4))).toFixed(3)})`;

    /* HUD fades as the transition begins */
    els.hud.style.opacity = (1 - seg(p, 0, 0.12)).toFixed(3);

    /* 2027 just under the logo */
    const yp = easeOut(seg(p, 0.5, 0.72));
    els.csYear.style.top = `${(fin.top + fin.h + Math.max(10, fin.w * 0.035)).toFixed(1)}px`;
    els.csYear.style.opacity = yp.toFixed(3);
    els.csYear.style.letterSpacing = `${lerp(1.2, 0.55, yp).toFixed(3)}em`;

    /* 3. the galaxy fades up behind the title, with a slow camera push-in for scale */
    const ep = easeOut(seg(p, 0.36, 0.9));
    const galaxyPush = 1.08 - 0.08 * ep + 0.05 * easeInOut(seg(secs, at(0.45), at(0.45) + 24));
    els.galaxy.style.opacity = (0.78 * ep).toFixed(3); // held back so the text stays readable
    els.galaxy.style.transform = `scale(${galaxyPush.toFixed(4)})`;

    /* 4. COMING SOON: travelling gradient reveal, one light pulse as it lands, then a slow breath */
    const cp = seg(p, 0.56, 0.9), ce = easeOut(cp);
    els.cs.style.opacity = clamp(cp * 2.2);
    els.cs.style.transform = `translateY(${((1 - ce) * 8).toFixed(2)}vh)`;
    const gy = lerp(200, 52, ce);
    const since = secs - T_CS_FULL;
    const sweep = since > 0 ? lerp(-20, 120, seg(since, 0, 1.4)) : -40; // a single light pass as it lands
    const glow = (since > 0 ? Math.exp(-since / 0.9) : 0) + 0.18 * (0.5 + 0.5 * Math.sin(secs * 0.9)) * ce;
    els.csTitle.style.backgroundImage =
      `linear-gradient(100deg, transparent ${(sweep - 9).toFixed(1)}%, rgba(255,255,255,0.7) ${sweep.toFixed(1)}%, transparent ${(sweep + 9).toFixed(1)}%),` +
      `radial-gradient(circle at 50% ${gy.toFixed(1)}vh, #f2fbff 0, #6ad8ff 30vh, #4d6bff 62vh, #9a46ff 95vh, rgba(40,20,90,0) 130vh)`;
    els.cs.style.filter = `drop-shadow(0 0 ${(6 + 12 * glow).toFixed(1)}px rgba(106,216,255,${(0.22 + 0.3 * glow).toFixed(2)}))`;
    const lp = easeOut(seg(p, 0.68, 0.98));
    els.energy.style.transform = `scaleX(${lp.toFixed(3)})`;
    els.energy.style.opacity = (lp * 0.6).toFixed(3);

    /* stars: streak during the jump, then decelerate out of warp */
    space.speed = secs < T_IMPACT ? lerp(0.03, 2.6, easeIn(mp)) : 0.03 + 2.6 * Math.exp(-(secs - T_IMPACT) * 1.6);
    space.frame(dt);

    fx.frame(dt, {
      secs,
      streakA: reduceMotion ? 0 : lerp(0.2, 0.85, thrust) * settle,
      streakV: lerp(0.25, 1.9, easeIn(thrust) * 0.6 + thrust * 0.4),
    });

    requestAnimationFrame(render);
  }

  /* Sound toggle: first click turns sound on and replays the intro in sync */
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

  addEventListener("resize", () => { vw = innerWidth; vh = innerHeight; space.resize(); flight.resize(); fx.resize(); });

  restart();
  requestAnimationFrame(render);
})();
