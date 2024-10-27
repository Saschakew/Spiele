// Spielfeld-Größe
const GRID_SIZE = 20;
const CELL_SIZE = 30;

// Spielobjekte
let mouse1 = { x: 0, y: 0 };
let mouse2 = { x: GRID_SIZE - 1, y: GRID_SIZE - 1 };
let cheese = { x: 0, y: 0 };
let obstacles = [];

// Neue Variablen für Timer und Punktezahl
let timeLeft = 120;
let score = 0;
let gameInterval;

// Neue Variablen für die Anzeige-Elemente
const scoreDisplay = document.getElementById('scoreDisplay');
const timeBarFill = document.getElementById('timeBarFill');

// Bilder für Mäuse
const mouse1Img = new Image();
mouse1Img.src = 'mouse.png';
const mouse2Img = new Image();
mouse2Img.src = 'mouse2.png';
const cheeseImg = new Image();
cheeseImg.src = 'cheese.png';
const rockImg = new Image();
rockImg.src = 'rock.png';
const grassImg = new Image();
grassImg.src = 'grass.png';
const mushroomImg = new Image();
mushroomImg.src = 'pilz.png';
const grassBackgroundImg = new Image();
grassBackgroundImg.src = 'grass_background.png';
grassBackgroundImg.onload = imageLoaded;

// Zähler für geladene Bilder
let loadedImages = 0;

// Funktion zum Überprüfen, ob alle Bilder geladen sind
function imageLoaded() {
    loadedImages++;
    if (loadedImages === 6) {  // Wenn alle sechs Bilder geladen sind (inkl. mouse2.png)
        initGame();
        gameLoop();
    }
}

// Event-Listener für das Laden der Bilder hinzufügen
mouse1Img.onload = imageLoaded;
mouse2Img.onload = imageLoaded;
cheeseImg.onload = imageLoaded;
rockImg.onload = imageLoaded;
grassImg.onload = imageLoaded;
mushroomImg.onload = imageLoaded;

// Neue Variablen für Superkräfte (für beide Spieler)
let superPowerActive1 = false;
let superPowerActive2 = false;
let superPowerTimer1 = null;
let superPowerTimer2 = null;
let mouseVisible1 = true;
let mouseVisible2 = true;
let blinkInterval1 = null;
let blinkInterval2 = null;

// Neue Variablen für die Katze
let cat = { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) };
let catSteps = 5;
const catImg = new Image();
catImg.src = 'cat.png';
catImg.onload = imageLoaded;

// Neue Variable für das Katzenziel
let catTarget = null;

// Neue Variable für das Katzen-Intervall
let catInterval;

// Spielfeld initialisieren
function initGame() {
    mouse1 = { x: 0, y: 0 };
    mouse2 = { x: GRID_SIZE - 1, y: GRID_SIZE - 1 };
    obstacles = [];
    mushroom = null;
    superPowerActive1 = false;
    superPowerActive2 = false;
    mouseVisible1 = true;
    mouseVisible2 = true;
    clearInterval(blinkInterval1);
    clearInterval(blinkInterval2);
    clearTimeout(superPowerTimer1);
    clearTimeout(superPowerTimer2);
    clearTimeout(mushroomTimer);
    cat = { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) };
    catSteps = 5;
    catTarget = null;
    placeObstacles(5);
    placeCheese();
    timeLeft = 120;
    score = 0;
    updateDisplay();
    startTimer();  // Dies startet sowohl den Spieltimer als auch die Katzenbewegung
    displayHighscores();

    // Adjust canvas size
    const canvas = document.getElementById('gameCanvas');
    canvas.width = GRID_SIZE * CELL_SIZE;
    canvas.height = GRID_SIZE * CELL_SIZE;
}

// Hindernisse platzieren
function placeObstacles(count) {
    for (let i = 0; i < count; i++) {
        let x, y, type;
        do {
            x = Math.floor(Math.random() * GRID_SIZE);
            y = Math.floor(Math.random() * GRID_SIZE);
            type = Math.random() < 0.5 ? 'rock' : 'grass';
        } while (
            (x === mouse1.x && y === mouse1.y) ||
            (x === mouse2.x && y === mouse2.y) ||
            (x === cheese.x && y === cheese.y) ||
            obstacles.some(obs => obs.x === x && obs.y === y)
        );
        obstacles.push({ x, y, type });
    }
}

