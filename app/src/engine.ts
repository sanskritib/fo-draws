import type { Msg, Point, StrokeMsg } from "./types";

// Draws Fo's messages on a <canvas>. Fo works in a 1000 x 1000 space that gets
// centered and scaled to fit whatever box the canvas sits in.
export class CanvasEngine {
  private ctx: CanvasRenderingContext2D;
  private pixels = new Map<string, string>();
  private grid = 32;
  private done: StrokeMsg[] = [];
  private queue: Msg[] = [];
  private busy = false;
  private scale = 1;
  private ox = 0;
  private oy = 0;
  private w = 0;
  private h = 0;
  private gen = 0; // bumps on every reset so an in-flight animation stops cleanly

  constructor(
    private canvas: HTMLCanvasElement,
    private onSay: (text: string) => void,
    private onBusy: (busy: boolean) => void,
  ) {
    this.ctx = canvas.getContext("2d")!;
  }

  resize() {
    const box = this.canvas.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.w = box.width;
    this.h = box.height;
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const s = Math.min(this.w, this.h) * 0.88;
    this.scale = s / 1000;
    this.ox = (this.w - s) / 2;
    this.oy = (this.h - s) / 2;
    this.redraw();
  }

  /** Show a whole canvas at once (used when you pick one from the sidebar). */
  show(messages: Msg[]) {
    this.reset();
    let say = "";
    for (const m of messages) {
      if ("canvas" in m || "clear" in m) { this.done = []; this.pixels.clear(); say = ""; }
      else if ("grid" in m) this.grid = m.grid;
      else if ("px" in m) for (const [x, y, c] of m.px) c ? this.pixels.set(`${x},${y}`, c) : this.pixels.delete(`${x},${y}`);
      else if ("say" in m) say = m.say;
      else if ("p" in m) this.done.push(m);
    }
    this.onSay(say);
    this.redraw();
  }

  /** Replay a canvas stroke by stroke, the way Fo drew it. */
  replay(messages: Msg[]) {
    this.reset();
    this.onSay("");
    this.redraw();
    messages.forEach((m) => this.enqueue(m));
  }

  /** Animate one new live message. */
  enqueue(m: Msg) {
    this.queue.push(m);
    void this.pump();
  }

  private reset() {
    this.gen++;
    this.queue = [];
    this.busy = false;
    this.done = [];
    this.pixels.clear();
    this.grid = 32;
    this.onBusy(false);
  }

  private X = (x: number) => this.ox + x * this.scale;
  private Y = (y: number) => this.oy + y * this.scale;

  private style(st: StrokeMsg) {
    const c = this.ctx;
    c.strokeStyle = st.c || "#1f1b17";
    c.lineWidth = (st.w || 4) * this.scale * 1.4;
    c.lineCap = "round";
    c.lineJoin = "round";
  }

  private drawFull(st: StrokeMsg) {
    const p = st.p;
    if (!p || !p.length) return;
    const c = this.ctx;
    this.style(st);
    if (st.f) c.fillStyle = st.f;
    c.beginPath();
    c.moveTo(this.X(p[0][0]), this.Y(p[0][1]));
    for (let i = 1; i < p.length; i++) c.lineTo(this.X(p[i][0]), this.Y(p[i][1]));
    if (st.f) { c.closePath(); c.fill(); }
    c.stroke();
  }

  private drawPixels() {
    if (!this.pixels.size) return;
    const c = this.ctx;
    const cell = 1000 / this.grid;
    c.strokeStyle = "rgba(0,0,0,0.05)";
    c.lineWidth = 1;
    for (let i = 0; i <= this.grid; i++) {
      c.beginPath(); c.moveTo(this.X(i * cell), this.Y(0)); c.lineTo(this.X(i * cell), this.Y(1000)); c.stroke();
      c.beginPath(); c.moveTo(this.X(0), this.Y(i * cell)); c.lineTo(this.X(1000), this.Y(i * cell)); c.stroke();
    }
    this.pixels.forEach((col, key) => {
      const [x, y] = key.split(",").map(Number);
      c.fillStyle = col;
      c.fillRect(this.X(x * cell) + 0.5, this.Y(y * cell) + 0.5, cell * this.scale - 1, cell * this.scale - 1);
    });
  }

  private redraw() {
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.drawPixels();
    this.done.forEach((s) => this.drawFull(s));
  }

  private animate(st: StrokeMsg, gen: number): Promise<void> {
    return new Promise((resolve) => {
      const p = st.p;
      if (!p || p.length < 2) { this.done.push(st); this.drawFull(st); return resolve(); }
      const seg: number[] = [];
      let total = 0;
      for (let i = 1; i < p.length; i++) {
        const d = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
        seg.push(d); total += d;
      }
      const dur = Math.max(250, total / (st.s || 0.9));
      const t0 = performance.now();
      const frame = (now: number) => {
        if (gen !== this.gen) return resolve();
        const k = Math.min(1, (now - t0) / dur);
        const target = total * (1 - Math.pow(1 - k, 2));
        this.redraw();
        this.style(st);
        const c = this.ctx;
        c.beginPath();
        c.moveTo(this.X(p[0][0]), this.Y(p[0][1]));
        let acc = 0;
        for (let i = 1; i < p.length; i++) {
          if (acc + seg[i - 1] <= target) { c.lineTo(this.X(p[i][0]), this.Y(p[i][1])); acc += seg[i - 1]; }
          else {
            const r = (target - acc) / seg[i - 1];
            const a: Point = p[i - 1], b: Point = p[i];
            c.lineTo(this.X(a[0] + (b[0] - a[0]) * r), this.Y(a[1] + (b[1] - a[1]) * r));
            break;
          }
        }
        c.stroke();
        if (k < 1) requestAnimationFrame(frame);
        else { this.done.push(st); this.redraw(); resolve(); }
      };
      requestAnimationFrame(frame);
    });
  }

  private async pump() {
    if (this.busy) return;
    this.busy = true;
    this.onBusy(true);
    const gen = this.gen;
    while (this.queue.length && gen === this.gen) {
      const m = this.queue.shift()!;
      if ("canvas" in m || "clear" in m) { this.done = []; this.pixels.clear(); this.onSay(""); this.redraw(); }
      else if ("grid" in m) { this.grid = m.grid; this.redraw(); }
      else if ("px" in m) {
        for (const [x, y, c] of m.px) {
          if (gen !== this.gen) break;
          c ? this.pixels.set(`${x},${y}`, c) : this.pixels.delete(`${x},${y}`);
          this.redraw();
          await new Promise((r) => setTimeout(r, m.d || 30));
        }
      } else if ("say" in m) this.onSay(m.say);
      else if ("p" in m) await this.animate(m, gen);
    }
    if (gen === this.gen) { this.busy = false; this.onBusy(false); }
  }
}
