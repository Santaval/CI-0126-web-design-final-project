require('dotenv').config();

const express = require('express');
const session = require('express-session');
const { passport } = require('./config/passport');
const authRoutes = require('./routes/auth');
const connectDB = require('./config/database');

const app = express();
const PORT = 3000;

// Middleware CORS
app.use((req, res, next) => {
    const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', true);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

app.use(express.json());

// ALMACENAMIENTO MEJORADO
const activeGames = new Map();  // Para buscar por gameId
const gamesByCode = new Map();  // Para buscar por gameCode

// Generar código de 6 letras
function generateGameCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Endpoint de prueba
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'Battleship Server OK',
        activeGames: activeGames.size,
        timestamp: new Date().toISOString()
    });
});

// 1. CREAR JUEGO
app.post('/api/game/create', (req, res) => {
    console.log('[CREATE] Request:', req.body);
    
    try {
        const { playerName } = req.body;
        
        if (!playerName) {
            return res.status(400).json({
                success: false,
                error: 'Nombre de jugador requerido'
            });
        }
        
        const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const gameCode = generateGameCode();
        
        // Crear objeto de juego
        const game = {
            id: gameId,
            gameCode: gameCode,
            players: [
                {
                    id: playerId,
                    name: playerName,
                    ready: false,
                    ships: null,
                    playerNumber: 1,
                    lastActive: Date.now()
                }
            ],
            status: 'waiting',
            currentPlayer: null,
            turn: 0,
            moves: [],
            createdAt: Date.now(),
            lastUpdated: Date.now()
        };
        
        // Guardar en ambos maps
        activeGames.set(gameId, game);
        gamesByCode.set(gameCode, gameId);
        
        console.log(`Juego creado: ${gameCode} (ID: ${gameId})`);
        console.log(`Total juegos: ${activeGames.size}`);
        
        res.json({
            success: true,
            gameId: gameId,
            playerId: playerId,
            gameCode: gameCode,
            playerNumber: 1,
            message: `Codigo: ${gameCode} - Comparte este codigo`
        });
        
    } catch (error) {
        console.error('Error en create:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// 2. UNIRSE A JUEGO
app.post('/api/game/join', (req, res) => {
    console.log('[JOIN] Request:', req.body);
    
    try {
        const { gameCode, playerName } = req.body;
        
        if (!gameCode || !playerName) {
            return res.status(400).json({
                success: false,
                error: 'Codigo de juego y nombre requeridos'
            });
        }
        
        // Buscar por código
        const upperGameCode = gameCode.toUpperCase();
        const gameId = gamesByCode.get(upperGameCode);
        
        console.log(`Buscando juego con codigo: ${upperGameCode}`);
        console.log(`GameId encontrado: ${gameId}`);
        
        if (!gameId) {
            return res.status(404).json({
                success: false,
                error: `Codigo de juego no encontrado: ${gameCode}`
            });
        }
        
        const game = activeGames.get(gameId);
        
        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Juego no encontrado'
            });
        }
        
        // Verificar estado
        if (game.status !== 'waiting') {
            return res.status(400).json({
                success: false,
                error: 'El juego ya comenzo o esta lleno'
            });
        }
        
        // Verificar jugadores
        if (game.players.length >= 2) {
            return res.status(400).json({
                success: false,
                error: 'El juego esta lleno (2/2 jugadores)'
            });
        }
        
        // Crear jugador 2
        const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        game.players.push({
            id: playerId,
            name: playerName,
            ready: false,
            ships: null,
            playerNumber: 2,
            lastActive: Date.now()
        });
        
        game.status = 'setup';
        game.lastUpdated = Date.now();
        
        console.log(`Jugador ${playerName} se unio al juego ${game.gameCode}`);
        console.log(`Jugadores: ${game.players.map(p => p.name).join(', ')}`);
        
        res.json({
            success: true,
            gameId: gameId,
            playerId: playerId,
            gameCode: game.gameCode,
            playerNumber: 2,
            message: `Unido al juego ${game.gameCode}`
        });
        
    } catch (error) {
        console.error('Error en join:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// 3. COLOCAR BARCOS
app.post('/api/game/place-ships', (req, res) => {
    console.log('[PLACE SHIPS] Request:', {
        gameId: req.body.gameId,
        playerId: req.body.playerId,
        shipCount: req.body.shipPlacements ? req.body.shipPlacements.length : 0
    });
    
    try {
        const { gameId, playerId, shipPlacements } = req.body;
        
        if (!gameId || !playerId || !shipPlacements) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren gameId, playerId y shipPlacements'
            });
        }
        
        const game = activeGames.get(gameId);
        
        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Juego no encontrado'
            });
        }
        
        const player = game.players.find(p => p.id === playerId);
        if (!player) {
            return res.status(404).json({
                success: false,
                error: 'Jugador no encontrado'
            });
        }
        
        // Validar shipPlacements
        if (!Array.isArray(shipPlacements) || shipPlacements.length !== 5) {
            return res.status(400).json({
                success: false,
                error: 'Debes colocar exactamente 5 barcos'
            });
        }
        
        player.ships = shipPlacements;
        player.ready = true;
        player.lastActive = Date.now();
        
        console.log(`Jugador ${player.name} coloco barcos en juego ${game.gameCode}`);
        
        // Verificar si ambos jugadores estan listos
        const allPlayers = game.players.length === 2;
        const allReady = game.players.every(p => p.ready);
        
        if (allPlayers && allReady) {
            game.status = 'playing';
            game.currentPlayer = game.players[0].id;
            game.turn = 1;
            console.log(`Juego ${game.gameCode} INICIADO! Turno de ${game.players[0].name}`);
        }
        
        res.json({
            success: true,
            gameStatus: game.status,
            allPlayersReady: allReady,
            totalPlayers: game.players.length,
            readyPlayers: game.players.filter(p => p.ready).length
        });
        
    } catch (error) {
        console.error('Error en place-ships:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// 4. REALIZAR ATAQUE
app.post('/api/game/attack', (req, res) => {
    console.log('[ATTACK] Request:', req.body);
    
    try {
        const { gameId, playerId, row, col } = req.body;
        
        if (!gameId || !playerId || row === undefined || col === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren gameId, playerId, row y col'
            });
        }
        
        const game = activeGames.get(gameId);
        
        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Juego no encontrado'
            });
        }
        
        if (game.status !== 'playing') {
            return res.status(400).json({
                success: false,
                error: 'El juego no esta en progreso'
            });
        }
        
        if (game.currentPlayer !== playerId) {
            return res.status(400).json({
                success: false,
                error: 'No es tu turno'
            });
        }
        
        // Validar coordenadas
        const rowNum = parseInt(row);
        const colNum = parseInt(col);
        
        if (isNaN(rowNum) || isNaN(colNum) || 
            rowNum < 0 || rowNum > 9 || 
            colNum < 0 || colNum > 9) {
            return res.status(400).json({
                success: false,
                error: 'Coordenadas invalidas (deben ser 0-9)'
            });
        }
        
        const attackingPlayer = game.players.find(p => p.id === playerId);
        const opponent = game.players.find(p => p.id !== playerId);
        
        // Verificar si ya se ataco esta posicion
        const existingMove = game.moves.find(m => 
            m.playerId === playerId && 
            m.row === rowNum && 
            m.col === colNum
        );
        
        if (existingMove) {
            return res.status(400).json({
                success: false,
                error: 'Ya atacaste esta posicion'
            });
        }
        
        // Simular resultado
        const isHit = Math.random() > 0.6;
        const result = isHit ? 'hit' : 'miss';
        
        const move = {
            playerId,
            playerName: attackingPlayer.name,
            row: rowNum,
            col: colNum,
            result: result,
            timestamp: Date.now(),
            turn: game.turn
        };
        
        game.moves.push(move);
        
        // Cambiar turno (si fue miss, cambia de jugador)
        if (result === 'miss') {
            game.currentPlayer = opponent.id;
            game.turn++;
            console.log(`Turno cambiado a ${opponent.name}`);
        }
        
        // Verificar si hay ganador (simulado)
        const playerHits = game.moves.filter(m => 
            m.playerId === playerId && m.result === 'hit'
        ).length;
        
        if (playerHits >= 10) {
            game.status = 'finished';
            game.winner = playerId;
            console.log(`Juego ${game.gameCode} TERMINADO! Ganador: ${attackingPlayer.name}`);
        }
        
        console.log(`Ataque en juego ${game.gameCode}: ${attackingPlayer.name} -> (${row},${col}) = ${result}`);
        
        res.json({
            success: true,
            result: result,
            gameStatus: game.status,
            nextPlayer: game.currentPlayer,
            winner: game.winner ? attackingPlayer.name : null,
            turn: game.turn,
            totalMoves: game.moves.length
        });
        
    } catch (error) {
        console.error('Error en attack:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// 5. POLLING DE ESTADO - ESTE ES EL ENDPOINT QUE FALTA
app.get('/api/game/poll/:gameId/:playerId', (req, res) => {
    try {
        const { gameId, playerId } = req.params;
        
        console.log(`[POLL] Game: ${gameId}, Player: ${playerId}`);
        
        const game = activeGames.get(gameId);
        
        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Juego no encontrado'
            });
        }
        
        const player = game.players.find(p => p.id === playerId);
        if (!player) {
            return res.status(404).json({
                success: false,
                error: 'Jugador no encontrado'
            });
        }
        
        // Actualizar ultimo poll
        player.lastActive = Date.now();
        game.lastUpdated = Date.now();
        
        // Preparar respuesta
        const response = {
            success: true,
            gameId: game.id,
            gameCode: game.gameCode,
            status: game.status,
            players: game.players.map(p => ({
                id: p.id,
                name: p.name,
                ready: p.ready,
                playerNumber: p.playerNumber,
                shipsPlaced: p.ships ? true : false
            })),
            currentPlayer: game.currentPlayer,
            turn: game.turn,
            moves: game.moves.slice(-10),
            winner: game.winner,
            totalPlayers: game.players.length,
            allPlayersReady: game.players.every(p => p.ready)
        };
        
        res.json(response);
        
    } catch (error) {
        console.error('Error en poll:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// 6. DEBUG: Listar juegos activos
app.get('/api/games/list', (req, res) => {
    const gamesList = Array.from(activeGames.values()).map(game => ({
        gameCode: game.gameCode,
        gameId: game.id,
        status: game.status,
        players: game.players.map(p => ({
            name: p.name,
            playerNumber: p.playerNumber,
            ready: p.ready
        })),
        createdAt: new Date(game.createdAt).toLocaleTimeString()
    }));
    
    res.json({
        success: true,
        totalGames: activeGames.size,
        games: gamesList
    });
});

// 7. DEBUG: Buscar juego por código
app.get('/api/game/find/:gameCode', (req, res) => {
    const gameCode = req.params.gameCode.toUpperCase();
    const gameId = gamesByCode.get(gameCode);
    
    if (!gameId) {
        return res.status(404).json({
            success: false,
            error: `Juego con codigo ${gameCode} no encontrado`
        });
    }
    
    const game = activeGames.get(gameId);
    
    res.json({
        success: true,
        game: {
            gameCode: game.gameCode,
            gameId: game.id,
            status: game.status,
            players: game.players,
            createdAt: game.createdAt
        }
    });
});

// 8. ESTADO DEL SERVIDOR
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        server: 'Battleship Multiplayer Server',
        status: 'running',
        port: PORT,
        activeGames: activeGames.size,
        timestamp: new Date().toISOString()
    });
});

