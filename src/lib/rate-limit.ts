function duration(value: string | null): number | null {
  if (!value) return null;
  if (/^\d+(\.\d+)?$/.test(value)) return Math.max(1, Math.ceil(Number(value)));
  const pieces = [...value.matchAll(/(\d+(?:\.\d+)?)(ms|s|m|h)/g)];
  if (!pieces.length || pieces.map((m) => m[0]).join('') !== value) return null;
  return Math.max(
    1,
    Math.ceil(
      pieces.reduce(
        (n, m) => n + Number(m[1]) * ({ ms: 0.001, s: 1, m: 60, h: 3600 }[m[2]] || 0),
        0,
      ),
    ),
  );
}
export function providerRetryAfter(headers: Headers) {
  const explicit = duration(headers.get('retry-after'));
  const reset = duration(
    headers.get(
      headers.get('x-ratelimit-remaining-requests') === '0'
        ? 'x-ratelimit-reset-requests'
        : 'x-ratelimit-reset-tokens',
    ),
  );
  return Math.min(explicit ?? reset ?? 60, 86400);
}
