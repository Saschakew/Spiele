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
        this.activeEffects = new Map();  // Initialisiere die Map für aktive Effekte
        this.thunderboltRadius = 2;
        this.visualX = x * CELL_SIZE;  // Tatsächliche Zeichenposition
        this.visualY = y * CELL_SIZE;
        this.targetX = x * CELL_SIZE;  // Zielposition
        this.targetY = y * CELL_SIZE;
        this.baseSpeed = 0.4;  // Basis-Bewegungsgeschwindigkeit
        this.moveSpeed = this.baseSpeed;
        this.visualX = x * CELL_SIZE;
        this.visualY = y * CELL_SIZE;
        this.targetX = x * CELL_SIZE;
        this.targetY = y * CELL_SIZE;
        this.activeEffects = new Map();
        this.isGhost = false;
        this.hasShield = false;
        this.activeEffects = new Map();
        this.hasForceField = false;
    }

    draw() {
        // Geschwindigkeit basierend auf Feldfarbe anpassen
        const gridX = Math.floor(this.x);
        const gridY = Math.floor(this.y);
        
        if (gridY >= 0 && gridY < colorGrid.length && 
            gridX >= 0 && gridX < colorGrid[0].length) {
            const currentCell = colorGrid[gridY][gridX];
            this.moveSpeed = currentCell === this.color ? this.baseSpeed * 1.5 : this.baseSpeed;
        } else {
            this.moveSpeed = this.baseSpeed;
        }

        // Sanfte Bewegung zur Zielposition
        const dx = this.targetX - this.visualX;
        const dy = this.targetY - this.visualY;
        
        if (Math.abs(dx) > 0.1) this.visualX += dx * this.moveSpeed;
        if (Math.abs(dy) > 0.1) this.visualY += dy * this.moveSpeed;

        // Zeichne das Spieler-Bild
        ctx.drawImage(this.image, this.visualX, this.visualY, CELL_SIZE, CELL_SIZE);
        
        // Zeichne die Thunderbolt-Cooldown-Leiste
        const barWidth = CELL_SIZE * 0.8;
        const barHeight = 5;
        const barX = this.visualX + (CELL_SIZE - barWidth) / 2;
        const barY = this.visualY - 10;
        
        ctx.fillStyle = 'gray';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        const progress = this.thunderboltReady ? 1 : 1 - (this.thunderboltCooldown / THUNDERBOLT_COOLDOWN);
        ctx.fillStyle = this.thunderboltReady ? 'gold' : 'blue';
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);

        // Zeichne aktive Effekte
        this.activeEffects.forEach((effect, effectType) => {
            if (effect && effect.update && effect.draw) {
                effect.update(effect.particles);
                effect.draw(effect.particles);
            }
        });
    }

    move(dx, dy) {
        const newX = this.x + dx * this.speed;
        const newY = this.y + dy * this.speed;
        
        if (this.canMoveTo(newX, newY)) {
            this.x = newX;
            this.y = newY;
            this.targetX = this.x * CELL_SIZE;
            this.targetY = this.y * CELL_SIZE;
            this.leaveTrail();
            this.checkCollision();
        }
    }

    canMoveTo(x, y) {
        const inBounds = x >= 0 && x < colorGrid[0].length && y >= 0 && y < colorGrid.length;
        if (!inBounds) return false;
        
        if (this.isGhost) {
            // Im Ghost-Mode kann man überall hin, außer auf den anderen Spieler
            const otherPlayer = this === pikachu ? bisasam : pikachu;
            return !(Math.floor(otherPlayer.x) === Math.floor(x) && 
                    Math.floor(otherPlayer.y) === Math.floor(y));
        }
        
        return inBounds && colorGrid[y][x] !== this.oppositeColor();
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
        if ((Math.floor(this.x) === Math.floor(otherPlayer.x) && Math.abs(this.y - otherPlayer.y) <= 1) ||
            (Math.floor(this.y) === Math.floor(otherPlayer.y) && Math.abs(this.x - otherPlayer.x) <= 1)) {
            
            // Wenn der aktuelle Spieler ein Schild hat, ist ER geschützt
            if (otherPlayer.hasShield) {
                createFloatingText("Blocked!", this.x * CELL_SIZE, this.y * CELL_SIZE - 20, '#FFD700');
            } else {
                this.forceThunderbolt();
            }
            
            // Wenn der andere Spieler ein Schild hat, ist ER geschützt
            if (this.hasShield) {
                createFloatingText("Blocked!", otherPlayer.x * CELL_SIZE, otherPlayer.y * CELL_SIZE - 20, '#FFD700');
            } else {
                otherPlayer.forceThunderbolt();
            }
        }
    }

    applyPowerup(powerupType) {
        const powerup = POWERUP_TYPES[powerupType];
        if (powerup) {
            // Effekt anwenden
            powerup.effect(this);
            
            // Timer für das Ende des Effekts setzen
            if (powerup.duration > 0) {
                setTimeout(() => {
                    powerup.endEffect(this);
                }, powerup.duration);
            }
        }
    }

    checkBerries() {
        berries = berries.filter(berry => {
            if (this.x === berry.x && this.y === berry.y) {
                this.applyPowerup(berry.powerupType);
                return false; // Beere entfernen
            }
            return true; // Beere behalten
        });
    }

    // Neue Methode zur Überprüfung, ob die Bewegung abgeschlossen ist
    isMoving() {
        return Math.abs(this.targetX - this.visualX) > 0.1 || 
               Math.abs(this.targetY - this.visualY) > 0.1;
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
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Animation starten
    requestAnimationFrame(gameLoop);

    // Optional: Aktiviere Pixelglätte deaktivieren für schärfere Grafiken
    ctx.imageSmoothingEnabled = false;  // Deaktiviert Pixel-Interpolation
}

