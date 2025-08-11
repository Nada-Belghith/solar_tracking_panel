import { io } from 'socket.io-client';

const socket = io("ws://localhost:3001", {
  transports: ["websocket"],
  query: {
    deviceId: "782baff0-6e0b-11f0-bfde-afa75a2b2a02",
    deviceToken: "BWCCwuYsd0VGOM464Y92",
  },
});

export default socket;