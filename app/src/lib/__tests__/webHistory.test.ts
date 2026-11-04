import { describe, expect, it } from 'vitest';
import { appDepth, createHistorySync, depthFromState } from '../webHistory';

// A tiny stand-in for the browser: a list of entries and a current position.
function fakeBrowser() {
  const entries: unknown[] = [null];
  let index = 0;
  let onPop: (state: unknown) => void = () => {};
  const history = {
    pushState(state: unknown) { entries.splice(index + 1); entries.push(state); index += 1; },
    replaceState(state: unknown) { entries[index] = state; },
    go(delta: number) { index += delta; onPop(entries[index]); },
  };
  return {
    history,
    entries,
    get index() { return index; },
    back() { history.go(-1); },
    listen(fn: (state: unknown) => void) { onPop = fn; },
  };
}

function setup() {
  const b = fakeBrowser();
  let appDepth = 1;
  const goBackCalls: number[] = [];
  const sync = createHistorySync({
    history: b.history,
    goBack: () => { appDepth -= 1; goBackCalls.push(appDepth); sync.onDepth(appDepth); },
  });
  b.listen((s) => sync.onPop(s));
  const open = () => { appDepth += 1; sync.onDepth(appDepth); };
  const appBack = () => { appDepth -= 1; sync.onDepth(appDepth); };
  return { b, sync, open, appBack, goBackCalls, depth: () => appDepth };
}

describe('web history sync', () => {
  it('adds one browser entry for each screen opened', () => {
    const t = setup();
    t.open(); t.open();
    expect(t.b.entries).toHaveLength(3);
    expect(t.b.index).toBe(2);
  });

  it('the browser back button goes back one screen in the app', () => {
    const t = setup();
    t.open(); t.open();
    t.b.back();
    expect(t.depth()).toBe(2);
    expect(t.goBackCalls).toEqual([2]);
    expect(t.b.index).toBe(1);
    t.b.back();
    expect(t.depth()).toBe(1);
    expect(t.b.index).toBe(0);
  });

  it('the app\'s own back arrow removes the extra entry without going back twice', () => {
    const t = setup();
    t.open(); t.open();
    t.appBack();
    expect(t.b.index).toBe(1);
    expect(t.goBackCalls).toEqual([]);
    expect(t.depth()).toBe(2);
  });

  it('returning several screens at once (for example signing out) drops all extra entries', () => {
    const t = setup();
    t.open(); t.open(); t.open();
    expect(t.b.index).toBe(3);
    t.sync.onDepth(1);
    expect(t.b.index).toBe(0);
    expect(t.goBackCalls).toEqual([]);
  });

  it('opening a screen after going back replaces the forward entries', () => {
    const t = setup();
    t.open(); t.open();
    t.b.back();
    t.open();
    expect(t.b.entries).toHaveLength(3);
    expect(t.b.index).toBe(2);
    expect(t.depth()).toBe(3);
  });

  it('reads the stored depth and treats anything else as the first screen', () => {
    expect(depthFromState({ sangamDepth: 3 })).toBe(3);
    expect(depthFromState(null)).toBe(1);
    expect(depthFromState({ sangamDepth: 'x' })).toBe(1);
  });

  it('counts stacked screens, plus one when a tab other than Community is showing', () => {
    expect(appDepth(undefined)).toBe(1);
    expect(appDepth({ routes: [{ name: 'Tabs', state: { index: 0 } }] })).toBe(1);
    expect(appDepth({ routes: [{ name: 'Tabs', state: { index: 2 } }] })).toBe(2);
    expect(appDepth({ routes: [{ name: 'Tabs' }, { name: 'Post' }] })).toBe(2);
    expect(appDepth({ routes: [{ name: 'Tabs', state: { index: 3 } }, { name: 'Contacts' }] })).toBe(3);
  });
});