// Spielschleife
function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    // Aktualisiere Spielerbewegungen
    updatePlayerMovements();

    // Beeren-Spawn-Timer
    if (currentTime - lastBerrySpawn > BERRY_SPAWN_INTERVAL) {
        const berry = new Berry();
        if (berry.placeRandomly()) {
            berries.push(berry);
        }
        lastBerrySpawn = currentTime;
    }

    pikachu.updateThunderbolt(deltaTime);
    bisasam.updateThunderbolt(deltaTime);

    // Überprüfe Kollisionen
    pikachu.checkCollision();
    bisasam.checkCollision();

    // Überprüfe Beeren
    pikachu.checkBerries();
    bisasam.checkBerries();

    updateConfetti(deltaTime);
    updateFloatingTexts(deltaTime);
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

    drawFloatingTexts();
}

// Tastatureingaben verarbeiten
function handleKeyDown(e) {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
    }
    // Thunderbolt-Tasten
    if (e.key === '0') pikachu.useThunderbolt();
    if (e.key === ' ') bisasam.useThunderbolt();
}

function handleKeyUp(e) {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
}

// Füge diese neue Funktion hinzu
function updatePlayerMovements() {
    const currentTime = Date.now();
    if (currentTime - lastMovementTime < MOVEMENT_DELAY) return;
    
    let moved = false;
    
    // Nur bewegen, wenn keine Animation läuft
    if (!pikachu.isMoving()) {
        if (keys.ArrowUp) { pikachu.move(0, -1); moved = true; }
        if (keys.ArrowDown) { pikachu.move(0, 1); moved = true; }
        if (keys.ArrowLeft) { pikachu.move(-1, 0); moved = true; }
        if (keys.ArrowRight) { pikachu.move(1, 0); moved = true; }
    }

    if (!bisasam.isMoving()) {
        if (keys.w) { bisasam.move(0, -1); moved = true; }
        if (keys.s) { bisasam.move(0, 1); moved = true; }
        if (keys.a) { bisasam.move(-1, 0); moved = true; }
        if (keys.d) { bisasam.move(1, 0); moved = true; }
    }

    if (moved) {
        lastMovementTime = currentTime;
    }
}

