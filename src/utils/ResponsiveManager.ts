import { Application } from 'pixi.js';

export interface GameDimensions {
  width: number;
  height: number;
  scale: number;
  isPortrait: boolean;
}

export class ResponsiveManager {
  private app: Application;
  private designWidth = 1080;
  private designHeight = 1920;
  private onResizeCallback?: (dimensions: GameDimensions) => void;

  constructor(app: Application) {
    this.app = app;
    this.setupResize();
  }

  /**
   * Настройка автоматического ресайза при изменении размера окна/ориентации
   */
  private setupResize(): void {
    window.addEventListener('resize', () => this.handleResize());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.handleResize(), 100);
    });
    
    // Первоначальный ресайз
    this.handleResize();
  }

  /**
   * Обработка изменения размера экрана
   */
  private handleResize(): void {
    const dimensions = this.calculateDimensions();
    
    // Обновляем размеры canvas
    this.app.renderer.resize(dimensions.width, dimensions.height);
    
    // Вызываем callback если он установлен
    if (this.onResizeCallback) {
      this.onResizeCallback(dimensions);
    }
  }

  /**
   * Расчет размеров игрового поля с учетом адаптивности
   */
  public calculateDimensions(): GameDimensions {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const isPortrait = windowHeight > windowWidth;

    // Определяем целевые размеры в зависимости от ориентации
    let targetWidth = isPortrait ? this.designWidth : this.designHeight;
    let targetHeight = isPortrait ? this.designHeight : this.designWidth;

    // Вычисляем масштаб с учетом соотношения сторон
    const scaleX = windowWidth / targetWidth;
    const scaleY = windowHeight / targetHeight;
    const scale = Math.min(scaleX, scaleY);

    return {
      width: windowWidth,
      height: windowHeight,
      scale,
      isPortrait,
    };
  }

  /**
   * Установить callback для обработки изменения размеров
   */
  public onResize(callback: (dimensions: GameDimensions) => void): void {
    this.onResizeCallback = callback;
    // Сразу вызываем callback с текущими размерами
    callback(this.calculateDimensions());
  }

  /**
   * Получить текущие размеры
   */
  public getDimensions(): GameDimensions {
    return this.calculateDimensions();
  }

  /**
   * Установить дизайнерские размеры (базовое разрешение)
   */
  public setDesignDimensions(width: number, height: number): void {
    this.designWidth = width;
    this.designHeight = height;
    this.handleResize();
  }
}
