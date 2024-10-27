const words = [
    'PROGRAMMIEREN', 'JAVASCRIPT', 'SPIEL', 'BUCHSTABEN', 'COMPUTER',
    'ENTWICKLUNG', 'ALGORITHMUS', 'DATENBANK', 'NETZWERK', 'VERSCHLÜSSELUNG',
    'FRAMEWORK', 'BIBLIOTHEK', 'FUNKTION', 'VARIABLE', 'OBJEKT',
    'SCHLEIFE', 'BEDINGUNG', 'ARRAY', 'STRING', 'INTEGER'
];
let currentWord = '';
let currentLetterIndex = 0;
let gameArea;
let messageElement;
let wordDisplay;
let fallTime = 60;
let increasingSpeed = false;
let currentSpeed = 1; // Neue Variable für die aktuelle Geschwindigkeit
let keyboardHint;

function init() {
    gameArea = document.getElementById('game-area');
    messageElement = document.getElementById('message');
    wordDisplay = document.getElementById('word-display');
    keyboardHint = document.getElementById('keyboard-hint');
    document.addEventListener('keydown', handleKeyPress);
    document.getElementById('fall-time').addEventListener('change', updateFallTime);
    document.getElementById('increasing-speed').addEventListener('change', updateIncreasingSpeed);
    startNewGame();
}

function updateFallTime() {
    fallTime = parseInt(document.getElementById('fall-time').value);
}

function updateIncreasingSpeed() {
    increasingSpeed = document.getElementById('increasing-speed').checked;
}

function startNewGame() {
    currentSpeed = 1; // Geschwindigkeit nur beim Neustart des Spiels zurücksetzen
    startNewWord();
}

function startNewWord() {
    currentWord = words[Math.floor(Math.random() * words.length)];
    currentLetterIndex = 0;
    gameArea.innerHTML = '';
    wordDisplay.innerHTML = '';
    dropNextLetter();
}

function dropNextLetter() {
    if (currentLetterIndex < currentWord.length) {
        const letter = currentWord[currentLetterIndex];
        const letterElement = document.createElement('div');
        letterElement.className = 'letter';
        letterElement.textContent = letter;
        letterElement.style.left = `${Math.random() * (gameArea.offsetWidth - 30)}px`;
        letterElement.style.top = '-30px';
        letterElement.style.opacity = '0';
        gameArea.appendChild(letterElement);

        if (increasingSpeed) {
            currentSpeed = fallTime / (currentLetterIndex + 1);
        } else {
            currentSpeed = fallTime;
        }
        letterElement.style.transition = `top ${currentSpeed}s linear, opacity 0.5s ease`;

        setTimeout(() => {
            letterElement.style.opacity = '1';
            letterElement.style.top = `${gameArea.offsetHeight}px`;
        }, 50);

        letterElement.addEventListener('transitionend', (event) => {
            if (event.propertyName === 'top' && !letterElement.classList.contains('correct')) {
                gameOver();
            }
        });

        // Aktualisiere die Tastaturanzeige für den aktuellen Buchstaben
        updateKeyboardHint(getKeyCodeForLetter(letter));

        currentLetterIndex++;
    } else {
        win();
    }
}

// Neue Funktion, um den KeyCode für einen Buchstaben zu erhalten
function getKeyCodeForLetter(letter) {
    const keyMap = {
        'A': 'KeyA', 'B': 'KeyB', 'C': 'KeyC', 'D': 'KeyD', 'E': 'KeyE',
        'F': 'KeyF', 'G': 'KeyG', 'H': 'KeyH', 'I': 'KeyI', 'J': 'KeyJ',
        'K': 'KeyK', 'L': 'KeyL', 'M': 'KeyM', 'N': 'KeyN', 'O': 'KeyO',
        'P': 'KeyP', 'Q': 'KeyQ', 'R': 'KeyR', 'S': 'KeyS', 'T': 'KeyT',
        'U': 'KeyU', 'V': 'KeyV', 'W': 'KeyW', 'X': 'KeyX', 'Y': 'KeyY',
        'Z': 'KeyZ'
    };
    return keyMap[letter] || null;
}

function handleKeyPress(event) {
    const pressedKey = event.key.toUpperCase();
    const currentLetter = currentWord[currentLetterIndex - 1];
    const letterElement = gameArea.querySelector('.letter:last-child');

    if (pressedKey === currentLetter) {
        letterElement.style.transition = 'none';
        letterElement.style.top = letterElement.offsetTop + 'px';
        letterElement.classList.add('correct');
        animateCorrectLetter(letterElement);
        updateWordDisplay(pressedKey);
        
        // Verzögere den Aufruf von dropNextLetter um eine kurze Zeit
        setTimeout(() => {
            dropNextLetter();
        }, 100);
    } else {
        animateWrongLetter(letterElement);
    }
}

