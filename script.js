const DICTIONARY_URL = "https://raw.githubusercontent.com/dwyl/english-words/master/words_dictionary.json";
let dictionary = [];
let currentWord = "";
let dailySeedValue = 0; 
const today = new Date().toDateString();

let hasAddedLetterThisTurn = false;

// Global references to elements
let wordDisplay, loadingDisplay, instructions, messageDisplay, passBtn, claimBtn;

// --- SEED UTILITY ---
function getSeededRandom(additionalShift = 0) {
    let x = Math.sin(dailySeedValue + additionalShift) * 10000;
    let val = x - Math.floor(x);
    return val < 0 ? val + 1 : val;
}

async function initGame() {
    // Correctly grab elements after page load
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
        if (loadingDisplay) loadingDisplay.innerText = "Load Error. Please refresh.";
    }
}

function setupDailyGame() {
    const allStarts = dictionary.map(w => w.substring(0, 3)).filter(s => s.length === 3);
    const counts = {};
    allStarts.forEach(s => counts[s] = (counts[s] || 0) + 1);
    const viable = Object.keys(counts).filter(s => counts[s] >= 150 && /[AEIOUY]/.test(s));

    const startIndex = Math.floor(getSeededRandom(0) * viable.length);
    currentWord = viable[startIndex];
    
    const dateEl = document.getElementById('date-display');
    if (dateEl) dateEl.innerText = today;
    if (wordDisplay) wordDisplay.innerText = currentWord;
    if (messageDisplay) messageDisplay.innerText = "Your turn! Add one letter.";
    
    if (passBtn) passBtn.disabled = true;
    if (claimBtn) claimBtn.disabled = true;
}

function handleKeyPress(key) {
    if (hasAddedLetterThisTurn) return;

    if (instructions) instructions.style.display = 'none';
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
        
        if (passBtn) passBtn.disabled = false;
        if (claimBtn) claimBtn.disabled = false;
        if (messageDisplay) messageDisplay.innerText = "Letter added! Claim or Pass.";
    }
}

function passTurn() {
    // If the user hasn't added a letter yet...
    if (!hasAddedLetterThisTurn) {
        if (messageDisplay) {
            messageDisplay.style.color = "orange"; // Give it a warning color
            messageDisplay.innerText = "You must add a letter before passing!";
        }
        return; // Stop here and don't trigger the computer
    }
    
    // Otherwise, proceed to the computer's turn
    if (messageDisplay) messageDisplay.style.color = "black"; // Reset color
    triggerComputer();
}

function triggerComputer() {
    if (messageDisplay) messageDisplay.innerText = "Computer is thinking...";
    if (passBtn) passBtn.disabled = true;
    if (claimBtn) claimBtn.disabled = true;

    setTimeout(() => {
        // 1. Find all words that start with the current string
        const possibilities = dictionary.filter(w => w.startsWith(currentWord) && w.length > currentWord.length);
        
        if (possibilities.length > 0) {
            // 2. Sort by length (shortest first) then alphabetically
            // This ensures the computer prefers common/short words
            possibilities.sort((a, b) => {
                if (a.length !== b.length) {
                    return a.length - b.length;
                }
                return a.localeCompare(b);
            });

            // 3. To keep it fair for everyone, we pick from the top "shortest" options 
            // but use the seed so the choice is identical for everyone today.
            const shortestLength = possibilities[0].length;
            const shortestOptions = possibilities.filter(w => w.length === shortestLength);
            
            // Use seed + word length to pick from the shortest options
            const seedShift = currentWord.length; 
            const index = Math.floor(getSeededRandom(seedShift) * shortestOptions.length);
            const chosenWord = shortestOptions[index];
            
            // 4. Update the word with just the NEXT letter
            currentWord += chosenWord[currentWord.length];
            wordDisplay.innerText = currentWord;
            
            hasAddedLetterThisTurn = false;
            if (messageDisplay) messageDisplay.innerText = "Computer moved. Your turn!";
        } else {
            if (messageDisplay) messageDisplay.innerText = "Computer is stuck! You win!";
            endGame(true);
        }
    }, 800);
}

function claimWord() {
    const isValid = dictionary.includes(currentWord);
    if (isValid) {
        if (messageDisplay) {
            messageDisplay.style.color = "green";
            messageDisplay.innerText = `SUCCESS! "${currentWord}" is a word.`;
        }
        endGame(true);
    } else {
        if (messageDisplay) {
            messageDisplay.style.color = "red";
            messageDisplay.innerText = `FAILED! "${currentWord}" is not a word.`;
        }
        endGame(false);
    }
}

function createKeyboard() {
    const container = document.getElementById('keyboard-container');
    if (!container) return;
    container.innerHTML = ''; // Clear existing
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
    navigator.clipboard.writeText(text).then(() => alert("Copied to clipboard!"));
}

window.onload = initGame;
