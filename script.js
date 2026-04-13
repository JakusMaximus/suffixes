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
// Ensures "random" choices are identical for everyone today
function getSeededRandom(additionalShift = 0) {
    let x = Math.sin(dailySeedValue + additionalShift) * 10000;
    let val = x - Math.floor(x);
    return val < 0 ? val + 1 : val;
}

async function initGame() {
    // Identify HTML elements
    wordDisplay = document.getElementById('word-display');
    loadingDisplay = document.getElementById('loading-display');
    instructions = document.getElementById('instructions');
    messageDisplay = document.getElementById('message');
    passBtn = document.getElementById('pass-btn');
    claimBtn = document.getElementById('claim-btn');

    const savedData = JSON.parse(localStorage.getItem('suffix_daily_state'));
    createKeyboard();

    // Generate the base seed once based on the date
    const now = new Date();
    dailySeedValue = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();

    try {
        const response = await fetch(DICTIONARY_URL);
        const data = await response.json();
        // Standardize dictionary (Upper Case)
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
        console.error("Dictionary Load Failed", e);
        if (loadingDisplay) loadingDisplay.innerText = "Load Error. Please refresh.";
    }
}

function setupDailyGame() {
    // 1. Find all 3-letter starts that have plenty of word options
    const allStarts = dictionary.map(w => w.substring(0, 3)).filter(s => s.length === 3);
    const counts = {};
    allStarts.forEach(s => counts[s] = (counts[s] || 0) + 1);
    const viable = Object.keys(counts).filter(s => counts[s] >= 150 && /[AEIOUY]/.test(s));

    // 2. Pick starting word using the seed
    const startIndex = Math.floor(getSeededRandom(0) * viable.length);
    currentWord = viable[startIndex];
    
    const dateEl = document.getElementById('date-display');
    if (dateEl) dateEl.innerText = today;
    if (wordDisplay) wordDisplay.innerText = currentWord;
    if (messageDisplay) {
        messageDisplay.style.color = "black";
        messageDisplay.innerText = "Your turn! Add one letter.";
    }
    
    // Disable buttons until a letter is added
    if (passBtn) passBtn.disabled = true;
    if (claimBtn) claimBtn.disabled = true;
}

function handleKeyPress(key) {
    // Only allow one letter per turn
    if (hasAddedLetterThisTurn) return;

    if (instructions) instructions.style.display = 'none';
    const tempWord = currentWord + key;
    
    // Check if the move is legal
    const exists = dictionary.some(w => w.startsWith(tempWord));
    
    if (!exists) {
        currentWord = tempWord;
        wordDisplay.innerText = currentWord;
        gameOver(`Bricked! No words start with "${currentWord}".`);
    } else {
        currentWord = tempWord;
        wordDisplay.innerText = currentWord;
        hasAddedLetterThisTurn = true; // Lock keyboard
        
        if (passBtn) passBtn.disabled = false;
        if (claimBtn) claimBtn.disabled = false;
        if (messageDisplay) {
            messageDisplay.style.color = "black";
            messageDisplay.innerText = "Letter added! Now Claim Word or Pass Turn.";
        }
    }
}

function passTurn() {
    // Logic check if user tries to pass too early
    if (!hasAddedLetterThisTurn) {
        if (messageDisplay) {
            messageDisplay.style.color = "orange";
            messageDisplay.innerText = "You must add a letter before passing!";
        }
        return;
    }
    triggerComputer();
}

function triggerComputer() {
    if (messageDisplay) {
        messageDisplay.style.color = "black";
        messageDisplay.innerText = "Computer is thinking...";
    }
    if (passBtn) passBtn.disabled = true;
    if (claimBtn) claimBtn.disabled = true;

    setTimeout(() => {
        const possibilities = dictionary.filter(w => w.startsWith(currentWord) && w.length > currentWord.length);
        
        if (possibilities.length > 0) {
            // Sort by shortest length first, then alphabetical for tie-breaks
            possibilities.sort((a, b) => {
                if (a.length !== b.length) return a.length - b.length;
                return a.localeCompare(b);
            });

            // Find all options at the shortest available length
            const shortestLen = possibilities[0].length;
            const shortestOptions = possibilities.filter(w => w.length === shortestLen);
            
            // Pick based on daily seed to ensure fairness
            const seedShift = currentWord.length; 
            const index = Math.floor(getSeededRandom(seedShift) * shortestOptions.length);
            const chosenWord = shortestOptions[index];
            
            // Add ONLY the next letter
            currentWord += chosenWord[currentWord.length];
            wordDisplay.innerText = currentWord;
            
            // Re-unlock player turn
            hasAddedLetterThisTurn = false;
            if (messageDisplay) messageDisplay.innerText = "Computer moved. Your turn!";
        } else {
            if (messageDisplay) messageDisplay.innerText = "Computer is stuck! You win!";
            endGame(true);
        }
    }, 800);
}

function claimWord() {
    // If the button is clicked but no letter added (safeguard)
    if (!hasAddedLetterThisTurn) {
        if (messageDisplay) messageDisplay.innerText = "Add a letter first!";
        return;
    }

    const isValid = dictionary.includes(currentWord.toUpperCase());
    
    if (isValid) {
        if (messageDisplay) {
            messageDisplay.style.color = "green";
            messageDisplay.innerText = `SUCCESS! "${currentWord}" is a word.`;
        }
        endGame(true);
    } else {
        if (messageDisplay) {
            messageDisplay.style.color = "red";
            messageDisplay.innerText = `FAILED! "${currentWord}" is not in the dictionary.`;
        }
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
    if (messageDisplay) {
        messageDisplay.style.color = "red";
        messageDisplay.innerText = msg;
    }
    endGame(false);
}

function displaySavedGame(data) {
    currentWord = data.word;
    wordDisplay.innerText = currentWord;
    if (messageDisplay) {
        messageDisplay.style.color = data.won ? "green" : "red";
        messageDisplay.innerText = data.won ? `Result: SUCCESS (${currentWord})` : `Result: FAILED (${currentWord})`;
    }
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
    navigator.clipboard.writeText(text).then(() => alert("Results copied to clipboard!"));
}

// Start the game
window.onload = initGame;
