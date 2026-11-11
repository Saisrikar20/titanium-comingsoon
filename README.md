# Titanium 27 — Coming Soon

The coming-soon page for **Titanium 2027**. It's one screen with a sci-fi
intro that plays by itself on load: you drift through a field of stars, speed up
into hyperspace and fly into a cutout shaped like the **TITANIUM 2027** logo, the letters turn to polished silver,
a slowly turning galaxy fades up behind them, and **COMING SOON** fades in.

It's plain HTML, CSS and JavaScript, with no framework, no build step and no dependencies.

---

## What happens on screen

The page holds on the starfield for 1.6 s, then plays a 6.5 s transition and
stays on the final screen.

| Time (approx.) | What you see |
| --- | --- |
| 0 – 1.6 s | First-person view of deep space filled with stars drifting towards you, through a helmet visor, with coordinates and a speed readout. You start to accelerate with a slow zero-g roll |
| 1.7 – 4.7 s | The stars stretch into hyperspace streaks as you speed up, and you fly into the TITANIUM letters. The move builds slowly, rushes through the middle and lands smoothly on the title |
| 4.0 – 5.1 s | The letters turn to the real silver logo artwork (bevelled titanium, with a soft highlight sweeping across) |
| 4.7 s | **Title lock:** a short lens flare and glow, and the stars drop out of warp |
| 3.9 – 7.5 s | A spiral galaxy (looping video) fades up behind the title and the camera settles in, then pushes in slowly |
| 5.2 – 7.5 s | **COMING SOON** appears in place as thin, wide-set white lettering that decrypts from random symbols, left to right (each letter keeps a fixed cell, so nothing moves), with a faint glow and three pulsing dots, and a thin energy line draws out beneath |
| After | Calm final frame: COMING SOON glows softly and its dots pulse, nebula haze drifts, the galaxy keeps turning and the logo shine sweeps |

- The opening starfield is drawn live on a canvas, so there is no image to wait for.
- Visitors with **Reduce motion** turned on in their system settings go straight to the final screen.
- **Sound** is off by default because browsers block audio until the visitor interacts. The speaker button (bottom right) turns it on and replays the intro, so the audio lines up with the picture. Click again to mute.
- The layout adapts to phones (logo and text are resized and repositioned below 640 px wide; the galaxy video crops to fill the screen).

---

## Sound design

All sound is generated live in the browser with the Web Audio API, so there are no audio files to load or license.

| When | Sound |
| --- | --- |
| Throughout | Deep filtered rumble and a low breathing drone |
| 0 – 4.7 s | Sci-fi engine rising in pitch, plus an airy riser that climbs to the hit, building tension |
| 1.3 s | Whoosh into the jump |
| Just before 4.7 s | Everything drops away for a beat… |
| 4.7 s | …then a bass impact with a reverb tail as the title locks |
| 5.2 – 5.6 s | Soft whoosh and shimmer as COMING SOON appears |

---

## Project structure

```
titanium-27/
├── index.html              Page markup (stage, galaxy video, logo cutout, HUD, text)
├── style.css               Layout, colours, nebula, galaxy, silver fill, flare, HUD, film grade
├── main.js                 Timeline, logo-cutout zoom, opening starfield, background stars and dust, hyperspace streaks, sound
└── assets/
    ├── warp.webp           Earlier warp-tunnel photo (not used right now)
    ├── station-wide.webp   Earlier space station view (not used right now)
    ├── logo-titanium.png   TITANIUM 2027 logo with transparent background (the cutout shape and the final silver artwork)
    ├── galaxy.mp4          Turning spiral galaxy behind the title (1080p H.264, 24 s seamless loop, muted)
    ├── galaxy-poster.jpg   First frame of the galaxy, shown until the video can play
    ├── earth-surface.webp  Earlier Earth background, base layer (not used right now)
    ├── earth-clouds.webp   Earlier Earth background, cloud layer (not used right now)
    └── earth-disc.webp     Original Earth photo (not used right now)
```

---

## Run it locally

Serve the folder with any static file server, then open the address it prints:

```bash
python3 -m http.server 5527
```

Then visit <http://localhost:5527>. Using a local server (rather than
double-clicking `index.html`) matches how it behaves once it's hosted.

---

## Deploy

It's a static site, so any static host works:

- **Vercel**: import the repo. Framework preset **Other**, no build command, output directory `.` (the repo root).
- **Netlify**: drag and drop the folder, or connect the repo with no build command.
- **GitHub Pages**: Settings → Pages → deploy from the `main` branch, root folder.

---

## Customising

| To change… | Edit |
| --- | --- |
| Pause before the transition | `HOLD` in `main.js` (seconds) |
| Flight feel (speed-up, roll) | the "first-person flight" block in `render()` in `main.js` |
| Title-lock moment (flare, glow, bass hit) | `T_IMPACT` near the top of `main.js` |
| Galaxy brightness and push-in | the "galaxy fades up" block in `render()` in `main.js` (`0.78 * ep` is its final opacity) |
| Galaxy framing | `.galaxy` `object-position` in `style.css` |
| Film grain and vignette strength | `.grade` `opacity` in `style.css` |
| Sound levels and timing | the `Sound` class in `main.js` (`play()` lists every cue) |
| HUD coordinates | `.hud-bl` in `index.html` (currently Chennai) |
| Transition length | `DUR` in `main.js` (seconds) |
| Order and overlap of each stage | the `seg(p, start, end)` ranges in `render()` in `main.js` (0 = start of transition, 1 = end) |
| Final logo size and position | `finalLogo()` in `main.js` |
| "COMING SOON" text | `index.html` |
| COMING SOON decrypt duration and symbols | `scrambleCS(1400)` and `SCRAMBLE_CHARS` in `main.js` |
| "COMING SOON" size, line weight and dots | `.cs-title` and `.dots` in `style.css` |
| Logo and COMING SOON position | `finalLogo()` in `main.js` (`cy` is the logo's centre as a fraction of screen height; COMING SOON follows it) |
| Accent / glow colour | `--cyan` at the top of `style.css` |
| HUD labels on the opening frame | `.hud` block in `index.html` |
| Opening starfield (density, brightness, speed) | `new Space($("heroStars"), count, dust, boost)` and `flight.speed` in `main.js` |
| Logo image or galaxy video | swap the file in `assets/` and keep the same name |

**Changing the logo:** the cutout is shaped by `assets/logo-titanium.png`, so it
needs a **transparent background**. The zoom starts from a solid point inside
one of the letters (`ANCHOR` in `main.js`, as a fraction of the image width and
height). If you swap in a different logo, set `ANCHOR` to a point that falls
inside a thick part of a letter, and update `LOGO_AR` (height ÷ width) and
`ANCHOR_R` to match the new image.

---

## Browser support

Works in current Chrome, Edge, Safari and Firefox on desktop and mobile. The
logo cutout uses CSS `mask-image`, which has the `-webkit-` prefix included for
Safari.

---

## Credits

- **Galaxy video**: provided by the Titanium team (re-encoded to 1080p with a crossfaded loop).
- **Earth photo** (earlier version, no longer shown): Apollo 17 "Blue Marble" (AS17-148-22727), NASA. Restored version by Toby Ord, from [tobyord.com/earth](https://www.tobyord.com/earth).
- **Fonts**: [Michroma](https://fonts.google.com/specimen/Michroma) (HUD labels) and [Gruppo](https://fonts.google.com/specimen/Gruppo) (COMING SOON), served from Google Fonts (SIL Open Font License).
- **Warp tunnel image** (earlier version, no longer shown): "A purple and blue background with lines of light" by [Anton Filatov](https://unsplash.com/@antony123antony) on [Unsplash](https://unsplash.com/photos/a-purple-and-blue-background-with-lines-of-light-O_5SJuSOxZA), free to use under the Unsplash License (colour-graded with extra brightness, bloom and a bright core).
- **Station artwork and TITANIUM logo**: provided by the Titanium team.
- **Transition idea**: based on the logo-mask transition from the Titanium 2026 site.
