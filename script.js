// The "Brain" of the Suffix Game
const DICTIONARY_URL = "https://raw.githubusercontent.com/dwyl/english-words/master/words.txt";

let dictionary = [];
const dailyStarters = ["STR", "CON", "EXT", "PRE", "INT", "PRO", "REH", "TRA", "INC", "COM"];
let currentWord = "";

const today = new Date().toDateString();

const wordDisplay = document.getElementById('word-display');
const messageDisplay = document.getElementById('message');
const inputField = document.getElementById('letter-input');
const dateDisplay = document.getElementById('date-display');
const controls = document.getElementById('controls');

// 1. Fetch Dictionary and Start
async function initGame() {
    messageDisplay.innerText = "Checking daily status...";
    
    // Check if player already played today
    const savedData = JSON.parse(localStorage.getItem('suffix_daily_state'));
    
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
    const today = new Date();
    const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    
    let seededRandom = Math.sin(dateSeed) * 10000;
    seededRandom = seededRandom - Math.floor(seededRandom);

    // 1. Get unique 3-letter starts
    const allStarts = dictionary.map(w => w.substring(0, 3)).filter(s => s.length === 3);
    const uniqueStarts = [...new Set(allStarts)];

    // 2. The "Common Rule" Filter
    const viableStarts = uniqueStarts.filter(start => {
        const wordsWithStart = dictionary.filter(w => w.startsWith(start));
        
        // RULE A: Must have at least 20 possible routes
        const hasEnoughRoutes = wordsWithStart.length >= 20;
        
        // RULE B: Must lead to at least one "Common-length" word (4-7 letters)
        // This usually filters out highly technical or obscure prefixes
        const leadsToCommonWord = wordsWithStart.some(w => w.length >= 4 && w.length <= 7);
        
        return hasEnoughRoutes && leadsToCommonWord;
    });

    // 3. Pick the starter
    const finalIndex = Math.floor(seededRandom * viableStarts.length);
    currentWord = viableStarts[finalIndex];

    // 4. Update UI
    dateDisplay.innerText = today.toDateString();
    wordDisplay.innerText = currentWord;
    messageDisplay.innerText = "Daily Challenge Loaded! Your turn.";
    inputField.disabled = false;
    inputField.focus();
}

// 2. Player Input Logic
function playerMove() {
    const letter = inputField.value.toUpperCase();
    if (!/^[A-Z]$/.test(letter)) return;
    
    currentWord += letter;
    wordDisplay.innerText = currentWord;
    inputField.value = "";
    
    // Check if a word can still be formed
    const possible = dictionary.some(w => w.startsWith(currentWord));
    
    if (!possible) {
        gameOver(`Game Over! No words start with "${currentWord}".`);
        return;
    }

    messageDisplay.innerText = "Computer is thinking...";
    setTimeout(computerMove, 600);
}

// 3. Computer Logic
function computerMove() {
    // Find all valid longer words
    const possibilities = dictionary.filter(w => w.startsWith(currentWord) && w.length > currentWord.length);
    
    if (possibilities.length > 0) {
        // Computer picks the shortest possible path to stay strategic
        possibilities.sort((a, b) => a.length - b.length);
        const target = possibilities[0];
        
        const nextLetter = target[currentWord.length];
        currentWord += nextLetter;
        wordDisplay.innerText = currentWord;
        messageDisplay.innerText = "Your turn!";
    } else {
        gameOver("Computer is stuck! You've formed a word that can't be extended.");
    }
}

// 4. Closing & Scoring
function closeWord() {
    const isValid = dictionary.includes(currentWord);
    
    if (isValid) {
        messageDisplay.style.color = "green";
        messageDisplay.innerText = `SUCCESS! "${currentWord}" is a word.`;
        endGame(true);
    } else {
        messageDisplay.style.color = "red";
        messageDisplay.innerText = `FAILED! "${currentWord}" is not in the dictionary.`;
        endGame(false);
    }
}

function endGame(won) {
    controls.style.display = 'none';
    document.getElementById('share-btn').style.display = 'inline-block';
    
    // Check if the game COULD have gone longer
    const longer = dictionary.find(w => w.startsWith(currentWord) && w.length > currentWord.length);
    if (won && longer) {
        messageDisplay.innerText += `\nYou could have carried on to: ${longer}`;
    } else if (won) {
        messageDisplay.innerText += `\nPerfect! You reached the end of the chain.`;
    }
}

function gameOver(msg) {
    messageDisplay.style.color = "red";
    messageDisplay.innerText = msg;
    endGame(false);
}

function shareResult() {
    const status = messageDisplay.innerText.includes("SUCCESS") ? "🟩" : "🟥";
    const text = `Suffix Game ${dateDisplay.innerText}\n${status} Final Word: ${currentWord}\nhttps://your-github-username.github.io/your-repo-name/`;
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
}

// Start!
initGame();
