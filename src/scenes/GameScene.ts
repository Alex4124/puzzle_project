import { Graphics, Text, TextStyle } from 'pixi.js';
import { Scene } from './Scene';
import { GameDimensions } from '@utils/ResponsiveManager';
import { GameConfig } from '@models/GameConfig';

/**
 * Игровая сцена
 * TODO: Реализовать игровую логику пазла
 */
export class GameScene extends Scene {
  private background!: Graphics;
  private placeholderText!: Text;

  constructor() {
    super();
  }

  public async init(): Promise<void> {
    this.createBackground();
    this.createPlaceholder();
    this.resize(this.dimensions);
  }

  private createBackground(): void {
    this.background = new Graphics();
    this.background.beginFill(GameConfig.BACKGROUND_COLOR);
    this.background.drawRect(0, 0, 100, 100);
    this.background.endFill();
    this.addChild(this.background);
  }

  private createPlaceholder(): void {
    const style = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 48,
      fontWeight: 'bold',
      fill: GameConfig.PRIMARY_COLOR,
      align: 'center',
    });

    this.placeholderText = new Text('Game Scene\n(To be implemented)', style);
    this.placeholderText.anchor.set(0.5);
    this.addChild(this.placeholderText);
  }

  protected onResize(dimensions: GameDimensions): void {
    const { width, height } = dimensions;

    this.background.clear();
    this.background.beginFill(GameConfig.BACKGROUND_COLOR);
    this.background.drawRect(0, 0, width, height);
    this.background.endFill();

    this.placeholderText.position.set(width / 2, height / 2);
  }
}
