const DICTIONARY_URL = "https://raw.githubusercontent.com/dwyl/english-words/master/words_dictionary.json";
let dictionary = [];
let currentWord = "";
let dailySeedValue = 0; 
const today = new Date().toDateString();

// Control variable to enforce one-letter-per-turn
let hasAddedLetterThisTurn = false;

// Global element references
let wordDisplay, loadingDisplay, instructions, messageDisplay, passBtn, claimBtn;

// --- SEED UTILITY ---
function getSeededRandom(additionalShift = 0) {
    let x = Math.sin(dailySeedValue + additionalShift) * 10000;
    let val = x - Math.floor(x);
    return val < 0 ? val + 1 : val;
}

// Ensure DOM is ready before running
document.addEventListener('DOMContentLoaded', () => {
    initGame();
});

async function initGame() {
    wordDisplay = document.getElementById('word-display');
    loadingDisplay = document.getElementById('loading-display');
    instructions = document.getElementById('instructions');
    messageDisplay = document.getElementById('message');
    passBtn = document.getElementById('pass-btn');
    claimBtn = document.getElementById('claim-btn');

    const savedData = JSON.parse(localStorage.getItem('suffix_daily_state'));
    createKeyboard();

    const now = new Date();
    dailySeedValue = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();

    try {
        const response = await fetch(DICTIONARY_URL);
        const data = await response.json();
        // Standardize dictionary
        dictionary = Object.keys(data).map(w => w.toUpperCase()).filter(w => w.length > 2);

        if (loadingDisplay) loadingDisplay.style.display = 'none';
        if (wordDisplay) wordDisplay.style.display = 'block';

        if (savedData && savedData.date === today) {
            displaySavedGame(savedData);
        } else {
            if (instructions) instructions.style.display = 'block';
            setupDailyGame();
        }
    } catch (e) {
        if (loadingDisplay) loadingDisplay.innerText = "Load Error. Refresh.";
    }
}

function setupDailyGame() {
    const allStarts = dictionary.map(w => w.substring(0, 3)).filter(s => s.length === 3);
    const counts = {};
    allStarts.forEach(s => counts[s] = (counts[s] || 0) + 1);
    const viable = Object.keys(counts).filter(s => counts[s] >= 150 && /[AEIOUY]/.test(s));

    const startIndex = Math.floor(getSeededRandom(0) * viable.length);
    currentWord = viable[startIndex];
    
    document.getElementById('date-display').innerText = today;
    wordDisplay.innerText = currentWord;
    messageDisplay.innerText = "Your turn! Add one letter.";
    
    // Initial state: Buttons locked until player types
    if (passBtn) passBtn.disabled = true;
    if (claimBtn) claimBtn.disabled = true;
}

function handleKeyPress(key) {
    if (hasAddedLetterThisTurn) return;

    if (instructions) instructions.style.display = 'none';
    const tempWord = (currentWord + key).toUpperCase();
    const exists = dictionary.some(w => w.startsWith(tempWord));
    
    if (!exists) {
        currentWord = tempWord;
        wordDisplay.innerText = currentWord;
        gameOver(`Bricked! No words start with "${currentWord}".`);
    } else {
        currentWord = tempWord;
        wordDisplay.innerText = currentWord;
        hasAddedLetterThisTurn = true; // Lock keyboard
        
        // UNLOCK BUTTONS
        if (passBtn) passBtn.disabled = false;
        if (claimBtn) claimBtn.disabled = false;
        messageDisplay.innerText = "Letter added! Claim Word or Pass Turn.";
    }
}

function passTurn() {
    if (!hasAddedLetterThisTurn) return;
    triggerComputer();
}

function triggerComputer() {
    messageDisplay.innerText = "Computer is thinking...";
    // Lock everything during computer turn
    if (passBtn) passBtn.disabled = true;
    if (claimBtn) claimBtn.disabled = true;
    hasAddedLetterThisTurn = true; 

    setTimeout(() => {
        const possibilities = dictionary.filter(w => w.startsWith(currentWord) && w.length > currentWord.length);
        
        if (possibilities.length > 0) {
            // Pick shortest word path
            possibilities.sort((a, b) => (a.length - b.length) || a.localeCompare(b));
            const shortestLen = possibilities[0].length;
            const shortestOptions = possibilities.filter(w => w.length === shortestLen);
            
            const seedShift = currentWord.length; 
            const index = Math.floor(getSeededRandom(seedShift) * shortestOptions.length);
            const chosenWord = shortestOptions[index];
            
            currentWord += chosenWord[currentWord.length].toUpperCase();
            wordDisplay.innerText = currentWord;
            
            // --- THE FIX ---
            // Allow the player to claim the computer's word immediately
            hasAddedLetterThisTurn = false; 
            if (passBtn) passBtn.disabled = true; // Still need to add a letter to pass back
            if (claimBtn) claimBtn.disabled = false; // BUT you can claim what the computer just did!
            messageDisplay.innerText = "Computer moved. Add a letter or Claim!";
        } else {
            messageDisplay.innerText = "Computer is stuck! You win!";
            endGame(true);
        }
    }, 800);
}

function claimWord() {
    const isValid = dictionary.includes(currentWord.toUpperCase());
    
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

function createKeyboard() {
    const container = document.getElementById('keyboard-container');
    if (!container) return;
    container.innerHTML = ''; 
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
    const controls = document.getElementById('controls');
    const keyboard = document.getElementById('keyboard-container');
    const share = document.getElementById('share-btn');

    if (controls) controls.style.display = 'none';
    if (keyboard) keyboard.style.display = 'none';
    if (share) share.style.display = 'inline-block';

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
    const text = `Suffix Game ${today}\n${currentWord}\nhttps://jakusmaximus.github.io/suffixes/`;
    navigator.clipboard.writeText(text).then(() => alert("Copied!"));
}
