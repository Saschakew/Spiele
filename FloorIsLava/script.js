// Floor is Lava - Game Logic
console.log('Script loaded!'); // Basic test to ensure script is linked correctly

// Game variables
let video;
let canvas;
let ctx;
let gameActive = false;
let gameOver = false;
let startTime;
let score = 0;
let timer = 0;
let animationFrameId;
let lastUpdateTime = 0;

// Game states
const GAME_STATE = {
    SETUP: 'setup',
    CALIBRATION: 'calibration',
    PLAYING: 'playing',
    GAME_OVER: 'gameover',
    LOADING_MODEL: 'loading_model'
};

let currentState = GAME_STATE.SETUP;

// Lava grid variables
let cornerPoints = []; // Will store the 4 corner points of our grid
let gridSize = 5; // 5x5 grid
let gridCells = []; // Will store the state of each cell ('lava' or 'stone')
let gridTimers = []; // Will store timers for dynamic platforms

// Dynamic platform variables
let platformInterval = 3000; // ms between new platform spawns
let lastPlatformTime = 0;
let platformDuration = 5000; // ms that a platform stays active
let maxActivePlatforms = 3; // Maximum number of active dynamic platforms
let activePlatforms = 0; // Current count of active platforms

// Rising lava variables
let difficultyLevel = 1;
let riseLavaInterval = 10000; // ms between lava rises
let lastLavaRiseTime = 0;
let maxDifficultyLevel = 5;

// Pose detection variables
let detector; // MoveNet detector
let poseDetectionActive = false;
let lastPose = null;
let detectionInterval = 100; // ms between pose detections
let lastDetectionTime = 0;
let debugMode = true; // Set to true to see pose keypoints

// DOM elements
const gameContainer = document.querySelector('.game-container');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const fullscreenButton = document.getElementById('fullscreen-button');
const gameStatus = document.getElementById('game-status');
const timerDisplay = document.getElementById('timer');
const scoreDisplay = document.getElementById('score');
const errorMessage = document.getElementById('error-message');

// Fullscreen state
let isFullscreen = false;

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', initializeGame);

// Set up event listeners
function setupEventListeners() {
    startButton.addEventListener('click', startCalibration);
    restartButton.addEventListener('click', restartGame);
    fullscreenButton.addEventListener('click', toggleFullscreen);
    
    // Canvas click handler - serves different purposes based on game state
    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Create the raw click point (not mirrored)
        const rawClickPoint = { x, y };
        
        // Create mirrored click point for game logic
        const clickPoint = mirrorPoint(rawClickPoint);
        
        console.log('Canvas clicked at:', rawClickPoint, 'Mirrored:', clickPoint, 'Current state:', currentState);
        
        if (currentState === GAME_STATE.CALIBRATION) {
            // In calibration mode, collect corner points
            handleCalibrationClick(clickPoint);
        } else if (currentState === GAME_STATE.PLAYING && !gameOver) {
            // In playing mode, check if click is in lava
            // Manual testing via clicks
            let inLava = false;
            
            // Find which grid cell contains the point
            for (let i = 0; i < gridSize; i++) {
                for (let j = 0; j < gridSize; j++) {
                    if (isPointInCell(clickPoint, i, j)) {
                        inLava = gridCells[i][j] === 'lava';
                        console.log('Click in cell:', i, j, 'Type:', gridCells[i][j]);
                        break;
                    }
                }
                if (inLava) break;
            }
            
            if (inLava) {
                console.log('Click in lava!');
                endGame();
            }
        }
    });
    
    // Listen for fullscreen change events
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
}

// Initialize the game
async function initializeGame() {
    // Get DOM elements
    video = document.getElementById('webcam');
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // Set up event listeners
    setupEventListeners();
    
    // Try to access webcam with ideal constraints for fullscreen
    try {
        const constraints = {
            video: {
                width: { ideal: window.innerWidth },
                height: { ideal: window.innerHeight },
                facingMode: 'environment' // Prefer back camera if available
            }
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        
        // Wait for video metadata to load to set canvas dimensions
        video.addEventListener('loadedmetadata', () => {
            resizeCanvasToVideo();
            
            // Initialize grid cells (all lava by default)
            initializeGridCells();
            
            // Draw a test rectangle to confirm canvas is working
            drawTestRectangle();
            
            // Load the pose detection model
            loadPoseDetectionModel();
        });
    } catch (error) {
        console.error('Error accessing webcam:', error);
        errorMessage.classList.remove('hidden');
        startButton.disabled = true;
    }
}

// Load the MoveNet pose detection model
async function loadPoseDetectionModel() {
    try {
        currentState = GAME_STATE.LOADING_MODEL;
        gameStatus.textContent = 'Loading pose detection model...';
        
        // Create detector options
        const detectorConfig = {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true
        };
        
        // Load the MoveNet model
        detector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet, 
            detectorConfig
        );
        
        console.log('MoveNet model loaded successfully');
        gameStatus.textContent = 'Model loaded! Click Start Game to begin.';
        currentState = GAME_STATE.SETUP;
        startButton.disabled = false;
    } catch (error) {
        console.error('Error loading pose detection model:', error);
        gameStatus.textContent = 'Error loading pose model. Try refreshing the page.';
    }
}

