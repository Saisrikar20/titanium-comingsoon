# Titanium 27 — Coming Soon

The coming-soon page for **Titanium 2027**. It's one screen: a huge ring turning
above a planet, with the silver **TITANIUM 2027** logo in the middle and
**COMING SOON** decrypting in place below it. The background is a looping video
of the ring turning.

It's plain HTML, CSS and JavaScript, with no framework, no build step and no dependencies.

---

## What happens on screen

The page opens straight on the scene and eases in over about four seconds.

| Time (approx.) | What you see |
| --- | --- |
| 0 – 1.6 s | The backdrop video fades up out of black |
| 0.5 – 2.0 s | The logo fades in from a soft blur and settles to full size, with a short glow as it lands |
| 2.0 – 3.4 s | **COMING SOON** appears in place as thin, wide-set white lettering that decrypts from random symbols, left to right (each letter keeps a fixed cell, so nothing moves), with a faint glow and three pulsing dots |
| 2.6 – 4.2 s | A thin energy line draws out beneath it |
| After | Calm final frame, still alive (see below) |

**What keeps moving**
- **The ring turns:** the backdrop is a 10-second video of the huge ring turning above the planet, looping seamlessly (the last 1.5 s fade into the first). It plays muted, so browsers allow it to start by itself.
- COMING SOON glows softly, its dots pulse, and a highlight sweeps across the logo.

**Notes**
- Visitors with **Reduce motion** turned on in their system settings get the finished scene with no movement.
- **Sound** is off by default because browsers block audio until the visitor interacts. The speaker button (bottom right) turns it on and replays the entrance, so the audio lines up with the picture. Click again to mute.
- The layout adapts to phones (logo and text are resized and repositioned below 640 px wide; the backdrop video crops to fill the screen).

---

## Sound design

All sound is generated live in the browser with the Web Audio API, so there are no audio files to load or license.

| When | Sound |
| --- | --- |
| Throughout | Deep filtered rumble and a low breathing drone |
| 0.3 – 1.9 s | A soft airy swell that carries the logo in |
| 1.4 s | A gentle low hit with a reverb tail as the logo lands |
| 1.9 – 2.2 s | Soft whoosh and shimmer as COMING SOON appears |

---

## Project structure

```
titanium-27/
├── index.html              Page markup (backdrop video, sky canvas, logo, COMING SOON)
├── style.css               Layout, colours, backdrop video, logo highlight, film grade
├── main.js                 Entrance timeline, COMING SOON decrypt, sound (the sky canvas code is still in here but hidden behind the video)
└── assets/
    ├── warp.webp           Earlier warp-tunnel photo (not used right now)
    ├── station-wide.webp   Earlier space station view (not used right now)
    ├── logo-titanium.png   TITANIUM 2027 logo with transparent background (the cutout shape and the final silver artwork)
    ├── backdrop.mp4        Backdrop video: the ring turning above the planet (1280×720, H.264, about 8.5 s, seamless loop, muted)
    ├── backdrop-poster.jpg First frame of the video, shown until it can play
    ├── nebula.webp         Alternative blue and violet nebula background (not used right now)
    ├── logo-titanium-2026.png  Logo as supplied, with 2026 (not used right now)
    ├── logo-titanium-2027.png  Earlier logo with its own 2027 (not used right now)
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
| When each part appears | the `T_BG`, `T_LOGO`, `T_HIT`, `T_LOGO_FULL`, `T_CS` and `T_CS_FULL` constants (seconds) near the top of `main.js` |
| Backdrop framing and the shade behind the title | `.backdrop` (`object-position`) and `.bg::after` in `style.css` |
| Film grain and vignette strength | `.grade` `opacity` in `style.css` |
| Sound levels and timing | the `Sound` class in `main.js` (`play()` lists every cue) |
| Logo size and position | `finalLogo()` in `main.js` (`cy` is the logo's centre as a fraction of screen height; COMING SOON follows it) |
| "COMING SOON" text | `index.html` |
| COMING SOON decrypt duration and symbols | `scrambleCS(1400)` and `SCRAMBLE_CHARS` in `main.js` |
| "COMING SOON" size, line weight and dots | `.cs-title` and `.dots` in `style.css` |
| Accent / glow colour | `--cyan`, `--blue` at the top of `style.css`, plus the glow colours in `render()` in `main.js` |
| Logo image or backdrop video | swap the file in `assets/` and keep the same name (update `LOGO_AR` in `main.js` if the logo's proportions change) |

---

## Browser support

Works in current Chrome, Edge, Safari and Firefox on desktop and mobile. The
logo cutout uses CSS `mask-image`, which has the `-webkit-` prefix included for
Safari.

---

## Credits

- **Backdrop video**: supplied by the Titanium team (a corner watermark painted out, enlarged to 720p and sharpened, with a crossfaded loop). A higher-resolution original would look sharper on large screens.
- **Earth photo** (earlier version, no longer shown): Apollo 17 "Blue Marble" (AS17-148-22727), NASA. Restored version by Toby Ord, from [tobyord.com/earth](https://www.tobyord.com/earth).
- **Fonts**: [Michroma](https://fonts.google.com/specimen/Michroma) (HUD labels) and [Gruppo](https://fonts.google.com/specimen/Gruppo) (COMING SOON), served from Google Fonts (SIL Open Font License).
- **Warp tunnel image** (earlier version, no longer shown): "A purple and blue background with lines of light" by [Anton Filatov](https://unsplash.com/@antony123antony) on [Unsplash](https://unsplash.com/photos/a-purple-and-blue-background-with-lines-of-light-O_5SJuSOxZA), free to use under the Unsplash License (colour-graded with extra brightness, bloom and a bright core).
- **Station artwork and TITANIUM logo**: provided by the Titanium team.
- **Transition idea**: based on the logo-mask transition from the Titanium 2026 site.
