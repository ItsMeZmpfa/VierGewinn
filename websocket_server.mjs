import { Server } from "socket.io";

const io = new Server(3001, {
  cors: {
    origin: "http://127.0.0.1:3000"
  }
});

const ROOMS = ["room1", "room2", "room3", "room4"];
const roomUsers = Object.fromEntries(ROOMS.map((r) => [r, []]));

io.use((socket, next) => {
  const username = socket.handshake.auth.username;
  if (!username) {
    return next(new Error("invalid username"));
  }
  socket.username = username;
  next();
});

io.on("connection", (socket) => {
  console.log(`Client connected with id: ${socket.id} and username: ${socket.username}`)
  socket.emit("connected", {ownUserID: socket.id});

  // inform newly connected user about currently connected users;
  const users = [];
  for (let [id, socket] of io.of("/").sockets) {
    users.push({
      userID: id,
      username: socket.username,
    });
  }
  socket.emit("users", users);

  //inform all already connected users about newly connected user
  socket.broadcast.emit("user connected", {
    userID: socket.id,
    username: socket.username,
  });

  // forward private message from one user to another one
  socket.on("private message", ({ content, to }) => {
    socket.to(to).emit("private message", {
      content,
      from: socket.id,
    });
  });

  //forward public message to all users
  socket.on("public message", ({ content }) => {
    io.emit("public message", {
      content,
      from: socket.id,
    });
  });

  //join room
  socket.on("join room", ({ room }) => {
    if (ROOMS.includes(room)) {
      if (roomUsers[room].length < 2) {
        // Wenn ein User den Raum betritt, wird der vorhandene User benachrichtigt.
        io.in(room).emit("user joined room", { userID: socket.id, username: socket.username });

        socket.join(room);
        roomUsers[room].push({ userID: socket.id, username: socket.username });
        socket.emit("join accept", { room, roomUsers: roomUsers[room] });
      } else {
        socket.emit("join reject", { error: "room full", room });
      }
    } else {
      socket.emit("join reject", { error: "no such room", room });
    }
  });

  //leave room
  socket.on("leave room", ({ room }) => {
    if (ROOMS.includes(room)) {
      socket.leave(room);
      roomUsers[room] = roomUsers[room].filter(({ userID }) => userID !== socket.id);
      socket.emit("leave accept", { room });
    } else {
      socket.emit("leave reject", { error: "no such room", room });
    }
  });

  // forward game message to room users
  socket.on("game message", ({ content, to }) => {
    io.in(to).emit("game message", {
      content,
      from: socket.id,
    });
  });

  // leave room when disconnecting
  socket.on("disconnect", () => {
    for(const [key, userList] of Object.entries(roomUsers)) {
      const newUserList = userList.filter(({ userID }) => userID !== socket.id);
      roomUsers[key] = newUserList;
    }
  });

});