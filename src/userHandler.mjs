export function setupUser(socket) {
    const signForm = document.getElementById("signInForm");
    const emailInput = document.getElementById("eMailInput");
    const roomForm = document.getElementById("roomForm");
    const chatContainer = document.getElementById("chatContainer");

    // Wenn das User Formular ausgefüllt und abgesendet wurde, soll sich mit dem Server verbunden werden.
    signForm.addEventListener("submit", event => {
        event.preventDefault();

        let username = emailInput.value;
        username = username.trim();
        username = username.toLowerCase();
        
        socket.auth = { username };
        socket.connect();
    });

    // Wenn die Verbindung erfolgreich war, soll das User Formular versteckt werden und das Raum Formular angezeigt werden.
    // Ebenso soll der Lobby-Chat angezeigt werden.
    socket.on("connected", ({ userID }) => {
        signForm.classList.add("hidden");
        roomForm.classList.remove("hidden");
        chatContainer.classList.remove("hidden");
    });

    // Wenn ein Fehler bei der Verbindung aufgetreten ist, wird dieser Fehler ausgegeben.
    socket.on("connect_error", (err) => {
        alert(err.message);
    });
}