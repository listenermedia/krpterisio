import io from "socket.io-client";

let socket: any;

export const getSocket = () => {
    if (!socket) {
        // In development, Vite proxies /socket.io to the backend.
        // In production, the backend serves the frontend so same origin works.
        socket = io("http://localhost:3000");
    }
    return socket;
};
