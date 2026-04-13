// The "Brain" of the Suffix Game
const DICTIONARY_URL = "https://raw.githubusercontent.com/dwyl/english-words/master/words_dictionary.json";

let dictionary = [];
let currentWord = "";
const today = new Date().toDateString();

const ROWS = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M"]
];

const wordDisplay = document.getElementById('word-display');
const loadingDisplay = document.getElementById('loading-display');
const instructions = document.getElementById('instructions');
const messageDisplay = document.getElementById('message');
const inputField = document.getElementById('letter-input');
const dateDisplay = document.getElementById('date-display');
const controls = document.getElementById('controls');

async function initGame() {
    const savedData = JSON.parse(localStorage.getItem('suffix_daily_state'));
    if (document.getElementById('keyboard-container')) createKeyboard();

    try {
        const response = await fetch(DICTIONARY_URL);
        const data = await response.json();
        
        // Dictionary is JSON; keys are the words
        dictionary = Object.keys(data)
                           .map(word => word.toUpperCase())
                           .filter(word => word.length > 2);

        loadingDisplay.style.display = 'none';
        wordDisplay.style.display = 'block';

        if (savedData && savedData.date === today) {
            if (instructions) instructions.style.display = 'none';
            displaySavedGame(savedData);
        } else {
            if (instructions) instructions.style.display = 'block';
            setupDailyAutomatedGame();
        }
    } catch (error) {
        loadingDisplay.innerText = "Error Loading. Please refresh.";
        console.error(error);
    }
}

function setupDailyAutomatedGame() {
    const now = new Date();
    const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    
    let seededRandom = Math.sin(dateSeed) * 10000;
    seededRandom = seededRandom - Math.floor(seededRandom);

    const allStarts = dictionary.map(w => w.substring(0, 3)).filter(s => s.length === 3);
    const counts = {};
    allStarts.forEach(s => counts[s] = (counts[s] || 0) + 1);

    // Filter for starters that appear in at least 150 words
    const viableStarts = Object.keys(counts).filter(start => {
        return counts[start] >= 150 && /[AEIOUY]/.test(start);
    });

    const finalIndex = Math.floor(seededRandom * viableStarts.length);
    currentWord = viableStarts[finalIndex];

    dateDisplay.innerText = today;
    wordDisplay.innerText = currentWord;
    messageDisplay.innerText = "Ready to play!";
    inputField.disabled = false;
}

function playerMove() {
    const letter = inputField.value.toUpperCase();
    if (!/^[A-Z]$/.test(letter)) return;

    // Hide instructions on the very first move
    if (instructions) instructions.style.display = 'none';

    currentWord += letter;
    wordDisplay.innerText = currentWord;
    inputField.value = "";
    
    const possible = dictionary.some(w => w.startsWith(currentWord));
    
    if (!possible) {
        gameOver(`Game Over! No words start with "${currentWord}".`);
        return;
    }

    messageDisplay.innerText = "Computer is thinking...";
    inputField.disabled = true; // Lock keyboard during computer turn

    setTimeout(computerMove, 600);
}

function computerMove() {
    const possibilities = dictionary.filter(w => w.startsWith(currentWord) && w.length > currentWord.length);
    
    if (possibilities.length > 0) {
        possibilities.sort((a, b) => a.length - b.length);
        const target = possibilities[0];
        currentWord += target[currentWord.length];
        wordDisplay.innerText = currentWord;
        messageDisplay.innerText = "Computer moved. Continue or Close Word?";
    } else {
        messageDisplay.innerText = "Computer is stuck! Extend it further or Close Word now.";
    }
    
    inputField.disabled = false;
}

function closeWord() {
    const isValid = dictionary.includes(currentWord);
    if (isValid) {
        messageDisplay.style.color = "green";
        messageDisplay.innerText = `SUCCESS! "${currentWord}" is a word.`;
        endGame(true);
    } else {
        messageDisplay.style.color = "red";
        messageDisplay.innerText = `FAILED! "${currentWord}" is not in the dictionary.`;
        endGame(false);
    }
}

function createKeyboard() {
    const container = document.getElementById('keyboard-container');
    container.innerHTML = '';

    ROWS.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';
        row.forEach(key => {
            const button = document.createElement('div');
            button.className = 'key';
            button.innerText = key;
            button.onclick = () => handleKeyPress(key);
            rowDiv.appendChild(button);
        });
        container.appendChild(rowDiv);
    });
}

function handleKeyPress(key) {
    if (inputField.disabled) return;
    inputField.value = key;
    playerMove();
}

function displaySavedGame(data) {
    dateDisplay.innerText = data.date;
    currentWord = data.word;
    wordDisplay.innerText = currentWord;
    messageDisplay.style.color = data.won ? "green" : "red";
    messageDisplay.innerText = data.won ? 
        `Daily Result: SUCCESS (${currentWord})` : 
        `Daily Result: FAILED (${currentWord})`;
    endGame(data.won, true);
}

function endGame(won, alreadyPlayed = false) {
    inputField.disabled = true;
    if (controls) controls.style.display = 'none';
    const kb = document.getElementById('keyboard-container');
    if (kb) kb.style.display = 'none';
    const share = document.getElementById('share-btn');
    if (share) share.style.display = 'inline-block';

    if (!alreadyPlayed) {
        const gameState = {
            date: today,
            word: currentWord,
            won: won
        };
        localStorage.setItem('suffix_daily_state', JSON.stringify(gameState));
    }
}

function gameOver(msg) {
    messageDisplay.style.color = "red";
    messageDisplay.innerText = msg;
    endGame(false);
}

function shareResult() {
    const status = messageDisplay.innerText.includes("SUCCESS") ? "🟩" : "🟥";
    const text = `Suffix Game ${today}\n${status} Word: ${currentWord}\nhttps://jakusmaximus.github.io/suffixes/`;
    navigator.clipboard.writeText(text);
    alert("Result copied to clipboard!");
}

window.onload = initGame;
