# Floor is Lava - Webcam Browser Game

## 1. Game Concept

"Floor is Lava" is an augmented reality browser game that uses a player's webcam to project the game environment onto their real-world surroundings. The core premise is simple: the floor is lava! Players must avoid touching the "lava" floor, which will be visually represented on their screen, by physically moving and finding "safe" objects or areas in their room.

## 2. Gameplay Mechanics

### 2.1. Webcam Integration & Environment Mapping:
    *   The game will access the player's webcam feed.
    *   It will attempt to identify a general "floor" area within the webcam's view. This might be a simplified detection (e.g., the lower portion of the screen) or a more advanced (and complex) computer vision approach if feasible.
    *   The "lava" effect will be overlaid onto this identified floor area.

### 2.2. Player Movement & Detection:
    *   The game will track the player's movement through the webcam.
    *   It will detect if the player's representation on screen (e.g., their feet or lower body) comes into contact with the "lava" area.

### 2.3. Safe Zones (Optional but Recommended):
    *   **Pre-defined:** Players could designate certain colored objects (e.g., a blue mat, a green pillow) as "safe zones" before the game starts. The game would then try to recognize these colors as safe.
    *   **Dynamic:** The game could randomly generate small "safe platforms" that appear and disappear on the "lava" floor, requiring players to move to them.

### 2.4. "Lava" Behavior:
    *   The lava is a constant threat.
    *   Optionally, the lava level could slowly rise over time, reducing the available safe space and increasing difficulty.

### 2.5. Scoring & Objectives:
    *   **Survival Time:** The primary objective is to survive as long as possible without touching the lava.
    *   **Points:** Points could be awarded for time survived. If dynamic safe zones are implemented, points could also be awarded for reaching them.
    *   **Challenges/Levels (Optional):** Introduce different difficulty levels, perhaps with faster lava, fewer safe zones, or specific movement challenges.

## 3. Game Flow

### 3.1. Setup & Calibration:
    *   Player grants webcam access.
    *   Brief calibration phase where the game attempts to identify the floor or the player can help define it.
    *   (If applicable) Player designates safe zone colors/objects.

### 3.2. Game Start:
    *   A countdown timer initiates the game.
    *   The "lava" appears on the floor.

### 3.3. Gameplay:
    *   Player physically moves to avoid the on-screen lava.
    *   Player utilizes any available safe zones.
    *   Timer/score updates in real-time.

### 3.4. Game Over:
    *   Occurs when the player is detected touching the lava.
    *   Displays final score and survival time.
    *   Option to restart the game.

## 4. Technical Considerations (Brief Overview)

*   **Browser Technologies:** HTML, CSS, JavaScript.
*   **Webcam Access:** WebRTC API (getUserMedia).
*   **Graphics/Overlay:** HTML5 Canvas or a JavaScript graphics library (e.g., p5.js, PixiJS) for drawing the lava and other game elements over the webcam feed.
*   **Motion/Object Detection (Complexity Varies):**
    *   **Simple:** Basic color detection for safe zones, or dividing the screen into "floor" and "non-floor" areas.
    *   **Advanced:** Libraries like TensorFlow.js with pre-trained models (e.g., for body part detection like PoseNet) could offer more robust player tracking and floor interaction but would significantly increase development complexity.
 