function updateKeyboardHint(keyCode) {
    const leftSection = keyboardHint.querySelector('.left');
    const middleSection = keyboardHint.querySelector('.middle');
    const rightSection = keyboardHint.querySelector('.right');

    leftSection.classList.remove('active');
    middleSection.classList.remove('active');
    rightSection.classList.remove('active');

    if (keyCode) {
        if (['KeyA', 'KeyQ', 'KeyW', 'KeyS', 'KeyY', 'KeyX', 'KeyC'].includes(keyCode)) {
            leftSection.classList.add('active');
        } else if (['KeyE', 'KeyD', 'KeyR', 'KeyF', 'KeyT', 'KeyG', 'KeyV', 'KeyB'].includes(keyCode)) {
            middleSection.classList.add('active');
        } else if (['KeyU', 'KeyH', 'KeyI', 'KeyJ', 'KeyO', 'KeyK', 'KeyP', 'KeyL', 'KeyM', 'KeyN'].includes(keyCode)) {
            rightSection.classList.add('active');
        }
    }
}

function updateWordDisplay(letter) {
    const span = document.createElement('span');
    span.textContent = letter;
    span.style.color = '#4CAF50';
    span.style.opacity = '0';
    span.style.transform = 'translateY(20px)';
    span.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    wordDisplay.appendChild(span);
    setTimeout(() => {
        span.style.opacity = '1';
        span.style.transform = 'translateY(0)';
    }, 50);
}

function animateCorrectLetter(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < 30; i++) {
        createConfettiParticle(centerX, centerY);
    }

    element.style.animation = 'correctPulse 0.3s';
    element.style.backgroundColor = '#4CAF50';
    element.style.color = 'white';
    element.style.borderRadius = '50%';

    setTimeout(() => {
        element.style.opacity = '0';
        element.style.transform = 'scale(0)';
    }, 300);
}

function createConfettiParticle(x, y) {
    const particle = document.createElement('div');
    particle.className = 'confetti';
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.backgroundColor = getRandomColor();
    particle.style.transform = `rotate(${Math.random() * 360}deg)`;

    document.body.appendChild(particle);

    const animationDuration = Math.random() * 1000 + 1000; // 1-2 seconds
    const xDistance = (Math.random() - 0.5) * 200;
    const yDistance = Math.random() * 200 - 250;

    particle.animate([
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${xDistance}px, ${yDistance}px) rotate(${Math.random() * 520 - 260}deg)`, opacity: 0 }
    ], {
        duration: animationDuration,
        easing: 'cubic-bezier(0,0,0.2,1)'
    }).onfinish = () => particle.remove();
}

function getRandomColor() {
    const colors = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function animateWrongLetter(element) {
    element.classList.remove('wrong-animation');
    void element.offsetWidth;
    element.classList.add('wrong-animation');
}

function win() {
    messageElement.textContent = 'Gut gemacht! Nächstes Wort...';
    messageElement.style.color = '#4CAF50';
    messageElement.style.animation = 'winPulse 1s';
    setTimeout(() => {
        messageElement.textContent = '';
        messageElement.style.animation = '';
        startNewWord();
    }, 1500);
}

function gameOver() {
    messageElement.textContent = 'Verloren! Versuche es noch einmal.';
    messageElement.style.color = '#FF5252';
    messageElement.style.animation = 'gameOverShake 0.5s';
    setTimeout(startNewGame, 3000);
}

window.onload = () => {
    init();
    addKeyframeAnimations();
};

function addKeyframeAnimations() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes correctPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
        }
        @keyframes wrongShake {
            0% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            50% { transform: translateX(5px); }
            75% { transform: translateX(-5px); }
            100% { transform: translateX(0); }
        }
        @keyframes winPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        @keyframes gameOverShake {
            0% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            50% { transform: translateX(10px); }
            75% { transform: translateX(-10px); }
            100% { transform: translateX(0); }
        }
        .wrong-animation {
            animation: wrongShake 0.5s;
        }
        .confetti {
            position: fixed;
            width: 10px;
            height: 10px;
            pointer-events: none;
        }
    `;
    document.head.appendChild(style);
}