// Käse zufällig platzieren
function placeCheese() {
    do {
        cheese.x = Math.floor(Math.random() * GRID_SIZE);
        cheese.y = Math.floor(Math.random() * GRID_SIZE);
    } while (
        obstacles.some(obs => obs.x === cheese.x && obs.y === cheese.y) ||
        (cheese.x === mouse1.x && cheese.y === mouse1.y) ||
        (cheese.x === mouse2.x && cheese.y === mouse2.y)
    );
}

// Maus bewegen (aktualisiert für Superkräfte)
function moveMouse(mouse, dx, dy) {
    let newX = mouse.x + dx;
    let newY = mouse.y + dy;
    
    if (newX >= 0 && newX < GRID_SIZE && newY >= 0 && newY < GRID_SIZE) {
        let superPowerActive = (mouse === mouse1) ? superPowerActive1 : superPowerActive2;
        if (superPowerActive || !obstacles.some(obs => obs.x === newX && obs.y === newY)) {
            if (superPowerActive) {
                obstacles = obstacles.filter(obs => obs.x !== newX || obs.y !== newY);
            } else if (obstacles.some(obs => obs.x === newX && obs.y === newY)) {
                catSteps += 5;  // Katze bekommt 5 neue Schritte
                console.log("Katze bekommt 5 neue Schritte. Aktuelle Schritte:", catSteps);
            }
            mouse.x = newX;
            mouse.y = newY;
        } else {
            // Maus hat ein Hindernis berührt, aber sich nicht bewegt
            catSteps += 5;
            console.log("Katze bekommt 5 neue Schritte (Hindernis berührt). Aktuelle Schritte:", catSteps);
        }
    }
    
    checkCollision(mouse);
}

// Überprüfen, ob eine Maus den Käse oder Pilz gefangen hat (aktualisiert)
function checkCollision(mouse) {
    if (mouse.x === cheese.x && mouse.y === cheese.y) {
        console.log("Käse gefangen!");
        if (mouse === mouse1) {
            score++;
        } else {
            score += 2;  // Zweiter Spieler bekommt 2 Punkte
        }
        updateDisplay();
        if (score % 3 === 0) {
            mathChallenge();
        }
        placeCheese();
        placeObstacles(Math.min(score, 3));
        
        if (Math.random() < 0.2) {
            placeMushroom();
        }
    }
    
    if (mushroom && mouse.x === mushroom.x && mouse.y === mushroom.y) {
        console.log("Magischer Pilz gefunden!");
        mushroom = null;
        clearTimeout(mushroomTimer);
        activateSuperPower(mouse === mouse1 ? 1 : 2);
    }
}

// Tastatureingaben verarbeiten (aktualisiert für zwei Spieler)
document.addEventListener('keydown', (event) => {
    switch(event.key) {
        case 'ArrowUp':    moveMouse(mouse1, 0, -1); break;
        case 'ArrowDown':  moveMouse(mouse1, 0, 1);  break;
        case 'ArrowLeft':  moveMouse(mouse1, -1, 0); break;
        case 'ArrowRight': moveMouse(mouse1, 1, 0);  break;
        case 'w': moveMouse(mouse2, 0, -1); break;
        case 's': moveMouse(mouse2, 0, 1);  break;
        case 'a': moveMouse(mouse2, -1, 0); break;
        case 'd': moveMouse(mouse2, 1, 0);  break;
    }
});

