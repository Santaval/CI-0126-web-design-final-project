import AuthService from "/utils/user.js";

const playerList = document.getElementById("player-list");
const statusLabel = document.querySelector("#challenge-status .status-text");
const buttons = document.querySelectorAll(".challenge-btn");
const currentsignedUser = document.querySelector("#current-user");

let currentUser = null;

let players = [];
let refreshInterval = null;
let challenges = {};

// Load user info
async function init() {
    currentUser = await AuthService.getUser();
    if (!currentUser) {
        window.location.href = "/auth/login";
        return;
    }
    currentsignedUser.textContent = currentUser.username || "You";

    await loadPlayers();

    // Refresh players list every 3 seconds
    refreshInterval = setInterval(loadPlayers, 3000);
}

async function loadPlayers() {
    try {
        const response = await fetch('/api/challenge/players', {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            players = data.players;
            renderPlayerList();
            updateStatusMessage();
        } else {
            console.error('Failed to load players:', data.message);
        }
    } catch (error) {
        console.error('Error loading players:', error);
    }
}

function updateStatusMessage() {
    // Check if there's any pending challenge sent by current user
    const pendingChallenge = players.find(p => p.challengeStatus === 'pending' && p.isChallenger);

    // Check if there's any received challenge
    const receivedChallenge = players.find(p => p.challengeStatus === 'received');

    // Check if there's an accepted challenge
    const acceptedChallenge = players.find(p => p.challengeStatus === 'accepted');

    // Check if there's a match in progress
    const inProgressMatch = players.find(p => p.challengeStatus === 'in_progress');

    if (inProgressMatch) {
        statusLabel.textContent = `Partida en progreso con ${inProgressMatch.username}`;
    } else if (acceptedChallenge) {
        if (acceptedChallenge.isChallenger) {
            statusLabel.textContent = `${acceptedChallenge.username} aceptó tu desafío! Puedes iniciar la partida.`;
        } else {
            statusLabel.textContent = `Desafío aceptado. Esperando a ${acceptedChallenge.username} para iniciar...`;
        }
    } else if (pendingChallenge) {
        statusLabel.textContent = `Esperando respuesta de ${pendingChallenge.username}...`;
    } else if (receivedChallenge) {
        statusLabel.textContent = `¡${receivedChallenge.username} te ha desafiado!`;
    } else {
        statusLabel.textContent = "Elige un contrincante";
    }
}

function renderPlayerList() {
    playerList.innerHTML = "";

    players.forEach((player) => {
        const playerItem = document.createElement("div");
        playerItem.classList.add("player-item");
        playerItem.dataset.username = player.username;

        const infoDiv = document.createElement("div");
        infoDiv.classList.add("info");

        const avatarDiv = document.createElement("div");
        avatarDiv.classList.add("avatar", "small");

        // Use player's image if available
        if (player.imageUrl && player.imageUrl !== '/img/default-profile.png') {
            avatarDiv.style.backgroundImage = `url(${player.imageUrl})`;
            avatarDiv.style.backgroundSize = 'cover';
            avatarDiv.style.backgroundPosition = 'center';
        } else {
            avatarDiv.textContent = player.username[0].toUpperCase();
        }

        const nameSpan = document.createElement("span");
        nameSpan.textContent = player.username;
        infoDiv.appendChild(avatarDiv);
        infoDiv.appendChild(nameSpan);

        const button = document.createElement("button");
        button.classList.add("primary-button");

        switch (player.challengeStatus) {
            case "pending":
                if (player.isChallenger) {
                    button.textContent = "Pendiente...";
                    button.disabled = true;
                } else {
                    button.textContent = "Aceptar Desafío";
                    button.onclick = () => acceptChallenge(player.challengeId);
                }
                break;

            case "received":
                button.textContent = "Aceptar Desafío";
                button.onclick = () => acceptChallenge(player.challengeId);
                break;

            case "accepted":
                if (player.isChallenger) {
                    button.textContent = "Empezar Partida";
                    button.onclick = () => startMatch(player.challengeId, player.username);
                } else {
                    button.textContent = "Esperando...";
                    button.disabled = true;
                }
                break;

            case "in_progress":
                button.textContent = "Ir a Partida";
                button.onclick = () => goToMatch(player.challengeId);
                break;

            case "rejected":
                button.textContent = "Desafiar Nuevamente";
                button.onclick = () => sendChallenge(player.username);
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

async function sendChallenge(username) {
    try {
        const response = await fetch('/api/challenge/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ challengedUsername: username })
        });

        const data = await response.json();

        if (data.success) {
            statusLabel.textContent = `Desafío enviado a ${username}. Esperando respuesta...`;
            await loadPlayers();
        } else {
            alert(data.message || 'Error al enviar desafío');
        }
    } catch (error) {
        console.error('Error sending challenge:', error);
        alert('Error al enviar desafío');
    }
}

async function acceptChallenge(challengeId) {
    try {
        const response = await fetch(`/api/challenge/accept/${challengeId}`, {
            method: 'POST',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            statusLabel.textContent = 'Desafío aceptado. Esperando al host para iniciar...';
            await loadPlayers();
        } else {
            alert(data.message || 'Error al aceptar desafío');
        }
    } catch (error) {
        console.error('Error accepting challenge:', error);
        alert('Error al aceptar desafío');
    }
}

async function startMatch(challengeId, opponentUsername) {
    try {
        const response = await fetch(`/api/challenge/start/${challengeId}`, {
            method: 'POST',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            statusLabel.textContent = `Comenzando partida con ${opponentUsername}...`;
            setTimeout(() => {
                goToMatch(challengeId);
            }, 1000);
        } else {
            alert(data.message || 'Error al iniciar partida');
        }
    } catch (error) {
        console.error('Error starting match:', error);
        alert('Error al iniciar partida');
    }
}

function goToMatch(challengeId) {
    // Clear the refresh interval before navigating
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    // TODO: Pass challengeId to game page
    window.location.href = `/game?challengeId=${challengeId}`;
}

// Clean up interval when page is unloaded
window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});

init();
