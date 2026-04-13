const DICTIONARY_URL = "https://raw.githubusercontent.com/dwyl/english-words/master/words_dictionary.json";
let dictionary = [];
let currentWord = "";
let initialLength = 3; // To track how many squares we need
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
const passBtn = document.getElementById('pass-btn');

async function initGame() {
    const savedData = JSON.parse(localStorage.getItem('suffix_daily_state'));
    createKeyboard();

    try {
        const response = await fetch(DICTIONARY_URL);
        const data = await response.json();
        dictionary = Object.keys(data).map(w => w.toUpperCase()).filter(w => w.length > 2);

        loadingDisplay.style.display = 'none';
        wordDisplay.style.display = 'block';

        if (savedData && savedData.date === today) {
            displaySavedGame(savedData);
        } else {
            instructions.style.display = 'block';
            setupDailyGame();
        }
    } catch (e) {
        loadingDisplay.innerText = "Load Error. Refresh.";
    }
}

function setupDailyGame() {
    const now = new Date();
    const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    let seededRandom = Math.sin(dateSeed) * 10000;
    seededRandom = seededRandom - Math.floor(seededRandom);

    const allStarts = dictionary.map(w => w.substring(0, 3)).filter(s => s.length === 3);
    const counts = {};
    allStarts.forEach(s => counts[s] = (counts[s] || 0) + 1);
    const viable = Object.keys(counts).filter(s => counts[s] >= 150 && /[AEIOUY]/.test(s));

    currentWord = viable[Math.floor(seededRandom * viable.length)];
    initialLength = currentWord.length; 
    document.getElementById('date-display').innerText = today;
    wordDisplay.innerText = currentWord;
    messageDisplay.innerText = "Your turn! Add a letter.";
}

function handleKeyPress(key) {
    if (inputField.disabled) return;
    instructions.style.display = 'none';
    currentWord += key;
    wordDisplay.innerText = currentWord;
    
    if (!dictionary.some(w => w.startsWith(currentWord))) {
        gameOver(`Bricked! No words start with "${currentWord}".`);
    } else {
        messageDisplay.innerText = "Letter added. Claim Word or Pass Turn.";
    }
}

function triggerComputer() {
    messageDisplay.innerText = "Computer is thinking...";
    inputField.disabled = true;
    passBtn.disabled = true;

    setTimeout(() => {
        const possibilities = dictionary.filter(w => w.startsWith(currentWord) && w.length > currentWord.length);
        if (possibilities.length > 0) {
            possibilities.sort((a, b) => a.length - b.length);
            currentWord += possibilities[0][currentWord.length];
            wordDisplay.innerText = currentWord;
            messageDisplay.innerText = "Computer moved. Your turn!";
        } else {
            messageDisplay.innerText = "Computer is stuck! Your turn.";
        }
        inputField.disabled = false;
        passBtn.disabled = false;
    }, 600);
}

function claimWord() {
    const isValid = dictionary.includes(currentWord);
    messageDisplay.style.color = isValid ? "green" : "red";
    messageDisplay.innerText = isValid ? `SUCCESS! "${currentWord}" is a word.` : `FAILED! "${currentWord}" is not a word.`;
    endGame(isValid);
}

function createKeyboard() {
    const container = document.getElementById('keyboard-container');
    ROWS.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';
        row.forEach(key => {
            const btn = document.createElement('div');
            btn.className = 'key';
            btn.innerText = key;
            btn.onclick = () => handleKeyPress(key);
            rowDiv.appendChild(btn);
        });
        container.appendChild(rowDiv);
    });
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

function displaySavedGame(data) {
    currentWord = data.word;
    wordDisplay.innerText = currentWord;
    messageDisplay.style.color = data.won ? "green" : "red";
    messageDisplay.innerText = data.won ? `Result: SUCCESS (${currentWord})` : `Result: FAILED (${currentWord})`;
    endGame(data.won, true);
}

function shareResult() {
    const savedData = JSON.parse(localStorage.getItem('suffix_daily_state'));
    const isWin = savedData.won;
    const len = currentWord.length;
    
    // Build squares: All green if win, last one red if loss
    let squares = "";
    for(let i = 0; i < len; i++) {
        if (!isWin && i === len - 1) {
            squares += "🟥";
        } else {
            squares += "🟩";
        }
    }

    const text = `Suffix Game ${today}\n${squares}\nWord: ${currentWord}\nhttps://jakusmaximus.github.io/suffixes/`;
    navigator.clipboard.writeText(text);
    alert("Shareable results copied to clipboard!");
}

window.onload = initGame;
