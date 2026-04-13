const DICTIONARY_URL = "https://raw.githubusercontent.com/dwyl/english-words/master/words_dictionary.json";
let dictionary = [];
let currentWord = "";
let dailySeedValue = 0; // Global seed for consistency
const today = new Date().toDateString();

let hasAddedLetterThisTurn = false;

const wordDisplay = document.getElementById('word-display');
const loadingDisplay = document.getElementById('loading-display');
const instructions = document.getElementById('instructions');
const messageDisplay = document.getElementById('message');
const passBtn = document.getElementById('pass-btn');
const claimBtn = document.getElementById('claim-btn');

// --- SEED UTILITY ---
// This ensures "random" choices are the same for everyone today
function getSeededRandom(additionalShift = 0) {
    let x = Math.sin(dailySeedValue + additionalShift) * 10000;
    return x - Math.floor(x) < 0 ? (x - Math.floor(x)) + 1 : x - Math.floor(x);
}

async function initGame() {
    const savedData = JSON.parse(localStorage.getItem('suffix_daily_state'));
    createKeyboard();

    // Generate the base seed once based on the date
    const now = new Date();
    dailySeedValue = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();

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
        loadingDisplay.innerText = "Load Error. Please refresh.";
    }
}

function setupDailyGame() {
    // 1. Get viable starts
    const allStarts = dictionary.map(w => w.substring(0, 3)).filter(s => s.length === 3);
    const counts = {};
    allStarts.forEach(s => counts[s] = (counts[s] || 0) + 1);
    const viable = Object.keys(counts).filter(s => counts[s] >= 150 && /[AEIOUY]/.test(s));

    // 2. Pick starting word using the seed (Same for everyone)
    const startIndex = Math.floor(getSeededRandom(0) * viable.length);
    currentWord = viable[startIndex];
    
    document.getElementById('date-display').innerText = today;
    wordDisplay.innerText = currentWord;
    messageDisplay.innerText = "Your turn! Add one letter.";
    
    passBtn.disabled = true;
    claimBtn.disabled = true;
}

function handleKeyPress(key) {
    if (hasAddedLetterThisTurn) return;

    instructions.style.display = 'none';
    const tempWord = currentWord + key;
    const exists = dictionary.some(w => w.startsWith(tempWord));
    
    if (!exists) {
        currentWord = tempWord;
        wordDisplay.innerText = currentWord;
        gameOver(`Bricked! No words start with "${currentWord}".`);
    } else {
        currentWord = tempWord;
        wordDisplay.innerText = currentWord;
        hasAddedLetterThisTurn = true;
        passBtn.disabled = false;
        claimBtn.disabled = false;
        messageDisplay.innerText = "Letter added! Claim or Pass.";
    }
}

function triggerComputer() {
    messageDisplay.innerText = "Computer is thinking...";
    hasAddedLetterThisTurn = true; 
    passBtn.disabled = true;
    claimBtn.disabled = true;

    setTimeout(() => {
        const possibilities = dictionary.filter(w => w.startsWith(currentWord) && w.length > currentWord.length);
        
        if (possibilities.length > 0) {
            // Sort to ensure the list is in the same order for everyone
            const nextLetters = [...new Set(possibilities.map(w => w[currentWord.length]))].sort();
            
            // Use the seed + word length to pick the letter. 
            // This ensures the computer makes the same "random" choice for everyone today.
            const seedShift = currentWord.length; 
            const letterIndex = Math.floor(getSeededRandom(seedShift) * nextLetters.length);
            
            currentWord += nextLetters[letterIndex];
            wordDisplay.innerText = currentWord;
            
            hasAddedLetterThisTurn = false;
            messageDisplay.innerText = "Computer moved. Your turn!";
        } else {
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
        messageDisplay.innerText = `FAILED! "${currentWord}" is not a word.`;
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
    hasAddedLetterThisTurn = true; 
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
    messageDisplay.innerText = data.won ? `Result: ${data.won ? 'SUCCESS' : 'FAILED'} (${currentWord})`;
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
    navigator.clipboard.writeText(text).then(() => alert("Copied to clipboard!"));
}

passBtn.onclick = passTurn;
claimBtn.onclick = claimWord;
window.onload = initGame;
