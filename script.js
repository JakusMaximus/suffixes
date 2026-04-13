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

        // Hide loading, show word
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
    messageDisplay.innerText = "Your turn! Add a letter.";
    inputField.disabled = false;
    inputField.focus();
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

function playerMove() {
    currentWord += inputField.value.toUpperCase();
    wordDisplay.innerText = currentWord;
    inputField.value = "";
    
    if (!dictionary.some(w => w.startsWith(currentWord))) {
        gameOver(`Game Over! No words start with "${currentWord}".`);
        return;
    }
    messageDisplay.innerText = "Computer is thinking...";
    setTimeout(computerMove, 600);
}

function computerMove() {
    const possibilities = dictionary.filter(w => w.startsWith(currentWord) && w.length > currentWord.length);
    if (possibilities.length > 0) {
        possibilities.sort((a, b) => a.length - b.length);
        currentWord += possibilities[0][currentWord.length];
        wordDisplay.innerText = currentWord;
        messageDisplay.innerText = "Your turn!";
        inputField.focus(); 
    } else {
        gameOver("Computer is stuck! You win!");
    }
}

function closeWord() {
    const isValid = dictionary.includes(currentWord);
    messageDisplay.style.color = isValid ? "green" : "red";
    messageDisplay.innerText = isValid ? `SUCCESS! "${currentWord}" is a word.` : `FAILED! "${currentWord}" is not in the dictionary.`;
    endGame(isValid);
}

function displaySavedGame(data) {
    dateDisplay.innerText = data.date;
    currentWord = data.word;
    wordDisplay.innerText = currentWord;
    messageDisplay.style.color = data.won ? "green" : "red";
    messageDisplay.innerText = data.won ? `Daily Complete: SUCCESS (${currentWord})` : `Daily Complete: FAILED (${currentWord})`;
    endGame(data.won, true);
}

function endGame(won, alreadyPlayed = false) {
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
