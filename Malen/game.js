// Spielvariablen
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let pikachu, bisasam;
let lastTime = 0;
let colorGrid = [];
const CELL_SIZE = 35; // Größe eines Feldes, entspricht der Pokémon-Größe
const THUNDERBOLT_COOLDOWN = 30000; // 30 Sekunden Cooldown
let scores = {
    yellow: 0,  // Pikachu's Punktzahl
    green: 0    // Bisasam's Punktzahl
};

// Konfetti-System
let confetti = [];

// Beeren-System
let berries = [];
const BERRY_SPAWN_INTERVAL = 10000; // Neue Beere alle 10 Sekunden
let lastBerrySpawn = 0;

// Lade das Beeren-Bild einmal am Anfang
const berryImage = new Image();
berryImage.src = 'beere.png';

// Spieler-Klasse
class Player {
    constructor(x, y, image, color, thunderboltKey) {
        this.x = x;
        this.y = y;
        this.image = new Image();
        this.image.src = image;
        this.color = color;
        this.speed = 1; // Geschwindigkeit in Feldern pro Bewegung
        this.thunderboltKey = thunderboltKey;
        this.thunderboltReady = true;
        this.thunderboltCooldown = 0;
    }

    draw() {
        ctx.drawImage(this.image, this.x * CELL_SIZE, this.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        
        // Zeichne Thunderbolt-Ladestatus
        const barWidth = CELL_SIZE * 0.8;
        const barHeight = 5;
        const barX = this.x * CELL_SIZE + (CELL_SIZE - barWidth) / 2;
        const barY = this.y * CELL_SIZE - 10;
        
        ctx.fillStyle = 'gray';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        const progress = this.thunderboltReady ? 1 : 1 - (this.thunderboltCooldown / THUNDERBOLT_COOLDOWN);
        ctx.fillStyle = this.thunderboltReady ? 'gold' : 'blue';
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);
    }

    move(dx, dy) {
        const newX = this.x + dx * this.speed;
        const newY = this.y + dy * this.speed;
        if (this.canMoveTo(newX, newY)) {
            this.x = newX;
            this.y = newY;
            this.leaveTrail();
            this.checkCollision();
        }
    }

    canMoveTo(x, y) {
        return x >= 0 && x < colorGrid[0].length && y >= 0 && y < colorGrid.length && 
               colorGrid[y][x] !== this.oppositeColor();
    }

    oppositeColor() {
        return this.color === 'yellow' ? 'green' : 'yellow';
    }

    leaveTrail() {
        if (colorGrid[this.y][this.x] !== this.color) {
            if (colorGrid[this.y][this.x] === this.oppositeColor()) {
                scores[this.oppositeColor()]--; // Punkt vom Gegner abziehen
            }
            colorGrid[this.y][this.x] = this.color;
            scores[this.color]++; // Punkt hinzufügen
        }
    }

    updateThunderbolt(deltaTime) {
        if (!this.thunderboltReady) {
            this.thunderboltCooldown -= deltaTime;
            if (this.thunderboltCooldown <= 0) {
                this.thunderboltReady = true;
                this.thunderboltCooldown = 0;
            }
        }
    }

    forceThunderbolt() {
        // Löst den Blitz aus, ohne den Timer zurückzusetzen
        triggerThunderbolt(this, true);
    }

    useThunderbolt() {
        if (this.thunderboltReady) {
            this.thunderboltReady = false;
            this.thunderboltCooldown = THUNDERBOLT_COOLDOWN;
            const destroyedFields = triggerThunderbolt(this, false);
            // Reduziere den Cooldown basierend auf zerstörten Feldern
            this.thunderboltCooldown -= destroyedFields * 2000; // 2 Sekunden pro zerstörtes Feld
            if (this.thunderboltCooldown <= 0) {
                this.thunderboltReady = true;
                this.thunderboltCooldown = 0;
            }
            return true;
        }
        return false;
    }

    checkCollision() {
        const otherPlayer = this === pikachu ? bisasam : pikachu;
        if ((this.x === otherPlayer.x && Math.abs(this.y - otherPlayer.y) === 1) ||
            (this.y === otherPlayer.y && Math.abs(this.x - otherPlayer.x) === 1)) {
            this.forceThunderbolt();
            otherPlayer.forceThunderbolt();
        }
    }
}

// Spiel initialisieren
function init() {
    canvas.width = Math.floor(window.innerWidth / CELL_SIZE) * CELL_SIZE;
    canvas.height = Math.floor(window.innerHeight / CELL_SIZE) * CELL_SIZE;
    
    // Punktzahl zurücksetzen
    scores.yellow = 0;
    scores.green = 0;

    // Spieler initialisieren
    pikachu = new Player(1, 1, 'player1.png', 'yellow', '0');
    bisasam = new Player(Math.floor(canvas.width / CELL_SIZE) - 2, 
                        Math.floor(canvas.height / CELL_SIZE) - 2, 
                        'player2.png', 'green', ' ');

    // Farbgitter initialisieren
    for (let y = 0; y < canvas.height / CELL_SIZE; y++) {
        colorGrid[y] = [];
        for (let x = 0; x < canvas.width / CELL_SIZE; x++) {
            colorGrid[y][x] = null;
        }
    }

    // Beeren zurücksetzen
    berries = [];
    lastBerrySpawn = 0;

    // Event-Listener für Tastatureingaben
    window.addEventListener('keydown', handleKeyPress);

    // Animation starten
    requestAnimationFrame(gameLoop);
}

