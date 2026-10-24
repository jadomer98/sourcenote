import { describe, expect, it } from 'vitest';
import { defaultLayout, parseLayout, resizePair } from '../src/lib/workspace-layout';

describe('workspace layout recovery and size bounds', () => {
  it('recovers from corrupt or stale browser settings', () => {
    for (const raw of [null, '{', 'null', '42', '[]'])
      expect(parseLayout(raw)).toEqual(defaultLayout);
    const layout = parseLayout(
      JSON.stringify({
        sidebarWidth: 9999,
        weights: { chat: -30, sources: 'wide' },
        hidden: ['unknown', 'sources', 'sources'],
        focused: 'sources',
      }),
    );
    expect(layout.sidebarWidth).toBe(340);
    expect(layout.hidden).toEqual(['sources']);
    expect(layout.focused).toBeNull();
    expect(layout.weights.sources).toBe(defaultLayout.weights.sources);
    expect(layout.weights.chat).toBeGreaterThan(0);
  });
  it('preserves valid choices including a compact navigation and all-closed recovery state', () => {
    const layout = {
      sidebarCollapsed: true,
      sidebarWidth: 288,
      weights: { sources: 12.5, chat: 50, studio: 37.5 },
      hidden: ['sources', 'chat', 'studio'],
      focused: null,
    };
    expect(parseLayout(JSON.stringify(layout))).toEqual(layout);
  });
  it('holds total width fixed and respects both panel minima at drag extremes', () => {
    for (const delta of [-10000, -100, 0, 100, 10000]) {
      const [left, right] = resizePair(280, 500, delta, 170, 240);
      expect(left + right).toBeCloseTo(780);
      expect(left).toBeGreaterThanOrEqual(170);
      expect(right).toBeGreaterThanOrEqual(240);
    }
  });
  it('scales minima together when a narrow viewport cannot fit normal widths', () => {
    const [left, right] = resizePair(80, 100, 10000, 170, 240);
    expect(left + right).toBeCloseTo(180);
    expect(left).toBeGreaterThan(0);
    expect(right).toBeGreaterThan(0);
    expect(left / right).toBeCloseTo(170 / 240);
  });
});
