# Titanium 27 — Coming Soon

The coming-soon page for **Titanium 2027**. It's one screen with a sci-fi
intro that plays by itself on load: the view of the space station shrinks into a
cutout shaped like the **TITANIUM** letters, the letters turn polished silver,
Earth rises from below, and **2027 · COMING SOON** fades in.

It's plain HTML, CSS and JavaScript, with no framework, no build step and no dependencies.

---

## What happens on screen

The page holds on the station for 1.6 s, then plays a 6.5 s transition and
stays on the final screen.

| Time (approx.) | What you see |
| --- | --- |
| 0 – 1.6 s | Full-screen space station view with a cyan HUD frame and labels |
| 1.7 – 5.2 s | The station shrinks into the TITANIUM letters while stars streak past |
| 4.3 – 5.6 s | The letters fill with glowing silver, with a light sweep across them |
| 4.2 – 7.8 s | Earth rises from the bottom of the screen |
| 5.2 – 6.7 s | **2027** fades in under the logo |
| 5.4 – 7.8 s | **COMING SOON** fades in with a cyan → blue → violet gradient |
| After | Final screen stays up; Earth turns slowly and the logo shine keeps sweeping |

- The intro waits for the station image to load before it starts, so the opening is never blank.
- Visitors with **Reduce motion** turned on in their system settings go straight to the final screen.
- The layout adapts to phones (logo, text and Earth are resized and repositioned below 640 px wide).

---

## Project structure

```
titanium-27/
├── index.html              Page markup (stage, Earth, logo cutout, HUD, text)
├── style.css               Layout, colours, Earth, silver fill, HUD, scanlines
├── main.js                 Timeline, logo-cutout zoom, starfield
└── assets/
    ├── station-wide.webp   Space station view (landscape, 2728×1536)
    ├── logo-titanium.png   TITANIUM wordmark with transparent background (used as the cutout shape)
    └── earth-disc.webp     Earth photo cropped to a circle (1340×1340)
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
| Transition length | `DUR` in `main.js` (seconds) |
| Order and overlap of each stage | the `seg(p, start, end)` ranges in `render()` in `main.js` (0 = start of transition, 1 = end) |
| Final logo size and position | `finalLogo()` in `main.js` |
| "COMING SOON" and "2027" text | `index.html` |
| "COMING SOON" size | `.cs-title` `font-size` in `style.css` |
| "COMING SOON" gradient colours | `.cs-title` in `style.css` **and** the `radial-gradient(...)` line for `csTitle` in `main.js` (the JS one animates it, so change both) |
| Accent / glow colour | `--cyan` at the top of `style.css` |
| HUD labels on the opening frame | `.hud` block in `index.html` |
| Station, logo or Earth image | swap the file in `assets/` and keep the same name |

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

- **Earth photo**: Apollo 17 "Blue Marble" (AS17-148-22727), NASA. Restored version by Toby Ord, from [tobyord.com/earth](https://www.tobyord.com/earth).
- **Font**: [Michroma](https://fonts.google.com/specimen/Michroma) by Vernon Adams, served from Google Fonts (SIL Open Font License).
- **Station artwork and TITANIUM logo**: provided by the Titanium team.
- **Transition idea**: based on the logo-mask transition from the Titanium 2026 site.
