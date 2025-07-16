import { Server } from "socket.io"

export const connectToSocket = (socket) =>{
    const io = new Server(socket);

    return io;
}