// Blitz-Fähigkeit auslösen
function triggerThunderbolt(player, isCollision) {
    const radius = isCollision ? 1 : player.thunderboltRadius;
    createExplosionEffect(player.x, player.y, radius, player.color);
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

// Am Anfang der Datei bei den Konstanten
const POWERUP_TYPES = {
    SPEED: {
        color: '#00FFFF',
        symbol: '⚡',
        duration: 5000,
        effect: (player) => {
            player.speed = 2;
            player.activeEffects.set('speed', {
                particles: [],
                update: (p) => {
                    // Mehr und schnellere Geschwindigkeitslinien
                    if (Math.random() < 0.5) {  // Erhöhte Spawn-Rate
                        const angle = Math.random() * Math.PI * 2;
                        const distance = CELL_SIZE * 0.6;
                        p.push({
                            x: player.visualX + CELL_SIZE/2 + Math.cos(angle) * distance,
                            y: player.visualY + CELL_SIZE/2 + Math.sin(angle) * distance,
                            vx: Math.cos(angle) * -5,
                            vy: Math.sin(angle) * -5,
                            lifetime: 300,
                            color: '#00FFFF',
                            size: Math.random() * 3 + 2
                        });
                    }
                    // Partikel aktualisieren
                    for (let i = p.length - 1; i >= 0; i--) {
                        p[i].lifetime -= 16;
                        p[i].x += p[i].vx;
                        p[i].y += p[i].vy;
                        if (p[i].lifetime <= 0) p.splice(i, 1);
                    }
                },
                draw: (p) => {
                    // Leuchteffekt um das Pokemon
                    ctx.save();
                    ctx.globalAlpha = 0.3;
                    ctx.shadowColor = '#00FFFF';
                    ctx.shadowBlur = 20;
                    ctx.beginPath();
                    ctx.arc(
                        player.visualX + CELL_SIZE/2,
                        player.visualY + CELL_SIZE/2,
                        CELL_SIZE * 0.6,
                        0, Math.PI * 2
                    );
                    ctx.fillStyle = '#00FFFF';
                    ctx.fill();
                    ctx.restore();

                    // Geschwindigkeitslinien
                    p.forEach(particle => {
                        ctx.save();
                        ctx.globalAlpha = particle.lifetime / 300;
                        ctx.fillStyle = particle.color;
                        ctx.shadowColor = particle.color;
                        ctx.shadowBlur = 5;
                        ctx.beginPath();
                        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    });
                }
            });
            createFloatingText("Speed Up!", player.x * CELL_SIZE, player.y * CELL_SIZE - 20, '#00FFFF');
        },
        endEffect: (player) => {
            player.speed = 1;
            player.activeEffects.delete('speed');
        }
    },

    // Neue Power-ups:
    GHOST: {
        color: '#9370DB',
        symbol: '👻',
        duration: 7000,
        effect: (player) => {
            player.isGhost = true;
            player.activeEffects.set('ghost', {
                particles: [],
                update: (p) => {
                    if (Math.random() < 0.3) {
                        p.push({
                            x: player.visualX + Math.random() * CELL_SIZE,
                            y: player.visualY + Math.random() * CELL_SIZE,
                            alpha: 1,
                            size: Math.random() * 5 + 3
                        });
                    }
                    p.forEach(particle => {
                        particle.alpha -= 0.02;
                    });
                    p = p.filter(particle => particle.alpha > 0);
                },
                draw: (p) => {
                    ctx.save();
                    // Ghost-Effekt für das Pokemon
                    ctx.globalAlpha = 0.7;
                    ctx.filter = 'blur(1px)';
                    ctx.drawImage(player.image, player.visualX, player.visualY, CELL_SIZE, CELL_SIZE);
                    
                    // Geister-Partikel
                    p.forEach(particle => {
                        ctx.globalAlpha = particle.alpha;
                        ctx.fillStyle = '#9370DB';
                        ctx.shadowColor = '#9370DB';
                        ctx.shadowBlur = 10;
                        ctx.beginPath();
                        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                        ctx.fill();
                    });
                    ctx.restore();
                }
            });
            createFloatingText("Ghost Mode!", player.x * CELL_SIZE, player.y * CELL_SIZE - 20, '#9370DB');
        },
        endEffect: (player) => {
            player.isGhost = false;
            player.activeEffects.delete('ghost');
        }
    },

    PAINT_EXPLOSION: {
        color: '#FF69B4',
        symbol: '💥',
        duration: 0,
        effect: (player) => {
            const radius = 4;
            createPaintExplosion(player.x, player.y, radius, player.color);
            
            for (let y = -radius; y <= radius; y++) {
                for (let x = -radius; x <= radius; x++) {
                    if (x*x + y*y <= radius*radius) {
                        const newX = Math.floor(player.x) + x;
                        const newY = Math.floor(player.y) + y;
                        if (newX >= 0 && newX < colorGrid[0].length &&
                            newY >= 0 && newY < colorGrid.length) {
                            if (colorGrid[newY][newX] === player.oppositeColor()) {
                                scores[player.oppositeColor()]--;
                            }
                            colorGrid[newY][newX] = player.color;
                            scores[player.color]++;
                        }
                    }
                }
            }
            createFloatingText("Paint Explosion!", player.x * CELL_SIZE, player.y * CELL_SIZE - 20, '#FF69B4');
        }
    },

    SHIELD: {
        color: '#FFD700',
        symbol: '🛡️',
        duration: 8000,
        effect: (player) => {
            player.hasShield = true;
            player.activeEffects.set('shield', {
                angle: 0,
                particles: [],
                update: (p) => {
                    this.angle = (this.angle + 0.05) % (Math.PI * 2);
                },
                draw: (p) => {
                    ctx.save();
                    const centerX = player.visualX + CELL_SIZE/2;
                    const centerY = player.visualY + CELL_SIZE/2;
                    
                    // Schild-Aura
                    ctx.globalAlpha = 0.3;
                    ctx.shadowColor = '#FFD700';
                    ctx.shadowBlur = 15;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, CELL_SIZE * 0.8, 0, Math.PI * 2);
                    ctx.fillStyle = '#FFD700';
                    ctx.fill();
                    
                    // Rotierende Schild-Partikel
                    ctx.globalAlpha = 0.7;
                    for (let i = 0; i < 8; i++) {
                        const angle = this.angle + (Math.PI * 2 * i / 8);
                        const x = centerX + Math.cos(angle) * CELL_SIZE * 0.8;
                        const y = centerY + Math.sin(angle) * CELL_SIZE * 0.8;
                        
                        ctx.beginPath();
                        ctx.arc(x, y, 3, 0, Math.PI * 2);
                        ctx.fillStyle = '#FFF';
                        ctx.shadowColor = '#FFD700';
                        ctx.shadowBlur = 5;
                        ctx.fill();
                    }
                    ctx.restore();
                }
            });
            createFloatingText("Shield Up!", player.x * CELL_SIZE, player.y * CELL_SIZE - 20, '#FFD700');
        },
        endEffect: (player) => {
            player.hasShield = false;
            player.activeEffects.delete('shield');
        }
    },

    FORCE_SHIELD: {
        color: '#4169E1',  // Royal Blue
        symbol: '⚡',
        duration: 6000,
        effect: (player) => {
            player.hasForceField = true;
            player.activeEffects.set('forcefield', {
                angle: 0,
                pulseSize: 0,
                particles: [],
                update: function(p) {
                    this.angle = (this.angle + 0.03) % (Math.PI * 2);
                    this.pulseSize = Math.sin(Date.now() * 0.005) * 0.2;
                    
                    // Prüfe Kollision mit anderem Spieler
                    const otherPlayer = player === pikachu ? bisasam : pikachu;
                    const dx = Math.floor(otherPlayer.x) - Math.floor(player.x);
                    const dy = Math.floor(otherPlayer.y) - Math.floor(player.y);
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 3 && distance > 0) {
                        // Berechne Abstoßungsrichtung
                        const pushX = dx / distance;
                        const pushY = dy / distance;
                        const force = Math.min(0.5, (3 - distance) * 0.3);  // Reduzierte Kraft
                        
                        // Berechne neue Position
                        let newX = otherPlayer.x + pushX * force;
                        let newY = otherPlayer.y + pushY * force;
                        
                        // Runde auf Gridpositionen
                        const gridX = Math.round(newX);
                        const gridY = Math.round(newY);
                        
                        // Prüfe ob die neue Position gültig ist
                        if (gridX >= 0 && gridX < colorGrid[0].length && 
                            gridY >= 0 && gridY < colorGrid.length) {
                            
                            // Setze die Position auf ganze Zahlen
                            otherPlayer.x = gridX;
                            otherPlayer.y = gridY;
                            otherPlayer.targetX = gridX * CELL_SIZE;
                            otherPlayer.targetY = gridY * CELL_SIZE;
                            otherPlayer.visualX = gridX * CELL_SIZE;
                            otherPlayer.visualY = gridY * CELL_SIZE;
                            
                            // Abstoßungseffekt
                            createForceFieldPulse(player.x, player.y, Math.atan2(dy, dx));
                        }
                    }
                },
                draw: function(p) {
                    ctx.save();
                    const centerX = player.visualX + CELL_SIZE/2;
                    const centerY = player.visualY + CELL_SIZE/2;
                    
                    // Kraftfeld-Aura
                    const baseSize = CELL_SIZE * 2;
                    const currentSize = baseSize * (1 + this.pulseSize);
                    
                    // Äußerer Glüh-Effekt
                    ctx.globalAlpha = 0.3;
                    ctx.shadowColor = '#4169E1';
                    ctx.shadowBlur = 15;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, currentSize, 0, Math.PI * 2);
                    ctx.fillStyle = '#4169E1';
                    ctx.fill();
                    
                    // Energielinien
                    ctx.globalAlpha = 0.7;
                    ctx.strokeStyle = '#4169E1';
                    ctx.lineWidth = 2;
                    
                    for (let i = 0; i < 8; i++) {
                        const angle = this.angle + (Math.PI * 2 * i / 8);
                        ctx.beginPath();
                        ctx.moveTo(
                            centerX + Math.cos(angle) * baseSize * 0.5,
                            centerY + Math.sin(angle) * baseSize * 0.5
                        );
                        ctx.lineTo(
                            centerX + Math.cos(angle) * currentSize,
                            centerY + Math.sin(angle) * currentSize
                        );
                        ctx.stroke();
                    }
                    
                    ctx.restore();
                }
            });
            createFloatingText("Force Field!", player.x * CELL_SIZE, player.y * CELL_SIZE - 20, '#4169E1');
        },
        endEffect: (player) => {
            player.hasForceField = false;
            player.activeEffects.delete('forcefield');
        }
    }
};

