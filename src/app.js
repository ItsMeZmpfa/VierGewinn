import * as fourWins from "./gameHandler.mjs";
import * as roomHandler from "./roomHandler.mjs";
import * as chatHandler from "./chatHandler.mjs";
import * as userHandler from "./userHandler.mjs";
import * as router from "./router.mjs";
import "normalize.css";
import "./app.css";

import { io } from "socket.io-client";

const URL = "http://localhost:3001";
const socket = io(URL, { autoConnect: false });

router.setupRouter(socket);
chatHandler.setupChat(socket);
userHandler.setupUser(socket);
roomHandler.setupRoomHandler(socket);
fourWins.setupFourWins(socket);

// Für Debugging
socket.onAny((event, arg1, ...args) => {
    console.log(event, JSON.stringify(arg1), JSON.stringify(args));
});
