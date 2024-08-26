export function setupFourWins(socket) {
    const playField = document.getElementById("playfield");
    const playerChip = document.getElementById("chip").getElementsByTagName("circle")[0];
    const gameText = document.getElementById("gameText");
    
    const victoryAudio = document.getElementById("victoryAudio");
    const dingAudio = document.getElementById("dingAudio");

    const resetButton = document.getElementById("resetButton");
    const leaveButton = document.getElementById("leaveButton");

    const playerName = document.getElementById("playerName");
    const playerImage = document.getElementById("playerImage");

    const opponentName = document.getElementById("opponentName");
    const opponentImage = document.getElementById("opponentImage");

    let color = "red";
    let currentRoom = "";
    let currentRoomUsers = [];
    let ownID;
    let turn = "yellow";

    // Erstellt die übrigen Spielzellen anhand der vorgegebenen Zelle.
    for(let i=0; i<41; i++) {
        const cell = document.getElementsByClassName("cell")[0];
        const newCell = cell.cloneNode(true);

        // Es sollen nur die erste Reihe als Drag-Zielpunkte dienen.
        if (i > 5) {
            newCell.classList.remove("drag");
        } else {
            // Der ersten Reihe wird pro Zelle die jeweilige Spaltenzahl zugewiesen, um später beim Drop die gewünschte Spalte zuermitteln.
            newCell.setAttribute("data-colmn", (i+1)%7);
        }

        // Die neue Zelle wird dem Spielfeld hinzugefügt.
        playField.append(newCell);
    }

    const draggers = document.querySelectorAll('.drag');

    // Die Zellen, die als Drag-Zielpunkte dienen, kriegen die notwendigen EventsListener zugewiesen.
    draggers.forEach(container => {
        const backgroundCirlce = container.getElementsByTagName("circle")[0];

        // Wenn man sich mit dem Spielchip über ein Drag-Zielpunkt befindet soll dieser gehighlightet werden.
        container.addEventListener("dragenter", event => {
            event.preventDefault();

            backgroundCirlce.classList.add('drag-over');
        });

        container.addEventListener("dragover", event => {
            event.preventDefault();

            backgroundCirlce.classList.add('drag-over');
        });

        // Wenn man sich nicht mehr über dem Drag-Zielpunkt befindet soll dieser nicht mehr gehighlightet werden.
        container.addEventListener("dragleave", event => {
            event.preventDefault();

            backgroundCirlce.classList.remove('drag-over');
        });

        // Wenn der Spielchip losgelassen wird, soll dieser in die Spalte fallen.
        container.addEventListener("drop", event => {
            event.preventDefault();

            const colmn = container.getAttribute("data-colmn");

            // Wenn man den Spielchip über dem Drag-Zielpunkt loslässt soll dieser nicht mehr gehighlightet werden.
            backgroundCirlce.classList.remove('drag-over');

            // Es wird geprüft, ob die Spalte bereits voll ist.
            // Es wird geprüft, ob der Spieler dran ist.
            // Wenn die Spalte nicht voll ist und der Spieler dran ist, wird der Spielzug über den Server mitgeteilt.
            if (isFull(colmn)) {
                // Fehlermeldung, wenn die Spalte voll ist.
                gameText.innerHTML = "Spalte ist voll!";
            } else if (turn !== color) {
                // Fehlermeldung, wenn der Spieler nicht dran ist.
                gameText.innerHTML = "Du bist nicht dran!";
            } else {
                // Der Spielzug wird als Game Message mit dem Identifier "move" gesendet und mit der Spalte und der Spielerfarbe.
                socket.emit("game message", {content: ["move", [colmn, color]], to: currentRoom});
            }
        });
    });

    // Wenn die Spieler das Spiel zurücksetzten wollen, wird dies über den Server mitgeteilt.
    resetButton.addEventListener("click", () => {
        // Die Reset-Anfrage wird als Game Message mit dem Identifier "reset" gesendet.
        socket.emit("game message", {content: ["reset"], to: currentRoom});
    });

    // Der Spieler kann jederzeit den Raum über einen "Verlassen"-Knopf verlassen.
    leaveButton.addEventListener("click", () => {
        // Dem Server wird über das Verlassen, des Spielers, benachrichtigt
        socket.emit("leave room", {room: currentRoom});
    });

    // Wenn eine Game Message mit dem Identifier "move" empfangen wird, soll der Spielchip ins Spielfeld gesetzt werden.
    // Wenn eine Game Message mit dem Identifier "reset" empfangen wird, soll das Spiel zurückgesetzt werden.
    socket.on("game message", ({ content, from }) => {
        if (content[0] === "move") {
            // Der Spielchip soll an die Stelle aus der Game Message gesetzt werden.
            dropChip(parseInt(content[1][0]), content[1][1]);

            // Wenn das Spiel noch nicht gewonnen wurde, ist der nächste Spieler dran.
            // Wenn das Spiel unentschieden ist, sollen die Spieler das erfahren.
            // Wenn das Spiel gewonnen wurde, sollen die Spieler erfahren wer gewonnen hat.
            if (!isWon(turn) && !isRemi()) {
                // Wechselt den Spieler, der gerade dran ist.
                if (turn === "yellow") {
                    turn = "red";
                } else {
                    turn = "yellow";
                }

                if (turn === color) {
                    // Um den Spieler zu benachrichtigen wird ein Sound abgespielt.
                    dingAudio.play();
                }

                // Markiert den Spieler der dran ist und editiert den Game Text.
                setTurnPlayer(turn, color);
            } else if (isWon(turn)) {
                // Wenn man der Spieler der gewonnen hat ist, wird neben dem geänderten Game Text auch ein Sound abgespielt.
                // Wenn der andere Spieler gewonnen hat, wird nur der Game Text geändert.
                if (turn === color) {
                    gameText.innerHTML = "Du hast gewonnen!";

                    victoryAudio.play();
                } else {
                    gameText.innerHTML = "Dein Gegner hat gewonnen!";
                }

                // Das Spielfeld wird gesperrt, damit man noch sehen kann wo gewonnnen wurde.
                turn = "none";
                // Der Reset-Knopf wird sichtbar gemacht.
                resetButton.classList.remove("hidden");
            } else {
                gameText.innerHTML = "Unentschieden!";

                // Das Spielfeld wird gesperrt, damit man noch sehen kann wo welcher Chip liegt.
                turn = "none";
                // Der Reset-Knopf wird sichtbar gemacht.
                resetButton.classList.remove("hidden");
            }
        } else if (content[0] === "reset") {
            // Das Spielfeld wird zurückgesetzt.
            resetGame();
            // Der Gelbe-Spieler ist wieder dran.
            turn = "yellow";

            // Markiert den Spieler der dran ist und editiert den Game Text.
            setTurnPlayer(turn, color);
            // Der Reset-Knopf wird wieder versteckt.
            resetButton.classList.add("hidden");
        }
    });

    // Wenn man einem Raum betritt, soll herausgefunden werden welcher Spieler man ist.
    socket.on("join accept", ({room, roomUsers}) => {
        // Sollte bereits eine Runde gespielt worden sein, soll diese zuerst zurück gesetzt werden.
        turn = "yellow";
        resetGame();
        // Reset-Knopf wird versteckt
        resetButton.classList.add("hidden");

        // Der aktuelle Raum und die aktuellen Raum User werden gesetzt.
        currentRoom = room;
        currentRoomUsers = roomUsers;

        // Wenn man der erste im Raum ist, ist man der Rote-Spieler.
        // Sonst ist man der Gelbe-Spieler.
        if (roomUsers.length > 1) {
            color = "yellow";
        } else {
            color = "red";
        }

        // Die Spielerkarte des Spielers wird angepasst.
        const username = getUsernameFromID(ownID, currentRoomUsers);
        playerName.innerHTML = username;
        setImage(playerImage, md5(username));

        // Wenn ein Gegner bereits im Raum ist wird sein Spielerkarte angepasst.
        // Wenn kein Gegner vorhanden ist, wird die Spielerkarte zurückgesetzt.
        if (currentRoomUsers.length > 1) {
            const username = getUsernameFromID(currentRoomUsers[0]["userID"], currentRoomUsers);
            opponentName.innerHTML = username;
            setImage(opponentImage, md5(username));
        } else {
            opponentName.innerHTML = "Gegner...";
            setImage(opponentImage, "");
        }

        // Markiert den Spieler der dran ist und editiert den Game Text.
        setTurnPlayer(turn, color);
        // Der eigene Spielerchip erhält die Farbe des jeweiligen Spielers.
        playerChip.style.fill = color;
    });

    // Wenn ein neuer Gegner den Raum betritt, soll der Raum zurückgesetzt werden.
    socket.on("user joined room", (user) => {
        // Der neue Gegner wird den aktuellen Usern hinzugefügt.
        currentRoomUsers.push(user);

        // Die Spielerkarte des Gegners wird angepasst.
        const username = getUsernameFromID(user.userID, currentRoomUsers);
        opponentName.innerHTML = username;
        setImage(opponentImage, md5(username));

        // Der Spieler, der zuerst da war, erhält die Farbe Rot.
        color = "red";
        // Der Gelbe-Spieler ist zuerst dran.
        turn = "yellow";
        // Der eigene Spielerchip erhält die Farbe des jeweiligen Spielers.
        playerChip.style.fill = color;

        // Das Spiel wird zurückgesetzt. 
        resetGame();
        // Reset-Knopf wird versteckt
        resetButton.classList.add("hidden");
        // Markiert den Spieler der dran ist und editiert den Game Text.
        setTurnPlayer(turn, color);
    });

    // Wenn der Spieler sich mit dem Server verbindet wird die eigene ID gespeichert.
    socket.on("connected", ({ ownUserID }) => {
        ownID = ownUserID;
    });
}

