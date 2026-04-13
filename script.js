const DICTIONARY_URL = "https://raw.githubusercontent.com/dwyl/english-words/master/words_dictionary.json";
let dictionary = [];
let currentWord = "";
let dailySeedValue = 0; 
const todayString = new Date().toDateString();

let hasAddedLetterThisTurn = false;

let wordDisplay, loadingDisplay, instructions, messageDisplay, passBtn, claimBtn;

function getSeededRandom(additionalShift = 0) {
    let x = Math.sin(dailySeedValue + additionalShift) * 10000;
    let val = x - Math.floor(x);
    return val < 0 ? val + 1 : val;
}

document.addEventListener('DOMContentLoaded', () => {
    initGame();
});

async function initGame() {
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

        if (savedData && savedData.date === todayString) {
            displaySavedGame(savedData);
        } else {
            if (instructions) instructions.style.display = 'block';
            setupDailyGame();
        }
    } catch (e) {
        if (loadingDisplay) loadingDisplay.innerText = "Load Error. Refresh.";
    }
}

function setupDailyGame() {
    const allStarts = dictionary.map(w => w.substring(0, 3)).filter(s => s.length === 3);
    const counts = {};
    allStarts.forEach(s => counts[s] = (counts[s] || 0) + 1);
    const viable = Object.keys(counts).filter(s => counts[s] >= 150 && /[AEIOUY]/.test(s));

    const startIndex = Math.floor(getSeededRandom(0) * viable.length);
    currentWord = viable[startIndex];
    
    document.getElementById('date-display').innerText = todayString;
    wordDisplay.innerText = currentWord;
    messageDisplay.innerText = "Your turn! Add one letter.";
    
    if (passBtn) passBtn.disabled = true;
    if (claimBtn) claimBtn.disabled = true;
}

function handleKeyPress(key) {
    if (hasAddedLetterThisTurn) return;
    if (instructions) instructions.style.display = 'none';
    const tempWord = (currentWord + key).toUpperCase();
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
        messageDisplay.innerText = "Letter added! Claim Word or Pass Turn.";
    }
}

function passTurn() {
    if (!hasAddedLetterThisTurn) return;
    triggerComputer();
}

function triggerComputer() {
    messageDisplay.innerText = "Computer is thinking...";
    if (passBtn) passBtn.disabled = true;
    if (claimBtn) claimBtn.disabled = true;
    hasAddedLetterThisTurn = true; 

    setTimeout(() => {
        const possibilities = dictionary.filter(w => w.startsWith(currentWord) && w.length > currentWord.length);
        if (possibilities.length > 0) {
            possibilities.sort((a, b) => (a.length - b.length) || a.localeCompare(b));
            const shortestLen = possibilities[0].length;
            const shortestOptions = possibilities.filter(w => w.length === shortestLen);
            const seedShift = currentWord.length; 
            const index = Math.floor(getSeededRandom(seedShift) * shortestOptions.length);
            const chosenWord = shortestOptions[index];
            currentWord += chosenWord[currentWord.length].toUpperCase();
            wordDisplay.innerText = currentWord;
            hasAddedLetterThisTurn = false; 
            if (passBtn) passBtn.disabled = true; 
            if (claimBtn) claimBtn.disabled = false; 
            messageDisplay.innerText = "Computer moved. Add a letter or Claim!";
        } else {
            messageDisplay.innerText = "Computer is stuck! You win!";
            endGame(true);
        }
    }, 800);
}

function claimWord() {
    const isValid = dictionary.includes(currentWord.toUpperCase());
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
        // --- STREAK LOGIC ---
        const savedData = JSON.parse(localStorage.getItem('suffix_daily_state'));
        let newStreak = 1;

        if (savedData && savedData.streak) {
            const lastDate = new Date(savedData.date);
            const todayDate = new Date(todayString);
            const diffInTime = todayDate.getTime() - lastDate.getTime();
            const diffInDays = diffInTime / (1000 * 3600 * 24);

            if (diffInDays === 1) {
                // Played yesterday, increment streak
                newStreak = savedData.streak + 1;
            } else if (diffInDays > 1) {
                // Missed a day, reset streak
                newStreak = 1;
            } else {
                // Same day or error, keep old streak
                newStreak = savedData.streak;
            }
        }

        const state = {
            date: todayString, 
            word: currentWord, 
            won: won,
            streak: newStreak
        };
        localStorage.setItem('suffix_daily_state', JSON.stringify(state));
        updateMessageWithStreak(newStreak);
    }
}

function updateMessageWithStreak(streak) {
    if (messageDisplay) {
        const streakMsg = streak > 1 ? ` 🔥 Daily Streak: ${streak}` : ` Streak started!`;
        messageDisplay.innerText += streakMsg;
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
    messageDisplay.style.color = data.won ? "green" : "red";
    messageDisplay.innerText = data.won ? `Result: SUCCESS (${currentWord})` : `Result: FAILED (${currentWord})`;
    if (data.streak) updateMessageWithStreak(data.streak);
    endGame(data.won, true);
}

function shareResult() {
    const savedData = JSON.parse(localStorage.getItem('suffix_daily_state'));
    if(!savedData) return;
    
    const isWin = savedData.won;
    const wordLength = currentWord.length;
    const streak = savedData.streak || 1;
    
    let squares = "";
    for(let i = 0; i < wordLength; i++) {
        squares += (!isWin && i === wordLength - 1) ? "🟥" : "🟩";
    }

    const fire = streak >= 3 ? "🔥" : "";
    const text = `Suffixes Game ${todayString}\n${squares} (${wordLength} letters)\nStreak: ${streak}${fire}\nhttps://jakusmaximus.github.io/suffixes/`;
    
    navigator.clipboard.writeText(text).then(() => {
        alert("Results copied to clipboard!");
    });
}
