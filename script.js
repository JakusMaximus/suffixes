const DICTIONARY_URL = "https://raw.githubusercontent.com/dwyl/english-words/master/words_dictionary.json";
let dictionary = [];
let currentWord = "";
const today = new Date().toDateString();

// Control variables for turn-based logic
let hasAddedLetterThisTurn = false;

const wordDisplay = document.getElementById('word-display');
const loadingDisplay = document.getElementById('loading-display');
const instructions = document.getElementById('instructions');
const messageDisplay = document.getElementById('message');
const inputField = document.getElementById('letter-input');
const passBtn = document.getElementById('pass-btn');
const claimBtn = document.getElementById('claim-btn'); // Ensure this ID exists in your HTML

async function initGame() {
    const savedData = JSON.parse(localStorage.getItem('suffix_daily_state'));
    createKeyboard();

    try {
        const response = await fetch(DICTIONARY_URL);
        const data = await response.json();
        // Filter for words > 2 letters and capitalize
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
        loadingDisplay.innerText = "Load Error. Please refresh.";
    }
}

function setupDailyGame() {
    const now = new Date();
    // Improved seeded random to avoid negative numbers
    const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    let x = Math.sin(dateSeed) * 10000;
    let seededRandom = x - Math.floor(x);
    if (seededRandom < 0) seededRandom += 1;

    // Find viable 3-letter starts
    const allStarts = dictionary.map(w => w.substring(0, 3)).filter(s => s.length === 3);
    const counts = {};
    allStarts.forEach(s => counts[s] = (counts[s] || 0) + 1);
    const viable = Object.keys(counts).filter(s => counts[s] >= 150 && /[AEIOUY]/.test(s));

    currentWord = viable[Math.floor(seededRandom * viable.length)];
    
    document.getElementById('date-display').innerText = today;
    wordDisplay.innerText = currentWord;
    messageDisplay.innerText = "Your turn! Add one letter.";
    
    // Initial UI State
    passBtn.disabled = true;
    claimBtn.disabled = true;
}

function handleKeyPress(key) {
    // Prevent adding more than one letter per turn
    if (hasAddedLetterThisTurn) {
        messageDisplay.innerText = "You already added a letter! Claim or Pass.";
        return;
    }

    instructions.style.display = 'none';
    const tempWord = currentWord + key;

    // Check if the move is legal (does it lead to any word?)
    const exists = dictionary.some(w => w.startsWith(tempWord));
    
    if (!exists) {
        currentWord = tempWord;
        wordDisplay.innerText = currentWord;
        gameOver(`Bricked! No words start with "${currentWord}".`);
    } else {
        currentWord = tempWord;
        wordDisplay.innerText = currentWord;
        hasAddedLetterThisTurn = true;
        
        // Enable choices
        passBtn.disabled = false;
        claimBtn.disabled = false;
        messageDisplay.innerText = "Letter added! Now Claim Word or Pass Turn.";
    }
}

function triggerComputer() {
    messageDisplay.innerText = "Computer is thinking...";
    // Lock UI during computer turn
    hasAddedLetterThisTurn = true; 
    passBtn.disabled = true;
    claimBtn.disabled = true;

    setTimeout(() => {
        const possibilities = dictionary.filter(w => w.startsWith(currentWord) && w.length > currentWord.length);
        
        if (possibilities.length > 0) {
            // Computer picks a random valid next letter from all possible words
            const nextLetters = [...new Set(possibilities.map(w => w[currentWord.length]))];
            const randomLetter = nextLetters[Math.floor(Math.random() * nextLetters.length)];
            
            currentWord += randomLetter;
            wordDisplay.innerText = currentWord;
            
            // Hand control back to player
            hasAddedLetterThisTurn = false;
            messageDisplay.innerText = "Computer moved. Your turn! Add a letter.";
        } else {
            // This shouldn't happen often if dictionary is consistent
            messageDisplay.innerText = "Computer is stuck! You win!";
            endGame(true);
        }
    }, 800);
}

function claimWord() {
    const isValid = dictionary.includes(currentWord);
    if (isValid) {
        messageDisplay.style.color = "green";
        messageDisplay.innerText = `SUCCESS! "${currentWord}" is a word.`;
        endGame(true);
    } else {
        messageDisplay.style.color = "red";
        messageDisplay.innerText = `FAILED! "${currentWord}" is not a dictionary word yet.`;
        endGame(false);
    }
}

function passTurn() {
    if (!hasAddedLetterThisTurn) return;
    triggerComputer();
}

function createKeyboard() {
    const container = document.getElementById('keyboard-container');
    const ROWS = [
        ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
        ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
        ["Z", "X", "C", "V", "B", "N", "M"]
    ];

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
    hasAddedLetterThisTurn = true; // Block further typing
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
    if(!savedData) return;
    
    const isWin = savedData.won;
    const len = currentWord.length;
    
    let squares = "";
    for(let i = 0; i < len; i++) {
        squares += (i === len - 1 && !isWin) ? "🟥" : "🟩";
    }

    const text = `Suffix Game ${today}\n${squares}\nhttps://jakusmaximus.github.io/suffixes/`;
    navigator.clipboard.writeText(text).then(() => {
        alert("Results copied to clipboard!");
    });
}

// Attach event listeners to buttons
passBtn.onclick = passTurn;
claimBtn.onclick = claimWord;

window.onload = initGame;
