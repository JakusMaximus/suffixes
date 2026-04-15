const DICTIONARY_URL = "https://raw.githubusercontent.com/cmcmarrow/scrabble-dictionary/master/collins_scrabble_words_2021.txt";

let dictionary = [];
let currentWord = "";
let dailySeedValue = 0; 
const todayString = new Date().toDateString();

let hasAddedLetterThisTurn = false;
let wordDisplay, loadingDisplay, messageDisplay, passBtn, claimBtn, solutionDisplay, longestHintDisplay;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
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
    messageDisplay = document.getElementById('message');
    passBtn = document.getElementById('pass-btn');
    claimBtn = document.getElementById('claim-btn');
    solutionDisplay = document.getElementById('solution-display');
    longestHintDisplay = document.getElementById('longest-word-hint');

    const savedData = JSON.parse(localStorage.getItem('suffix_daily_state'));
    createKeyboard();

    const now = new Date();
    dailySeedValue = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();

    try {
        const response = await fetch(DICTIONARY_URL);
        const text = await response.text();
        
        // Scrabble files are usually one word per line
        dictionary = text.split('\n')
            .map(w => w.trim().toUpperCase())
            .filter(w => w.length > 2 && /^[A-Z]+$/.test(w));

        if (loadingDisplay) loadingDisplay.style.display = 'none';
        if (wordDisplay) wordDisplay.style.display = 'block';

        if (!localStorage.getItem('suffix_visited')) {
            showInstructions();
            localStorage.setItem('suffix_visited', 'true');
        }

        if (savedData && savedData.date === todayString) {
            displaySavedGame(savedData);
        } else {
            setupDailyGame();
        }
    } catch (e) {
        if (loadingDisplay) loadingDisplay.innerText = "Error Loading Scrabble Dictionary.";
    }
}

// --- CORE LOGIC ---

function getShortestWordLength(str) {
    let options = dictionary.filter(w => w.startsWith(str));
    if (options.length === 0) return Infinity;
    return Math.min(...options.map(w => w.length));
}

function findTrueLongestWord(startStr) {
    let current = startStr;
    while (true) {
        let possibleNextLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").filter(l => 
            dictionary.some(w => w.startsWith(current + l))
        );
        if (possibleNextLetters.length === 0) break;

        let bestLetter = "";
        let maxShortestPath = -1;
        for (let l of possibleNextLetters) {
            let shortestForThisLetter = getShortestWordLength(current + l);
            if (shortestForThisLetter > maxShortestPath) {
                maxShortestPath = shortestForThisLetter;
                bestLetter = l;
            }
        }
        current += bestLetter;
        if (dictionary.includes(current)) break;

        let compLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").filter(l => 
            dictionary.some(w => w.startsWith(current + l))
        );
        if (compLetters.length === 0) break;

        let minShortestPath = Infinity;
        let compLetter = "";
        for (let l of compLetters) {
            let shortest = getShortestWordLength(current + l);
            if (shortest < minShortestPath) {
                minShortestPath = shortest;
                compLetter = l;
            }
        }
        current += compLetter;
        if (dictionary.includes(current)) break;
    }
    return current;
}

// --- GAMEPLAY ---

function setupDailyGame() {
    // Generate 3-letter starts
    const allStarts = dictionary.map(w => w.substring(0, 3)).filter(s => s.length === 3);
    const counts = {};
    allStarts.forEach(s => counts[s] = (counts[s] || 0) + 1);

    // Using the Scrabble dictionary, we want stems that have plenty of options
    const viable = Object.keys(counts).filter(s => {
        const hasVowel = /[AEIOUY]/.test(s);
        // Stems with at least 40 words in a Scrabble dictionary are usually very playable
        return hasVowel && counts[s] >= 40; 
    });

    const startIndex = Math.floor(getSeededRandom(0) * viable.length);
    currentWord = viable[startIndex];
    
    const bestWord = findTrueLongestWord(currentWord);
    longestHintDisplay.innerText = `Today's potential: Up to ${bestWord.length} letters`;

    document.getElementById('date-display').innerText = todayString;
    wordDisplay.innerText = currentWord;
    messageDisplay.innerText = "Your turn! Add one letter.";
    
    if (passBtn) passBtn.disabled = true;
    if (claimBtn) claimBtn.disabled = true;
}

function handleKeyPress(key) {
    if (hasAddedLetterThisTurn) return;
    
    currentWord = (currentWord + key).toUpperCase();
    wordDisplay.innerText = currentWord;
    hasAddedLetterThisTurn = true; 

    if (passBtn) passBtn.disabled = false;
    if (claimBtn) claimBtn.disabled = false;
    messageDisplay.innerText = "Claim or Pass Turn?";
}