// Das Spielerbild wird mit dem Bild von der E-Mail Adresse von Gravater ausgefüllt.
function setImage(imageObject, hash) {
    fetch("https://www.gravatar.com/avatar/" + hash)
    .then(response => response.blob())
    .then(imageBlob  => {
        imageObject.setAttribute("src", URL.createObjectURL(imageBlob));
    })
    .catch(error => console.error(error));
}

// Mit dieser Funktion kann der Username von einer ID aus eine beliebigen Liste erfahren werden.
function getUsernameFromID(id, userList) {
    for (const { userID, username } of userList) {
        if (userID === id) return username;
    }
    // Sollte es die ID nicht geben, wird "Anonym" zurückgegeben.
    return "Anonym";
}

// Markiert den Spieler der dran ist und editiert den Game Text.
function setTurnPlayer(turn, color) {
    const playerCard = document.getElementById("playerContainer");
    const opponentCard = document.getElementById("opponentContainer");
    const gameText = document.getElementById("gameText");

    // Wenn man dran ist, wird dies als Game Text gesetzt und die eigene Spielerkarte markiert.
    // Wenn der Gegner dran ist, wird dies als Game Text gesetzt und die Spielerkarte des Gegners markiert.
    if (turn === color) {
        gameText.innerHTML = "Du bist dran!";

        playerCard.classList.add("on-turn");
        opponentCard.classList.remove("on-turn");
    } else {
        gameText.innerHTML = "Dein Gegner ist dran!";

        opponentCard.classList.add("on-turn");
        playerCard.classList.remove("on-turn");
    }
}

