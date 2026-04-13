const DICTIONARY_URL = "https://raw.githubusercontent.com/dwyl/english-words/master/words_dictionary.json";
let dictionary = [];
let currentWord = "";
let dailySeedValue = 0; 
const todayString = new Date().toDateString();

let hasAddedLetterThisTurn = false;
let wordDisplay, loadingDisplay, instructions, messageDisplay, passBtn, claimBtn, solutionDisplay;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Load Theme
    if (localStorage.getItem('suffix_theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    initGame();
});

function getSeededRandom(additionalShift = 0) {
    let x = Math.sin(dailySeedValue + additionalShift) * 10000;
    let val = x - Math.floor(x);
    return val < 0 ? val + 1 : val;
}

async function initGame() {
    wordDisplay = document.getElementById('word-display');
    loadingDisplay = document.getElementById('loading-display');
    instructions = document.getElementById('instructions');
    messageDisplay = document.getElementById('message');
    passBtn = document.getElementById('pass-btn');
    claimBtn = document.getElementById('claim-btn');
    solutionDisplay = document.getElementById('solution-display');

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
        if (loadingDisplay) loadingDisplay.innerText = "Error Loading Dictionary.";
    }
}

// --- GAMEPLAY ---
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
        gameOver(`No words start with "${currentWord}".`);
    } else {
        currentWord = tempWord;
        wordDisplay.innerText = currentWord;
        hasAddedLetterThisTurn = true; 
        if (passBtn) passBtn.disabled = false;
        if (claimBtn) claimBtn.disabled = false;
        messageDisplay.innerText = "Claim or Pass Turn?";
    }
}

function handleBackspace() {
    if (!hasAddedLetterThisTurn) return;
    currentWord = currentWord.slice(0, -1);
    wordDisplay.innerText = currentWord;
    hasAddedLetterThisTurn = false; 
    if (passBtn) passBtn.disabled = true;
    if (claimBtn) claimBtn.disabled = true;
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
        let possibilities = dictionary.filter(w => w.startsWith(currentWord) && w.length > currentWord.length);
        
        if (possibilities.length > 0) {
            // Favor common lengths (4-8 letters) to avoid obscure long words
            let commonOptions = possibilities.filter(w => w.length <= 8);
            let finalOptions = commonOptions.length > 0 ? commonOptions : possibilities;
            
            finalOptions.sort((a, b) => (a.length - b.length) || a.localeCompare(b));
            
            const shortestLen = finalOptions[0].length;
            const shortestOptions = finalOptions.filter(w => w.length === shortestLen);
            const seedShift = currentWord.length; 
            const index = Math.floor(getSeededRandom(seedShift) * shortestOptions.length);
            const chosenWord = shortestOptions[index];
            
            currentWord += chosenWord[currentWord.length].toUpperCase();
            wordDisplay.innerText = currentWord;
            
            hasAddedLetterThisTurn = false; 
            if (claimBtn) claimBtn.disabled = false; 
            messageDisplay.innerText = "Computer moved. Your turn!";
        } else {
            messageDisplay.innerText = "Computer is stuck! You win!";
            endGame(true);
        }
    }, 800);
}

function claimWord() {
    const isValid = dictionary.includes(currentWord.toUpperCase());
    if (isValid) {
        messageDisplay.style.color = "var(--accent-success)";
        messageDisplay.innerText = `WIN! "${currentWord}" is a word.`;
        endGame(true);
    } else {
        messageDisplay.style.color = "#dc3545";
        messageDisplay.innerText = `LOSS! "${currentWord}" isn't a word.`;
        endGame(false);
    }
}

// --- KEYBOARD ---
function createKeyboard() {
    const container = document.getElementById('keyboard-container');
    if (!container) return;
    container.innerHTML = ''; 
    const ROWS = [
        ["Q","W","E","R","T","Y","U","I","O","P"],
        ["A","S","D","F","G","H","J","K","L"],
        ["Z","X","C","V","B","N","M", "⌫"]
    ];
    ROWS.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';
        row.forEach(key => {
            const btn = document.createElement('div');
            btn.className = 'key';
            if (key === "⌫") {
                btn.classList.add('key-back');
                btn.onclick = handleBackspace;
            } else {
                btn.onclick = () => handleKeyPress(key);
            }
            btn.innerText = key;
            rowDiv.appendChild(btn);
        });
        container.appendChild(rowDiv);
    });
}

