// The "Brain" of the Suffix Game
// Using a curated list of 10,000 common words for speed and fairness
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

// Add physical keyboard Enter key support
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
    createKeyboard(); // Build the visual keyboard
    
    try {
        const response = await fetch(DICTIONARY_URL);
        const text = await response.text();
        // Process the text into a clean array of words
        dictionary = text.split('\n')
                         .map(word => word.trim().toUpperCase())
                         .filter(word => word.length > 2);

        if (savedData && savedData.date === today) {
            displaySavedGame(savedData);
        } else {
            setupDailyAutomatedGame();
        }
    }
