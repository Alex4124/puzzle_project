import { Container } from 'pixi.js';
import { GameDimensions } from '@utils/ResponsiveManager';

export abstract class Scene extends Container {
  protected dimensions: GameDimensions;

  constructor() {
    super();
    this.dimensions = {
      width: window.innerWidth,
      height: window.innerHeight,
      scale: 1,
      isPortrait: true,
    };
  }

  /**
   * Инициализация сцены - вызывается один раз при создании
   */
  public abstract init(): Promise<void>;

  /**
   * Метод вызывается при показе сцены
   */
  public show(): void {
    this.visible = true;
  }

  /**
   * Метод вызывается при скрытии сцены
   */
  public hide(): void {
    this.visible = false;
  }

  /**
   * Обновление размеров при изменении экрана
   */
  public resize(dimensions: GameDimensions): void {
    this.dimensions = dimensions;
    this.onResize(dimensions);
  }

  /**
   * Переопределите этот метод для обработки изменения размеров
   */
  protected abstract onResize(dimensions: GameDimensions): void;

  /**
   * Обновление логики сцены (вызывается каждый кадр)
   */
  public update(deltaTime: number): void {
    this.onUpdate(deltaTime);
  }

  /**
   * Переопределите этот метод для обновления логики
   */
  protected onUpdate(deltaTime: number): void {
    // По умолчанию ничего не делаем
  }

  /**
   * Очистка ресурсов сцены
   */
  public dispose(): void {
    this.removeAllListeners();
    this.removeChildren();
    this.destroy();
  }
}
