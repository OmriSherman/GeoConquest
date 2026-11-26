// A running quiz registers a handler here; the tab navigator calls it on every tab press.
// (A screen can't listen to other tabs' tabPress events itself, they are only delivered to that tab's own screens.)
export type QuizTabPress = { tabName: string; target?: string; preventDefault: () => void };

let handler: ((e: QuizTabPress) => void) | null = null;

export function addQuizTabGuard(h: (e: QuizTabPress) => void): () => void {
  handler = h;
  return () => { if (handler === h) handler = null; };
}

export function runQuizTabGuard(e: { target?: string; preventDefault: () => void }, tabName: string) {
  handler?.({ tabName, target: e.target, preventDefault: () => e.preventDefault() });
}
