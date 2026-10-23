export const MULTIPLIERS = { normal: 1, double: 2, redouble: 4, single_hand: 3 };
export const SINGLE_HAND_CALL = 29;
export const TOTAL_POINTS = 29;

// Preview only. The backend is the source of truth for scoring.
export function multiplier(doubled, redoubled, single = false) {
  if (single) return doubled || redoubled ? null : MULTIPLIERS.single_hand;
  if (redoubled && !doubled) return null;
  if (redoubled) return MULTIPLIERS.redouble;
  if (doubled) return MULTIPLIERS.double;
  return MULTIPLIERS.normal;
}

export function modeLabel(set) {
  if (set.single_hand) return "Single Hand";
  if (set.redoubled) return "Redouble";
  if (set.doubled) return "Double";
  return "Normal";
}

export function previewSet(call, points, doubled, redoubled, single = false) {
  const m = multiplier(doubled, redoubled, single);
  if (m == null || !Number.isInteger(points) || points < 0 || points > TOTAL_POINTS) return null;
  const needed = single ? SINGLE_HAND_CALL : call;
  const opponentPoints = TOTAL_POINTS - points;
  if (points >= needed) return { success: true, opponentPoints, caller: m, opponent: 0 };
  return { success: false, opponentPoints, caller: -m, opponent: opponentPoints >= needed ? 1 : 0 };
}

export function rateText(value) {
  return value == null ? "N/A" : `${value}%`;
}

export function signed(n) {
  if (n == null) return "—";
  return n > 0 ? `+${n}` : String(n);
}

export const tokenKey = (matchId) => `t29-${matchId}`;
