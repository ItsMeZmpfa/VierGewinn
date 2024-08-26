export function setupRouter(socket) {
    const router = new Router();

    // Registriert die Routen.
    router.add_route("lobby");
    router.add_route("game");

    // Wenn die Seite geladen wird, wird standardmäßig die erste registrierte Seite angezeigt.
    window.addEventListener("load", () => {
        router.init_routes();
    });

    // Beim Wechseln der HistoryStates wird die vorher definierte ID ausgelesen und der dazugehörige Content geladen.
    window.addEventListener("popstate", event => {
        const id = event.state.id;

        router.load_content(id);
    });
    
    // Wenn ein Raum betreten wurde, wird die Game-Route aufgerufen.
    socket.on("join accept", ({room, roomUsers}) => {
        router.load_site("game");
    });

    // Wenn ein Raum verlassen wurde, wird die Lobby-Route aufgerufen.
    socket.on("leave accept", ({room, roomUsers}) => {
        router.load_site("lobby");
    });
}

class Router {
    constructor() {
        this.routes = [];
        this.currentRoom = "lobby";
    }

    add_route(id) {
        // Registriert eine neue Sicht.
        this.routes.push(id);
    }

    init_routes() {
        // Die EventListener für die Knöpfe werden zugewiesen.
        this.routes.forEach(route => {
            const button = document.getElementById(route);

            button.addEventListener("click", event => {
                this.load_site(event.target.id);
            });
        });

        // Die erste Sicht wird geladen.
        const id = this.routes[0];

        this.load_content(id);
        window.history.pushState({id}, `${id}`, `/`);
    }

    load_site(id) {
        this.load_content(id);

        window.history.pushState({id}, `${id}`, `/${id}`);
    }

    load_content(id) {
        // Die Knöpfe, Sichten und Chats werden zurückgesetzt.
        this.routes.forEach(route => {
            const button = document.getElementById(route);
            const site = document.getElementById(`${route}Container`);
            const chat = document.getElementById(`${route}Messages`);

            button.classList.remove("nav-button-active");
            site.classList.add("hidden");
            chat.classList.add("hidden");
        });

        // Läd die gewollte Sicht und den dazugehörigen Chat.
        const navButton = document.getElementById(`${id}`);
        const idSite = document.getElementById(`${id}Container`);
        const chatTopBar = document.getElementById("chatTop");
        const chatTopTag = chatTopBar.getElementsByTagName("span")[0];
        const chat = document.getElementById(`${id}Messages`);
        const chatForm = document.getElementById("chatForm");
        chatForm.setAttribute("data-chat", id);

        document.title = `${id.toUpperCase()} JS`;
        chatTopTag.innerHTML = `${id[0].toUpperCase() + id.substring(1)}-Chat`;

        // Updatet die neue Ansicht, den dazugehörigen Knopf und den Chat.
        navButton.classList.add("nav-button-active");
        idSite.classList.remove("hidden");
        chat.classList.remove("hidden");
    }
}
