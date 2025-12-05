import AuthService from "/utils/user.js";

const playerList = document.getElementById("player-list");
const challengeDetails = document.getElementById("challenge-details");
const selectedAvatar = document.getElementById("selected-avatar");
const selectedUsername = document.getElementById("selected-username");
const statusLabel = document.querySelector("#challenge-status .status-text");
const challengeActions = document.getElementById("challenge-actions");
const currentUserAvatar = document.getElementById("current-user-avatar");
const currentsignedUser = document.querySelector("#current-user");

let currentUser = null;
let players = [];
let selectedPlayer = null;
let refreshInterval = null;

// Load user info
async function init() {
    currentUser = await AuthService.getUser();
    if (!currentUser) {
        window.location.href = "/auth/login";
        return;
    }

    // Set current user info
    currentsignedUser.textContent = currentUser.username || "You";

    // Set current user avatar
    if (currentUser.imageUrl && currentUser.imageUrl !== '/img/default-profile.png') {
        currentUserAvatar.src = currentUser.imageUrl;
    }

    await loadPlayers();

    // Refresh players list every 3 seconds
    refreshInterval = setInterval(loadPlayers, 3000);
}

// Load players from API
async function loadPlayers() {
    try {
        const response = await fetch('/api/challenge/players', {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            players = data.players;
            renderPlayerList();

            // Update selected player if one is selected
            if (selectedPlayer) {
                const updatedPlayer = players.find(p => p.username === selectedPlayer.username);
                if (updatedPlayer) {
                    selectPlayer(updatedPlayer);
                }
            }
        } else {
            console.error('Failed to load players:', data.message);
        }
    } catch (error) {
        console.error('Error loading players:', error);
    }
}

function renderPlayerList() {
    playerList.innerHTML = "";

    players.forEach((player) => {
        const playerItem = document.createElement("div");
        playerItem.classList.add("player-item");

        // Highlight selected player
        if (selectedPlayer && selectedPlayer.username === player.username) {
            playerItem.classList.add("selected");
        }

        playerItem.dataset.username = player.username;
        playerItem.onclick = () => selectPlayer(player);

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

        // Add status badge if there's an active challenge
        if (player.challengeStatus !== 'available') {
            const statusBadge = document.createElement("span");
            statusBadge.classList.add("status-badge");
            statusBadge.textContent = getStatusBadgeText(player.challengeStatus, player.isChallenger);
            playerItem.appendChild(statusBadge);
        }

        playerItem.appendChild(infoDiv);
        playerList.appendChild(playerItem);
    });
}

function getStatusBadgeText(status, isChallenger) {
    switch (status) {
        case "pending":
            return isChallenger ? "Enviado" : "Recibido";
        case "received":
            return "Recibido";
        case "accepted":
            return "Aceptado";
        case "in_progress":
            return "En Partida";
        case "rejected":
            return "Rechazado";
        default:
            return "";
    }
}

function selectPlayer(player) {
    selectedPlayer = player;

    // Show challenge details section
    challengeDetails.style.display = "block";

    // Update selected player info
    selectedUsername.textContent = player.username;

    // Set avatar
    if (player.imageUrl && player.imageUrl !== '/img/default-profile.png') {
        selectedAvatar.src = player.imageUrl;
    } else {
        selectedAvatar.src = '/img/avatarph.png';
    }

    // Update status and actions
    updateChallengeStatus(player);
    updateChallengeActions(player);

    // Re-render list to highlight selection
    renderPlayerList();
}

function updateChallengeStatus(player) {
    switch (player.challengeStatus) {
        case "pending":
            if (player.isChallenger) {
                statusLabel.textContent = `Esperando respuesta de ${player.username}...`;
            } else {
                statusLabel.textContent = `${player.username} te ha desafiado!`;
            }
            break;

        case "received":
            statusLabel.textContent = `${player.username} te ha desafiado!`;
            break;

        case "accepted":
            if (player.isChallenger) {
                statusLabel.textContent = `${player.username} aceptó tu desafío! Puedes iniciar la partida.`;
            } else {
                statusLabel.textContent = `Desafío aceptado. Esperando a ${player.username} para iniciar...`;
            }
            break;

        case "in_progress":
            statusLabel.textContent = `Partida en progreso con ${player.username}`;
            break;

        case "rejected":
            statusLabel.textContent = `${player.username} rechazó tu desafío.`;
            break;

        default:
            statusLabel.textContent = `Listo para desafiar a ${player.username}`;
            break;
    }
}

async function updateChallengeActions(player) {
    challengeActions.innerHTML = "";

    switch (player.challengeStatus) {
        case "pending":
            if (player.isChallenger) {
                // Challenger can cancel
                const cancelBtn = createButton("Cancelar Desafío", "secondary-button", () => cancelChallenge(player.challengeId));
                challengeActions.appendChild(cancelBtn);
            } else {
                // Challenged can accept or reject
                const acceptBtn = createButton("Aceptar", "primary-button", () => acceptChallenge(player.challengeId));
                const rejectBtn = createButton("Rechazar", "secondary-button", () => rejectChallenge(player.challengeId));
                challengeActions.appendChild(acceptBtn);
                challengeActions.appendChild(rejectBtn);
            }
            break;

        case "received":
            const acceptBtn = createButton("Aceptar", "primary-button", () => acceptChallenge(player.challengeId));
            const rejectBtn = createButton("Rechazar", "secondary-button", () => rejectChallenge(player.challengeId));
            challengeActions.appendChild(acceptBtn);
            challengeActions.appendChild(rejectBtn);
            break;

        case "accepted":
            if (player.isChallenger) {
                const startBtn = createButton("Empezar Partida", "primary-button", () => startMatch(player.challengeId, player.username));
                const cancelBtn = createButton("Cancelar", "secondary-button", () => cancelChallenge(player.challengeId));
                challengeActions.appendChild(startBtn);
                challengeActions.appendChild(cancelBtn);
            } else {
                const waitingText = document.createElement("p");
                waitingText.textContent = "Esperando al host...";
                waitingText.style.fontStyle = "italic";
                waitingText.style.color = "var(--color-text)";
                waitingText.style.opacity = "0.7";
                challengeActions.appendChild(waitingText);
            }
            break;

        case "in_progress":
            const challenge = await loadChallenge(player.challengeId);
            console.log(challenge);
            const goBtn = createButton("Ir a Partida", "primary-button", () => goToMatch(challenge.gameCode));
            challengeActions.appendChild(goBtn);

            if (player.isChallenger) {
                const cancelBtn = createButton("Cancelar Partida", "secondary-button", () => cancelChallenge(player.challengeId));
                challengeActions.appendChild(cancelBtn);
            }
            break;

        case "rejected":
            const rechallengeBtn = createButton("Desafiar Nuevamente", "primary-button", () => sendChallenge(player.username));
            challengeActions.appendChild(rechallengeBtn);
            break;

        default:
            const challengeBtn = createButton("Enviar Desafío", "primary-button", () => sendChallenge(player.username));
            challengeActions.appendChild(challengeBtn);
            break;
    }
}

function createButton(text, className, onClick) {
    const button = document.createElement("button");
    button.textContent = text;
    button.classList.add(className);
    button.onclick = onClick;
    return button;
}


async function loadChallenge(challengeId) {
    try {
        const response = await fetch(`/api/challenge/${challengeId}`, {
            credentials: 'include'
        });

        const res = await response.json();
        if (res.success) {
            return res.challenge;
        } else {
            console.error('Failed to load challenge:', res.message);
        }
    } catch (error) {
        console.error('Error loading challenge:', error);
    }
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
            await loadPlayers();
        } else {
            alert(data.message || 'Error al aceptar desafío');
        }
    } catch (error) {
        console.error('Error accepting challenge:', error);
        alert('Error al aceptar desafío');
    }
}

async function rejectChallenge(challengeId) {
    try {
        const response = await fetch(`/api/challenge/reject/${challengeId}`, {
            method: 'POST',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            await loadPlayers();
            // Clear selection after rejection
            selectedPlayer = null;
            challengeDetails.style.display = "none";
            renderPlayerList();
        } else {
            alert(data.message || 'Error al rechazar desafío');
        }
    } catch (error) {
        console.error('Error rejecting challenge:', error);
        alert('Error al rechazar desafío');
    }
}

async function cancelChallenge(challengeId) {
    if (!confirm('¿Estás seguro de que quieres cancelar este desafío?')) {
        return;
    }

    try {
        const response = await fetch(`/api/challenge/cancel/${challengeId}`, {
            method: 'POST',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            await loadPlayers();
            // Clear selection after cancellation
            selectedPlayer = null;
            challengeDetails.style.display = "none";
            renderPlayerList();
        } else {
            alert(data.message || 'Error al cancelar desafío');
        }
    } catch (error) {
        console.error('Error cancelling challenge:', error);
        alert('Error al cancelar desafío');
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
    window.location.href = `/game?challengeId=${challengeId}`;
}

// Clean up interval when page is unloaded
window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});

init();