// Überprüft ob die jeweilige Spalte bereits voll ist.
function isFull(colmn) {
    const cells = document.querySelectorAll(".cell");
    // Erstellt eine Liste mit den verfügbaren Zellen der vorhandenen Spalten.
    const grid = [
        [cells[0], cells[7], cells[14], cells[21], cells[28], cells[35]],
        [cells[1], cells[8], cells[15], cells[22], cells[29], cells[36]],
        [cells[2], cells[9], cells[16], cells[23], cells[30], cells[37]],
        [cells[3], cells[10], cells[17], cells[24], cells[31], cells[38]],
        [cells[4], cells[11], cells[18], cells[25], cells[32], cells[39]],
        [cells[5], cells[12], cells[19], cells[26], cells[33], cells[40]],
        [cells[6], cells[13], cells[20], cells[27], cells[34], cells[41]]
    ];

    // Ermittelt die letzte leere Zelle der gesuchten Spalte.
    const lastEmpty = getLastEmpty(grid[colmn]);

    // Wenn keine leere Zelle mehr verfügbar ist, wird "false" zurückgegeben.
    // Wenn noch eine Zelle verfügbar ist, wird "true" zurückgegeben.
    if (lastEmpty !== -1) {
        return false;
    } else {
        return true;
    }
}

// Erstellt eine Liste der Zellen der vorhandenen Spalten und fügt einen Spielchip ein.
function dropChip(colmn, color) {
    const cells = document.querySelectorAll(".cell");
    const grid = [
        [cells[0], cells[7], cells[14], cells[21], cells[28], cells[35]],
        [cells[1], cells[8], cells[15], cells[22], cells[29], cells[36]],
        [cells[2], cells[9], cells[16], cells[23], cells[30], cells[37]],
        [cells[3], cells[10], cells[17], cells[24], cells[31], cells[38]],
        [cells[4], cells[11], cells[18], cells[25], cells[32], cells[39]],
        [cells[5], cells[12], cells[19], cells[26], cells[33], cells[40]],
        [cells[6], cells[13], cells[20], cells[27], cells[34], cells[41]]
    ];

    // Ermittelt die letzte leere Zelle.
    const lastEmpty = getLastEmpty(grid[colmn]);

    const backgroundCirlce = grid[colmn][lastEmpty].getElementsByTagName("circle")[0];
    // Setzt die Farbe der gefundenen Zelle, auf die Farbe des Spielchips.
    backgroundCirlce.setAttribute("fill", color);
}

// Überprüft welchee Zelle noch leer ist.
function getLastEmpty(cells) {
    // Wenn keine Zelle mehr leer ist wird "-1" zurückgegeben.
    let i = -1;

    // Für jede Zelle, die noch leer ist wird i hochgezählt.
    cells.forEach(cell => {
        const backgroundCirlce = cell.getElementsByTagName("circle")[0];

        if (backgroundCirlce.getAttribute("fill") === "darkblue") {
            i++;
        }
    });

    return i;
}