// Resize canvas to match video dimensions
function resizeCanvasToVideo() {
    if (video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // If we're in fullscreen mode, adjust canvas size
        if (isFullscreen) {
            // Maintain aspect ratio while filling the screen
            const videoAspect = video.videoWidth / video.videoHeight;
            const screenAspect = window.innerWidth / window.innerHeight;
            
            if (videoAspect > screenAspect) {
                // Video is wider than screen
                canvas.style.width = '100vw';
                canvas.style.height = 'auto';
            } else {
                // Video is taller than screen
                canvas.style.width = 'auto';
                canvas.style.height = '100vh';
            }
        } else {
            // Reset styles when not in fullscreen
            canvas.style.width = '';
            canvas.style.height = '';
        }
        
        // Apply mirroring to canvas context
        setupMirroredCanvas();
    }
}

// We're no longer using canvas transformations for mirroring
// Instead, we'll handle mirroring in our coordinate calculations
function setupMirroredCanvas() {
    // Reset to default transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// Convert a screen x-coordinate to a mirrored coordinate
function mirrorX(x) {
    return canvas.width - x;
}

// Mirror a point's x-coordinate
function mirrorPoint(point) {
    return {
        x: mirrorX(point.x),
        y: point.y
    };
}

// Initialize grid cells (half lava, half stone)
function initializeGridCells() {
    gridCells = [];
    gridTimers = []; // Initialize timers for dynamic platforms
    
    for (let i = 0; i < gridSize; i++) {
        const row = [];
        const timerRow = [];
        
        for (let j = 0; j < gridSize; j++) {
            // Make the left half stone, right half lava
            if (j < gridSize / 2) {
                row.push('stone');
            } else {
                row.push('lava');
            }
            // Initialize all timers to 0 (no active timer)
            timerRow.push(0);
        }
        
        gridCells.push(row);
        gridTimers.push(timerRow);
    }
}

// Draw a test rectangle to confirm canvas is working
function drawTestRectangle() {
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.fillRect(canvas.width / 4, canvas.height / 4, canvas.width / 2, canvas.height / 2);
    
    // Add text to indicate this is a test
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Canvas Test - Click Start Game', canvas.width / 2, canvas.height / 2);
}

// Start the calibration process
function startCalibration() {
    if (!video.srcObject) {
        errorMessage.classList.remove('hidden');
        return;
    }
    
    currentState = GAME_STATE.CALIBRATION;
    cornerPoints = []; // Reset corner points
    
    // Update UI
    startButton.style.display = 'none';
    gameStatus.textContent = 'Calibration: Click the 4 corners of your 20x20 area';
    
    // Start calibration loop
    calibrationLoop();
}

// Handle clicks during calibration
function handleCalibrationClick(point) {
    if (cornerPoints.length < 4) {
        cornerPoints.push(point);
        console.log('Added corner point:', point, 'Total points:', cornerPoints.length);
        
        // Update UI to show progress
        const cornerNames = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
        if (cornerPoints.length < 4) {
            gameStatus.textContent = `Calibration: Click the ${cornerNames[cornerPoints.length]} corner`;
        } else {
            // All corners collected, start the game
            gameStatus.textContent = 'Calibration complete! Starting game...';
            console.log('Calibration complete. All corner points:', cornerPoints);
            setTimeout(startGame, 1000); // Short delay before starting game
        }
    }
}

// Calibration loop
function calibrationLoop() {
    if (currentState !== GAME_STATE.CALIBRATION) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw collected corner points
    drawCornerPoints();
    
    // Continue calibration loop
    requestAnimationFrame(calibrationLoop);
}

// Draw the corner points during calibration
function drawCornerPoints() {
    const pointSize = 10;
    const cornerNames = ['TL', 'TR', 'BR', 'BL'];
    
    // Draw instruction text
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Click the ${cornerNames[cornerPoints.length]} corner (${cornerPoints.length}/4)`, 
                canvas.width / 2, 30);
    
    ctx.lineWidth = 2;
    
    // Draw existing corner points
    for (let i = 0; i < cornerPoints.length; i++) {
        // Get the point and un-mirror it for display
        const point = cornerPoints[i];
        const displayPoint = { x: mirrorX(point.x), y: point.y };
        
        console.log('Drawing corner point', i, 'at:', displayPoint, 'original:', point);
        
        // Draw point
        ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
        ctx.beginPath();
        ctx.arc(displayPoint.x, displayPoint.y, pointSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw label
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(cornerNames[i], displayPoint.x, displayPoint.y - 15);
    }
    
    // Draw lines between points
    if (cornerPoints.length > 1) {
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
        ctx.beginPath();
        
        // Start with the first point (un-mirrored for display)
        const firstDisplayPoint = { x: mirrorX(cornerPoints[0].x), y: cornerPoints[0].y };
        ctx.moveTo(firstDisplayPoint.x, firstDisplayPoint.y);
        
        for (let i = 1; i < cornerPoints.length; i++) {
            const displayPoint = { x: mirrorX(cornerPoints[i].x), y: cornerPoints[i].y };
            ctx.lineTo(displayPoint.x, displayPoint.y);
        }
        
        // Close the shape if we have all 4 points
        if (cornerPoints.length === 4) {
            ctx.lineTo(firstDisplayPoint.x, firstDisplayPoint.y);
        }
        
        ctx.stroke();
    }
}

// Start the game
function startGame() {
    if (!video.srcObject) {
        errorMessage.classList.remove('hidden');
        return;
    }
    
    if (!detector) {
        gameStatus.textContent = 'Pose detection model not loaded. Please wait...';
        return;
    }
    
    currentState = GAME_STATE.PLAYING;
    gameActive = true;
    gameOver = false;
    poseDetectionActive = true;
    
    // Reset game variables
    startTime = Date.now();
    lastPlatformTime = Date.now();
    lastLavaRiseTime = Date.now();
    lastUpdateTime = Date.now();
    score = 0;
    difficultyLevel = 1;
    activePlatforms = 0;
    
    // Update UI
    startButton.style.display = 'none';
    restartButton.style.display = 'none';
    gameStatus.textContent = 'Avoid the lava with your feet! Watch for temporary safe platforms!';
    
    // Start game loop
    gameLoop();
}

// Game loop
function gameLoop() {
    if (!gameActive) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get current time for updates
    const now = Date.now();
    
    // Update dynamic platforms and rising lava
    updateGameDynamics(now);
    
    // Draw lava grid
    drawLavaGrid();
    
    // Run pose detection at specified intervals
    if (detector && poseDetectionActive && now - lastDetectionTime > detectionInterval) {
        detectPose();
        lastDetectionTime = now;
    }
    
    // Draw the last detected pose if in debug mode
    if (debugMode && lastPose) {
        drawPoseKeypoints();
    }
    
    // Check for foot-lava collision
    if (lastPose) {
        checkFootLavaCollision();
    }
    
    // Update timer and score
    updateTimerAndScore();
    
    // Continue game loop
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Update dynamic platforms and rising lava
function updateGameDynamics(now) {
    // Update platform timers and check for expired platforms
    updatePlatformTimers(now);
    
    // Spawn new dynamic platforms at intervals
    if (now - lastPlatformTime > platformInterval && activePlatforms < maxActivePlatforms) {
        spawnDynamicPlatform();
        lastPlatformTime = now;
    }
    
    // Increase difficulty by rising lava over time
    if (difficultyLevel < maxDifficultyLevel && now - lastLavaRiseTime > riseLavaInterval) {
        riseLava();
        lastLavaRiseTime = now;
    }
}

// Update platform timers and remove expired platforms
function updatePlatformTimers(now) {
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            // If this cell has an active timer
            if (gridTimers[i][j] > 0) {
                // Check if the timer has expired
                if (now > gridTimers[i][j]) {
                    // Timer expired, convert back to original state (likely lava)
                    gridCells[i][j] = 'lava';
                    gridTimers[i][j] = 0;
                    activePlatforms--;
                    console.log(`Platform at [${i},${j}] expired, converting back to lava`);
                }
            }
        }
    }
}

// Spawn a new dynamic platform (temporary safe zone)
function spawnDynamicPlatform() {
    // Find a suitable lava cell to convert to a temporary stone platform
    const candidates = [];
    
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            // Only consider lava cells with no active timer
            if (gridCells[i][j] === 'lava' && gridTimers[i][j] === 0) {
                candidates.push({row: i, col: j});
            }
        }
    }
    
    if (candidates.length > 0) {
        // Randomly select a candidate cell
        const randomIndex = Math.floor(Math.random() * candidates.length);
        const selected = candidates[randomIndex];
        
        // Convert to stone and set timer
        gridCells[selected.row][selected.col] = 'stone-temp';
        gridTimers[selected.row][selected.col] = Date.now() + platformDuration;
        activePlatforms++;
        
        console.log(`Spawned temporary platform at [${selected.row},${selected.col}]`);
    }
}

// Increase difficulty by converting some stone to lava
function riseLava() {
    // Count how many stone cells we have
    let stoneCells = 0;
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (gridCells[i][j] === 'stone') {
                stoneCells++;
            }
        }
    }
    
    // Calculate how many cells to convert based on difficulty level
    // As difficulty increases, convert more cells at once
    const cellsToConvert = Math.min(stoneCells, difficultyLevel);
    
    if (cellsToConvert > 0) {
        // Find all permanent stone cells (not temporary platforms)
        const stonePositions = [];
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                if (gridCells[i][j] === 'stone') {
                    stonePositions.push({row: i, col: j});
                }
            }
        }
        
        // Randomly select cells to convert
        for (let i = 0; i < cellsToConvert; i++) {
            if (stonePositions.length === 0) break;
            
            const randomIndex = Math.floor(Math.random() * stonePositions.length);
            const selected = stonePositions[randomIndex];
            
            // Convert to lava
            gridCells[selected.row][selected.col] = 'lava';
            console.log(`Rising lava converted [${selected.row},${selected.col}] from stone to lava`);
            
            // Remove this position from the array
            stonePositions.splice(randomIndex, 1);
        }
        
        // Increase difficulty level for next time
        difficultyLevel++;
        console.log(`Difficulty increased to level ${difficultyLevel}`);
        
        // Adjust platform spawn rate based on difficulty
        platformInterval = Math.max(1000, 3000 - (difficultyLevel * 300));
    }
}

// Draw the lava grid
function drawLavaGrid() {
    // If we don't have 4 corner points yet, don't draw the grid
    if (cornerPoints.length < 4) {
        console.log('Not drawing grid - missing corner points');
        return;
    }
    
    console.log('Drawing grid with corner points:', cornerPoints);
    
    // Draw the grid cells
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            drawGridCell(i, j);
        }
    }
    
    // Draw grid lines
    drawGridLines();
    
    // Add lava bubbles for effect
    drawLavaBubbles();
}

// Linear interpolation helper function
function lerp(p1, p2, t) {
    return {
        x: p1.x * (1 - t) + p2.x * t,
        y: p1.y * (1 - t) + p2.y * t
    };
}

// Draw a single grid cell
function drawGridCell(row, col) {
    // Calculate the four corners of this grid cell using bilinear interpolation
    const cellCorners = getGridCellCorners(row, col);
    
    // Un-mirror the corners for display
    const displayCorners = cellCorners.map(corner => ({
        x: mirrorX(corner.x),
        y: corner.y
    }));
    
    // Set fill style based on cell type
    if (gridCells[row][col] === 'lava') {
        // Create lava gradient
        const gradient = ctx.createLinearGradient(
            displayCorners[0].x, displayCorners[0].y, 
            displayCorners[2].x, displayCorners[2].y
        );
        gradient.addColorStop(0, 'rgba(255, 87, 34, 0.7)');
        gradient.addColorStop(1, 'rgba(255, 193, 7, 0.9)');
        ctx.fillStyle = gradient;
    } else if (gridCells[row][col] === 'stone') {
        // Permanent stone texture
        const gradient = ctx.createLinearGradient(
            displayCorners[0].x, displayCorners[0].y, 
            displayCorners[2].x, displayCorners[2].y
        );
        gradient.addColorStop(0, 'rgba(120, 120, 120, 0.8)');
        gradient.addColorStop(0.5, 'rgba(150, 150, 150, 0.8)');
        gradient.addColorStop(1, 'rgba(100, 100, 100, 0.8)');
        ctx.fillStyle = gradient;
    } else if (gridCells[row][col] === 'stone-temp') {
        // Temporary stone platform with a different color
        const gradient = ctx.createLinearGradient(
            displayCorners[0].x, displayCorners[0].y, 
            displayCorners[2].x, displayCorners[2].y
        );
        gradient.addColorStop(0, 'rgba(0, 200, 83, 0.8)');  // Green tint for temporary platforms
        gradient.addColorStop(0.5, 'rgba(76, 175, 80, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 150, 136, 0.8)');
        ctx.fillStyle = gradient;
    }
    
    // Draw the cell
    ctx.beginPath();
    ctx.moveTo(displayCorners[0].x, displayCorners[0].y);
    ctx.lineTo(displayCorners[1].x, displayCorners[1].y);
    ctx.lineTo(displayCorners[2].x, displayCorners[2].y);
    ctx.lineTo(displayCorners[3].x, displayCorners[3].y);
    ctx.closePath();
    ctx.fill();
    
    // Draw timer for temporary platforms
    if (gridCells[row][col] === 'stone-temp' && gridTimers[row][col] > 0) {
        drawPlatformTimer(displayCorners, gridTimers[row][col]);
    }
}

// Draw a timer indicator for temporary platforms
function drawPlatformTimer(corners, expiryTime) {
    const now = Date.now();
    const timeLeft = Math.max(0, expiryTime - now);
    const progress = timeLeft / platformDuration; // 0 to 1 value
    
    // Calculate center of the cell
    const centerX = (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4;
    const centerY = (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4;
    
    // Calculate radius (half the smaller dimension of the cell)
    const width = Math.max(
        Math.abs(corners[0].x - corners[1].x),
        Math.abs(corners[2].x - corners[3].x)
    );
    const height = Math.max(
        Math.abs(corners[0].y - corners[3].y),
        Math.abs(corners[1].y - corners[2].y)
    );
    const radius = Math.min(width, height) * 0.3;
    
    // Draw timer circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();
    
    // Draw progress arc (countdown)
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * progress));
    ctx.lineTo(centerX, centerY);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();
    
    // Draw seconds left as text
    const secondsLeft = Math.ceil(timeLeft / 1000);
    ctx.fillStyle = 'black';
    ctx.font = `${radius * 0.8}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(secondsLeft, centerX, centerY);
}

// Get the four corners of a grid cell using bilinear interpolation
function getGridCellCorners(row, col) {
    const tl = cornerPoints[0]; // top-left
    const tr = cornerPoints[1]; // top-right
    const br = cornerPoints[2]; // bottom-right
    const bl = cornerPoints[3]; // bottom-left
    
    // Calculate normalized coordinates (0 to 1)
    const rowT = row / gridSize;
    const rowB = (row + 1) / gridSize;
    const colL = col / gridSize;
    const colR = (col + 1) / gridSize;
    
    // Interpolate to get the four corners of this cell
    const topLeft = lerp(lerp(tl, bl, rowT), lerp(tr, br, rowT), colL);
    const topRight = lerp(lerp(tl, bl, rowT), lerp(tr, br, rowT), colR);
    const bottomRight = lerp(lerp(tl, bl, rowB), lerp(tr, br, rowB), colR);
    const bottomLeft = lerp(lerp(tl, bl, rowB), lerp(tr, br, rowB), colL);
    
    return [topLeft, topRight, bottomRight, bottomLeft];
}

// Draw grid lines
function drawGridLines() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    
    // Draw horizontal grid lines
    for (let i = 0; i <= gridSize; i++) {
        const t = i / gridSize;
        const left = lerp(lerp(cornerPoints[0], cornerPoints[3], t), lerp(cornerPoints[1], cornerPoints[2], t), 0);
        const right = lerp(lerp(cornerPoints[0], cornerPoints[3], t), lerp(cornerPoints[1], cornerPoints[2], t), 1);
        
        // Un-mirror the points for display
        const displayLeft = { x: mirrorX(left.x), y: left.y };
        const displayRight = { x: mirrorX(right.x), y: right.y };
        
        ctx.beginPath();
        ctx.moveTo(displayLeft.x, displayLeft.y);
        ctx.lineTo(displayRight.x, displayRight.y);
        ctx.stroke();
    }
    
    // Draw vertical grid lines
    for (let j = 0; j <= gridSize; j++) {
        const t = j / gridSize;
        const top = lerp(lerp(cornerPoints[0], cornerPoints[1], t), lerp(cornerPoints[3], cornerPoints[2], t), 0);
        const bottom = lerp(lerp(cornerPoints[0], cornerPoints[1], t), lerp(cornerPoints[3], cornerPoints[2], t), 1);
        
        // Un-mirror the points for display
        const displayTop = { x: mirrorX(top.x), y: top.y };
        const displayBottom = { x: mirrorX(bottom.x), y: bottom.y };
        
        ctx.beginPath();
        ctx.moveTo(displayTop.x, displayTop.y);
        ctx.lineTo(displayBottom.x, displayBottom.y);
        ctx.stroke();
    }
}

