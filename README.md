# Titanium 27 — Coming Soon

A static coming-soon page. On load, the space station view shrinks into the
TITANIUM letters, the logo turns silver, Earth rises, and "2027 · COMING SOON"
fades in.

Plain HTML/CSS/JS, no build step. Open `index.html` through any static server, e.g.

```bash
python3 -m http.server 5527
```

Timing lives in `main.js` (`HOLD` = pause before the transition, `DUR` = transition length).

Earth image: Apollo 17 "Blue Marble", NASA — restoration by Toby Ord (tobyord.com/earth).
