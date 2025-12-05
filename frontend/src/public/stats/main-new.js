// Load and display user statistics
async function loadStats() {
    try {
        const response = await fetch('/api/stats', {
            credentials: 'include'
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/auth/login';
                return;
            }
            throw new Error('Failed to load stats');
        }

        const stats = await response.json();
        console.log('Stats loaded:', stats);
        displayStats(stats);
        displayGameHistory(stats.recentGames);
    } catch (error) {
        console.error('Error loading stats:', error);
        document.getElementById('stats-container').innerHTML = '<div class="error">Error cargando estadísticas</div>';
        document.getElementById('matches-container').innerHTML = '<div class="error">Error cargando historial</div>';
    }
}

function displayStats(stats) {
    const container = document.getElementById('stats-container');
    
    const html = `
        <!-- Overview Stats -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.overview.totalGames}</div>
                <div class="stat-label">Partidas Jugadas</div>
            </div>
            <div class="stat-card win">
                <div class="stat-value">${stats.overview.wins}</div>
                <div class="stat-label">Victorias</div>
            </div>
            <div class="stat-card loss">
                <div class="stat-value">${stats.overview.losses}</div>
                <div class="stat-label">Derrotas</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.overview.winRate.toFixed(1)}%</div>
                <div class="stat-label">Tasa de Victoria</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.overview.currentStreak}</div>
                <div class="stat-label">Racha Actual</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.overview.bestStreak}</div>
                <div class="stat-label">Mejor Racha</div>
            </div>
        </div>

        <!-- Performance Stats -->
        <div class="section-header">
            <h2>Rendimiento en Combate</h2>
        </div>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.performance.totalShots}</div>
                <div class="stat-label">Disparos Totales</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.performance.totalHits}</div>
                <div class="stat-label">Impactos</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.performance.accuracy.toFixed(1)}%</div>
                <div class="stat-label">Precisión</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.performance.avgShotsPerGame.toFixed(1)}</div>
                <div class="stat-label">Promedio Disparos/Juego</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.performance.totalShipsSunk}</div>
                <div class="stat-label">Barcos Hundidos</div>
            </div>
            <div class="stat-card loss">
                <div class="stat-value">${stats.performance.totalShipsLost}</div>
                <div class="stat-label">Barcos Perdidos</div>
            </div>
        </div>

        <!-- Records -->
        ${stats.performance.fastestWin || stats.performance.longestGame ? `
        <div class="section-header">
            <h2>Récords Personales</h2>
        </div>
        <div class="stats-grid">
            ${stats.performance.fastestWin ? `
            <div class="stat-card win">
                <div class="stat-value">${stats.performance.fastestWin}</div>
                <div class="stat-label">Victoria Más Rápida (disparos)</div>
            </div>
            ` : ''}
            ${stats.performance.longestGame ? `
            <div class="stat-card">
                <div class="stat-value">${stats.performance.longestGame}</div>
                <div class="stat-label">Partida Más Larga (disparos)</div>
            </div>
            ` : ''}
        </div>
        ` : ''}

        <!-- Challenge Stats -->
        <div class="section-header">
            <h2>Estadísticas de Desafíos</h2>
        </div>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.challenges.total}</div>
                <div class="stat-label">Desafíos Totales</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.challenges.sent}</div>
                <div class="stat-label">Enviados</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.challenges.received}</div>
                <div class="stat-label">Recibidos</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.challenges.pending}</div>
                <div class="stat-label">Pendientes</div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function displayGameHistory(games) {
    const container = document.getElementById('matches-container');
    
    if (!games || games.length === 0) {
        container.innerHTML = '<div class="empty-state">No hay partidas jugadas aún</div>';
        return;
    }
    
    const html = games.map(game => {
        const date = new Date(game.date);
        const formattedDate = date.toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        });
        
        const isWin = game.result === 'win';
        const opponentAvatar = game.opponent.avatar || '/img/default-profile.png';
        
        return `
            <div class="match-card ${isWin ? 'victory' : 'defeat'}">
                <div class="match-header">
                    <span class="match-date">${formattedDate}</span>
                    <span class="match-result ${isWin ? 'win' : 'loss'}">
                        ${isWin ? '🏆 Victoria' : '💀 Derrota'}
                    </span>
                </div>
                <div class="match-body">
                    <div class="opponent-info">
                        <div class="avatar-circle">
                            <img src="${opponentAvatar}" alt="${game.opponent.username}" onerror="this.src='/img/default-profile.png'" />
                        </div>
                        <div class="opponent-details">
                            <span class="opponent-name">${game.opponent.username}</span>
                            <span class="game-code">Código: ${game.gameCode}</span>
                        </div>
                    </div>
                    <div class="match-stats">
                        <div class="stat-item">
                            <span class="stat-label">Disparos:</span>
                            <span class="stat-value">${game.stats.yourShots}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Precisión:</span>
                            <span class="stat-value">${game.stats.yourAccuracy}%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Hundidos:</span>
                            <span class="stat-value">${game.stats.yourShipsSunk}/5</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// Load stats when page loads
document.addEventListener('DOMContentLoaded', loadStats);