// Draw bubbles in the lava for visual effect
function drawLavaBubbles() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    
    // Create random bubbles
    const time = Date.now() / 1000;
    for (let i = 0; i < 15; i++) {
        // Interpolate bubble position within the grid
        const tx = (Math.sin(time * (i * 0.1) + i) + 1) / 2; // 0 to 1
        const ty = (Math.cos(time * 0.2 + i) + 1) / 2; // 0 to 1
        
        const bubblePos = bilinearInterpolation(tx, ty);
        const size = Math.sin(time * 0.1 + i) * 5 + 5;
        
        ctx.beginPath();
        ctx.arc(bubblePos.x, bubblePos.y, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Bilinear interpolation to find a point within the grid
function bilinearInterpolation(tx, ty) {
    const tl = cornerPoints[0]; // top-left
    const tr = cornerPoints[1]; // top-right
    const br = cornerPoints[2]; // bottom-right
    const bl = cornerPoints[3]; // bottom-left
    
    // Interpolate along top and bottom edges
    const top = lerp(tl, tr, tx);
    const bottom = lerp(bl, br, tx);
    
    // Interpolate between top and bottom
    return lerp(top, bottom, ty);
}

// Check if a point is inside a lava cell
function isPointInLava(point) {
    // If we don't have a calibrated grid yet, use the old method
    if (cornerPoints.length < 4) {
        return false;
    }
    
    // Find which grid cell contains the point
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (isPointInCell(point, i, j)) {
                return gridCells[i][j] === 'lava';
            }
        }
    }
    
    // If point is outside the grid, it's not in lava
    return false;
}

