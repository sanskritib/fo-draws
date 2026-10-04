import type { Msg } from "./types";

// Fo sends drawing messages to this public ntfy.sh topic; the page listens with Server-Sent Events.
export const TOPIC = "fo-draws-sk-7q2m9x";
const BASE = `https://ntfy.sh/${TOPIC}`;

type NtfyEvent = { id: string; event: string; message?: string };

function parse(ev: NtfyEvent): Msg[] {
  if (ev.event !== "message" || !ev.message) return [];
  try {
    const m = JSON.parse(ev.message);
    return Array.isArray(m) ? m : [m];
  } catch {
    return [];
  }
}

/** Messages ntfy still holds from the last 12 hours, so a refresh keeps the live canvas. */
export async function loadRecent(): Promise<{ messages: Msg[]; lastId: string | null }> {
  const res = await fetch(`${BASE}/json?poll=1&since=12h`);
  const text = await res.text();
  const messages: Msg[] = [];
  let lastId: string | null = null;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const ev = JSON.parse(line) as NtfyEvent;
    if (ev.event === "message") lastId = ev.id;
    messages.push(...parse(ev));
  }
  return { messages, lastId };
}

/** Listen for new messages. Returns a function that stops listening. */
export function listen(
  sinceId: string | null,
  onMsg: (m: Msg) => void,
  onStatus: (s: "live" | "reconnecting") => void,
): () => void {
  const es = new EventSource(`${BASE}/sse${sinceId ? `?since=${sinceId}` : ""}`);
  es.onopen = () => onStatus("live");
  es.onerror = () => onStatus("reconnecting");
  es.onmessage = (e) => parse(JSON.parse(e.data) as NtfyEvent).forEach(onMsg);
  return () => es.close();
}

/** Only the messages after the most recent "new canvas" or "clear". */
export function currentCanvas(all: Msg[]): { title: string; messages: Msg[] } {
  let start = 0;
  let title = "Live canvas";
  all.forEach((m, i) => {
    if ("canvas" in m) { start = i + 1; title = m.canvas.title; }
    else if ("clear" in m) start = i + 1;
  });
  return { title, messages: all.slice(start) };
}