// Beeren-Klasse überarbeiten
class Berry {
    constructor() {
        this.powerupType = this.getRandomPowerup();
        this.placeRandomly();
        this.scale = 0;  // Für Spawn-Animation
        this.rotation = Math.random() * Math.PI * 2;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.sparkles = [];  // Für Glitzereffekte
    }

    getRandomPowerup() {
        const types = Object.keys(POWERUP_TYPES);
        return types[Math.floor(Math.random() * types.length)];
    }

    placeRandomly() {
        let attempts = 0;
        const maxAttempts = 100;

        do {
            this.x = Math.floor(Math.random() * (colorGrid[0].length));
            this.y = Math.floor(Math.random() * (colorGrid.length));
            attempts++;
            if (attempts > maxAttempts) return false;
        } while (colorGrid[this.y][this.x] !== null);
        
        return true;
    }

    draw() {
        const centerX = this.x * CELL_SIZE + CELL_SIZE/2;
        const centerY = this.y * CELL_SIZE + CELL_SIZE/2;
        const radius = CELL_SIZE/3;
        
        // Spawn-Animation
        if (this.scale < 1) {
            this.scale += 0.1;
        }

        // Schwebende Animation
        const bobHeight = 3;
        const bobY = Math.sin(Date.now() * 0.003 + this.bobOffset) * bobHeight;
        
        // Rotations-Animation
        this.rotation += 0.02;

        ctx.save();
        ctx.translate(centerX, centerY + bobY);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);