// Setzt das Spielfeld zurück
function resetGame() {
    const cells = document.querySelectorAll(".cell");

    // Setzt alle Zellen wieder auf die standard Farbe zurück.
    cells.forEach(cell => {
        const backgroundCirlce = cell.getElementsByTagName("circle")[0];
        backgroundCirlce.setAttribute("fill", "darkblue");
    });
}

// Überprüft ob das Spiel gewonnen wurde.
function isWon(color) {
    const cells = document.querySelectorAll(".cell");
    const grid = [
        [],
        [],
        [],
        [],
        [],
        []
    ];
    
    let gridRow = 0;

    // Es wird eine Matrix erstellt, mit den Farben der Zellen.
    cells.forEach(cell => {
        if (grid[gridRow].length === 7) {
            gridRow++;
        }

        const backgroundCirlce = cell.getElementsByTagName("circle")[0];
        grid[gridRow].push(backgroundCirlce.getAttribute("fill"));
    });

    // Es werden die horizontalen Gewinnmöglichkeiten überprüft.
    // Dabei wird immer eine Zelle und dann die nächsten drei horizontalen Zellen überprüft.
    for (let row=0; row<6; row++) {
        for (let colm=0; colm<4; colm++) {
            if (grid[row][colm] == color && grid[row][colm+1] == color && grid[row][colm+2] == color && grid[row][colm+3] == color) {
                // Sollte eine Gewinnmöglichkeit erreicht wurde, wird "true" zurückgegeben.
                return true;
            }
        }
    }

    // Es werden die vertikalen Gewinnmöglichkeiten überprüft.
    // Dabei wird immer eine Zelle und dann die nächsten drei vertikalen Zellen überprüft.
    for (let colm=0; colm<7; colm++) {
        for (let row=0; row<3; row++) {
            if (grid[row][colm] == color && grid[row+1][colm] == color && grid[row+2][colm] == color && grid[row+3][colm] == color) {
                // Sollte eine Gewinnmöglichkeit erreicht wurde, wird "true" zurückgegeben.
                return true;
            }
        }
    }

    // Es werden die diagonalen (nach oben rechts) Gewinnmöglichkeiten überprüft.
    // Dabei wird immer eine Zelle und dann die nächsten diagonalen (nach oben rechts) Zellen überprüft.
    for (let colm=0; colm<4; colm++) {
        for (let row=3; row<6; row++) {
            if (grid[row][colm] == color && grid[row-1][colm+1] == color && grid[row-2][colm+2] == color && grid[row-3][colm+3] == color) {
                // Sollte eine Gewinnmöglichkeit erreicht wurde, wird "true" zurückgegeben.
                return true;
            }
        }
    }

    // Es werden die diagonalen (nach links oben) Gewinnmöglichkeiten überprüft.
    // Dabei wird immer eine Zelle und dann die nächsten diagonalen (nach oben links) Zellen überprüft.
    for (let colm=3; colm<7; colm++) {
        for (let row=3; row<6; row++) {
            if (grid[row][colm] == color && grid[row-1][colm-1] == color && grid[row-2][colm-2] == color && grid[row-3][colm-3] == color) {
                // Sollte eine Gewinnmöglichkeit erreicht wurde, wird "true" zurückgegeben.
                return true;
            }
        }
    }

    // Wenn nicht gewonnen wurde, wird "false" zurückgegeben.
    return false;
}

// Überprüft ob ein Unentschieden vorhanden ist.
function isRemi() {
    const cells = document.querySelectorAll(".cell");
    // Erstellt eine Liste mit den verfügbaren Zellen der vorhandenen Spalten.
    const grid = [
        [cells[0], cells[7], cells[14], cells[21], cells[28], cells[35]],
        [cells[1], cells[8], cells[15], cells[22], cells[29], cells[36]],
        [cells[2], cells[9], cells[16], cells[23], cells[30], cells[37]],
        [cells[3], cells[10], cells[17], cells[24], cells[31], cells[38]],
        [cells[4], cells[11], cells[18], cells[25], cells[32], cells[39]],
        [cells[5], cells[12], cells[19], cells[26], cells[33], cells[40]],
        [cells[6], cells[13], cells[20], cells[27], cells[34], cells[41]]
    ];

    for (let i=0; i<7; i++) {
        // Ermittelt die letzte leere Zelle der gesuchten Spalte.
        const lastEmpty = getLastEmpty(grid[i]);

        // Wenn keine leere Zelle mehr verfügbar ist, wird "false" zurückgegeben.
        // Wenn noch eine Zelle verfügbar ist, wird "true" zurückgegeben.
        if (lastEmpty !== -1) {
            return false;
        }
    }

    // Wenn kein Remi vorliegt, wird "true" zurückgegeben.
    return true;
}