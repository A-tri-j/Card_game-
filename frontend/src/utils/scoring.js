export function calcScore(call, tricks) {
  if (call === "" || tricks === "" || call == null || tricks == null) return null;

  const c = Number(call);
  const t = Number(tricks);
  if (!Number.isFinite(c) || !Number.isFinite(t)) return null;
  if (c < 1 || c > 13 || t < 0 || t > 13) return null;

  const score = t >= c ? c + (t - c) * 0.1 : -c;
  return Math.round(score * 1000) / 1000;
}

export function fmt(n) {
  return n == null ? "—" : String(Number(n.toFixed(3)));
}
