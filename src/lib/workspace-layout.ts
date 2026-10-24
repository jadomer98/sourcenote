export const panelIds = ['sources', 'chat', 'studio'] as const;
export type PanelId = (typeof panelIds)[number];
export type LayoutPreferences = {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  weights: Record<PanelId, number>;
  hidden: PanelId[];
  focused: PanelId | null;
};
export const defaultLayout: LayoutPreferences = {
  sidebarCollapsed: false,
  sidebarWidth: 224,
  weights: { sources: 26, chat: 45, studio: 29 },
  hidden: [],
  focused: null,
};
export const panelLabels: Record<PanelId, string> = {
  sources: 'Quellen',
  chat: 'Chat',
  studio: 'Studio',
};
export const panelMinimums: Record<PanelId, number> = { sources: 170, chat: 240, studio: 190 };
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export function parseLayout(raw: string | null): LayoutPreferences {
  if (!raw) return defaultLayout;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object') return defaultLayout;
    const valid = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
    return {
      sidebarCollapsed: value.sidebarCollapsed === true,
      sidebarWidth: valid(value.sidebarWidth)
        ? clamp(value.sidebarWidth, 176, 340)
        : defaultLayout.sidebarWidth,
      weights: Object.fromEntries(
        panelIds.map((id) => [
          id,
          valid(value.weights?.[id])
            ? clamp(value.weights[id], 0.1, 1000)
            : defaultLayout.weights[id],
        ]),
      ) as Record<PanelId, number>,
      hidden: Array.isArray(value.hidden) ? panelIds.filter((id) => value.hidden.includes(id)) : [],
      focused:
        panelIds.includes(value.focused) && !value.hidden?.includes(value.focused)
          ? value.focused
          : null,
    };
  } catch {
    return defaultLayout;
  }
}
// Keep the pair's combined space fixed; scale minima only when the viewport
// physically cannot accommodate all three usual minimum widths.
export function resizePair(
  left: number,
  right: number,
  delta: number,
  leftMin: number,
  rightMin: number,
) {
  const total = left + right;
  const scale = Math.min(1, total / (leftMin + rightMin));
  const next = clamp(left + delta, leftMin * scale, total - rightMin * scale);
  return [next, total - next] as const;
}
