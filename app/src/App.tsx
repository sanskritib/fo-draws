import { useEffect, useRef, useState } from "react";
import { CanvasEngine } from "./engine";
import { currentCanvas, listen, loadRecent } from "./live";
import type { Msg, SavedCanvas, SavedCanvasMeta } from "./types";

const LIVE = "live";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<CanvasEngine | null>(null);
  const liveMsgs = useRef<Msg[]>([]);
  const selectedRef = useRef<string>(LIVE);
  const savedCache = useRef(new Map<string, SavedCanvas>());

  const [saved, setSaved] = useState<SavedCanvasMeta[]>([]);
  const [selected, setSelected] = useState<string>(LIVE);
  const [liveTitle, setLiveTitle] = useState("Live canvas");
  const [status, setStatus] = useState<"connecting" | "live" | "reconnecting">("connecting");
  const [drawing, setDrawing] = useState(false);
  const [caption, setCaption] = useState("");

  // Canvas engine + resizing
  useEffect(() => {
    const e = new CanvasEngine(canvasRef.current!, setCaption, setDrawing);
    engine.current = e;
    const ro = new ResizeObserver(() => e.resize());
    ro.observe(canvasRef.current!.parentElement!);
    e.resize();
    return () => ro.disconnect();
  }, []);

  // Saved canvases (committed to the repo under canvases/)
  useEffect(() => {
    fetch("./canvases/index.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: SavedCanvasMeta[]) => setSaved([...list].sort((a, b) => b.created.localeCompare(a.created))))
      .catch(() => setSaved([]));
  }, []);

  // Live channel: restore the current live canvas, then keep listening
  useEffect(() => {
    let stop = () => {};
    let cancelled = false;
    loadRecent()
      .catch(() => ({ messages: [] as Msg[], lastId: null }))
      .then(({ messages, lastId }) => {
        if (cancelled) return;
        const cur = currentCanvas(messages);
        liveMsgs.current = cur.messages;
        setLiveTitle(cur.title);
        if (selectedRef.current === LIVE) engine.current?.show(cur.messages);
        stop = listen(lastId, onLive, setStatus);
      });
    return () => { cancelled = true; stop(); };
  }, []);

  function onLive(m: Msg) {
    if ("canvas" in m) { liveMsgs.current = []; setLiveTitle(m.canvas.title); }
    else if ("clear" in m) liveMsgs.current = [];
    else liveMsgs.current.push(m);
    if (selectedRef.current === LIVE) engine.current?.enqueue(m);
  }

  async function open(id: string) {
    selectedRef.current = id;
    setSelected(id);
    if (id === LIVE) return engine.current?.show(liveMsgs.current);
    const c = await getSaved(id);
    if (c && selectedRef.current === id) engine.current?.show(c.messages);
  }

  async function getSaved(id: string): Promise<SavedCanvas | undefined> {
    if (savedCache.current.has(id)) return savedCache.current.get(id);
    const meta = saved.find((s) => s.id === id);
    if (!meta) return;
    const c: SavedCanvas = await fetch(`./canvases/${meta.file}`, { cache: "no-store" }).then((r) => r.json());
    savedCache.current.set(id, c);
    return c;
  }

  async function replay() {
    const msgs = selected === LIVE ? liveMsgs.current : (await getSaved(selected))?.messages;
    if (msgs) engine.current?.replay(msgs);
  }

  const title = selected === LIVE ? liveTitle : saved.find((s) => s.id === selected)?.title ?? "";
  const dotClass = drawing && selected === LIVE ? "dot drawing" : status === "live" ? "dot live" : "dot";
  const statusText =
    selected !== LIVE ? "saved canvas" :
    drawing ? "fo is drawing" :
    status === "live" ? "listening for fo" :
    status === "reconnecting" ? "reconnecting..." : "connecting...";

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <span className="logo">fo draws</span>
          <span className="tag">tell Fo what to draw</span>
        </div>

        <button className={`item ${selected === LIVE ? "on" : ""}`} onClick={() => open(LIVE)}>
          <span className={status === "live" ? "dot live" : "dot"} />
          <span className="item-text">
            <span className="item-title">Live</span>
            <span className="item-sub">{liveTitle}</span>
          </span>
        </button>

        <div className="section">Canvas history</div>
        <nav className="list">
          {saved.length === 0 && <div className="empty">No saved canvases yet</div>}
          {saved.map((s) => (
            <button key={s.id} className={`item ${selected === s.id ? "on" : ""}`} onClick={() => open(s.id)}>
              <span className="item-text">
                <span className="item-title">{s.title}</span>
              </span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="stage">
        <header className="top">
          <span className="title">{title}</span>
          <button className="ghost" onClick={replay}>Replay</button>
        </header>
        <div className="paper">
          <canvas ref={canvasRef} />
          <div className={`caption ${caption ? "show" : ""}`}>{caption}</div>
        </div>
        <footer className="bar">
          <span className={dotClass} />
          <span>{statusText}</span>
        </footer>
      </main>
    </div>
  );
}
