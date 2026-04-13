const DICTIONARY_URL = "https://raw.githubusercontent.com/dwyl/english-words/master/words_dictionary.json";
let dictionary = [];
let currentWord = "";
let dailySeedValue = 0; 
const today = new Date().toDateString();

let hasAddedLetterThisTurn = false;

// We declare these globally but don't assign them until the page is ready
let wordDisplay, loadingDisplay, instructions, messageDisplay, passBtn, claimBtn;

// --- SEED UTILITY ---
function getSeededRandom(additionalShift = 0) {
    let x = Math.sin(dailySeedValue + additionalShift) * 10000;
    let val = x - Math.floor(x);
    return val < 0 ? val + 1 : val;
}

// THIS IS THE FIX: Wait for the HTML to be 100% loaded
document.addEventListener('DOMContentLoaded', () => {
    initGame();
});

async function initGame() {
    // Now that the DOM is ready, we grab the elements
    wordDisplay = document.getElementById('word-display');
    loadingDisplay = document.getElementById('loading-display');
    instructions = document.getElementById('instructions');
    messageDisplay = document.getElementById('message');
    passBtn = document.getElementById('pass-btn');
    claimBtn = document.getElementById('claim-btn');

    // Double check that we actually found the claim button
    if (!claimBtn) {
        console.error("CRITICAL ERROR: Button with ID 'claim-btn' not found in HTML.");
    }

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
    
    // Lock buttons until player types
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
        
        // UNLOCK BUTTONS
        if (passBtn) passBtn.disabled = false;
        if (claimBtn) claimBtn.disabled = false;
        if (messageDisplay) messageDisplay.innerText = "Letter added! Claim or Pass.";
    }
}

function passTurn() {
    if (!hasAddedLetterThisTurn) {
        if (messageDisplay) messageDisplay.innerText = "Add a letter first!";
        return;
    }
    triggerComputer();
}

function triggerComputer() {
    if (messageDisplay) messageDisplay.innerText = "Computer is thinking...";
    if (passBtn) passBtn.disabled = true;
    if (claimBtn) claimBtn.disabled = true;

    setTimeout(() => {
        const possibilities = dictionary.filter(w => w.startsWith(currentWord) && w.length > currentWord.length);
        
        if (possibilities.length > 0) {
            possibilities.sort((a, b) => (a.length - b.length) || a.localeCompare(b));
            const shortestLen = possibilities[0].length;
            const shortestOptions = possibilities.filter(w => w.length === shortestLen);
            
            const seedShift = currentWord.length; 
            const index = Math.floor(getSeededRandom(seedShift) * shortestOptions.length);
            const chosenWord = shortestOptions[index];
            
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
    // This is the core logic for the button
    const isValid = dictionary.includes(currentWord.toUpperCase());
    
    if (isValid) {
        if (messageDisplay) {
            messageDisplay.style.color = "green";
            messageDisplay.innerText = `WIN! "${currentWord}" is a word.`;
        }
        endGame(true);
    } else {
        if (messageDisplay) {
            messageDisplay.style.color = "red";
            messageDisplay.innerText = `LOSS! "${currentWord}" is not a word.`;
        }
        endGame(false);
    }
}

function createKeyboard() {
    const container = document.getElementById('keyboard-container');
    if (!container) return;
    container.innerHTML = ''; 
    const ROWS = [["Q","W","E","R","T","Y","U","I","O","P"],["A","S","D","F","G","H","J","K","L"],["Z","X","C","V","B","N","M"]];

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
    const text = `Suffix Game ${today}\n${currentWord}\nhttps://jakusmaximus.github.io/suffixes/`;
    navigator.clipboard.writeText(text).then(() => alert("Copied!"));
}