// Check if a point is on stone
function isPointOnStone(point) {
    // If we don't have a calibrated grid yet, return false
    if (cornerPoints.length < 4) {
        return false;
    }
    
    // Find which grid cell contains the point
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (isPointInCell(point, i, j)) {
                return gridCells[i][j] === 'stone';
            }
        }
    }
    
    // If point is outside the grid, it's not on stone
    return false;
}

// Check if a point is inside a specific grid cell
function isPointInCell(point, row, col) {
    const corners = getGridCellCorners(row, col);
    return isPointInPolygon(point, corners);
}

// Check if a point is inside a polygon
function isPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        
        const intersect = ((yi > point.y) !== (yj > point.y)) &&
            (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Update timer and score
function updateTimerAndScore() {
    if (!gameActive || gameOver) return;
    
    // Update timer
    timer = Math.floor((Date.now() - startTime) / 1000);
    timerDisplay.textContent = `Time: ${timer}s`;
    
    // Update score (based on survival time)
    score = timer * 10; // 10 points per second
    scoreDisplay.textContent = `Score: ${score}`;
}

// End the game
function endGame() {
    gameActive = false;
    gameOver = true;
    currentState = GAME_STATE.GAME_OVER;
    
    // Cancel animation frame
    cancelAnimationFrame(animationFrameId);
    
    // Update UI
    gameStatus.textContent = `Game Over! You survived for ${timer} seconds.`;
    restartButton.style.display = 'block';
    
    // Draw game over overlay
    drawGameOverOverlay();
}

// Draw game over overlay
function drawGameOverOverlay() {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Game over text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);
    
    // Score text
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText(`You survived for ${timer} seconds`, canvas.width / 2, canvas.height / 2 + 50);
}