// Timer starten (aktualisiert)
function startTimer() {
    clearInterval(gameInterval);
    clearInterval(catInterval);
    gameInterval = setInterval(() => {
        timeLeft--;
        updateDisplay();
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
    
    // Neues Intervall für die Katzenbewegung
    catInterval = setInterval(() => {
        moveCat();
    }, 1000);
}

// Anzeige aktualisieren
function updateDisplay() {
    scoreDisplay.textContent = `Punkte: ${score}`;
    const timePercentage = (timeLeft / 120) * 100;
    timeBarFill.style.width = `${timePercentage}%`;
}

// Spiel beenden (aktualisiert)
function endGame(message = "Spielende!") {
    clearInterval(gameInterval);
    clearInterval(catInterval);
    alert(message + ` Du hast ${score} Punkte erreicht.`);
    const playerName = prompt("Bitte gib deinen Namen ein:");
    if (playerName) {
        addHighscore(playerName, score);
    }
    restartButton.style.display = 'block';
}

// Bestenliste hinzufügen
function addHighscore(name, score) {
    let highscores = JSON.parse(localStorage.getItem('highscores')) || [];
    highscores.push({name, score});
    highscores.sort((a, b) => b.score - a.score);
    highscores = highscores.slice(0, 10);  // Nur die Top 10 behalten
    localStorage.setItem('highscores', JSON.stringify(highscores));
    displayHighscores();
}

// Bestenliste anzeigen
function displayHighscores() {
    const highscoresList = document.getElementById('highscoresList');
    highscoresList.innerHTML = '';
    const highscores = JSON.parse(localStorage.getItem('highscores')) || [];
    highscores.forEach((entry, index) => {
        const li = document.createElement('li');
        li.textContent = `${entry.name}: ${entry.score}`;
        highscoresList.appendChild(li);
    });
}

// Updated render function without rotations
function render() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the grass background
    ctx.fillStyle = '#90EE90';  // Light green
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw obstacles
    obstacles.forEach(obs => {
        ctx.drawImage(obs.type === 'rock' ? rockImg : grassImg, obs.x * CELL_SIZE, obs.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });
    
    // Draw mushroom with pulsing effect
    if (mushroom) {
        ctx.save();
        ctx.translate(mushroom.x * CELL_SIZE + CELL_SIZE / 2, mushroom.y * CELL_SIZE + CELL_SIZE / 2);
        ctx.scale(1 + mushroomPulse * 0.1, 1 + mushroomPulse * 0.1);
        ctx.drawImage(mushroomImg, -CELL_SIZE / 2, -CELL_SIZE / 2, CELL_SIZE, CELL_SIZE);
        ctx.restore();
        
        // Update mushroom pulse
        mushroomPulse += 0.1 * mushroomPulseDirection;
        if (mushroomPulse >= 1 || mushroomPulse <= 0) {
            mushroomPulseDirection *= -1;
        }
    }
    
    // Draw cheese
    ctx.drawImage(cheeseImg, cheese.x * CELL_SIZE, cheese.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    
    // Draw mice (with blinking effect when superpowers are active)
    if (!superPowerActive1 || mouseVisible1) {
        ctx.drawImage(mouse1Img, mouse1.x * CELL_SIZE, mouse1.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
    if (!superPowerActive2 || mouseVisible2) {
        ctx.drawImage(mouse2Img, mouse2.x * CELL_SIZE, mouse2.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
    
    // Draw cat
    ctx.drawImage(catImg, cat.x * CELL_SIZE, cat.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    
    // Draw cheese eaten animation
    if (cheeseEatenAnimation) {
        ctx.globalAlpha = cheeseEatenAnimation.opacity;
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(cheeseEatenAnimation.x, cheeseEatenAnimation.y, cheeseEatenAnimation.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    
    // Draw mouse eaten animation
    if (mouseEatenAnimation) {
        ctx.globalAlpha = mouseEatenAnimation.opacity;
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(mouseEatenAnimation.x, mouseEatenAnimation.y, mouseEatenAnimation.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// Game Loop
let isGamePaused = false;

function gameLoop() {
    if (!isGamePaused) {
        render();
        requestAnimationFrame(gameLoop);
    }
}

// Neustart-Button Funktionalität
const restartButton = document.getElementById('restartButton');
restartButton.addEventListener('click', () => {
    restartButton.style.display = 'none';
    initGame();
});

// Initial call to display highscores
displayHighscores();

// Neue Funktion für die Mathe-Aufgabe
function mathChallenge() {
    isGamePaused = true;
    let num1, num2, operation;
    do {
        num1 = Math.floor(Math.random() * 10);
        num2 = Math.floor(Math.random() * 10);
        operation = Math.random() < 0.5 ? '+' : '-';
    } while (operation === '-' && num2 > num1);  // Verhindere negative Ergebnisse

    const question = `${num1} ${operation} ${num2}`;
    const correctAnswer = operation === '+' ? num1 + num2 : num1 - num2;

    clearInterval(gameInterval);  // Stoppe den Timer

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Zeichne die Aufgabe
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(question, canvas.width / 2, canvas.height / 2);
    
    // Warte auf Benutzereingabe
    const userInput = prompt(question);
    const userAnswer = parseInt(userInput);
    
    const isCorrect = userAnswer === correctAnswer;
    if (isCorrect) {
        timeLeft += 15;
    }
    
    showFeedback(isCorrect);
    updateDisplay();
}

function showFeedback(isCorrect) {
    const feedbackElement = document.createElement('div');
    feedbackElement.style.position = 'fixed';
    feedbackElement.style.top = '0';
    feedbackElement.style.left = '0';
    feedbackElement.style.width = '100%';
    feedbackElement.style.height = '100%';
    feedbackElement.style.backgroundColor = isCorrect ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)';
    feedbackElement.style.zIndex = '1000';
    document.body.appendChild(feedbackElement);
    
    setTimeout(() => {
        document.body.removeChild(feedbackElement);
        isGamePaused = false;
        startTimer();
        gameLoop();
    }, 500);
}

// Neue Variablen für den Pilz und Superkräfte
let mushroom = null;
let superPowerActive = false;
let superPowerTimer = null;
let mushroomTimer = null;
let blinkInterval = null;

// New variables for mushroom animation
let mushroomPulse = 0;
let mushroomPulseDirection = 1;

// Updated render function
function render() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the grass background
    ctx.fillStyle = '#90EE90';  // Light green
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw obstacles
    obstacles.forEach(obs => {
        ctx.drawImage(obs.type === 'rock' ? rockImg : grassImg, obs.x * CELL_SIZE, obs.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });
    
    // Draw mushroom with pulsing effect
    if (mushroom) {
        ctx.save();
        ctx.translate(mushroom.x * CELL_SIZE + CELL_SIZE / 2, mushroom.y * CELL_SIZE + CELL_SIZE / 2);
        ctx.scale(1 + mushroomPulse * 0.1, 1 + mushroomPulse * 0.1);
        ctx.drawImage(mushroomImg, -CELL_SIZE / 2, -CELL_SIZE / 2, CELL_SIZE, CELL_SIZE);
        ctx.restore();
        
        // Update mushroom pulse
        mushroomPulse += 0.1 * mushroomPulseDirection;
        if (mushroomPulse >= 1 || mushroomPulse <= 0) {
            mushroomPulseDirection *= -1;
        }
    }
    
    // Draw cheese
    ctx.drawImage(cheeseImg, cheese.x * CELL_SIZE, cheese.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    
    // Draw mice (with blinking effect when superpowers are active)
    if (!superPowerActive1 || mouseVisible1) {
        ctx.drawImage(mouse1Img, mouse1.x * CELL_SIZE, mouse1.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
    if (!superPowerActive2 || mouseVisible2) {
        ctx.drawImage(mouse2Img, mouse2.x * CELL_SIZE, mouse2.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
    
    // Draw cat
    ctx.drawImage(catImg, cat.x * CELL_SIZE, cat.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    
    // Draw cheese eaten animation
    if (cheeseEatenAnimation) {
        ctx.globalAlpha = cheeseEatenAnimation.opacity;
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(cheeseEatenAnimation.x, cheeseEatenAnimation.y, cheeseEatenAnimation.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    
    // Draw mouse eaten animation
    if (mouseEatenAnimation) {
        ctx.globalAlpha = mouseEatenAnimation.opacity;
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(mouseEatenAnimation.x, mouseEatenAnimation.y, mouseEatenAnimation.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// Updated placeMushroom function
function placeMushroom() {
    let x, y;
    do {
        x = Math.floor(Math.random() * GRID_SIZE);
        y = Math.floor(Math.random() * GRID_SIZE);
    } while (
        (x === mouse1.x && y === mouse1.y) ||
        (x === mouse2.x && y === mouse2.y) ||
        (x === cheese.x && y === cheese.y) ||
        obstacles.some(obs => obs.x === x && obs.y === y)
    );
    mushroom = { x, y };
    mushroomPulse = 0;
    mushroomPulseDirection = 1;
    
    // Timer zum Entfernen des Pilzes nach 15 Sekunden
    clearTimeout(mushroomTimer);
    mushroomTimer = setTimeout(() => {
        mushroom = null;
    }, 15000);
}

// Superkräfte aktivieren (angepasst für beide Spieler)
function activateSuperPower(mouseNumber) {
    if (mouseNumber === 1) {
        superPowerActive1 = true;
        clearTimeout(superPowerTimer1);
        superPowerTimer1 = setTimeout(() => {
            superPowerActive1 = false;
            clearInterval(blinkInterval1);
            mouseVisible1 = true;
        }, 10000);
        
        clearInterval(blinkInterval1);
        blinkInterval1 = setInterval(() => {
            mouseVisible1 = !mouseVisible1;
        }, 200);
    } else {
        superPowerActive2 = true;
        clearTimeout(superPowerTimer2);
        superPowerTimer2 = setTimeout(() => {
            superPowerActive2 = false;
            clearInterval(blinkInterval2);
            mouseVisible2 = true;
        }, 10000);
        
        clearInterval(blinkInterval2);
        blinkInterval2 = setInterval(() => {
            mouseVisible2 = !mouseVisible2;
        }, 200);
    }
}

// Katze bewegen (aktualisiert)
function moveCat() {
    if (catSteps > 0) {
        // Wähle ein Ziel, wenn keins vorhanden ist oder zufällig alle 10 Züge
        if (!catTarget || Math.random() < 0.1) {
            catTarget = Math.random() < 0.5 ? mouse1 : mouse2;
        }
        
        let dx = 0, dy = 0;
        
        if (cat.x < catTarget.x) dx = 1;
        else if (cat.x > catTarget.x) dx = -1;
        else if (cat.y < catTarget.y) dy = 1;
        else if (cat.y > catTarget.y) dy = -1;
        
        let newX = cat.x + dx;
        let newY = cat.y + dy;
        
        if (newX >= 0 && newX < GRID_SIZE && newY >= 0 && newY < GRID_SIZE &&
            !obstacles.some(obs => obs.x === newX && obs.y === newY)) {
            cat.x = newX;
            cat.y = newY;
            catSteps--;
        }
        
        checkCatCollision();
    }
    console.log("Katze bewegt sich. Position:", cat.x, cat.y, "Schritte übrig:", catSteps);
}

// Überprüfen, ob die Katze eine Maus gefangen hat
function checkCatCollision() {
    if ((cat.x === mouse1.x && cat.y === mouse1.y) || (cat.x === mouse2.x && cat.y === mouse2.y)) {
        endGame("Die Katze hat eine Maus gefangen!");
    }
}

// New variables for animations
let cheeseEatenAnimation = null;
let mouseEatenAnimation = null;

// Updated moveMouse function without storing last movement
function moveMouse(mouse, dx, dy) {
    let newX = mouse.x + dx;
    let newY = mouse.y + dy;
    
    if (newX >= 0 && newX < GRID_SIZE && newY >= 0 && newY < GRID_SIZE) {
        let superPowerActive = (mouse === mouse1) ? superPowerActive1 : superPowerActive2;
        if (superPowerActive || !obstacles.some(obs => obs.x === newX && obs.y === newY)) {
            if (superPowerActive) {
                obstacles = obstacles.filter(obs => obs.x !== newX || obs.y !== newY);
            } else if (obstacles.some(obs => obs.x === newX && obs.y === newY)) {
                catSteps += 5;  // Katze bekommt 5 neue Schritte
                console.log("Katze bekommt 5 neue Schritte. Aktuelle Schritte:", catSteps);
            }
            mouse.x = newX;
            mouse.y = newY;
        } else {
            // Maus hat ein Hindernis berührt, aber sich nicht bewegt
            catSteps += 5;
            console.log("Katze bekommt 5 neue Schritte (Hindernis berührt). Aktuelle Schritte:", catSteps);
        }
    }
    
    checkCollision(mouse);
}

// Updated checkCollision function with cheese eaten animation
function checkCollision(mouse) {
    if (mouse.x === cheese.x && mouse.y === cheese.y) {
        console.log("Cheese caught!");
        if (mouse === mouse1) {
            score++;
        } else {
            score += 2;
        }
        updateDisplay();
        if (score % 3 === 0) {
            mathChallenge();
        }
        
        // Start cheese eaten animation
        cheeseEatenAnimation = {
            x: cheese.x * CELL_SIZE + CELL_SIZE / 2,
            y: cheese.y * CELL_SIZE + CELL_SIZE / 2,
            radius: 0,
            opacity: 1
        };
        animateCheeseEaten();
        
        placeCheese();
        placeObstacles(Math.min(score, 3));
        
        if (Math.random() < 0.2) {
            placeMushroom();
        }
    }
    
    if (mushroom && mouse.x === mushroom.x && mouse.y === mushroom.y) {
        console.log("Magischer Pilz gefunden!");
        mushroom = null;
        clearTimeout(mushroomTimer);
        activateSuperPower(mouse === mouse1 ? 1 : 2);
    }
}

// Cheese eaten animation
function animateCheeseEaten() {
    if (cheeseEatenAnimation) {
        cheeseEatenAnimation.radius += 2;
        cheeseEatenAnimation.opacity -= 0.05;
        
        if (cheeseEatenAnimation.opacity <= 0) {
            cheeseEatenAnimation = null;
        } else {
            requestAnimationFrame(animateCheeseEaten);
        }
    }
}

// Updated checkCatCollision function with mouse eaten animation
function checkCatCollision() {
    if ((cat.x === mouse1.x && cat.y === mouse1.y) || (cat.x === mouse2.x && cat.y === mouse2.y)) {
        const eatenMouse = (cat.x === mouse1.x && cat.y === mouse1.y) ? mouse1 : mouse2;
        
        // Start mouse eaten animation
        mouseEatenAnimation = {
            x: eatenMouse.x * CELL_SIZE + CELL_SIZE / 2,
            y: eatenMouse.y * CELL_SIZE + CELL_SIZE / 2,
            radius: 0,
            opacity: 1
        };
        animateMouseEaten();
        
        setTimeout(() => {
            endGame("The cat caught a mouse!");
        }, 1000);  // Delay end game to allow animation to play
    }
}

// Mouse eaten animation
function animateMouseEaten() {
    if (mouseEatenAnimation) {
        mouseEatenAnimation.radius += 3;
        mouseEatenAnimation.opacity -= 0.03;
        
        if (mouseEatenAnimation.opacity <= 0) {
            mouseEatenAnimation = null;
        } else {
            requestAnimationFrame(animateMouseEaten);
        }
    }
}

// Add this function to clear the leaderboard
function clearLeaderboard() {
    localStorage.removeItem('highscores');
    displayHighscores();
}

// Add event listener for the clear leaderboard button
document.getElementById('clearLeaderboardButton').addEventListener('click', clearLeaderboard);

// New variables for animations
let mushroomEatenAnimation = null;
let objectDestroyedAnimations = [];

// Updated render function
function render() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the grass background
    ctx.fillStyle = '#90EE90';  // Light green
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw obstacles
    obstacles.forEach(obs => {
        ctx.drawImage(obs.type === 'rock' ? rockImg : grassImg, obs.x * CELL_SIZE, obs.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });
    
    // Draw mushroom with pulsing effect
    if (mushroom) {
        ctx.save();
        ctx.translate(mushroom.x * CELL_SIZE + CELL_SIZE / 2, mushroom.y * CELL_SIZE + CELL_SIZE / 2);
        ctx.scale(1 + mushroomPulse * 0.1, 1 + mushroomPulse * 0.1);
        ctx.drawImage(mushroomImg, -CELL_SIZE / 2, -CELL_SIZE / 2, CELL_SIZE, CELL_SIZE);
        ctx.restore();
        
        // Update mushroom pulse
        mushroomPulse += 0.1 * mushroomPulseDirection;
        if (mushroomPulse >= 1 || mushroomPulse <= 0) {
            mushroomPulseDirection *= -1;
        }
    }
    
    // Draw cheese
    ctx.drawImage(cheeseImg, cheese.x * CELL_SIZE, cheese.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    
    // Draw mice (with blinking effect when superpowers are active)
    if (!superPowerActive1 || mouseVisible1) {
        ctx.drawImage(mouse1Img, mouse1.x * CELL_SIZE, mouse1.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
    if (!superPowerActive2 || mouseVisible2) {
        ctx.drawImage(mouse2Img, mouse2.x * CELL_SIZE, mouse2.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
    
    // Draw cat
    ctx.drawImage(catImg, cat.x * CELL_SIZE, cat.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    
    // Draw cheese eaten animation
    if (cheeseEatenAnimation) {
        ctx.globalAlpha = cheeseEatenAnimation.opacity;
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(cheeseEatenAnimation.x, cheeseEatenAnimation.y, cheeseEatenAnimation.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    
    // Draw mouse eaten animation
    if (mouseEatenAnimation) {
        ctx.globalAlpha = mouseEatenAnimation.opacity;
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(mouseEatenAnimation.x, mouseEatenAnimation.y, mouseEatenAnimation.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    
    // Draw mushroom eaten animation
    if (mushroomEatenAnimation) {
        ctx.globalAlpha = mushroomEatenAnimation.opacity;
        ctx.fillStyle = 'purple';
        ctx.beginPath();
        ctx.arc(mushroomEatenAnimation.x, mushroomEatenAnimation.y, mushroomEatenAnimation.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    
    // Draw object destroyed animations
    objectDestroyedAnimations.forEach(anim => {
        ctx.globalAlpha = anim.opacity;
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.arc(anim.x, anim.y, anim.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
    });
}

// Updated checkCollision function
function checkCollision(mouse) {
    if (mouse.x === cheese.x && mouse.y === cheese.y) {
        console.log("Cheese caught!");
        if (mouse === mouse1) {
            score++;
        } else {
            score += 2;
        }
        updateDisplay();
        if (score % 3 === 0) {
            mathChallenge();
        }
        
        // Start cheese eaten animation
        cheeseEatenAnimation = {
            x: cheese.x * CELL_SIZE + CELL_SIZE / 2,
            y: cheese.y * CELL_SIZE + CELL_SIZE / 2,
            radius: 0,
            opacity: 1
        };
        animateCheeseEaten();
        
        placeCheese();
        placeObstacles(Math.min(score, 3));
        
        if (Math.random() < 0.2) {
            placeMushroom();
        }
    }
    
    if (mushroom && mouse.x === mushroom.x && mouse.y === mushroom.y) {
        console.log("Magischer Pilz gefunden!");
        
        // Start mushroom eaten animation
        mushroomEatenAnimation = {
            x: mushroom.x * CELL_SIZE + CELL_SIZE / 2,
            y: mushroom.y * CELL_SIZE + CELL_SIZE / 2,
            radius: 0,
            opacity: 1
        };
        animateMushroomEaten();
        
        mushroom = null;
        clearTimeout(mushroomTimer);
        activateSuperPower(mouse === mouse1 ? 1 : 2);
    }
}

// Mushroom eaten animation
function animateMushroomEaten() {
    if (mushroomEatenAnimation) {
        mushroomEatenAnimation.radius += 2;
        mushroomEatenAnimation.opacity -= 0.05;
        
        if (mushroomEatenAnimation.opacity <= 0) {
            mushroomEatenAnimation = null;
        } else {
            requestAnimationFrame(animateMushroomEaten);
        }
    }
}

// Updated moveMouse function
function moveMouse(mouse, dx, dy) {
    let newX = mouse.x + dx;
    let newY = mouse.y + dy;
    
    if (newX >= 0 && newX < GRID_SIZE && newY >= 0 && newY < GRID_SIZE) {
        let superPowerActive = (mouse === mouse1) ? superPowerActive1 : superPowerActive2;
        if (superPowerActive || !obstacles.some(obs => obs.x === newX && obs.y === newY)) {
            if (superPowerActive) {
                obstacles = obstacles.filter(obs => {
                    if (obs.x === newX && obs.y === newY) {
                        // Start object destroyed animation
                        objectDestroyedAnimations.push({
                            x: obs.x * CELL_SIZE + CELL_SIZE / 2,
                            y: obs.y * CELL_SIZE + CELL_SIZE / 2,
                            radius: 0,
                            opacity: 1
                        });
                        animateObjectDestroyed();
                        return false;
                    }
                    return true;
                });
            } else if (obstacles.some(obs => obs.x === newX && obs.y === newY)) {
                catSteps += 5;
                console.log("Katze bekommt 5 neue Schritte. Aktuelle Schritte:", catSteps);
            }
            mouse.x = newX;
            mouse.y = newY;
        } else {
            catSteps += 5;
            console.log("Katze bekommt 5 neue Schritte (Hindernis berührt). Aktuelle Schritte:", catSteps);
        }
    }
    
    checkCollision(mouse);
}

// Object destroyed animation
function animateObjectDestroyed() {
    objectDestroyedAnimations = objectDestroyedAnimations.filter(anim => {
        anim.radius += 1;
        anim.opacity -= 0.05;
        
        return anim.opacity > 0;
    });
    
    if (objectDestroyedAnimations.length > 0) {
        requestAnimationFrame(animateObjectDestroyed);
    }
}
