# Floor is Lava - Webcam Browser Game

An augmented reality browser game where the floor is literally lava! Use your webcam to play this fun physical game where you need to avoid touching the virtual lava.

## How to Play

1. **Setup**: Allow webcam access when prompted by your browser
2. **Start**: Click the "Start Game" button
3. **Play**: Physically move to avoid the lava (bottom portion of the screen)
4. **Score**: Your score increases the longer you survive
5. **Game Over**: Triggered when you touch the lava (currently simulated by clicking in the lava area)

## Features

- Real-time webcam integration
- Visual lava effect at the bottom of the screen
- Timer and score tracking
- Simple game state management (start, play, game over)

## Current Implementation

This is a basic implementation with the following features:

- The lava occupies the bottom 30% of the screen
- Game over is currently triggered by clicking in the lava area (simulating player detection)
- Score increases based on survival time

## Future Enhancements

- Implement actual player detection using color tracking or TensorFlow.js
- Add dynamic safe zones that appear and disappear
- Improve visual effects and animations
- Add sound effects
- Implement difficulty levels (rising lava)

## Running the Game

1. Open `index.html` in a modern web browser
2. Allow webcam access when prompted
3. Click "Start Game" to begin playing

## Browser Compatibility

This game works best in modern browsers with webcam support:
- Chrome
- Firefox
- Edge
- Safari (recent versions)

## Privacy Note

This game uses your webcam feed, but all processing happens locally in your browser. No video data is sent to any server.
