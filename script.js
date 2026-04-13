// Simple dictionary for testing
const dictionary = ["STRETCH", "STRETCHED", "STRETCHING", "STRETCHERS", "CONFERENCE", "CONFISCATE", "CONFISCATED", "EXTENSION", "EXTENSIONIST", "EXTENSIONISM"];

const dailyStarters = ["STR", "CON", "EXT", "PRE", "INT"];
let currentWord = "";

// Initialize Game
const today = new Date();
const dateString = today.toDateString();
document.getElementById('date-display').innerText = dateString;

const dayIndex = today.getDate() % dailyStarters.length;
currentWord = dailyStarters[dayIndex];

const wordDisplay = document.getElementById('word-display');
const messageDisplay = document.getElementById('message');
const inputField = document.getElementById('letter-input');

wordDisplay.innerText = currentWord;

function playerMove() {
    const letter = inputField.value.toUpperCase();
    if (!/^[A-Z]$/.test(letter)) return;
    
    currentWord += letter;
    wordDisplay.innerText = currentWord;
    inputField.value = "";
    
    // Check if the player just entered a sequence that doesn't exist at all
    const possible = dictionary.some(w => w.startsWith(currentWord));
    if (!possible) {
        gameOver(`The computer stopped. "${currentWord}" isn't the start of any known word!`);
        return;
    }

    setTimeout(computerMove, 600);
}

function computerMove() {
    const possibleWords = dictionary.filter(w => w.startsWith(currentWord) && w.length > currentWord.length);
    
    if (possibleWords.length > 0) {
        // Pick the first available word
        const target = possibleWords[0];
        const nextLetter = target[currentWord.length];
        currentWord += nextLetter;
        wordDisplay.innerText = currentWord;
    } else {
        gameOver("The computer can't find another letter! You pushed it to the limit.");
    }
}

function closeWord() {
    if (dictionary.includes(currentWord)) {
        messageDisplay.style.color = "green";
        messageDisplay.innerText = `WIN! "${currentWord}" is a valid word.`;
        endGame(true);
    } else {
        messageDisplay.style.color = "red";
        messageDisplay.innerText = `LOSE! "${currentWord}" is not a complete word.`;
        endGame(false);
    }
}

function endGame(won) {
    document.getElementById('controls').style.display = 'none';
    document.getElementById('share-btn').style.display = 'inline-block';
    
    const longer = dictionary.find(w => w.startsWith(currentWord) && w.length > currentWord.length);
    if (won && longer) {
        messageDisplay.innerText += ` Could you have gone further? Yes: ${longer}...`;
    }
}

function shareResult() {
    const icon = messageDisplay.innerText.includes("WIN") ? "🟩" : "🟥";
    const text = `Suffix Day ${today.getDate()}\n${icon} Word: ${currentWord}\nCan you beat me?`;
    navigator.clipboard.writeText(text);
    alert("Result copied to clipboard!");
}

function gameOver(msg) {
    messageDisplay.style.color = "red";
    messageDisplay.innerText = msg;
    endGame(false);
}