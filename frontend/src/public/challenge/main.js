import AuthService from "/utils/user.js";

const playerList = document.getElementById("player-list");
const statusLabel = document.querySelector("#challenge-status .status-text");
const buttons = document.querySelectorAll(".challenge-btn");
const currentsignedUser = document.querySelector("#current-user");

let currentUser = null;

const mockPlayers = [
    { username: "Test" },
    { username: "Nacho" },
    { username: "Aron" },
    { username: "Steven" },
];

let challenges = {};

// Load user info
async function init() {
    currentUser = await AuthService.getUser();
    if (!currentUser) {
        window.location.href = "/auth/login";
        return;
    }
    currentsignedUser.textContent = currentUser.username || "You";
    renderPlayerList();
}

function renderPlayerList() {
    playerList.innerHTML = "";

    mockPlayers.forEach((player) => {
        if (player.username === currentUser.username) return;

        const status = challenges[player.username] || "available";
        const playerItem = document.createElement("div");
        playerItem.classList.add("player-item");
        playerItem.dataset.username = player.username;

        const infoDiv = document.createElement("div");
        infoDiv.classList.add("info");
        const avatarDiv = document.createElement("div");
        avatarDiv.classList.add("avatar", "small");
        avatarDiv.textContent = "";
        const nameSpan = document.createElement("span");
        nameSpan.textContent = player.username;
        infoDiv.appendChild(avatarDiv);
        infoDiv.appendChild(nameSpan);

        const button = document.createElement("button");
        button.classList.add("primary-button");

        switch (status) {
            case "pending":
                button.textContent = "Pendiente...";
                button.disabled = true;
                break;
            case "accepted":
                button.textContent = "Empezar Partida";
                button.onclick = () => goToMatch(player.username);
                break;
            case "rejected":
                button.textContent = "Desafiar Nuevamente";
                button.onclick = () => sendChallenge(player.username);
                break;
            case "received":
                button.textContent = "Aceptar Desafio";
                button.onclick = () => acceptChallenge(player.username);
                break;
            default:
                button.textContent = "Desafiar";
                button.onclick = () => sendChallenge(player.username);
                break;
        }

        playerItem.appendChild(infoDiv);
        playerItem.appendChild(button);
        playerList.appendChild(playerItem);
    });
}

async function sendChallenge(opponent) {
    challenges[opponent] = "pending";
    statusLabel.textContent = `Esperando a ${opponent}...`;
    renderPlayerList();

    // Mock de "aceptado"
    setTimeout(() => {
        challenges[opponent] = Math.random() > 0.3 ? "accepted" : "rejected";
        statusLabel.textContent =
            challenges[opponent] === "accepted"
                ? `${opponent} Desafio Aceptado!`
                : `${opponent} Desafio Rechazado.`;
        renderPlayerList();
    }, 2000);
}

function acceptChallenge(opponent) {
    challenges[opponent] = "accepted";
    statusLabel.textContent = `Desafio de ${opponent} aceptado. Esperando al Host para iniciar...`;
    renderPlayerList();
}

function goToMatch(opponent) {
    challenges[opponent] = "active";
    statusLabel.textContent = `Comenzando partida con ${opponent}...`;
    setTimeout(() => {
        // TODO : Redirigir a la página del juego con los parámetros necesarios
        window.location.href = "/components/game/game.html";     
    }, 1000);
}

init();
