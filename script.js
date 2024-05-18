document.addEventListener("DOMContentLoaded", () => {
    let checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const spans = document.querySelectorAll("span")
    let board = tf.zeros([9])
    const iaTurn = document.getElementById("iaTurn")
    const restart = document.getElementById("restart")
    const winnerDiv = document.getElementById("winnerDiv")
    const winnerText = document.getElementById("winnerText")

    // Función para convertir el tensor en un array
    async function getBoardArray() {
        const data = await board.data();
        return Array.from(data);
    }

    // Función para actualizar el tablero (array bidimensional) basado en los valores de los checkboxes
    function jugar() {
        const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');

        allCheckboxes.forEach((checkbox, index) => {
            checkbox.addEventListener('change', async function () {
                let span = this.nextElementSibling; // Obtén el siguiente hermano del checkbox, que es el span
                if (this.checked) {
                    span.textContent = '❌'; // Coloca una marca de verificación cuando está marcado
                } else {
                    span.textContent = ''; // Borra el contenido del span si no está marcado
                }
                let row = Math.floor(index / 3);
                let col = index % 3;
                // Obtiene el tablero actualizado como un array
                const boardArray = await getBoardArray();
                // Actualiza el valor en el array
                boardArray[row * 3 + col] = this.checked ? 1 : 0;
                // Crea un nuevo tensor con el array actualizado
                board = tf.tensor(boardArray);
                console.log(boardArray); // Imprime el array actualizado en la consola

                const gameStatus = checkGameStatus(boardArray);
                if (gameStatus !== null) {
                    if (gameStatus === 1) {
                        winnerDiv.classList.remove("hidden")
                        winnerText.innerText = "¡Ganaste!"
                        winnerText.classList.add("text-green-500")
                    } else if (gameStatus === -1) {
                        winnerDiv.classList.remove("hidden")
                        winnerText.innerText = "¡Perdiste!"
                        winnerText.classList.add("text-red-500")
                    } else {
                        winnerDiv.classList.remove("hidden")
                        winnerText.innerText = "¡Empate!"
                        winnerText.classList.add("text-yellow-500")
                    }
                }
            });
        });

    }

    // Función para que el modelo realice una jugada
    async function realizarJugada() {
        tf.ready().then(() => {
            const modelPath = 'model/ttt_model.json';

            tf.tidy(() => {
                try {
                    // const model = await tf.loadLayersModel(modelPath);
                    tf.loadLayersModel(modelPath).then(async (model) => {

                        // Obtiene el tablero actualizado como un array
                        const boardArray = await getBoardArray();

                        // Realiza la predicción con el modelo
                        const inputTensor = tf.tensor([boardArray]);
                        const prediction = model.predict(inputTensor);
                        const predictionArray = await prediction.array();
                        console.log(predictionArray);

                        // Encuentra el próximo movimiento válido
                        let nextMoveIndex = -1;
                        let maxProbability = -Infinity;
                        predictionArray[0].forEach((probability, index) => {
                            if (boardArray[index] === 0 && probability > maxProbability) {
                                nextMoveIndex = index;
                                maxProbability = probability;
                            }
                        });

                        // Heurística para ganar o bloquear victoria inminente
                        const winningMove = findWinningMove(boardArray, -1); // Priorizar movimiento para ganar
                        const blockingMove = findWinningMove(boardArray, 1); // Priorizar movimiento para bloquear al oponente

                        if (winningMove !== -1) {
                            nextMoveIndex = winningMove;
                        } else if (blockingMove !== -1) {
                            nextMoveIndex = blockingMove;
                        }

                        // Marca el checkbox correspondiente al próximo movimiento
                        if (nextMoveIndex !== -1) {
                            const checkbox = document.querySelectorAll('input[type="checkbox"]')[nextMoveIndex];
                            checkbox.checked = true;
                            const span = checkbox.nextElementSibling; // Obtén el siguiente hermano del checkbox, que es el span
                            span.textContent = '⭕'; // Actualiza el contenido del span

                            // Actualiza el valor en el array
                            boardArray[nextMoveIndex] = -1;
                            // Actualiza el tablero después de realizar la jugada del modelo
                            board = tf.tensor(boardArray);
                            console.log(boardArray); // Muestra el tablero actualizado en la consola

                        }

                        const gameStatus = checkGameStatus(boardArray);
                        if (gameStatus !== null) {
                            if (gameStatus === 1) {
                                winnerDiv.classList.remove("hidden")
                                winnerText.innerText = "¡Ganaste!"
                                winnerText.classList.add("text-green-500")
                            } else if (gameStatus === -1) {
                                winnerDiv.classList.remove("hidden")
                                winnerText.innerText = "¡Perdiste!"
                                winnerText.classList.add("text-red-500")
                            } else {
                                winnerDiv.classList.remove("hidden")
                                winnerText.innerText = "¡Empate!"
                                winnerText.classList.add("text-yellow-500")
                            }
                        }
                    })
                } catch (error) {
                    console.error('Error al cargar el modelo:', error);
                }
            })
        })
    }

    function findWinningMove(boardArray, player) {
        // Define todas las combinaciones ganadoras
        const winningCombinations = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Filas
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columnas
            [0, 4, 8], [2, 4, 6]             // Diagonales
        ];

        for (let combo of winningCombinations) {
            const [a, b, c] = combo;
            if (boardArray[a] === player && boardArray[b] === player && boardArray[c] === 0) {
                return c;
            }
            if (boardArray[a] === player && boardArray[b] === 0 && boardArray[c] === player) {
                return b;
            }
            if (boardArray[a] === 0 && boardArray[b] === player && boardArray[c] === player) {
                return a;
            }
        }

        return -1;
    }

    // Función para reiniciar el tablero
    function reiniciarTablero() {
        // Reinicia los valores de los checkboxes a no marcados
        checkboxes.forEach((checkbox) => {
            checkbox.checked = false;
        });
        // Reinicia la matriz del tablero a ceros
        board = tf.zeros([9]);

        winnerDiv.classList.add("hidden")

        spans.forEach((span) => {
            span.innerText = ""
        })
    }

    function checkGameStatus(boardArray) {
        // Definir todas las combinaciones ganadoras posibles
        const winningCombinations = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Filas
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columnas
            [0, 4, 8], [2, 4, 6]             // Diagonales
        ];

        for (const combo of winningCombinations) {
            const [a, b, c] = combo;
            if (boardArray[a] !== 0 && boardArray[a] === boardArray[b] && boardArray[a] === boardArray[c]) {
                return boardArray[a]; // Devuelve el jugador ganador (1 o -1)
            }
        }

        if (boardArray.every(cell => cell !== 0)) {
            return 'tie'; // Devuelve 'tie' si todas las casillas están ocupadas
        }

        return null; // Devuelve null si no hay ganador ni empate
    }


    iaTurn.addEventListener("click", async () => {
        await realizarJugada()
    })

    restart.addEventListener("click", () => {
        reiniciarTablero()
    })

    jugar()
})