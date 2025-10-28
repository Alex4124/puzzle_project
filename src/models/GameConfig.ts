/**
 * Конфигурация игры
 */
export class GameConfig {
  // Размеры дизайна
  public static readonly DESIGN_WIDTH = 1080;
  public static readonly DESIGN_HEIGHT = 1920;

  // Цвета
  public static readonly BACKGROUND_COLOR = 0xE8C9A0;
  public static readonly PRIMARY_COLOR = 0x8B4513;

  // Названия сцен
  public static readonly SCENE_INTRO = 'intro';
  public static readonly SCENE_GAME = 'game';
  public static readonly SCENE_PACKSHOT = 'packshot';

  // Названия ассетов (добавьте свои по мере необходимости)
  public static readonly ASSET_BACKGROUND = 'background';
  public static readonly ASSET_LOGO = 'logo';
  public static readonly ASSET_START_BUTTON = 'start_button';
  
  // Puzzle assets
  public static readonly ASSET_PUZZLE_COMPLETE = 'puzzle_complete';
  public static readonly ASSET_PUZZLE_TILE_PREFIX = 'puzzle_tile_';
  
  // Вы можете добавить свои ассеты здесь:
  // public static readonly ASSET_YOUR_IMAGE = 'your_image';
}
