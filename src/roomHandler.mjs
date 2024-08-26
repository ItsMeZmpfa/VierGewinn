export function setupRoomHandler(socket) {
    const roomForm = document.getElementById("roomForm");
    const roomInput = document.getElementById("roomInput");
    const gameButton = document.getElementById("game");
    
    let currentRoom = "lobby";

    // Wenn das Raum Formular ausgefüllt und abgesendet wurde, soll der aktuelle Raum verlassen und der ausgewähle betreten werden.
    roomForm.addEventListener("submit", event => {
        event.preventDefault();

        const room = roomInput.value;

        // Falls vorhanden wird versucht den aktuellen Raum zu verlassen.
        if (currentRoom !== "lobby") {
            socket.emit("leave room", ({room: currentRoom}));
        }

        // Der neue Raum wird versucht zu betreten.
        socket.emit("join room", {room: room});
    });

    // Wenn ein Raum betreteb wurde, wird der Game-Knopf der Navigation angezeigt und der aktuelle Raum geändert.
    socket.on("join accept", ({ room, users }) => {
        gameButton.classList.remove("hidden");
        currentRoom = room;
    });

    // Wenn der Beitritt nicht möglich war, wird ein Fehler ausgegeben.
    socket.on("join reject", ({ error }) => {
        alert(error);
    });

    // Wenn das Verlassen erfolgreich war, wird der Game-Knopf versteckt und der aktuelle Raum geändert.
    socket.on("leave accept", ({ room, users }) => {
        gameButton.classList.add("hidden");
        currentRoom = "lobby";
    });
}