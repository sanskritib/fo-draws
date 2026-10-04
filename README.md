# fo draws

Drawing with voice. Tell Fo (on a call, by text or voice memo) what to draw, like "a straight line top to bottom", and it lands on the canvas live.

Live site: https://sanskritib.github.io/fo-draws/

## The app

- **Left sidebar**: the Live canvas on top, then Canvas history, one entry per saved canvas, titled by date and time (for example "Sunday, October 4, 12:20 PM"). Click one to see that drawing on the right.
- **Right side**: the canvas, with a Replay button that redraws it stroke by stroke.
- Built with React + TypeScript (Vite). Source is in `app/src`.

## How live drawing works

- The page listens on a live channel (ntfy.sh, topic `fo-draws-sk-7q2m9x`) using Server-Sent Events, and reloads the last 12 hours on refresh so the live canvas survives a reload.
- Fo sends small JSON messages to that channel:
  - `{"canvas": {"id": "2026-10-04-1220", "title": "Sunday, October 4, 12:20 PM"}}` starts a new live canvas
  - `{"p": [[x, y], ...], "c": "#1f1b17", "w": 4}` draws a hand-drawn stroke in a 1000 x 1000 space
  - `{"grid": 32}` sets the pixel grid, `{"px": [[x, y, "#e0763c"], ...], "d": 30}` colors pixels one by one (a null color erases)
  - `{"say": "text"}` shows a caption, `{"clear": true}` wipes the canvas

## Saved canvases

Saving a canvas commits its messages to `canvases/<id>.json` and adds it to `canvases/index.json`. The sidebar reads that list.

## Working on it

```
npm install
npm run dev      # local dev server
npm run build    # type-checks, then writes index.html + assets/ to the repo root
```

Pushing changes under `app/` to main runs `.github/workflows/build.yml`, which builds and commits the site for GitHub Pages.

Built by Sanskriti Bhatnagar with Fo, her Wajo AI assistant.