// Spielschleife
function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    pikachu.updateThunderbolt(deltaTime);
    bisasam.updateThunderbolt(deltaTime);

    // Überprüfe Kollisionen
    pikachu.checkCollision(bisasam);

    updateConfetti(deltaTime);
    draw();
    requestAnimationFrame(gameLoop);
}

// Zeichenfunktion
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Zeichne Hintergrund
    ctx.fillStyle = createGradientBackground(ctx, canvas.width, canvas.height);
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Zeichne ein subtiles Gittermuster
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < canvas.width; x += CELL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += CELL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Farbspuren mit Schatten und Glanz zeichnen
    for (let y = 0; y < colorGrid.length; y++) {
        for (let x = 0; x < colorGrid[y].length; x++) {
            if (colorGrid[y][x]) {
                ctx.save();
                ctx.shadowColor = 'rgba(0,0,0,0.3)';
                ctx.shadowBlur = 5;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                
                // Hauptfarbe mit Transparenz
                ctx.fillStyle = colorGrid[y][x].replace(')', ', 0.8)').replace('rgb', 'rgba');
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                
                // Glanzeffekt
                const gradient = ctx.createLinearGradient(
                    x * CELL_SIZE, y * CELL_SIZE,
                    x * CELL_SIZE, y * CELL_SIZE + CELL_SIZE
                );
                gradient.addColorStop(0, 'rgba(255,255,255,0.2)');
                gradient.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = gradient;
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                
                ctx.restore();
            }
        }
    }

    // Verbesserte Beeren-Darstellung
    berries.forEach(berry => {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        berry.draw();
        // Glitzernder Effekt
        if (Math.random() > 0.9) {
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.beginPath();
            ctx.arc(
                berry.x * CELL_SIZE + CELL_SIZE/2, 
                berry.y * CELL_SIZE + CELL_SIZE/2, 
                2, 0, Math.PI * 2
            );
            ctx.fill();
        }
        ctx.restore();
    });

    // Verbesserte Spieler-Darstellung
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    pikachu.draw();
    bisasam.draw();
    ctx.restore();

    // Verbessertes Konfetti
    drawConfetti();

    // Verbesserte Punktzahl-Anzeige
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.roundRect(5, 5, 140, 30, 5);
    ctx.roundRect(canvas.width - 145, 5, 140, 30, 5);
    ctx.fill();
    
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = 'yellow';
    ctx.fillText(`Pikachu: ${scores.yellow}`, 10, 25);
    ctx.fillStyle = 'green';
    ctx.fillText(`Bisasam: ${scores.green}`, canvas.width - 140, 25);
    ctx.restore();
}

// Tastatureingaben verarbeiten
function handleKeyPress(e) {
    switch(e.key) {
        case 'ArrowUp': pikachu.move(0, -1); break;
        case 'ArrowDown': pikachu.move(0, 1); break;
        case 'ArrowLeft': pikachu.move(-1, 0); break;
        case 'ArrowRight': pikachu.move(1, 0); break;
        case 'w': bisasam.move(0, -1); break;
        case 's': bisasam.move(0, 1); break;
        case 'a': bisasam.move(-1, 0); break;
        case 'd': bisasam.move(1, 0); break;
        case '0': pikachu.useThunderbolt(); break;
        case ' ': bisasam.useThunderbolt(); break;
    }
}

// Blitz-Fähigkeit auslösen
function triggerThunderbolt(player, isCollision) {
    const radius = isCollision ? 1 : 2; // Kleinerer Radius bei Kollision
    return useThunderbolt(player, radius);
}

// Blitz-Fähigkeit
function useThunderbolt(player, radius) {
    let destroyedFields = 0;
    for (let y = player.y - radius; y <= player.y + radius; y++) {
        for (let x = player.x - radius; x <= player.x + radius; x++) {
            if (y >= 0 && y < colorGrid.length && x >= 0 && x < colorGrid[0].length) {
                if (colorGrid[y][x] === player.oppositeColor()) {
                    createConfetti(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2);
                    scores[player.oppositeColor()]--;
                    colorGrid[y][x] = null;
                    destroyedFields++;
                }
            }
        }
    }
    return destroyedFields; // Gib die Anzahl der zerstörten Felder zurück
}

// Konfetti-System
function createConfetti(x, y) {
    const particleCount = 30;
    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const velocity = 2 + Math.random() * 2;
        confetti.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * velocity,
            vy: Math.sin(angle) * velocity,
            color: getRandomColor(),
            size: Math.random() * 3 + 1,
            lifetime: 1000 + Math.random() * 1000,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10
        });
    }
}

function updateConfetti(deltaTime) {
    confetti = confetti.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.05; // Leichte Schwerkraft hinzufügen
        particle.lifetime -= deltaTime;
        return particle.lifetime > 0;
    });
}

function drawConfetti() {
    confetti.forEach(particle => {
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate((particle.rotation + particle.rotationSpeed) * Math.PI / 180);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.lifetime / 1000;
        ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
        ctx.restore();
    });
}

// Füge diese Funktion hinzu, um zufällige Farben zu generieren
function getRandomColor() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgb(${r},${g},${b})`;
}

// Spiel starten
window.onload = init;

// Füge diese Funktionen am Anfang hinzu
function createGradientBackground(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#87CEEB');   // Himmelblau
    gradient.addColorStop(1, '#4CA1AF');   // Türkis
    return gradient;
}
