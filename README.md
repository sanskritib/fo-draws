# fo draws

Drawing with voice. Open `index.html` in a browser and it shows a blank canvas that says "listening for fo". Tell Fo (by text or voice memo) what to draw, like "a red slant stroke left to right", and Fo colors the pixels live, one by one.

## How it works

- The page listens on a live channel (ntfy.sh, topic `fo-draws-sk-7q2m9x`) using Server-Sent Events.
- Fo sends small JSON messages to that channel. The page queues them and animates each one.
- Message types:
  - `{"grid": 32}` sets the pixel grid size
  - `{"px": [[x, y, "#e0763c"], ...], "d": 30}` colors pixels one by one (`d` = ms between pixels; a null color erases)
  - `{"p": [[x, y], ...], "c": "#1f1b17", "w": 4}` draws a hand-drawn stroke in a 1000 x 1000 space
  - `{"say": "text"}` shows a caption, `{"clear": true}` wipes the canvas

Built by Sanskriti Bhatnagar with Fo, her Wajo AI assistant.
