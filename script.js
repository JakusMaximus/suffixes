// The "Brain" of the Suffix Game
const DICTIONARY_URL = "https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt";

let dictionary = [];
let currentWord = "";

const today = new Date().toDateString();
const ROWS = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M"]
];
const wordDisplay = document.getElementById('word-display');
const messageDisplay = document.getElementById('message');
const inputField = document.getElementById('letter-input');
const dateDisplay = document.getElementById('date-display');
const controls = document.getElementById('controls');

// TWEAK: Add Enter Key Support
inputField.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        playerMove();
    }
});

// 1. Fetch Dictionary and Start
async function initGame() {
    messageDisplay.innerText = "Checking daily status...";
    inputField.disabled = true; 
    
    const savedData = JSON.parse(localStorage.getItem('suffix_daily_state'));
    createKeyboard();
    try {
        const response = await fetch(DICTIONARY_URL);
        const text = await response.text();
        dictionary = text.split('\n').map(word => word.trim().toUpperCase()).filter(word => word.length > 2);

        if (savedData && savedData.date === today) {
            displaySavedGame(savedData);
        } else {
            setupDailyAutomatedGame();
        }
    } catch (error) {
        messageDisplay.innerText = "Failed to load dictionary.";
    }
}

function setupDailyAutomatedGame() {
    const now = new Date();
    const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    
    let seededRandom = Math.sin(dateSeed) * 10000;
    seededRandom = seededRandom - Math.floor(seededRandom);

    const allStarts = dictionary.map(w => w.substring(0, 3)).filter(s => s.length === 3);
    const uniqueStarts = [...new Set(allStarts)];

    const viableStarts = uniqueStarts.filter(start => {
        const wordsWithStart = dictionary.filter(w => w.startsWith(start));
        const hasEnoughRoutes = wordsWithStart.length >= 20;
        const leadsToCommonWord = wordsWithStart.some(w => w.length >= 4 && w.length <= 7);
        return hasEnoughRoutes && leadsToCommonWord;
    });

    const finalIndex = Math.floor(seededRandom * viableStarts.length);
    currentWord = viableStarts[finalIndex];

    dateDisplay.innerText = today;
    wordDisplay.innerText = currentWord;
    messageDisplay.innerText = "Daily Challenge Loaded! Your turn.";
    inputField.disabled = false;
    inputField.focus();
}

function playerMove() {
    const letter = inputField.value.toUpperCase();
    if (!/^[A-Z]$/.test(letter)) return;
    
    currentWord += letter;
    wordDisplay.innerText = currentWord;
    inputField.value = "";
    
    const possible = dictionary.some(w => w.startsWith(currentWord));
    
    if (!possible) {
        gameOver(`Game Over! No words start with "${currentWord}".`);
        return;
    }

    messageDisplay.innerText = "Computer is thinking...";
    setTimeout(computerMove, 600);
}

function computerMove() {
    const possibilities = dictionary.filter(w => w.startsWith(currentWord) && w.length > currentWord.length);
    
    if (possibilities.length > 0) {
        possibilities.sort((a, b) => a.length - b.length);
        const target = possibilities[0];
        
        const nextLetter = target[currentWord.length];
        currentWord += nextLetter;
        wordDisplay.innerText = currentWord;
        messageDisplay.innerText = "Your turn!";
        inputField.focus(); // TWEAK: Keep the focus for the player
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
        document.getElementById('keyboard-container').style.display = 'none';
    } else {
        messageDisplay.style.color = "red";
        messageDisplay.innerText = `FAILED! "${currentWord}" is not in the dictionary.`;
        endGame(false);
    }
}

function createKeyboard() {
    const container = document.getElementById('keyboard-container');
    container.innerHTML = ''; // Clear it first

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
    dateDisplay.innerText = data.date;
    currentWord = data.word;
    wordDisplay.innerText = currentWord;
    
    messageDisplay.style.color = data.won ? "green" : "red";
    messageDisplay.innerText = data.won ? 
        `You already played today! Result: SUCCESS (${currentWord})` : 
        `You already played today! Result: FAILED (${currentWord})`;
    
    controls.style.display = 'none';
    document.getElementById('share-btn').style.display = 'inline-block';
}

function endGame(won) {
    controls.style.display = 'none';
    document.getElementById('share-btn').style.display = 'inline-block';

    const gameState = {
        date: today,
        word: currentWord,
        won: won
    };
    localStorage.setItem('suffix_daily_state', JSON.stringify(gameState));

    const longer = dictionary.find(w => w.startsWith(currentWord) && w.length > currentWord.length);
    if (won && longer) {
        messageDisplay.innerText += `\nYou could have carried on to: ${longer}`;
    }
}

function gameOver(msg) {
    messageDisplay.style.color = "red";
    messageDisplay.innerText = msg;
    endGame(false);
}

function shareResult() {
    const status = messageDisplay.innerText.includes("SUCCESS") ? "🟩" : "🟥";
    // TWEAK: Make sure to update your actual URL here!
    const text = `Suffix Game ${dateDisplay.innerText}\n${status} Word: ${currentWord}\nhttps://jakusmaximus.github.io/suffixes/`;
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
}

initGame();
