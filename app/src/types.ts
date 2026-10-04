// Messages Fo sends over the live channel, and that saved canvases are made of.
export type Point = [number, number];

export type StrokeMsg = { p: Point[]; c?: string; w?: number; s?: number; f?: string };
export type PixelMsg = { px: [number, number, string | null][]; d?: number };
export type GridMsg = { grid: number };
export type SayMsg = { say: string };
export type ClearMsg = { clear: true };
/** Starts a fresh live canvas with a title, e.g. "Sunday, October 4, 12:20 PM". */
export type CanvasMsg = { canvas: { id: string; title: string } };

export type Msg = StrokeMsg | PixelMsg | GridMsg | SayMsg | ClearMsg | CanvasMsg;

export type SavedCanvasMeta = { id: string; title: string; created: string; file: string };
export type SavedCanvas = { id: string; title: string; created: string; messages: Msg[] };