// 9. LIMPIAR TODOS LOS JUEGOS
app.delete('/api/cleanup', (req, res) => {
    const count = activeGames.size;
    activeGames.clear();
    gamesByCode.clear();
    res.json({
        success: true,
        message: `Se eliminaron ${count} juegos`,
        remainingGames: activeGames.size
    });
});

// Servir archivos estaticos si es necesario
app.use(express.static('public'));

// Ruta por defecto
app.get('/', (req, res) => {
    res.json({
        message: 'Battleship Multiplayer Server',
        endpoints: [
            'GET  /api/test - Probar conexion',
            'POST /api/game/create - Crear juego',
            'POST /api/game/join - Unirse a juego',
            'POST /api/game/place-ships - Colocar barcos',
            'POST /api/game/attack - Realizar ataque',
            'GET  /api/game/poll/:gameId/:playerId - Polling estado',
            'GET  /api/status - Estado del servidor',
            'GET  /api/games/list - Listar juegos activos',
            'GET  /api/game/find/:gameCode - Buscar juego por codigo'
        ]
    });
});

app.listen(PORT, () => {
    console.log(`Battleship Server running on http://localhost:${PORT}`);
    console.log(`Endpoints disponibles:`);
    console.log(`   http://localhost:${PORT}/api/test`);
    console.log(`   http://localhost:${PORT}/api/game/create`);
    console.log(`   http://localhost:${PORT}/api/game/join`);
    console.log(`   http://localhost:${PORT}/api/status`);
    console.log(`   http://localhost:${PORT}/api/games/list`);
});