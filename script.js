const DICTIONARY_URL = "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt";
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
const passBtn = document.getElementById('pass-btn');

async function initGame() {
    createKeyboard();
    const savedData = JSON.parse(localStorage.getItem('suffix_daily_state'));

    try {
        const response = await fetch(DICTIONARY_URL);
        if (!response.ok) throw new Error("Download failed");
        
        const text = await response.text();
        dictionary = text.split('\n')
                         .map(w => w.trim().toUpperCase())
                         .filter(w => w.length > 2);

        loadingDisplay.style.display = 'none';
        wordDisplay.style.display = 'block';

        if (savedData && savedData.date === today) {
            displaySavedGame(savedData);
        } else {
            instructions.style.display = 'block';
            setupDailyGame();
        }
    } catch (e) {
        console.error("Initialization Error:", e);
        loadingDisplay.innerText = "Error loading dictionary. Please refresh.";
    }
}

function createKeyboard() {
    const container = document.getElementById('keyboard-container');
    container.innerHTML = '';
    ROWS.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';
        row.forEach(key => {
            const btn = document.createElement('button');
            btn.className = 'key-btn';
            btn.innerText = key;
            btn.onclick = () => handleKeyPress(key);
            rowDiv.appendChild(btn);
        });
        container.appendChild(rowDiv);
    });
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
    
    if (!dictionary.some(w => w.startsWith(currentWord))) {
        gameOver(`Bricked! No words start with "${currentWord}".`, false);
    } else {
        messageDisplay.innerText = "Letter added. Claim Word or Pass Turn.";
        canType = false;
        updateKeyStates(false);
        passBtn.disabled = false; // Enable pass button after typing
    }
}

function triggerComputer() {
    if (canType) return;
    messageDisplay.innerText = "Computer is thinking...";
    passBtn.disabled = true;

    setTimeout(() => {
        const possibilities = dictionary.filter(w => w.startsWith(currentWord) && w.length > currentWord.length);
        
        if (possibilities.length === 0) {
            gameOver("Computer couldn't find a word! You win!", true);
        } else {
            // Computer picks a random valid next letter
            const randomWord = possibilities[Math.floor(Math.random() * possibilities.length)];
            const nextLetter = randomWord[currentWord.length];
            currentWord += nextLetter;
            wordDisplay.innerText = currentWord;
            
            messageDisplay.innerText = `Computer added "${nextLetter}". Your turn!`;
            canType = true;
            updateKeyStates(true);
        }
    }, 1000);
}

function claimWord() {
    if (dictionary.includes(currentWord)) {
        gameOver(`Victory! "${currentWord}" is a valid word.`, true);
    } else {
        gameOver(`Failed! "${currentWord}" is not a complete word.`, false);
    }
}

function updateKeyStates(enabled) {
    const keys = document.querySelectorAll('.key-btn');
    keys.forEach(btn => btn.disabled = !enabled);
    passBtn.disabled = !enabled;
}

function gameOver(msg, isWin) {
    canType = false;
    updateKeyStates(false);
    messageDisplay.innerText = msg;
    const state = { date: today, word: currentWord, result: isWin ? "won" : "lost", msg: msg };
    localStorage.setItem('suffix_daily_state', JSON.stringify(state));
}

function displaySavedGame(data) {
    wordDisplay.innerText = data.word;
    messageDisplay.innerText = data.msg;
    document.getElementById('date-display').innerText = data.date;
    canType = false;
    updateKeyStates(false);
}

function shareResult() {
    const text = `Suffixes Daily - ${today}\n${currentWord}\n${messageDisplay.innerText}`;
    navigator.clipboard.writeText(text);
    alert("Result copied to clipboard!");
}

// CRITICAL: Actually start the game
initGame();