function handleBackspace() {
    if (!hasAddedLetterThisTurn) return;
    currentWord = currentWord.slice(0, -1);
    wordDisplay.innerText = currentWord;
    hasAddedLetterThisTurn = false; 
    
    messageDisplay.innerText = "Your turn! Add one letter.";
    
    if (passBtn) passBtn.disabled = true;
    if (claimBtn) claimBtn.disabled = true;
}

function passTurn() {
    if (!hasAddedLetterThisTurn) return;
    
    const pathExists = dictionary.some(w => w.startsWith(currentWord));
    if (!pathExists) {
        gameOver(`Loss! No words start with "${currentWord}".`);
        return;
    }
    
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
            let letters = {};
            possibilities.forEach(w => {
                let l = w[currentWord.length];
                if (!letters[l] || w.length < letters[l]) {
                    letters[l] = w.length;
                }
            });

            let bestLetter = Object.keys(letters).reduce((a, b) => letters[a] < letters[b] ? a : b);
            
            currentWord += bestLetter.toUpperCase();
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

function endGame(won, alreadyPlayed = false) {
    hasAddedLetterThisTurn = true; 
    document.getElementById('controls').style.display = 'none';
    document.getElementById('keyboard-container').style.display = 'none';
    document.getElementById('share-btn').style.display = 'inline-block';

    if (!alreadyPlayed) {
        const savedData = JSON.parse(localStorage.getItem('suffix_daily_state'));
        let newStreak = won ? (savedData && savedData.streak ? savedData.streak + 1 : 1) : 0;
        const state = { date: todayString, word: currentWord, won: won, streak: newStreak };
        localStorage.setItem('suffix_daily_state', JSON.stringify(state));
        updateStats(won, newStreak);
    }
    revealSolutions();
}

function updateStats(won, streak) {
    let stats = JSON.parse(localStorage.getItem('suffix_stats')) || { played: 0, wins: 0, maxStreak: 0, currentStreak: 0 };
    stats.played++;
    if (won) stats.wins++;
    stats.currentStreak = streak;
    stats.maxStreak = Math.max(stats.maxStreak, streak);
    localStorage.setItem('suffix_stats', JSON.stringify(stats));
}

function revealSolutions() {
    const startStr = currentWord.substring(0,3);
    const bestPossible = findTrueLongestWord(startStr);
    solutionDisplay.innerText = `Ideal outcome was: ${bestPossible}`;
}

// --- UI HELPERS ---
function createKeyboard() {
    const container = document.getElementById('keyboard-container');
    if (!container) return;
    container.innerHTML = ''; 
    const ROWS = [["Q","W","E","R","T","Y","U","I","O","P"],["A","S","D","F","G","H","J","K","L"],["Z","X","C","V","B","N","M", "⌫"]];
    ROWS.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';
        row.forEach(key => {
            const btn = document.createElement('div');
            btn.className = 'key';
            if (key === "⌫") { btn.onclick = handleBackspace; } 
            else { btn.onclick = () => handleKeyPress(key); }
            btn.innerText = key;
            rowDiv.appendChild(btn);
        });
        container.appendChild(rowDiv);
    });
}

function showStats() {
    const stats = JSON.parse(localStorage.getItem('suffix_stats')) || { played: 0, wins: 0, currentStreak: 0, maxStreak: 0 };
    const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
    document.getElementById('stats-body').innerHTML = `
        <div style="display: flex; justify-content: space-around; margin-top: 20px;">
            <div><div style="font-size:1.5rem; font-weight:800">${stats.played}</div><div style="font-size:0.7rem">Played</div></div>
            <div><div style="font-size:1.5rem; font-weight:800">${winPct}%</div><div style="font-size:0.7rem">Win %</div></div>
            <div><div style="font-size:1.5rem; font-weight:800">${stats.currentStreak}</div><div style="font-size:0.7rem">Streak</div></div>
        </div>`;
    document.getElementById('stats-modal').style.display = 'block';
}

function closeStats() { document.getElementById('stats-modal').style.display = 'none'; }
function showInstructions() { document.getElementById('instructions-modal').style.display = 'block'; }
function closeInstructions() { document.getElementById('instructions-modal').style.display = 'none'; }

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const target = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', target);
    localStorage.setItem('suffix_theme', target);
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
    const streak = savedData.streak || 0;
    
    let squares = "🟩".repeat(len);
    if (!savedData.won) {
        squares += "🟥";
    }

    const text = `Suffix Game ${todayString}\n${squares}\n${len} letters\nStreak: ${streak}\nhttps://jakusmaximus.github.io/suffixes/`;
    navigator.clipboard.writeText(text).then(() => alert("Copied to clipboard!"));
}

function gameOver(msg) {
    messageDisplay.style.color = "#dc3545";
    messageDisplay.innerText = msg;
    endGame(false);
}
