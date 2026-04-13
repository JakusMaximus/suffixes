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
        dictionary = Object.keys(data).map(word => word.toUpperCase()).filter(word => word.length > 2);

        loadingDisplay.style.display = 'none';
        wordDisplay.style.display = 'block';

        if (savedData && savedData.date === today) {
            displaySavedGame(savedData);
        } else {
            setupDailyAutomatedGame();
        }
    } catch (error) {
        loadingDisplay.innerText = "Error Loading. Please refresh.";
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

    const viableStarts = Object.keys(counts).filter(start => counts[start] >= 150 && /[AEIOUY]/.test(start));
    const finalIndex = Math.floor(seededRandom * viableStarts.length);
    currentWord = viableStarts[finalIndex];

    dateDisplay.innerText = today;
    wordDisplay.innerText = currentWord;
    messageDisplay.innerText = "Your turn! Add a letter or Close Word.";
    inputField.disabled = false;
}

function playerMove() {
    // Check if the input is actually a letter
    const letter = inputField.value.toUpperCase();
    if (!/^[A-Z]$/.test(letter)) return;

    currentWord += letter;
    wordDisplay.innerText = currentWord;
    inputField.value = "";
    
    // Check if the sequence is still possible
    const isPossible = dictionary.some(w => w.startsWith(currentWord));
    
    if (!isPossible) {
        gameOver(`Game Over! No words start with "${currentWord}".`);
        return;
    }

    messageDisplay.innerText = "Computer is thinking...";
    
    // Disable keyboard during computer "thought"
    inputField.disabled = true;

    setTimeout(computerMove, 600);
}

function computerMove() {
    const possibilities = dictionary.filter(w => w.startsWith(currentWord) && w.length > currentWord.length);
    
    if (possibilities.length > 0) {
        possibilities.sort((a, b) => a.length - b.length);
        const target = possibilities[0];
        currentWord += target[currentWord.length];
        wordDisplay.innerText = currentWord;
        messageDisplay.innerText = "Computer moved. Your turn!";
    } else {
        messageDisplay.innerText = "Computer is stuck! You can extend it or Close Word now.";
    }
    
    // Re-enable keyboard for player
    inputField.disabled = false;
}

function closeWord() {
    // Player chooses to bank their current string
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
    messageDisplay.innerText = data.won ? `Daily Result: SUCCESS (${currentWord})` : `Daily Result: FAILED (${currentWord})`;
    endGame(data.won, true);
}

function endGame(won, alreadyPlayed = false) {
    inputField.disabled = true;
    document.getElementById('controls').style.display = 'none';
    document.getElementById('keyboard-container').style.display = 'none';
    document.getElementById('share-btn').style.display = 'inline-block';

    if (!alreadyPlayed) {
        localStorage.setItem('suffix_daily_state', JSON.stringify({date: today, word: currentWord, won: won}));
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
    alert("Result copied!");
}

window.onload = initGame;
