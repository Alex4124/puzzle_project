import { GameApplication } from './GameApplication';

/**
 * Точка входа в приложение
 */
async function main() {
  try {
    console.log('🎮 Starting Magic Jigsaw Playable...');
    
    const game = new GameApplication();
    await game.init();
    
    console.log('✅ Game initialized successfully!');
    console.log('📱 Responsive design enabled');
    console.log('🎨 MVC architecture ready');
  } catch (error) {
    console.error('❌ Failed to initialize game:', error);
  }
}

// Запускаем игру
main();