// Restart the game
function restartGame() {
    // If we already have calibration points, skip calibration and start the game directly
    if (cornerPoints.length === 4) {
        startGame();
    } else {
        // Otherwise, start with calibration
        startCalibration();
    }
}

// Toggle fullscreen mode
function toggleFullscreen() {
    if (!isFullscreen) {
        // Enter fullscreen
        if (gameContainer.requestFullscreen) {
            gameContainer.requestFullscreen();
        } else if (gameContainer.webkitRequestFullscreen) { /* Safari */
            gameContainer.webkitRequestFullscreen();
        } else if (gameContainer.msRequestFullscreen) { /* IE11 */
            gameContainer.msRequestFullscreen();
        } else if (gameContainer.mozRequestFullScreen) { /* Firefox */
            gameContainer.mozRequestFullScreen();
        }
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { /* Safari */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE11 */
            document.msExitFullscreen();
        } else if (document.mozCancelFullScreen) { /* Firefox */
            document.mozCancelFullScreen();
        }
    }
}

// Handle fullscreen change events
function handleFullscreenChange() {
    // Check if we're in fullscreen mode
    isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || 
                    document.mozFullScreenElement || document.msFullscreenElement);
    
    // Update UI
    if (isFullscreen) {
        gameContainer.classList.add('fullscreen');
        fullscreenButton.innerHTML = '<i class="fullscreen-icon"></i>Exit Fullscreen';
    } else {
        gameContainer.classList.remove('fullscreen');
        fullscreenButton.innerHTML = '<i class="fullscreen-icon"></i>Fullscreen';
    }
    
    // Resize canvas to match new dimensions
    resizeCanvasToVideo();
    
    // If we have corner points, we need to redraw the grid
    if (cornerPoints.length === 4) {
        if (currentState === GAME_STATE.CALIBRATION) {
            drawCornerPoints();
        } else if (currentState === GAME_STATE.PLAYING) {
            drawLavaGrid();
        }
    }
}

