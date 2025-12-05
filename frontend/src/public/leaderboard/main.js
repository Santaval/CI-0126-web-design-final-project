/**
 * Leaderboard Page - Main JavaScript
 * Handles fetching and displaying user rankings
 */

let allPlayers = [];
let currentFilter = 'wins';
let currentUserId = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadLeaderboard();
    setupFilterControls();
});

/**
 * Setup filter button controls
 */
function setupFilterControls() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update filter and re-render
            currentFilter = btn.dataset.filter;
            sortAndDisplayPlayers();
        });
    });
}

/**
 * Load leaderboard data from API
 */
async function loadLeaderboard() {
    const userRankCard = document.getElementById('user-rank-card');
    const leaderboardContainer = document.getElementById('leaderboard-container');

    try {
        // Fetch ranking data
        const response = await fetch('/api/stats/ranking', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch leaderboard data');
        }

        const data = await response.json();
        
        // Store current user ID
        currentUserId = data.userStats?.userId?.toString();
        
        // Store all players data
        allPlayers = data.topPlayers || [];

        // Display user's rank card
        displayUserRank(data, userRankCard);

        // Display leaderboard
        sortAndDisplayPlayers();

    } catch (error) {
        console.error('Error loading leaderboard:', error);
        
        userRankCard.innerHTML = `
            <div class="error">
                ❌ Failed to load your ranking
            </div>
        `;
        
        leaderboardContainer.innerHTML = `
            <div class="error">
                ❌ Failed to load leaderboard. Please try again later.
            </div>
        `;
    }
}

/**
 * Display user's rank card
 */
function displayUserRank(data, container) {
    const { rank, totalPlayers, userStats } = data;

    if (!userStats) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">🎮</div>
                <p>Play some games to get ranked!</p>
            </div>
        `;
        return;
    }

    const rankSuffix = getRankSuffix(rank);
    const rankDescription = getRankDescription(rank, totalPlayers);
    
    container.classList.remove('loading');
    container.innerHTML = `
        <div class="user-rank-info">
            <div class="rank-badge">
                <span class="rank-label">Rank</span>
                <span class="rank-number">${rank}</span>
            </div>
            <div class="user-details">
                <span class="username">${escapeHtml(userStats.username)}</span>
                <span class="rank-description">${rankDescription}</span>
            </div>
        </div>
        <div class="user-stats-mini">
            <div class="stat-mini">
                <span class="value">${userStats.wins || 0}</span>
                <span class="label">Wins</span>
            </div>
            <div class="stat-mini">
                <span class="value">${userStats.totalGames || 0}</span>
                <span class="label">Games</span>
            </div>
            <div class="stat-mini">
                <span class="value">${userStats.winRate?.toFixed(1) || 0}%</span>
                <span class="label">Win Rate</span>
            </div>
        </div>
    `;
}

/**
 * Sort and display players based on current filter
 */
function sortAndDisplayPlayers() {
    const leaderboardContainer = document.getElementById('leaderboard-container');
    
    // Sort players based on current filter
    const sortedPlayers = [...allPlayers];
    
    switch(currentFilter) {
        case 'wins':
            sortedPlayers.sort((a, b) => {
                if (b.wins !== a.wins) return b.wins - a.wins;
                return b.winRate - a.winRate;
            });
            break;
        case 'winrate':
            sortedPlayers.sort((a, b) => {
                // Only compare win rates for players with at least 5 games
                const aGames = a.totalGames >= 5 ? a.winRate : -1;
                const bGames = b.totalGames >= 5 ? b.winRate : -1;
                if (bGames !== aGames) return bGames - aGames;
                return b.wins - a.wins;
            });
            break;
        case 'games':
            sortedPlayers.sort((a, b) => {
                if (b.totalGames !== a.totalGames) return b.totalGames - a.totalGames;
                return b.wins - a.wins;
            });
            break;
    }

    // Display sorted players
    displayLeaderboard(sortedPlayers, leaderboardContainer);
}

/**
 * Display leaderboard list
 */
function displayLeaderboard(players, container) {
    container.classList.remove('loading');

    if (!players || players.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">🏆</div>
                <p>No players ranked yet. Be the first!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = players.map((player, index) => {
        const rank = index + 1;
        const isCurrentUser = player.userId?.toString() === currentUserId;
        const rankClass = `rank-item rank-${rank} ${isCurrentUser ? 'current-user' : ''}`;
        const medal = getMedalForRank(rank);
        const title = getTitleForPlayer(player);

        return `
            <div class="${rankClass}">
                <div class="rank-left">
                    <div class="rank-position ${medal ? 'medal' : ''}">
                        ${medal || rank}
                    </div>
                    <div class="player-avatar">
                        <img src="${player.avatar || '/img/default-profile.png'}" 
                             alt="${escapeHtml(player.username)}"
                             onerror="this.src='/img/default-profile.png'">
                    </div>
                    <div class="player-info">
                        <div class="player-name">
                            ${escapeHtml(player.username)}
                            ${isCurrentUser ? '<span style="color: #4CAF50;">👤 You</span>' : ''}
                        </div>
                        <div class="player-title">${title}</div>
                    </div>
                </div>
                <div class="rank-right">
                    <div class="rank-stat">
                        <span class="stat-value">${player.wins || 0}</span>
                        <span class="stat-label">Wins</span>
                    </div>
                    <div class="rank-stat">
                        <span class="stat-value">${player.totalGames || 0}</span>
                        <span class="stat-label">Games</span>
                    </div>
                    <div class="rank-stat">
                        <span class="stat-value">${player.winRate?.toFixed(1) || 0}%</span>
                        <span class="stat-label">Win Rate</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Get medal emoji for top 3 ranks
 */
function getMedalForRank(rank) {
    switch(rank) {
        case 1: return '🥇';
        case 2: return '🥈';
        case 3: return '🥉';
        default: return null;
    }
}

/**
 * Get rank suffix (1st, 2nd, 3rd, etc.)
 */
function getRankSuffix(rank) {
    const j = rank % 10;
    const k = rank % 100;
    if (j === 1 && k !== 11) return rank + 'st';
    if (j === 2 && k !== 12) return rank + 'nd';
    if (j === 3 && k !== 13) return rank + 'rd';
    return rank + 'th';
}

/**
 * Get rank description based on position
 */
function getRankDescription(rank, total) {
    const percentage = (rank / total) * 100;
    
    if (rank === 1) return '👑 Champion - You\'re #1!';
    if (rank <= 3) return `🏆 Top 3 - Elite Player`;
    if (rank <= 10) return `⭐ Top 10 - Excellent!`;
    if (percentage <= 25) return `🎯 Top 25% - Great job!`;
    if (percentage <= 50) return `📈 Top 50% - Keep climbing!`;
    return `🎮 Ranked ${rank} of ${total}`;
}

/**
 * Get title for player based on stats
 */
function getTitleForPlayer(player) {
    const { wins, totalGames, winRate } = player;
    
    if (totalGames === 0) return '🆕 Newcomer';
    if (wins >= 100) return '⚡ Legend';
    if (wins >= 50) return '🔥 Master';
    if (wins >= 25) return '⭐ Expert';
    if (winRate >= 80 && totalGames >= 10) return '🎯 Sharpshooter';
    if (winRate >= 60 && totalGames >= 5) return '🏹 Skilled';
    if (totalGames >= 50) return '🎮 Veteran';
    if (totalGames >= 20) return '⚓ Regular';
    return '🌊 Sailor';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
