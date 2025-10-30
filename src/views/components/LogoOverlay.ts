import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { AssetManager } from '@services/AssetManager';
import { GameConfig } from '@models/GameConfig';
import { GameDimensions } from '@services/ResponsiveManager';

/**
 * Постоянный слой с логотипом, располагается поверх всех сцен
 */
export class LogoOverlay extends Container {
  private logoHolder: Container;
  private baseWidth = 1;
  private baseHeight = 1;

  constructor() {
    super();
    this.logoHolder = new Container();
    this.addChild(this.logoHolder);
    this.createLogo();
  }

  /**
   * Создаёт логотип из ассета или placeholder
   */
  private createLogo(): void {
    const assetManager = AssetManager.getInstance();

    if (assetManager.hasAsset(GameConfig.ASSET_LOGO)) {
      const texture = assetManager.getAsset<Texture>(GameConfig.ASSET_LOGO);
      const sprite = new Sprite(texture);
      sprite.anchor.set(0, 0);
      this.logoHolder.addChild(sprite);
      this.baseWidth = sprite.width || 1;
      this.baseHeight = sprite.height || 1;
    } else {
      const placeholder = this.createPlaceholder();
      const bounds = placeholder.getLocalBounds();
      this.baseWidth = bounds.width || 1;
      this.baseHeight = bounds.height || 1;
      this.logoHolder.addChild(placeholder);
    }
  }

  /**
   * Простой placeholder логотипа (как в IntroScene)
   */
  private createPlaceholder(): Container {
    const container = new Container();

    // Синяя подложка
    const background = new Graphics();
    background.beginFill(0x1E88E5);
    background.drawRoundedRect(0, 0, 200, 80, 15);
    background.endFill();

    // Оранжевая деталь пазла слева
    const piece = new Graphics();
    piece.beginFill(0xFF9800);
    piece.moveTo(20, 20);
    piece.lineTo(50, 20);
    piece.lineTo(55, 15);
    piece.lineTo(60, 20);
    piece.lineTo(60, 50);
    piece.lineTo(55, 55);
    piece.lineTo(50, 50);
    piece.lineTo(20, 50);
    piece.lineTo(20, 20);
    piece.endFill();

    // Надпись
    const style = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 16,
      fontWeight: 'bold',
      fill: 0xFFFFFF,
    });
    const text = new Text('MAGIC\nJIGSAW\nPUZZLES', style);
    text.position.set(75, 15);

    container.addChild(background, piece, text);
    return container;
  }

  /**
   * Обновление позиции/масштаба логотипа при ресайзе
   */
  public resize(dimensions: GameDimensions): void {
    const safe = (dimensions as any).safe;
    const width = safe ? safe.width : dimensions.width;
    const height = safe ? safe.height : dimensions.height;
    const offsetX = safe ? safe.x : 0;
    const offsetY = safe ? safe.y : 0;
    const scale = Math.min(width / GameConfig.DESIGN_WIDTH, height / GameConfig.DESIGN_HEIGHT) * 1.2;

    this.logoHolder.scale.set(scale);
    this.position.set(offsetX + 10, offsetY + 10);
  }

  public dispose(): void {
    this.removeAllListeners();
    this.removeChildren();
    this.destroy();
  }
}
