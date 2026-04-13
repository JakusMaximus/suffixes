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
const inputField = document.getElementById('letter-input');
const passBtn = document.getElementById('pass-btn');

async function initGame() {
    createKeyboard();
    try {
        const response = await fetch(DICTIONARY_URL);
        if (!response.ok) throw new Error("Download failed");
        
        const text = await response.text();
        // Split by newline, trim whitespace, and filter
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
    
    canType = true;
    updateKeyStates(true);
}

function handleKeyPress(key) {
    if (!canType) return;

    instructions.style.display = 'none';
    currentWord += key;
    wordDisplay.innerText = currentWord;
    
    if (!dictionary.some(w => w.startsWith(currentWord))) {
        gameOver(`Bricked! No words start with "${currentWord}".`);
    } else {
        messageDisplay.innerText = "Letter added. Claim Word or Pass Turn.";
        canType = false;
        updateKeyStates(false);
    }
}

function triggerComputer() {
    if (canType) {
        messageDisplay.innerText = "You must add a letter first!";
        return;
    }

    messageDisplay.innerText = "Computer is thinking...";
    passBtn.disabled = true;

    setTimeout(() => {
        const possibilities = dictionary.filter(w => w.startsWith(currentWord) && w.length > currentWord.length);
        
        if (possibilities.