        // Äußeres Leuchten
        ctx.shadowColor = POWERUP_TYPES[this.powerupType].color;
        ctx.shadowBlur = 15;

        // Beeren-Form
        ctx.beginPath();
        this.drawBerryShape(0, 0, radius);
        
        // Beeren-Farbverlauf
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        const baseColor = POWERUP_TYPES[this.powerupType].color;
        gradient.addColorStop(0, this.lightenColor(baseColor, 50));
        gradient.addColorStop(0.7, baseColor);
        gradient.addColorStop(1, this.darkenColor(baseColor, 30));
        
        ctx.fillStyle = gradient;
        ctx.fill();

        // Glanzeffekt
        const shine = ctx.createLinearGradient(-radius, -radius, radius, radius);
        shine.addColorStop(0, 'rgba(255,255,255,0.5)');
        shine.addColorStop(0.5, 'rgba(255,255,255,0)');
        shine.addColorStop(1, 'rgba(255,255,255,0.2)');
        ctx.fillStyle = shine;
        ctx.fill();

        // Symbol des Power-ups
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = `${radius}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(POWERUP_TYPES[this.powerupType].symbol, 0, 0);

        // Glitzer-Effekte
        this.updateSparkles();
        this.drawSparkles(ctx);

        ctx.restore();
    }

    drawBerryShape(x, y, radius) {
        ctx.beginPath();
        ctx.moveTo(x, y - radius);
        
        // Beeren-Form mit Wellen
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
            const waveRadius = radius * (1 + Math.sin(angle * 4 + Date.now() * 0.003) * 0.1);
            const px = x + Math.cos(angle) * waveRadius;
            const py = y + Math.sin(angle) * waveRadius;
            
            if (angle === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        
        ctx.closePath();
    }

    updateSparkles() {
        // Neue Glitzer hinzufügen
        if (Math.random() < 0.1 && this.sparkles.length < 5) {
            this.sparkles.push({
                x: (Math.random() - 0.5) * CELL_SIZE/2,
                y: (Math.random() - 0.5) * CELL_SIZE/2,
                size: Math.random() * 3 + 1,
                lifetime: 1,
                angle: Math.random() * Math.PI * 2
            });
        }

        // Glitzer aktualisieren
        this.sparkles = this.sparkles.filter(sparkle => {
            sparkle.lifetime -= 0.02;
            sparkle.angle += 0.1;
            return sparkle.lifetime > 0;
        });
    }

    drawSparkles(ctx) {
        this.sparkles.forEach(sparkle => {
            ctx.save();
            ctx.translate(sparkle.x, sparkle.y);
            ctx.rotate(sparkle.angle);
            ctx.fillStyle = `rgba(255,255,255,${sparkle.lifetime})`;
            
            // Stern-Form
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * Math.PI * 2) / 5;
                const x = Math.cos(angle) * sparkle.size;
                const y = Math.sin(angle) * sparkle.size;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        });
    }

    lightenColor(color, percent) {
        const num = parseInt(color.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R : 255) * 0x10000 + (G < 255 ? G : 255) * 0x100 + (B < 255 ? B : 255)).toString(16).slice(1);
    }

    darkenColor(color, percent) {
        const num = parseInt(color.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R < 0 ? 0 : R) * 0x10000 + (G < 0 ? 0 : G) * 0x100 + (B < 0 ? 0 : B)).toString(16).slice(1);
    }
}

// Schwebenden Text für Powerup-Effekte hinzufügen
let floatingTexts = [];

function createFloatingText(text, x, y, color) {
    floatingTexts.push({
        text,
        x,
        y,
        color,
        lifetime: 1000,
        velocity: -2
    });
}

function updateFloatingTexts(deltaTime) {
    floatingTexts = floatingTexts.filter(text => {
        text.y += text.velocity;
        text.lifetime -= deltaTime;
        return text.lifetime > 0;
    });
}

function drawFloatingTexts() {
    floatingTexts.forEach(text => {
        ctx.save();
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = text.color;
        ctx.globalAlpha = text.lifetime / 1000;
        ctx.textAlign = 'center';
        ctx.fillText(text.text, text.x, text.y);
        ctx.restore();
    });
}

// Am Anfang der Datei bei den Variablen
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    s: false,
    a: false,
    d: false
};

// Am Anfang der Datei bei den Variablen
const MOVEMENT_DELAY = 50; // Von 100 auf 50 Millisekunden reduziert
let lastMovementTime = 0;

// Füge diese Funktion hinzu
function createExplosionEffect(centerX, centerY, radius, color) {
    const baseColor = color === 'yellow' ? 
        { r: 255, g: 215, b: 0 } : // Gold für Pikachu
        { r: 144, g: 238, b: 144 }; // Hellgrün für Bisasam

    // Hauptexplosionsring
    confetti.push({
        x: centerX * CELL_SIZE + CELL_SIZE/2,
        y: centerY * CELL_SIZE + CELL_SIZE/2,
        radius: 0,
        maxRadius: radius * CELL_SIZE,
        color: `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.3)`,
        lifetime: 400,
        type: 'ring',
        startTime: Date.now()
    });

    // Sekundärer Ring (verzögert)
    confetti.push({
        x: centerX * CELL_SIZE + CELL_SIZE/2,
        y: centerY * CELL_SIZE + CELL_SIZE/2,
        radius: 0,
        maxRadius: radius * CELL_SIZE * 0.8,
        color: `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.4)`,
        lifetime: 300,
        type: 'ring',
        startTime: Date.now() + 100
    });

    // Explosionspartikel
    const particleCount = 30;
    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const speed = 4 + Math.random() * 4;
        const size = 2 + Math.random() * 3;
        const lifetime = 500 + Math.random() * 300;

        // Hauptpartikel
        confetti.push({
            x: centerX * CELL_SIZE + CELL_SIZE/2,
            y: centerY * CELL_SIZE + CELL_SIZE/2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 1)`,
            size: size,
            lifetime: lifetime,
            alpha: 1,
            type: 'explosion',
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 15
        });

        // Glitzernde Partikel
        if (Math.random() > 0.5) {
            confetti.push({
                x: centerX * CELL_SIZE + CELL_SIZE/2,
                y: centerY * CELL_SIZE + CELL_SIZE/2,
                vx: Math.cos(angle) * (speed * 0.7),
                vy: Math.sin(angle) * (speed * 0.7),
                color: 'rgba(255, 255, 255, 0.9)',
                size: size * 0.6,
                lifetime: lifetime * 0.8,
                alpha: 1,
                type: 'sparkle',
                pulseSpeed: 0.05 + Math.random() * 0.05
            });
        }
    }

    // Zentrale Blitzeffekte
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        confetti.push({
            x: centerX * CELL_SIZE + CELL_SIZE/2,
            y: centerY * CELL_SIZE + CELL_SIZE/2,
            length: radius * CELL_SIZE * 0.7,
            angle: angle,
            color: `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.8)`,
            lifetime: 200,
            type: 'lightning',
            width: 3
        });
    }
}

