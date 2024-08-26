export function setupChat(socket) {
    const chatContainer = document.getElementById("chatContainer");
    const chatTopBar = document.getElementById("chatTop");
    const chatForm = document.getElementById("chatForm");
    const chatInput = document.getElementById("chatInput");
    
    const lobbyMessages = document.getElementById("lobbyMessages");
    const gameMessages = document.getElementById("gameMessages");

    let userList = [];
    let currentRoom = "lobby";

    chatContainer.style.height = "30px";
    
    // Wenn auf die Top-Bar gedrückt wird, soll der Chat maximiert oder minimiert werden.
    chatTopBar.addEventListener("click", () => {
        if (chatContainer.style.height === "30px") {
            chatContainer.style.height = "500px";
            chatInput.focus();
        } else {
            chatContainer.style.height = "30px";
        }
    });

    // Wenn das Nachrichtenformular ausgefüllt und abgesendet wurde soll eine Nachricht gesendet werden.
    chatForm.addEventListener("submit", event => {
        const text = chatInput.value;
        event.preventDefault();

        // Wenn man sich in der Lobby befindet wird eine Public Message gesendet.
        // Wenn man sich in einem Raum befindet wird eine Game Message gesendet mit dem Identifier "chat".
        if (chatForm.getAttribute("data-chat") === "lobby") {
            socket.emit("public message", { content: text });
        } else {
            socket.emit("game message", { content: ["chat", text], to: currentRoom });
        }

        // Der Input des Formulares soll zurückgesetzt werden.
        chatInput.value = "";
    });

    // Bei der Verbindung mit dem Server werden die anderen User in "userList" abgespeichert.
    socket.on("users", (users) => {
        userList = users;
    });

    // Wenn neue User sich verbinden, soll die Liste erweitert werden.
    socket.on("user connected", (user) => {
        userList.push(user);
    });

    // Wenn eine Public Message empfangen wird, soll diese in den Lobby Chat hinzugefügt werden.
    socket.on("public message", ({ content, from }) => {
        appendMessage(lobbyMessages, content, from, userList);
    });

    // Wenn eine Game Message empfangen wird, soll diese in den Raum Chat hinzugefügt werden.
    socket.on("game message", ({ content, from }) => {
        // Wenn die empfangende Game Message den Identifier "chat" hat wird deren Inhalt dem Raum-Chat hinzugefügt.
        if (content[0] === "chat") {
            appendMessage(gameMessages, content[1], from, userList);
        }
    });

    // Wenn man einen Raum betritt, soll der Chat umgestellt werden, sodass nun der Raum-Chat angezeigt wird.
    socket.on("join accept", ({ room, users }) => {
        currentRoom = room;

        // Der Chat wird geleert, damit alte Nachrichten aus anderen Räumen nicht mehr zusehen sind.
        if (currentRoom !== "lobby") {
            gameMessages.innerHTML = "";
        }
    });

    // Wenn man einen Raum verlässt, soll wieder der Lobby-Chat angezeigt werden.
    socket.on("leave accept", ({ room, users }) => {
        currentRoom = "lobby";
    });
}

// Mit dieser Funktion kann der Username von einer ID aus eine beliebigen Liste erfahren werden.
function getUsernameFromID(id, userList) {
    for (const { userID, username } of userList) {
        if (userID === id) return username;
    }
    // Sollte es die ID nicht geben, wird "Anonym" zurückgegeben.
    return "Anonym";
}

// Mit dieser Funktion wird eine neue Nachricht dem Chat hinzugefügt.
function appendMessage(chat, content, from, userList) {
    const newMessage = document.createElement("div");
    const author = document.createElement("span");
    const spaceing = document.createElement("br");
    const msgContent = document.createElement("span");

    // Der Autor der Nachricht wird gesetzt.
    author.innerHTML = getUsernameFromID(from, userList) + ":";
    // Der Inhalt der Nachricht wird gesetzt.
    msgContent.innerHTML = content;

    // Die Nachrichtenteilelemente werden zu einem Element hinzugefügt.
    newMessage.classList.add("message");
    newMessage.append(author);
    newMessage.append(spaceing);
    newMessage.append(msgContent);

    // Die neue Nachricht wird dem Chat hinzugefügt.
    chat.append(newMessage);

    chat.scrollTo(0, chat.scrollHeight);
}