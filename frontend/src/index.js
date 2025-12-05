require('dotenv').config();

const express = require('express');
const session = require('express-session');
const { passport } = require('./config/passport');
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const connectDB = require('./config/database');
const path = require('path');
const morgan = require('morgan');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

connectDB();

app.use(morgan('dev'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(passport.initialize());
app.use(passport.session());

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

app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);


// Servir archivos estaticos si es necesario
app.use(express.static(path.join(__dirname, './public')));

// Ruta por defecto
// app.get('/', (req, res) => {
//     res.json({
//         message: 'Battleship Multiplayer Server',
//         endpoints: [
//             'GET  /api/test - Probar conexion',
//             'POST /api/game/create - Crear juego',
//             'POST /api/game/join - Unirse a juego',
//             'POST /api/game/place-ships - Colocar barcos',
//             'POST /api/game/attack - Realizar ataque',
//             'GET  /api/game/poll/:gameId/:playerId - Polling estado',
//             'GET  /api/status - Estado del servidor',
//             'GET  /api/games/list - Listar juegos activos',
//             'GET  /api/game/find/:gameCode - Buscar juego por codigo'
//         ]
//     });
// });

app.listen(PORT, () => {
    console.log(`Battleship Server running on http://localhost:${PORT}`);
    console.log(`Endpoints disponibles:`);
    console.log(`   http://localhost:${PORT}/api/test`);
    console.log(`   http://localhost:${PORT}/api/game/create`);
    console.log(`   http://localhost:${PORT}/api/game/join`);
    console.log(`   http://localhost:${PORT}/api/status`);
    console.log(`   http://localhost:${PORT}/api/games/list`);
});