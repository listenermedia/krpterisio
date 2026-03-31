import io from "socket.io-client";

let socket: any;

export const getSocket = () => {
    if (!socket) {
        // In development, Vite proxies /socket.io to the backend (localhost:3000).
        // In production, the backend serves the frontend so same origin works.
        const url = import.meta.env.DEV
            ? "http://localhost:3000"
            : window.location.origin;
        socket = io(url);
    }
    return socket;
};
