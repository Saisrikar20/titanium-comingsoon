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
    flare: $("flare"),
    hud: $("hud"), vel: $("vel"),
    galaxy: $("galaxy"), snd: $("snd"),
    arCockpit: $("arCockpit"), arScreen: $("arScreen"), arContent: $("arContent"), cockpitDash: $("cockpitDash"),
    arExpBeam: $("arExpBeam"),
  };

  /* ------------------------------------------------------------------
   * Timeline (seconds).
   * 0.0s – 2.0s : Spaceman waves palm left and right in center
   * 2.0s – 4.4s : Turns 180°, hands return to normal, model pulled down so helmet is centered (not backpack)
   * 4.4s – 4.8s : Camera glides right INTO the head/helmet of the model, model dissolves into 1st person
   * 4.8s – 5.5s : HUD VIEW ACTIVE: "WARP DRIVE · ENGAGED", velocity ramps 0.00c -> 0.99c
   * 5.5s – 7.1s : WARP ANIMATION: Hyperspace streaks burst, star acceleration, flare
   * 7.1s – 7.8s : Warp velocity settles into cockpit orbit view
   * 7.8s+       : GAME AR CYLINDRICAL CURVED SCREEN OPENS & LOCKS IN!
   * ------------------------------------------------------------------ */
  const HOLD = 2.0;                       // Greeting hold, then begins 180° turn & helmet zoom
  const T_ZOOM_HELMET = 4.4;              // Reaches back of helmet (model pulled down to center helmet dome)
  const T_ENTER_HEAD = 4.8;               // Enters through helmet into 1st-person POV, model dissolves
  const T_HUD_APPEAR = 4.8;               // Once inside head: HUD view activates with WARP DRIVE ENGAGED
  const T_WARP_FIRE = 5.5;                // Warp drive fires: hyperspace streaks, star acceleration, lens flare
  const T_WARP_DECEL = 7.1;               // Warp velocity settles to orbital cruising speed
  const T_HUD_FADE = 7.3;                 // Visor HUD dissolves into cockpit viewport
  const T_AR_REVEAL = 7.8;                // Game opening curved AR screen expands from center & displays info!
  const T_ENTER_VISOR = T_WARP_DECEL;
  const T_IMPACT = T_AR_REVEAL;
  const DUR = 5.0;
  const at = (p) => HOLD + p * DUR;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let vw = innerWidth, vh = innerHeight;
  const mobile = () => vw <= 640;

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
  const fx = new FX($("fx"));
  const sound = new Sound();

  let t0 = performance.now(), last = t0;
  function restart() {
    t0 = performance.now();
    last = t0;
    if (window.__resetSpaceman) window.__resetSpaceman();
  }
  window.__syncMainStart = () => {
    t0 = performance.now();
    last = t0;
  };
  if (window.__spacemanLoaded) {
    t0 = window.__spacemanTStart || performance.now();
    last = t0;
  }
  window.__getElapsed = () => (performance.now() - t0) / 1000;

  /* Mouse tracking for AR visor parallax */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("mousemove", (e) => {
    mouse.tx = (e.clientX / vw - 0.5) * 2;
    mouse.ty = (e.clientY / vh - 0.5) * 2;
  });

  /* Render ------------------------------------------------------------ */
  function render(now) {
    const realDt = Math.max(0.001, (now - last) / 1000); last = now;
    const dt = Math.min(0.05, realDt);
    const secs = reduceMotion ? 99 : (now - t0) / 1000;

    // Smooth mouse inertia
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;

    /* ================================================================
     * TIMELINE CHOREOGRAPHY:
     * 0.0s – 2.0s : Spaceman waves palm left and right in center
     * 2.0s – 4.4s : Turns 180°, hands return to normal, model pulled down so helmet is centered (not backpack)
     * 4.4s – 4.8s : Camera glides right INTO the head/helmet of the model, model dissolves into 1st person
     * 4.8s – 5.5s : HUD VIEW ACTIVE: "WARP DRIVE · ENGAGED", velocity ramps 0.00c -> 0.99c
     * 5.5s – 7.1s : WARP ANIMATION: Hyperspace streaks burst, star acceleration, flare
     * 7.1s – 7.8s : Warp velocity settles into cockpit orbit view
     * 7.8s+       : GAME AR CYLINDRICAL CURVED SCREEN OPENS & LOCKS IN!
     * ================================================================ */

    // 1. Warp thrust & hyperspace dynamics
    const inWarp = secs >= T_WARP_FIRE && secs < T_WARP_DECEL;
    const warpProgress = seg(secs, T_WARP_FIRE, T_WARP_DECEL);
    const thrust = inWarp ? easeFlight(warpProgress) : 0;
    const settled = secs >= T_AR_REVEAL ? easeOut(seg(secs, T_AR_REVEAL, T_AR_REVEAL + 0.8)) : 0;

    // Camera zero-g roll during flight
    const roll = 0.5 * Math.sin(secs * 0.7) * (1 - settled);
    if (els.cam) els.cam.style.transform = reduceMotion ? "none" : `rotate(${roll.toFixed(3)}deg)`;

    // Warp velocity readout
    if (els.vel) {
      if (secs < T_HUD_APPEAR) {
        els.vel.textContent = "0.00";
      } else if (secs < T_WARP_FIRE) {
        const acc = easeIn(seg(secs, T_HUD_APPEAR, T_WARP_FIRE));
        els.vel.textContent = (0.99 * acc).toFixed(2);
      } else if (secs < T_WARP_DECEL) {
        els.vel.textContent = "0.99";
      } else {
        const dockP = seg(secs, T_WARP_DECEL, T_AR_REVEAL);
        els.vel.textContent = lerp(0.99, 0.12, easeOut(dockP)).toFixed(2);
      }
    }

    // 2. Starfield & FX speeds
    if (secs < T_HUD_APPEAR) {
      space.speed = 0.03; // Calm drifting stars during spaceman greeting & turn
    } else if (secs < T_WARP_FIRE) {
      space.speed = lerp(0.03, 0.45, seg(secs, T_HUD_APPEAR, T_WARP_FIRE));
    } else if (inWarp) {
      space.speed = lerp(0.45, 3.4, thrust);
    } else if (secs >= T_WARP_DECEL && secs < T_AR_REVEAL) {
      const decel = 1 - seg(secs, T_WARP_DECEL, T_AR_REVEAL);
      space.speed = 0.03 + 3.0 * decel * decel;
    } else if (secs >= T_AR_REVEAL) {
      space.speed = 0.03 + 1.2 * Math.exp(-(secs - T_AR_REVEAL) * 1.8);
    }
    space.frame(dt);

    // Hyperspace streaks (engage during warp)
    fx.frame(dt, {
      secs,
      streakA: reduceMotion ? 0 : (inWarp ? lerp(0.15, 0.95, thrust) : 0),
      streakV: lerp(0.25, 2.8, thrust),
    });

    // 3. HUD visor: emerges after 45° dive, shows WARP DRIVE · ENGAGED, fades out at orbit arrival
    if (els.hud) {
      if (secs < T_HUD_APPEAR) {
        els.hud.style.opacity = "0";
      } else if (secs < T_HUD_APPEAR + 0.35) {
        const hudIn = easeOut(seg(secs, T_HUD_APPEAR, T_HUD_APPEAR + 0.35));
        els.hud.style.opacity = hudIn.toFixed(3);
      } else if (secs < T_HUD_FADE) {
        els.hud.style.opacity = "1";
      } else {
        const hudOut = 1 - easeOut(seg(secs, T_HUD_FADE, T_HUD_FADE + 0.45));
        els.hud.style.opacity = hudOut.toFixed(3);
      }
    }

    // 4. Galaxy background fade & push-in behind the AR screen
    if (els.galaxy) {
      const gp = easeOut(seg(secs, T_WARP_FIRE + 0.4, T_WARP_DECEL + 0.8));
      const galaxyPush = 1.05 - 0.05 * gp + 0.04 * easeInOut(seg(secs, T_AR_REVEAL, T_AR_REVEAL + 24));
      els.galaxy.style.opacity = (0.78 * gp).toFixed(3);
      els.galaxy.style.transform = `scale(${galaxyPush.toFixed(4)})`;
    }

    // 5. Flare kicks at warp launch and AR screen reveal
    const warpKick = inWarp ? Math.exp(-(secs - T_WARP_FIRE) / 0.4) : 0;
    const arKick = secs >= T_AR_REVEAL ? Math.exp(-(secs - T_AR_REVEAL) / 0.45) : 0;
    const kick = Math.max(warpKick, arKick);
    if (els.flare) {
      els.flare.style.top = `${(vh * 0.45).toFixed(1)}px`;
      els.flare.style.opacity = (kick * 0.85).toFixed(3);
      els.flare.style.transform = `translate(-50%, -50%) scaleX(${(0.3 + 0.7 * (kick > 0.05 ? 1 : 0)).toFixed(3)})`;
    }

    // 6. GAME OPENING EXPANSION FROM CENTER FOR CYLINDRICAL AR SCREEN
    if (els.arCockpit && els.arScreen) {
      if (secs >= T_AR_REVEAL) {
        els.arCockpit.style.opacity = "1";
        els.arCockpit.style.pointerEvents = "auto";

        const expandDur = 0.72;
        const expandP = seg(secs, T_AR_REVEAL, T_AR_REVEAL + expandDur);

        let scaleX = 1, scaleY = 1, glow = 0;
        if (expandP < 0.45) {
          // Phase 1: Horizontal slit expands from center line
          const p1 = expandP / 0.45;
          const e1 = easeOut(p1);
          scaleX = lerp(0.02, 1.05, e1);
          scaleY = lerp(0.015, 0.07, e1);
          glow = 1.8 * (1 - p1 * 0.25);
        } else {
          // Phase 2: Vertical unfolding from center line with elastic game settle
          const p2 = (expandP - 0.45) / 0.55;
          const e2 = Math.sin(p2 * Math.PI * 0.5);
          const overshoot = Math.sin(p2 * Math.PI) * 0.06;
          scaleX = lerp(1.05, 1.0, p2);
          scaleY = lerp(0.07, 1.0, e2) + overshoot;
          glow = lerp(1.2, 0, p2);
        }

        // Center expansion energy beam dynamics
        if (els.arExpBeam) {
          if (expandP < 0.7) {
            const beamAlpha = 1 - expandP / 0.7;
            els.arExpBeam.style.opacity = beamAlpha.toFixed(3);
            els.arExpBeam.style.transform = `translateY(-50%) scaleX(${(scaleX * 1.15).toFixed(3)}) scaleY(${(1 + glow * 3).toFixed(2)})`;
          } else {
            els.arExpBeam.style.opacity = "0";
          }
        }

        // 3D holographic cylindrical visor perspective tilt with mouse responsiveness
        const tiltX = lerp(6.0, 2.2, expandP) - mouse.y * 1.8;
        const tiltY = mouse.x * 2.5;
        const finalScale = 0.96;

        els.arScreen.style.transform = `rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) scaleX(${(scaleX * finalScale).toFixed(4)}) scaleY(${(scaleY * finalScale).toFixed(4)})`;
        els.arScreen.style.filter = glow > 0.05 ? `drop-shadow(0 0 ${glow * 28}px rgba(0, 229, 255, ${glow * 0.85})) brightness(${1 + glow * 0.35})` : "none";

        // DISPLAY INFO AFTER EXPANSION
        const infoDelay = 0.52;
        const infoP = seg(secs, T_AR_REVEAL + infoDelay, T_AR_REVEAL + infoDelay + 0.65);
        const infoEase = easeOut(infoP);

        if (els.arContent) {
          els.arContent.style.opacity = infoEase.toFixed(3);
          const contentTransY = (1 - infoEase) * 16;
          const contentScale = lerp(0.93, 1.0, infoEase);
          els.arContent.style.transform = `translateY(${contentTransY.toFixed(1)}px) scale(${contentScale.toFixed(3)})`;
        }

        // Surrounding HUD elements (tabs, status, docks) cascade in cleanly
        const hudP = seg(secs, T_AR_REVEAL + 0.42, T_AR_REVEAL + 0.92);
        const hudEase = easeOut(hudP);
        const hudElements = els.arScreen.querySelectorAll(".ar-top-tabs, .ar-bracket-tl, .ar-status-tr, .ar-bracket-r, .ar-bottom-bar");
        hudElements.forEach((el) => {
          el.style.opacity = hudEase.toFixed(3);
        });

        // Zero-g floating breath for the cockpit deck
        if (els.cockpitDash) {
          const dashP = seg(secs, T_AR_REVEAL + 0.25, T_AR_REVEAL + 0.85);
          const dashEase = easeOut(dashP);
          const dashFloat = Math.sin(secs * 1.2) * 2.5;
          els.cockpitDash.style.opacity = dashEase.toFixed(3);
          els.cockpitDash.style.transform = `translateX(-50%) translateY(${dashFloat.toFixed(1)}px)`;
        }
      } else {
        els.arCockpit.style.opacity = "0";
        els.arCockpit.style.pointerEvents = "none";
        if (els.arExpBeam) els.arExpBeam.style.opacity = "0";
        if (els.arContent) els.arContent.style.opacity = "0";
        const hudElements = els.arScreen.querySelectorAll(".ar-top-tabs, .ar-bracket-tl, .ar-status-tr, .ar-bracket-r, .ar-bottom-bar");
        hudElements.forEach((el) => {
          el.style.opacity = "0";
        });
      }
    }

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

  addEventListener("resize", () => { vw = innerWidth; vh = innerHeight; space.resize(); fx.resize(); });

  restart();
  requestAnimationFrame(render);
})();
