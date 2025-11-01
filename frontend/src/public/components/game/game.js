class battleShipGame{
    //Vamos a dejar aquí toda la data necesaria para que el juego se pueda llevar acabo
    constructor(){
        this.boardSize = 8;
        this.maxAttempts = 8;
        //Esto solo para definirlo al inicio, luego trabajamos con esto
        this.remainingAttempts = this.maxAttempts;
        this.shipsFound = 0;
        this.totalShips = 3;
        this.board = [];
        this.ships = [];
        this.gameOver = false;
        this.processingClick = false; // Bandera para controlar clicks múltiples

        //Lo primero que se debe de ejecutar para el juego
        //Aquí vamos a poner los valores para ek juego
        this.initializeGame();
        //Montamos las celdas
        this.createBoard();
        // metemos las naves en el tablero
        this.placeShips();
        //Ante cada evento
        this.updateDisplay();
    }
    
    initializeGame(){
        // Llenamos la matriz de falsos
        this.board = Array(this.boardSize).fill().map(() => 
         Array(this.boardSize).fill(false));
    }

    createBoard(){
        const gameBoard = document.getElementById("game-board");

        //Limpiamos el contenido
        gameBoard.innerHTML = '';

        //Leenamos las celdas del board
        for(let row = 0; row< this.boardSize; row++){
            for(let column = 0; column< this.boardSize; column++){
                const cell = document.createElement("div");
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.column = column;

                //Añadimos los eventsListeners cuando pasmos el cursor por encima y cuando clickeamos 
                //Nos traemos la celda para trabajarla
                cell.addEventListener('mouseenter', () => this.handleMouseEnter(cell));
                cell.addEventListener('mouseleave', () => this.handleMouseLeave(cell));
                cell.addEventListener('click', () => this.handleCellClick(cell));

                //Alfinal se lo appendeamos al padre
                gameBoard.appendChild(cell);
            }
        }
    }

    placeShips(){
        //Varios casos de prueba para el juego
        const randomNum = Math.floor(Math.random() * 3) + 1;
        let shipsPositions;
        
        if(randomNum === 1){
         shipsPositions = [
            {name:"Barco Grande",size:4,rows:[0,1,2,3],columns:[0,0,0,0], hitCount: 0},
            {name: "Barco Mediando",size:3,rows:[3,3,3], columns:[3,4,5], hitCount: 0},
            {name: "Barco pequeño",size:2,rows:[7,7], columns:[6,7], hitCount: 0}
        ];
        }else if(randomNum === 2){
            shipsPositions = [
                {name:"Barco Grande",size:4,rows:[0,0,0,0],columns:[0,1,2,3], hitCount: 0},
                {name: "Barco Mediando",size:3,rows:[3,3,3], columns:[0,1,2], hitCount: 0},
                {name: "Barco pequeño",size:2,rows:[7,7], columns:[0,1], hitCount: 0}
            ];
        }else{
            shipsPositions = [
                {name:"Barco Grande",size:4,rows:[3,3,3,3],columns:[0,1,2,3], hitCount: 0},
                {name: "Barco Mediando",size:3,rows:[0,0,0], columns:[5,6,7], hitCount: 0},
                {name: "Barco pequeño",size:2,rows:[6,6], columns:[6,7], hitCount: 0}
            ];
        }
        
        for(let i = 0; i<shipsPositions.length; i++){
            this.ships.push(shipsPositions[i]);
            for(let j = 0; j<shipsPositions[i].size; j++){
               this.board[shipsPositions[i].rows[j]][shipsPositions[i].columns[j]] = shipsPositions[i].name;
            }
        }
    }

    handleMouseEnter(cell){
        //No tenemos que hace nada si suede lo siguiente
        if(this.gameOver || cell.classList.contains('hit') || cell.classList.contains('miss')){
            return;
        }
         
        //Cambiamos el color 
        cell.style.backgroundColor = '#00A22B';
    }

    handleMouseLeave(cell){
        if(this.gameOver || cell.classList.contains('hit') || cell.classList.contains('miss')){
            return;
        }

        cell.style.backgroundColor = 'transparent';
    }

    async handleCellClick(cell) {
        //Verificación robusta para evitar condiciones de carrera
        if(this.gameOver || 
           this.processingClick || 
           cell.classList.contains('hit') || 
           cell.classList.contains('miss')){
            return;
        }

        //Marcamos que estamos procesando un click
        this.processingClick = true;
        
        //Bloqueamos la celda inmediatamente
        cell.style.pointerEvents = 'none';
        
        //Pequeña pausa para asegurar que el DOM se actualice
        await new Promise(resolve => setTimeout(resolve, 10));

        try {
            //Nos traemos las filas y las columnas de la celda que clickeamo
            const row = parseInt(cell.dataset.row);
            const column = parseInt(cell.dataset.column);
            
            //Verificación adicional de coordenadas
            if (row < 0 || row >= this.boardSize || column < 0 || column >= this.boardSize) {
                return;
            }
            
            //En caso de que se haya acertado
            if(this.board[row][column] && this.board[row][column] !== false){
                //Buscamos el barco que fue impactado
                const shipName = this.board[row][column];
                const ship = this.ships.find(s => s.name === shipName);
                
                if(ship){
                    //LE DIMOS
                    cell.classList.add('hit');
                    cell.textContent = '✓';
                    //Aumentamos el contador de hits de ese barco
                    ship.hitCount++;
                    
                    //Verificamos si el barco fue hundido completamente
                    if(ship.hitCount === ship.size){
                        this.shipsFound++;
                        this.showMessage(`¡Hundiste el ${ship.name}!`, 'success');
                        //Revelamos el barco completo
                        this.revealShip(ship);
                    } else {
                        this.showMessage(`¡Impacto en el ${ship.name}!`, 'success');
                    }
                }
            }else{
                //Caso donde no le dimos 
                cell.classList.add('miss');
                cell.textContent = '✗';
                this.remainingAttempts--;
                this.showMessage("Bombardeaste el Agua",'error');
            }
            
            //Actualizamos según lo sucedido
            this.updateDisplay();
            this.checkGameStatus();
            
        } finally {
            //Siempre liberamos el procesamiento
            this.processingClick = false;
        }
    }

    checkGameStatus(){
        //Caso donde el jugador ganó
        if(this.shipsFound === this.totalShips){
            this.gameOver = true;
            this.showFinalMessage("Felicidades ganaste Campeón!!",'success');
            const cells = document.querySelectorAll(".cell"); 
            cells.forEach((cell) =>{cell.style.pointerEvents = "none"});
            const restartButton = document.getElementById('restart-btn');
            restartButton.style.display = "block";
        //Caso donde perdimos
        }else if(this.remainingAttempts === 0){
            this.gameOver = true;
            this.showFinalMessage("Game Over - No lograste hundir los barcos","error");
            this.revealShips();
            const cells = document.querySelectorAll(".cell"); 
            cells.forEach((cell) =>{cell.style.pointerEvents = "none"});
            const restartButton = document.getElementById('restart-btn');
            restartButton.style.display = "block";
        }
    }

    revealShips(){
        const cells = document.querySelectorAll(".cell")

        cells.forEach(cell =>{
          const row = parseInt(cell.dataset.row);
          const column =  parseInt(cell.dataset.column);

          if (this.board[row][column] && !cell.classList.contains('hit')) {
            cell.classList.add('ship');
            cell.textContent = '⛵';
          }
        });
    }

    revealShip(ship){
        const cells = document.querySelectorAll(".cell");
        cells.forEach(cell =>{
            const row = parseInt(cell.dataset.row);
            const column = parseInt(cell.dataset.column);
            
            //Revisamos todas las posiciones del barco
            for(let i = 0; i < ship.size; i++){
                if(ship.rows[i] === row && ship.columns[i] === column){
                    cell.classList.add('ship');
                    cell.textContent = '⛵';
                }
            }
        });
    }

    updateDisplay(){
        const attemps = document.getElementById("attempts-count");
        attemps.innerText = this.remainingAttempts;
        const shipsFound = document.getElementById("ships-found");
        shipsFound.innerText = this.shipsFound;
    }
    
    //Tiramos el display con el estilo dependiendo de lo otro que nos mandaron 
    showMessage(text,type){
       const messageElement = document.getElementById("message");

       messageElement.textContent = text;
       messageElement.className = `message ${type}`;

       //Dejamos el mensaje un ratito para después quitarlo
       setTimeout(() => {
        messageElement.textContent = "";
        messageElement.className = "message";
       },2000);
    }

    showFinalMessage(text,type){
        const messageElement = document.getElementById("message");
        messageElement.textContent = text;
        messageElement.className = `message ${type}`;
        //Este mensaje final NO se quita automáticamente, se queda hasta que se reinicie el juego
    }

    restartGame(){
        this.remainingAttempts = this.maxAttempts;
        this.shipsFound = 0;
        this.gameOver = false;
        this.processingClick = false;

        //Limpiamos el mensaje final antes de empezar nuevo juego
        const messageElement = document.getElementById("message");
        messageElement.textContent = "";
        messageElement.className = "message";

        this.initializeGame();
        this.createBoard();
        this.placeShips();
        this.updateDisplay();
        document.getElementById('restart-btn').style.display = 'none';
        this.showMessage('¡Nuevo juego comenzado!', 'success');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new battleShipGame();
    document.getElementById('restart-btn').addEventListener('click', () => {
        game.restartGame();
    });
});