function updateConfetti(deltaTime) {
    confetti = confetti.filter(particle => {
        if (particle.type === 'ring') {
            if (Date.now() < particle.startTime) return true;
            particle.radius += (particle.maxRadius - particle.radius) * 0.2;
            particle.lifetime -= deltaTime;
            return particle.lifetime > 0;
        } else if (particle.type === 'explosion' || particle.type === 'portal') {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= 0.96;
            particle.vy *= 0.96;
            if (particle.rotation) particle.rotation += particle.rotationSpeed;
            particle.lifetime -= deltaTime;
            particle.alpha = particle.lifetime / 500;
            return particle.lifetime > 0;
        } else if (particle.type === 'sparkle') {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= 0.98;
            particle.vy *= 0.98;
            particle.lifetime -= deltaTime;
            particle.alpha = (1 + Math.sin(Date.now() * particle.pulseSpeed)) * 0.5 * (particle.lifetime / 500);
            return particle.lifetime > 0;
        } else if (particle.type === 'lightning') {
            particle.lifetime -= deltaTime;
            return particle.lifetime > 0;
        } else {
            // Normales Konfetti
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.1;
            particle.lifetime -= deltaTime;
            return particle.lifetime > 0;
        }
    });
}

function drawConfetti() {
    confetti.forEach(particle => {
        ctx.save();
        if (particle.type === 'ring') {
            if (Date.now() >= particle.startTime) {
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                ctx.fillStyle = particle.color;
                ctx.fill();
            }
        } else if (particle.type === 'explosion' || particle.type === 'portal') {
            ctx.translate(particle.x, particle.y);
            if (particle.rotation) {
                ctx.rotate(particle.rotation * Math.PI / 180);
            }
            ctx.globalAlpha = particle.alpha;
            ctx.fillStyle = particle.color;
            ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
        } else if (particle.type === 'sparkle') {
            ctx.globalAlpha = particle.alpha;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (particle.type === 'lightning') {
            const progress = particle.lifetime / 200;
            ctx.globalAlpha = progress;
            ctx.strokeStyle = particle.color;
            ctx.lineWidth = particle.width;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            const endX = particle.x + Math.cos(particle.angle) * particle.length * progress;
            const endY = particle.y + Math.sin(particle.angle) * particle.length * progress;
            ctx.lineTo(endX, endY);
            ctx.stroke();
        } else {
            // Normales Konfetti
            ctx.translate(particle.x, particle.y);
            ctx.rotate((particle.rotation + particle.rotationSpeed) * Math.PI / 180);
            ctx.fillStyle = particle.color;
            ctx.globalAlpha = particle.lifetime / 1000;
            ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
        }
        ctx.restore();
    });
}

// Aktualisiere die Berry-Kollisionsprüfung
function checkBerryCollisions() {
    berries = berries.filter(berry => {
        const pikachuCollision = Math.floor(pikachu.x) === berry.x && Math.floor(pikachu.y) === berry.y;
        const bibasamCollision = Math.floor(bisasam.x) === berry.x && Math.floor(bisasam.y) === berry.y;
        
        if (pikachuCollision) {
            pikachu.applyPowerup(berry.powerupType);
            return false;
        }
        if (bibasamCollision) {
            bisasam.applyPowerup(berry.powerupType);
            return false;
        }
        return true;
    });
}

// Füge diese Hilfsfunktion für Explosionseffekte hinzu
function createPaintExplosion(x, y, radius, color) {
    const particleCount = 20;
    const centerX = x * CELL_SIZE + CELL_SIZE/2;
    const centerY = y * CELL_SIZE + CELL_SIZE/2;
    
    // Explosionsring
    confetti.push({
        x: centerX,
        y: centerY,
        radius: 0,
        maxRadius: radius * CELL_SIZE,
        color: color === 'yellow' ? 'rgba(255, 215, 0, 0.3)' : 'rgba(144, 238, 144, 0.3)',
        lifetime: 500,
        type: 'ring'
    });

    // Explosionspartikel
    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const speed = 2 + Math.random() * 3;
        confetti.push({
            x: centerX,
            y: centerY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: color === 'yellow' ? '#FFD700' : '#90EE90',
            size: Math.random() * 4 + 2,
            lifetime: 500 + Math.random() * 500,
            type: 'explosion',
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10
        });
    }
}

// Vereinfachte Version der createForceFieldPulse Funktion
function createForceFieldPulse(x, y, angle) {
    const centerX = x * CELL_SIZE + CELL_SIZE/2;
    const centerY = y * CELL_SIZE + CELL_SIZE/2;
    
    // Stoßwelle
    confetti.push({
        x: centerX,
        y: centerY,
        radius: CELL_SIZE,
        maxRadius: CELL_SIZE * 3,
        color: 'rgba(65, 105, 225, 0.3)',
        lifetime: 300,
        type: 'ring',
        startTime: Date.now()
    });
}

