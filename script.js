// The "Brain" of the Suffixes Game
const DICTIONARY_URL = "https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt";

let dictionary = [];
let currentWord = "";
const today = new Date().toDateString();

// Keyboard layout
const ROWS = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M"]
];

// DOM Elements
const wordDisplay = document.getElementById('word-display');
const messageDisplay = document.getElementById('message');
const inputField = document.getElementById('letter-input');
const dateDisplay = document.getElementById('date-display');
const controls = document.getElementById('controls');

// 1. Initialize Game
async function initGame() {
    // Show loading state so we know the script is running
    if (wordDisplay) wordDisplay.innerText = "WAIT";
    if (messageDisplay) messageDisplay.innerText = "Loading Daily Game...";

    // Check if player already played today
    const savedData = JSON.parse(localStorage.getItem('suffixes_daily_state'));

    // Create keyboard if the container exists
    if (document.getElementById('keyboard-container')) {
        createKeyboard();
    }

    try {
        const response = await fetch(DICTIONARY_URL);
        const text = await response.text();
        
        // Convert text file to Array
        dictionary = text.split('\n')
                         .map(word => word.trim().toUpperCase())
                         .filter(word => word.length > 2);

        if (savedData && savedData.date === today) {
            displaySavedGame(savedData);
        } else {
            setupDailyAutomatedGame();
        }
    } catch (error) {
        if (messageDisplay) messageDisplay.innerText = "Error loading dictionary. Refresh!";
        console.error("Dictionary Load Error:", error);
    }
}

// 2. Setup Daily Challenge
function setupDailyAutomatedGame() {
    const now = new Date();
    const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    
    let seededRandom = Math.sin(dateSeed) * 10000;
    seededRandom = seededRandom - Math.floor(seededRandom);

    // 1. Get all 3-letter starts
    const allStarts = dictionary.map(w => w.substring(0, 3)).filter(s => s.length === 3);
    
    // 2. Count how many words each start has
    const counts = {};
    allStarts.forEach(s => counts[s] = (counts[s] || 0) + 1);

    // 3. Filter for "Power Starters" (Starters that lead to at least 50 words)
    // This ensures plenty of routes and very common-sounding starts
    const viableStarts = Object.keys(counts).filter(start => {
        const isCommon = counts[start] >= 50; 
        const hasVowel = /[AEIOUY]/.test(start); // Must have a vowel (avoids things like 'BRR' or 'PST')
        return isCommon && hasVowel;
    });

    // 4. Pick the starter
    const finalIndex = Math.floor(seededRandom * viableStarts.length);
    currentWord = viableStarts[finalIndex];

    // 5. Update UI
    dateDisplay.innerText = today;
    wordDisplay.innerText = currentWord;
    messageDisplay.innerText = "Power Starter Loaded! Your turn.";
    messageDisplay.style.color = "gray";
    inputField.disabled = false;
    inputField.focus();
}

// 3. Gameplay Logic
function playerMove() {
    const letter = inputField.value.toUpperCase();
    if (!/^[A-Z]$/.test(letter)) return;
    
    currentWord += letter;
    wordDisplay.innerText = currentWord;
    inputField.value = "";
    
    const possible = dictionary.some(w => w.startsWith(currentWord));
    
    if (!possible) {
        gameOver(`Game Over! No common words start with "${currentWord}".`);
        return;
    }

    messageDisplay.innerText = "Computer is thinking...";
    setTimeout(computerMove, 600);
}

function computerMove() {
    const possibilities = dictionary.filter(w => w.startsWith(currentWord) && w.length > currentWord.length);
    
    if (possibilities.length > 0) {
        possibilities.sort((a, b) => a.length - b.length); // Pick shortest word
        const target = possibilities[0];
        
        const nextLetter = target[currentWord.length];
        currentWord += nextLetter;
        wordDisplay.innerText = currentWord;
        messageDisplay.innerText = "Your turn!";
        inputField.focus(); 
    } else {
        gameOver("Computer is stuck! You've formed a word that can't be extended.");
    }
}

function closeWord() {
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

// 4. UI Functions
function createKeyboard() {
    const container = document.getElementById('keyboard-container');
    if (!container) return;
    container.innerHTML = '';

    ROWS.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';
        row.forEach(key => {
            const button = document.createElement('div');
            button.className = 'key';
            button.innerText = key;
            button.onclick = () => handleKeyPress(key);
            rowDiv.appendChild(button);
        });
        container.appendChild(rowDiv);
    });
}

function handleKeyPress(key) {
    if (inputField.disabled) return;
    inputField.value = key;
    playerMove();
}

function displaySavedGame(data) {
    if (dateDisplay) dateDisplay.innerText = data.date;
    currentWord = data.word;
    if (wordDisplay) wordDisplay.innerText = currentWord;
    
    if (messageDisplay) {
        messageDisplay.style.color = data.won ? "green" : "red";
        messageDisplay.innerText = data.won ? 
            `Daily Complete! SUCCESS: ${currentWord}` : 
            `Daily Complete! FAILED: ${currentWord}`;
    }
    
    if (controls) controls.style.display = 'none';
    const kb = document.getElementById('keyboard-container');
    if (kb) kb.style.display = 'none';
    const share = document.getElementById('share-btn');
    if (share) share.style.display = 'inline-block';
}

function endGame(won) {
    if (controls) controls.style.display = 'none';
    const kb = document.getElementById('keyboard-container');
    if (kb) kb.style.display = 'none';
    const share = document.getElementById('share-btn');
    if (share) share.style.display = 'inline-block';

    const gameState = {
        date: today,
        word: currentWord,
        won: won
    };
    localStorage.setItem('suffixes_daily_state', JSON.stringify(gameState));

    const longer = dictionary.find(w => w.startsWith(currentWord) && w.length > currentWord.length);
    if (won && longer) {
        messageDisplay.innerText += `\nCould have gone to: ${longer}`;
    }
}

function gameOver(msg) {
    messageDisplay.style.color = "red";
    messageDisplay.innerText = msg;
    endGame(false);
}

function shareResult() {
    const status = messageDisplay.innerText.includes("SUCCESS") ? "🟩" : "🟥";
    const text = `Suffixes Game ${today}\n${status} Word: ${currentWord}\nhttps://jakusmaximus.github.io/suffixes/`;
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
}

// Physical keyboard support for Enter
inputField.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        playerMove();
    }
});

// Run when page is loaded
window.onload = initGame;
