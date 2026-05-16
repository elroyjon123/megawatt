let socket;
let socketInitPromise;

/**
 * Lazily loads socket.io-client only when needed (charger pages).
 */
export async function getSocketAsync() {
  if (socket) return socket;
  if (socketInitPromise) return socketInitPromise;

  socketInitPromise = import("socket.io-client").then(({ io }) => {
    socket = io(import.meta.env.VITE_SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: true,
    });
    return socket;
  });

  return socketInitPromise;
}

// Backwards-compatible sync accessor (returns null until initialized)
export function getSocket() {
  return socket;
}