// Detect pose from video feed
async function detectPose() {
    if (!detector || !video.readyState) return;
    
    try {
        // Run pose detection
        const poses = await detector.estimatePoses(video);
        
        if (poses && poses.length > 0) {
            // Store the most recent pose
            const pose = poses[0];
            
            // Mirror the keypoints to match our mirrored display
            // Note: TensorFlow.js is already detecting on the mirrored video feed,
            // but we need to make sure the coordinates match our canvas
            if (pose.keypoints) {
                // No need to modify keypoints as the canvas context is already mirrored
                // and the video feed is mirrored with CSS
            }
            
            lastPose = pose;
        }
    } catch (error) {
        console.error('Error detecting pose:', error);
    }
}

// Draw pose keypoints for debugging
function drawPoseKeypoints() {
    if (!lastPose || !lastPose.keypoints) return;
    
    // Draw all keypoints
    ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
    
    for (const keypoint of lastPose.keypoints) {
        // Only draw keypoints with reasonable confidence
        if (keypoint.score > 0.3) {
            // Mirror the x-coordinate for display
            const displayX = mirrorX(keypoint.x);
            const y = keypoint.y;
            
            // Draw circle at keypoint
            ctx.beginPath();
            ctx.arc(displayX, y, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw keypoint name - note that in mirrored view, left and right are flipped visually
            // but the keypoint names are still correct anatomically
            if (keypoint.name === 'left_ankle' || keypoint.name === 'right_ankle') {
                ctx.fillStyle = 'white';
                ctx.font = '12px Arial';
                ctx.fillText(keypoint.name, displayX + 10, y);
                ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
            }
        }
    }
    
    // Draw estimated foot positions
    drawEstimatedFeet();
    
    // Connect keypoints to form a skeleton (simplified)
    drawSkeleton();
}

// Draw estimated foot positions
function drawEstimatedFeet() {
    // Get ankle and knee keypoints
    const leftAnkle = lastPose.keypoints.find(kp => kp.name === 'left_ankle');
    const rightAnkle = lastPose.keypoints.find(kp => kp.name === 'right_ankle');
    const leftKnee = lastPose.keypoints.find(kp => kp.name === 'left_knee');
    const rightKnee = lastPose.keypoints.find(kp => kp.name === 'right_knee');
    
    // Estimate foot positions
    const leftFoot = estimateFootPosition(leftKnee, leftAnkle);
    const rightFoot = estimateFootPosition(rightKnee, rightAnkle);
    
    // Draw left foot
    if (leftFoot && leftAnkle && leftAnkle.score > 0.5) {
        const displayX = mirrorX(leftFoot.x);
        const y = leftFoot.y;
        
        // Draw foot point (larger than regular keypoints)
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.beginPath();
        ctx.arc(displayX, y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw line from ankle to foot
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(mirrorX(leftAnkle.x), leftAnkle.y);
        ctx.lineTo(displayX, y);
        ctx.stroke();
        
        // Label the foot
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText('LEFT FOOT', displayX + 10, y);
    }
    
    // Draw right foot
    if (rightFoot && rightAnkle && rightAnkle.score > 0.5) {
        const displayX = mirrorX(rightFoot.x);
        const y = rightFoot.y;
        
        // Draw foot point (larger than regular keypoints)
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.beginPath();
        ctx.arc(displayX, y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw line from ankle to foot
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(mirrorX(rightAnkle.x), rightAnkle.y);
        ctx.lineTo(displayX, y);
        ctx.stroke();
        
        // Label the foot
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText('RIGHT FOOT', displayX + 10, y);
    }
}

// Draw skeleton connecting keypoints
function drawSkeleton() {
    if (!lastPose || !lastPose.keypoints) return;
    
    // Define connections between keypoints for a simplified skeleton
    const connections = [
        ['nose', 'left_eye'], ['nose', 'right_eye'],
        ['left_eye', 'left_ear'], ['right_eye', 'right_ear'],
        ['nose', 'left_shoulder'], ['nose', 'right_shoulder'],
        ['left_shoulder', 'left_elbow'], ['right_shoulder', 'right_elbow'],
        ['left_elbow', 'left_wrist'], ['right_elbow', 'right_wrist'],
        ['left_shoulder', 'right_shoulder'],
        ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
        ['left_hip', 'right_hip'],
        ['left_hip', 'left_knee'], ['right_hip', 'right_knee'],
        ['left_knee', 'left_ankle'], ['right_knee', 'right_ankle']
    ];
    
    // Create a map of keypoints by name for easy lookup
    const keypointMap = {};
    for (const keypoint of lastPose.keypoints) {
        keypointMap[keypoint.name] = keypoint;
    }
    
    // Draw connections
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
    ctx.lineWidth = 2;
    
    for (const [from, to] of connections) {
        const fromKeypoint = keypointMap[from];
        const toKeypoint = keypointMap[to];
        
        if (fromKeypoint && toKeypoint && fromKeypoint.score > 0.3 && toKeypoint.score > 0.3) {
            // Mirror the x-coordinates for display
            const fromX = mirrorX(fromKeypoint.x);
            const fromY = fromKeypoint.y;
            const toX = mirrorX(toKeypoint.x);
            const toY = toKeypoint.y;
            
            ctx.beginPath();
            ctx.moveTo(fromX, fromY);
            ctx.lineTo(toX, toY);
            ctx.stroke();
        }
    }
}

// Check if feet are in lava
function checkFootLavaCollision() {
    if (!lastPose || !lastPose.keypoints) return;
    
    // Get ankle and knee keypoints
    const leftAnkle = lastPose.keypoints.find(kp => kp.name === 'left_ankle');
    const rightAnkle = lastPose.keypoints.find(kp => kp.name === 'right_ankle');
    const leftKnee = lastPose.keypoints.find(kp => kp.name === 'left_knee');
    const rightKnee = lastPose.keypoints.find(kp => kp.name === 'right_knee');
    
    // Estimate foot positions by extending from ankles in the direction from knee to ankle
    const leftFoot = estimateFootPosition(leftKnee, leftAnkle);
    const rightFoot = estimateFootPosition(rightKnee, rightAnkle);
    
    // Check if feet are detected with good confidence
    if (leftFoot && leftAnkle && leftAnkle.score > 0.5) {
        // Map foot position to grid
        if (isPointInLava(leftFoot)) {
            console.log('Left foot in lava!');
            endGame();
            return;
        }
    }
    
    if (rightFoot && rightAnkle && rightAnkle.score > 0.5) {
        // Map foot position to grid
        if (isPointInLava(rightFoot)) {
            console.log('Right foot in lava!');
            endGame();
            return;
        }
    }
}

// Estimate foot position by extending from ankle in the direction from knee to ankle
function estimateFootPosition(knee, ankle) {
    if (!ankle || ankle.score < 0.5) return null;
    
    // If knee is not detected with good confidence, just extend downward from ankle
    if (!knee || knee.score < 0.3) {
        return {
            x: ankle.x,
            y: ankle.y + 15 // Extend 15 pixels down from ankle
        };
    }
    
    // Calculate direction vector from knee to ankle
    const dx = ankle.x - knee.x;
    const dy = ankle.y - knee.y;
    
    // Normalize the vector
    const length = Math.sqrt(dx * dx + dy * dy);
    const normalizedDx = dx / length;
    const normalizedDy = dy / length;
    
    // Extend from ankle by 20% of knee-to-ankle distance
    const footExtension = length * 0.2;
    
    return {
        x: ankle.x + normalizedDx * footExtension,
        y: ankle.y + normalizedDy * footExtension
    };
}

// Helper function to check if a keypoint is in lava
function isKeypointInLava(keypoint) {
    if (!keypoint || keypoint.score < 0.5) return false;
    
    // Create a point object from the keypoint coordinates
    const point = {x: keypoint.x, y: keypoint.y};
    
    // Find which grid cell contains the point
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (isPointInCell(point, i, j)) {
                return gridCells[i][j] === 'lava';
            }
        }
    }
    
    // If point is outside the grid, it's not in lava
    return false;
}
