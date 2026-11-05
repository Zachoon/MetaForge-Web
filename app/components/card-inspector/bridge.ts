type Kind = "over" | "move" | "out" | "focus" | "blur" | "click";
type Handler = (kind: Kind, event: Event) => void;

let handler: Handler | null = null;
const queue: Array<[Kind, Event]> = [];

export function setInspectorHandler(next: Handler | null) {
  handler = next;
  if (!next) return;
  for (const item of queue.splice(0, queue.length)) next(item[0], item[1]);
}

export function emitInspector(kind: Kind, event: Event) {
  if (handler) handler(kind, event);
  else if (queue.length < 12) queue.push([kind, event]);
}
