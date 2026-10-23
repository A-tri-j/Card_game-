const API = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers["X-Edit-Token"] = token;

  let response;
  try {
    response = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Unable to connect to server. Please try again shortly.");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    let message = "Something went wrong";
    if (typeof data?.detail === "string") message = data.detail;
    else if (Array.isArray(data?.detail)) {
      message = data.detail.map((d) => d.msg).join(", ");
    }
    throw new Error(message);
  }
  return data;
}

export const api = {
  health: () => request("/health"),
  searchPlayers: (q) => request(`/api/players?search=${encodeURIComponent(q)}`),
  listMatches: (query = "") => request(`/api/matches${query}`),
  getMatch: (id) => request(`/api/matches/${id}`),
  createMatch: (body) => request("/api/matches", { method: "POST", body }),
  updateRound: (id, round, body, token) =>
    request(`/api/matches/${id}/rounds/${round}`, { method: "PATCH", body, token }),
  completeMatch: (id, token) =>
    request(`/api/matches/${id}/complete`, { method: "POST", token }),
  reopenMatch: (id, token) =>
    request(`/api/matches/${id}/reopen`, { method: "POST", token }),
  closeMatch: (id, token) =>
    request(`/api/matches/${id}/close`, { method: "PATCH", token }),
  dashboard: (game = "call_bridge", player = "") =>
    request(`/api/dashboard?game=${game}&player=${encodeURIComponent(player)}`),
  leaderboard: (game = "call_bridge") => request(`/api/leaderboard?game=${game}`),
  t29: {
    create: (body) => request("/api/t29/matches", { method: "POST", body }),
    get: (id) => request(`/api/t29/matches/${id}`),
    setPlayers: (id, players, token) =>
      request(`/api/t29/matches/${id}/players`, { method: "PATCH", body: { players }, token }),
    start: (id, token) => request(`/api/t29/matches/${id}/start`, { method: "POST", token }),
    recordCall: (id, body, token) =>
      request(`/api/t29/matches/${id}/sets/call`, { method: "POST", body, token }),
    submitResult: (id, setNumber, body, token) =>
      request(`/api/t29/matches/${id}/sets/${setNumber}/result`, { method: "POST", body, token }),
    end: (id, token) => request(`/api/t29/matches/${id}/end`, { method: "POST", token }),
    cancel: (id, token) =>
      request(`/api/t29/matches/${id}/cancel`, { method: "POST", body: { confirm: true }, token }),
    history: (query = "") => request(`/api/t29/matches${query}`),
    dashboard: () => request("/api/t29/stats/dashboard"),
    players: () => request("/api/t29/stats/players"),
    teams: () => request("/api/t29/stats/teams"),
    headToHead: () => request("/api/t29/stats/head-to-head"),
  },
};