// --- STATS & STORAGE ---
function endGame(won, alreadyPlayed = false) {
    hasAddedLetterThisTurn = true; 
    document.getElementById('controls').style.display = 'none';
    document.getElementById('keyboard-container').style.display = 'none';
    document.getElementById('share-btn').style.display = 'inline-block';

    if (!alreadyPlayed) {
        const savedData = JSON.parse(localStorage.getItem('suffix_daily_state'));
        let newStreak = 1;

        if (savedData && savedData.date) {
            const lastDate = new Date(savedData.date);
            const todayDate = new Date(todayString);
            const diffDays = Math.floor((todayDate - lastDate) / (1000 * 3600 * 24));
            if (diffDays === 1) newStreak = (savedData.streak || 0) + 1;
            else if (diffDays === 0) newStreak = savedData.streak || 1;
        }

        const state = { date: todayString, word: currentWord, won: won, streak: newStreak };
        localStorage.setItem('suffix_daily_state', JSON.stringify(state));
        updateStats(won, newStreak);
    }
    if (!won) revealSolution();
}

function updateStats(won, streak) {
    let stats = JSON.parse(localStorage.getItem('suffix_stats')) || { played: 0, wins: 0, maxStreak: 0 };
    stats.played++;
    if (won) stats.wins++;
    stats.maxStreak = Math.max(stats.maxStreak, streak);
    stats.currentStreak = streak;
    localStorage.setItem('suffix_stats', JSON.stringify(stats));
}

function showStats() {
    const stats = JSON.parse(localStorage.getItem('suffix_stats')) || { played: 0, wins: 0, currentStreak: 0, maxStreak: 0 };
    const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
    document.getElementById('stats-body').innerHTML = `
        <div style="display: flex; justify-content: space-around; margin-top: 20px;">
            <div><div style="font-size:1.5rem; font-weight:800">${stats.played}</div><div style="font-size:0.7rem">Played</div></div>
            <div><div style="font-size:1.5rem; font-weight:800">${winPct}%</div><div style="font-size:0.7rem">Win %</div></div>
            <div><div style="font-size:1.5rem; font-weight:800">${stats.currentStreak}</div><div style="font-size:0.7rem">Streak</div></div>
        </div>
    `;
    document.getElementById('stats-modal').style.display = 'block';
}

function closeStats() { document.getElementById('stats-modal').style.display = 'none'; }

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const target = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', target);
    localStorage.setItem('suffix_theme', target);
}

function revealSolution() {
    const options = dictionary.filter(w => w.startsWith(currentWord) && w.length > currentWord.length);
    if (options.length > 0) {
        options.sort((a,b) => a.length - b.length);
        solutionDisplay.innerText = `Computer was thinking of: ${options[0]}`;
    }
}

function displaySavedGame(data) {
    currentWord = data.word;
    wordDisplay.innerText = currentWord;
    messageDisplay.style.color = data.won ? "var(--accent-success)" : "#dc3545";
    messageDisplay.innerText = data.won ? `Result: SUCCESS` : `Result: FAILED`;
    endGame(data.won, true);
}

function shareResult() {
    const savedData = JSON.parse(localStorage.getItem('suffix_daily_state'));
    if(!savedData) return;
    const len = currentWord.length;
    const streak = savedData.streak || 1;
    let squares = "";
    for(let i = 0; i < len; i++) squares += (!savedData.won && i === len - 1) ? "🟥" : "🟩";
    const text = `Suffix Game ${todayString}\n${squares} (${len} letters)\nStreak: ${streak} ${streak >= 3 ? '🔥' : ''}\nhttps://jakusmaximus.github.io/suffixes/`;
    navigator.clipboard.writeText(text).then(() => alert("Copied to clipboard!"));
}

function gameOver(msg) {
    messageDisplay.style.color = "#dc3545";
    messageDisplay.innerText = msg;
    endGame(false);
}
