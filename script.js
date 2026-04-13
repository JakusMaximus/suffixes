const DICTIONARY_URL = "https://cdn.jsdelivr.net/gh/dwyl/english-words@master/words_dictionary.json";
let dictionary = [];
let currentWord = "";
let initialLength = 3; 
let canType = true; 
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
    createKeyboard();
    const savedData = JSON.parse(localStorage.getItem('suffix_daily_state'));

    try {
        const response = await fetch(DICTIONARY_URL);
        if (!response.ok) throw new Error("Dictionary download failed");
        
        const data = await response.json();
        // Convert keys to uppercase and filter for length
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
        console.error(e);
        loadingDisplay.innerText = "Error loading dictionary. Please refresh.";
    }
}

function setupDailyGame() {
    const now = new Date();
    // Seeded random based on date
    const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    let seededRandom = Math.sin(dateSeed) * 10000;
    seededRandom = seededRandom - Math.floor(seededRandom);

    const allStarts = dictionary.map(w => w.substring(0, 3)).filter(s => s.length === 3);
    const counts = {};
    allStarts.forEach(s => counts[s] = (counts[s] || 0) + 1);
    
    // Pick a starting 3-letter suffix that has at least 150 possible continuations
    const viable = Object.keys(counts).filter(s => counts[s] >= 150 && /[AEIOUY]/.test(s));

    currentWord = viable[Math.floor(seededRandom * viable.length)];
    initialLength = currentWord.length; 
    document.getElementById('date-display').innerText = today;
    wordDisplay.innerText = currentWord;
    messageDisplay.innerText = "Your turn! Add a letter.";
    
    canType = true;
    updateKeyStates(true);
}

function handleKeyPress(key) {
    if (!canType) return;

    instructions.style.display = 'none';
    currentWord += key;
    wordDisplay.innerText = currentWord;
    
    // Check if the current string is still a valid start to any word
    if (!dictionary.some(w => w.startsWith(currentWord))) {
        gameOver(`Bricked! No words start with "${currentWord}".`);
    } else {
        messageDisplay.innerText = "Letter added. Claim Word or Pass Turn.";
        // Lock typing until Computer moves or player fails
        canType = false;
        updateKeyStates(false);
    }
}

function triggerComputer() {
    // If the player hasn't typed yet, don't let them pass
    if (canType) {
        messageDisplay.innerText = "You must add a letter first!";
        return;
    }

    messageDisplay.innerText = "Computer is thinking...";
    passBtn.disabled = true;

    setTimeout(() => {
        const possibilities = dictionary.filter(w => w.startsWith(currentWord) && w.length > currentWord.length);
        
        if (possibilities.length > 0) {
            // Greedy AI: picks the shortest possible valid continuation
            possibilities.sort((a, b) => a.length - b.length);
            currentWord += possibilities[0][currentWord.length];
            wordDisplay.innerText = currentWord;
            
            messageDisplay.innerText = "Computer moved. Your turn!";
            
            // Turn back to player
            canType = true;
            passBtn.disabled = false;
            updateKeyStates(true);
        } else {
            messageDisplay.innerText = "Computer is stuck! You must claim it.";
            // If computer is stuck, player can't pass again, but they can still claim
            passBtn.disabled = true;
        }
    }, 600);
}

function updateKeyStates(enabled) {
    const keys = document.querySelectorAll('.key');
    keys.forEach(k => {
        k.style.opacity = enabled ? "1" : "0.4";
        k.style.pointerEvents = enabled ? "auto" : "none";
        k.style.cursor = enabled ? "pointer" : "default";
    });
}

function claimWord() {
    const isValid = dictionary.includes(currentWord);
    messageDisplay.style.color = isValid ? "var(--accent-success)" : "red";
    messageDisplay.innerText = isValid ? `SUCCESS! "${currentWord}" is a word.` : `FAILED! "${currentWord}" is not a word.`;
    endGame(isValid);
}

function createKeyboard() {
    const container = document.getElementById('keyboard-container');
    container.innerHTML = ''; // Clear existing
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
    canType = false;
    updateKeyStates(false);
    document.getElementById('controls').style.display = 'none';
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
    messageDisplay.style.color = data.won ? "var(--accent-success)" : "red";
    messageDisplay.innerText = data.won ? `Result: SUCCESS (${currentWord})` : `Result: FAILED (${currentWord})`;
    endGame(data.won, true);
}

function shareResult() {
    const savedData = JSON.parse(localStorage.getItem('suffix_daily_state'));
    if (!savedData) return;
    
    const isWin = savedData.won;
    const len = currentWord.length;
    
    let squares = "";
    for(let i = 0; i < len; i++) {
        squares += ( !isWin && i === len - 1) ? "🟥" : "🟩";
    }

    const text = `Suffixes Game ${today}\n${squares}\nhttps://jakusmaximus.github.io/suffixes/`;
    navigator.clipboard.writeText(text);
    alert("Result copied to clipboard!");
}

window.onload = initGame;
