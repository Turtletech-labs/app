// Makes the browser's back button (and the Android back button in Chrome) step
// back through the app's screens instead of leaving the site.
//
// The app uses React Navigation without URL linking, so the address never
// changes and the browser has only one history entry. We add one entry for each
// screen the member opens, on the same address, so nothing about the member
// (names, ids) ever appears in the URL or the browser history.
//
// Kept free of React Native imports so it can be unit tested.

export interface HistoryLike {
  pushState(state: unknown, title: string): void;
  replaceState(state: unknown, title: string): void;
  go(delta: number): void;
}

interface Options {
  history: HistoryLike;
  /** Go back one screen in the app. */
  goBack: () => void;
}

const KEY = 'sangamDepth';

export function depthFromState(state: unknown): number {
  const v = state && typeof state === 'object' ? (state as Record<string, unknown>)[KEY] : undefined;
  return typeof v === 'number' && v >= 1 ? v : 1;
}

export function createHistorySync({ history, goBack }: Options) {
  let depth = 1;
  // Popstate events we caused ourselves and must not act on.
  let ignore = 0;
  history.replaceState({ [KEY]: 1 }, '');

  return {
    /** The app now shows `d` stacked screens. */
    onDepth(d: number) {
      if (d === depth) return;
      if (d > depth) {
        for (let i = depth + 1; i <= d; i++) history.pushState({ [KEY]: i }, '');
        depth = d;
      } else {
        // The app went back by itself (a Back button, or signing out), so drop
        // the extra browser entries.
        const delta = d - depth;
        depth = d;
        ignore += 1;
        history.go(delta);
      }
    },
    /** The browser moved to a history entry with this stored depth. */
    onPop(state: unknown) {
      if (ignore > 0) { ignore -= 1; return; }
      const target = depthFromState(state);
      if (target < depth) {
        const steps = depth - target;
        depth = target; // set first, so the state change this causes is a no-op
        for (let i = 0; i < steps; i++) goBack();
      } else if (target > depth) {
        // Forward into a screen that no longer exists. Keep going back.
        history.go(-1);
      }
    },
  };
}

interface RouteLike { name: string; state?: { index?: number } }
interface RootStateLike { routes: RouteLike[] }

/**
 * How many "back steps" the member is from the start: screens stacked on top of
 * the tabs, plus one when a tab other than the first (Community) is showing.
 */
export function appDepth(state: RootStateLike | undefined): number {
  if (!state) return 1;
  const tabs = state.routes.find((r) => r.name === 'Tabs');
  const extra = (tabs?.state?.index ?? 0) > 0 ? 1 : 0;
  return state.routes.length + extra;
}

interface NavRefLike {
  getRootState(): RootStateLike | undefined;
  /** Pop the top screen. */
  goBack(): void;
  /** Show the first tab (Community). */
  goHome(): void;
}

/** True only when the app is the top-level page of a real browser tab. */
export function canSyncWebHistory(): boolean {
  try {
    return typeof window !== 'undefined'
      && typeof window.history?.pushState === 'function'
      && window.self === window.top;
  } catch {
    return false; // cross-origin frame: leave history alone
  }
}

export function attachWebHistory(ref: NavRefLike) {
  const sync = createHistorySync({
    history: window.history,
    goBack: () => {
      const stacked = (ref.getRootState()?.routes.length ?? 1) > 1;
      if (stacked) ref.goBack(); else ref.goHome();
    },
  });
  const onPop = (e: PopStateEvent) => sync.onPop(e.state);
  window.addEventListener('popstate', onPop);
  return {
    onStateChange: () => sync.onDepth(appDepth(ref.getRootState())),
    dispose: () => window.removeEventListener('popstate', onPop),
  };
}
