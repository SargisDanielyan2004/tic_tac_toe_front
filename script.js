// Enable pusher logging - don't include this in production
Pusher.logToConsole = true;

var pusher = new Pusher('dd5bf1f7c062147a66e6', {
    cluster: 'ap2'
});
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const id = urlParams.get('id');
let channel = pusher.subscribe(`room.${id}`);
let squares = document.querySelectorAll(".square");
let winnerMessage = document.getElementById("winner-message");
let resetButton = document.getElementById("reset-btn");
squares.forEach(square => square.addEventListener("click", handleClick));
let currentPlayer = "X";
let player = null;
let restart = false;

let madeSteps = {
    'X': [],
    'O': []
}

resetButton.addEventListener("click", restartGameReq);

joinRequest(id)
    .then((res) => {
        player = res.player;
    }).finally(() => {
    channel.bind('new-step', function(data) {
        if (data.player !== player) {
            resetButton.disabled = false;
        }else if(data.message) {
            resetButton.disabled = false;
        }else {
            resetButton.disabled = true;
        }
        if (data.reset) {
            console.log(player)
            if (data.player !== player) {
                restart = confirm();
                if (restart) {
                    let resetForSecondPlayer = true
                    restartGameRequest(id, false, resetForSecondPlayer, data.player)
                    resetGame()
                }else {
                    resetButton.disabled = true;
                }
            }
        }else if(data.reset == false){
            resetGame()
        }
        if (data.message && !winnerMessage.innerHTML) {
            if (data.message === "Draw!") {
                winnerMessage.innerHTML = data.message;
            }else {
                winnerMessage.innerHTML = data.player +  ' ' + data.message
                highlightCells(data.combination)
                disableSquares()
            }

        } else if(data.step && data.player !== player && data.message != 'Draw!'){
            togglePlayer();
            madeSteps[data.player].push(parseInt(data.step));
            print(madeSteps)
            checkWin()
        }
    });
})


const winningCombinations = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    [1, 4, 7],
    [2, 5, 8],
    [3, 6, 9],
    [1, 5, 9],
    [3, 5, 7]
];


function handleClick(event) {

    if(currentPlayer === player) {

        let square = event.target;
        if (square.innerHTML === "") {
            nextStepRequest(id, square.id, player, winnerMessage.innerHTML)
            madeSteps[player].push(parseInt(square.id));
            print(madeSteps)
            checkWin()
            togglePlayer();
        }
    }
}

function checkWin() {
    const playerWon = winningCombinations.find(combination => {
        return combination.every(id => madeSteps[player].includes(id))
    })

    if(playerWon){
        highlightCells(playerWon)
        nextStepRequest(id, null, player, 'wins!')
        winnerMessage.innerHTML = `${player} wins!`;
        disableSquares();
        return;
    }
    console.log(madeSteps)

    if(madeSteps.X.length + madeSteps.O.length === 9){
        winnerMessage.innerHTML = "Draw!";
        nextStepRequest(id, null, null, 'Draw!', false)

        disableSquares();
        return;
    }
    return;
}

function highlightCells(combination){
    nextStepRequest(id, null, player, 'wins!', combination, false)
    combination.forEach(function(idx){
        squares[idx - 1].classList.add("highlight")
    })
}
function print(steps) {
    for (let i = 0; i < steps.X.length; i++) {
            squares[steps.X[i] - 1].innerHTML = "X"
    }
    for (let i = 0; i < steps.O.length; i++) {
            squares[steps.O[i] - 1].innerHTML = "O"
    }
}

function togglePlayer() {
    currentPlayer = currentPlayer === "X" ? "O" : "X";
}

function disableSquares() {
    squares.forEach(square => {
        square.removeEventListener("click", handleClick);
    });
}

function enableSquares() {
    squares.forEach(square => {
        square.addEventListener("click", handleClick);
    });
}

function restartGameReq() {
    restartGameRequest(id, true, false, currentPlayer)
}
function resetGame() {
    resetButton.disabled = true;
    squares.forEach(square => {
                    if (square.className == 'square highlight') {
                        square.classList.remove('highlight')
                    }
                    currentPlayer = "X";
                    square.innerHTML = "";
                    winnerMessage.innerHTML = "";
                    madeSteps = {
                        'X': [],
                        'O': []
                    }
                });
                enableSquares();
    return;
}

async function joinRequest(id) {
    let response = await fetch(`http://127.0.0.1:8000/api/join/${id}`, {
        method: 'POST'
    })
    if (!response.ok) {
        const message = `An error has occured: ${response.status}`;
        throw new Error(message);
    }
    let result = await response.json();
    return result;
}

async function nextStepRequest(id, step, player, message, combination) {
    let response = await fetch(`http://127.0.0.1:8000/api/room/${id}/make-step`, {
        method: 'POST',
        body: JSON.stringify({step, player, message, combination}),
        headers: {
            "Content-Type": "application/json",
        },
    });
    if (!response.ok) {
        const message = `An error has occured: ${response.status}`;
        throw new Error(message);
    }
    let result = response.json();
    return result;
}

async function restartGameRequest(id, reset, resetForSecondPlayer, player) {
    let response = await fetch(`http://127.0.0.1:8000/api/room/${id}/restart`, {
        method: 'POST',
        body: JSON.stringify({reset, player}),
        headers: {
            "Content-Type": "application/json",
        },
    });
    if (!response.ok) {
        const message = `An error has occured: ${response.status}`;
        throw new Error(message);
    }
    let result = response.json();
    return result;
}
