const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const { jwtSecret } = require("./config");

// userId -> Set<WebSocket>
const userIdToSockets = new Map();

function authTokenFromQuery(url) {
  try {
    const query = url.split("?")[1] || "";
    const pairs = new URLSearchParams(query);
    return pairs.get("token");
  } catch (_) {
    return null;
  }
}

function bindSocketToUser(userId, ws) {
  if (!userIdToSockets.has(userId)) userIdToSockets.set(userId, new Set());
  userIdToSockets.get(userId).add(ws);

  ws.on("close", () => {
    const set = userIdToSockets.get(userId);
    if (set) {
      set.delete(ws);
      if (set.size === 0) userIdToSockets.delete(userId);
    }
  });
}

function safeSend(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function pushToUser(userId, payload) {
  const set = userIdToSockets.get(userId);
  if (!set) return 0;
  let count = 0;
  for (const ws of set) {
    safeSend(ws, payload);
    count++;
  }
  return count;
}

function broadcastToUsers(userIds, payload) {
  let total = 0;
  userIds.forEach((id) => {
    total += pushToUser(id, payload);
  });
  return total;
}

function initWebSocketServer(server) {
  const wss = new WebSocket.Server({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const token = authTokenFromQuery(req.url);
    if (!token) {
      ws.close(4001, "NO_TOKEN");
      return;
    }
    try {
      const decoded = jwt.verify(token, jwtSecret);
      const userId = decoded.id;
      bindSocketToUser(userId, ws);
      safeSend(ws, { type: "connected", data: { userId } });
    } catch (e) {
      ws.close(4002, "INVALID_TOKEN");
    }
  });

  return wss;
}

module.exports = {
  initWebSocketServer,
  pushToUser,
  broadcastToUsers,
};
