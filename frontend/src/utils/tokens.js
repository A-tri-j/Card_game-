const TOKEN_PREFIX = "cardly:token:";
const CREATOR_KEY = "cardly:creator";

export function saveToken(matchId, token) {
  try {
    localStorage.setItem(TOKEN_PREFIX + matchId, token);
  } catch {
    /* storage blocked */
  }
}

export function getToken(matchId) {
  try {
    return localStorage.getItem(TOKEN_PREFIX + matchId);
  } catch {
    return null;
  }
}

export function saveCreator(name) {
  try {
    localStorage.setItem(CREATOR_KEY, name);
  } catch {
    /* ignore */
  }
}

export function getCreator() {
  try {
    return localStorage.getItem(CREATOR_KEY) || "";
  } catch {
    return "";
  }
}
