import { Container, FederatedPointerEvent } from 'pixi.js';
import gsap from 'gsap';

export interface ButtonConfig {
  onPress?: () => void;
  scale?: number;
  enableHover?: boolean;
  enablePulse?: boolean;
  pulseFactor?: number; // how strong the pulse is (e.g., 1.3 means +30%)
  pulseDuration?: number; // seconds for one half-cycle
}

/**
 * Контроллер для интерактивных кнопок
 */
export class ButtonController {
  private container: Container;
  private config: ButtonConfig;
  private originalScale: number;
  private pulseAnimation?: gsap.core.Tween;

  constructor(container: Container, config: ButtonConfig = {}) {
    this.container = container;
    this.config = config;
    this.originalScale = config.scale || 1;

    this.setupInteractivity();
  }

  /**
   * Настройка интерактивности кнопки
   */
  private setupInteractivity(): void {
    this.container.eventMode = 'static';
    this.container.cursor = 'pointer';

    // Обработчики событий
    this.container.on('pointerdown', this.onPointerDown.bind(this));
    this.container.on('pointerup', this.onPointerUp.bind(this));
    this.container.on('pointerupoutside', this.onPointerUpOutside.bind(this));

    if (this.config.enableHover) {
      this.container.on('pointerover', this.onPointerOver.bind(this));
      this.container.on('pointerout', this.onPointerOut.bind(this));
    }

    if (this.config.enablePulse) {
      this.startPulse();
    }
  }

  /**
   * Обработчик нажатия
   */
  private onPointerDown(event: FederatedPointerEvent): void {
    gsap.to(this.container.scale, {
      x: this.originalScale * 0.9,
      y: this.originalScale * 0.9,
      duration: 0.1,
      ease: 'power2.out',
    });
  }

  /**
   * Обработчик отпускания
   */
  private onPointerUp(event: FederatedPointerEvent): void {
    gsap.to(this.container.scale, {
      x: this.originalScale,
      y: this.originalScale,
      duration: 0.2,
      ease: 'elastic.out(1, 0.5)',
      onComplete: () => {
        if (this.config.onPress) {
          this.config.onPress();
        }
      },
    });
  }

  /**
   * Обработчик отпускания вне кнопки
   */
  private onPointerUpOutside(): void {
    gsap.to(this.container.scale, {
      x: this.originalScale,
      y: this.originalScale,
      duration: 0.2,
      ease: 'power2.out',
    });
  }

  /**
   * Обработчик наведения
   */
  private onPointerOver(): void {
    gsap.to(this.container.scale, {
      x: this.originalScale * 1.05,
      y: this.originalScale * 1.05,
      duration: 0.3,
      ease: 'power2.out',
    });
  }

  /**
   * Обработчик ухода курсора
   */
  private onPointerOut(): void {
    gsap.to(this.container.scale, {
      x: this.originalScale,
      y: this.originalScale,
      duration: 0.3,
      ease: 'power2.out',
    });
  }

  /**
   * Запуск анимации пульсации
   */
  private startPulse(): void {
    const factor = this.config.pulseFactor ?? 1.1;
    const duration = this.config.pulseDuration ?? 1;
    this.pulseAnimation = gsap.to(this.container.scale, {
      x: this.originalScale * factor,
      y: this.originalScale * factor,
      duration,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    });
  }

  /**
   * Остановка анимации пульсации
   */
  public stopPulse(): void {
    if (this.pulseAnimation) {
      this.pulseAnimation.kill();
      gsap.to(this.container.scale, {
        x: this.originalScale,
        y: this.originalScale,
        duration: 0.3,
      });
    }
  }

  /** Updates the baseline scale used for pointer animations. */
  public setBaseScale(scale: number): void {
    if (Math.abs(this.originalScale - scale) <= 1e-4) {
      this.container.scale.set(scale);
      return;
    }

    if (this.pulseAnimation) {
      this.pulseAnimation.kill();
      this.pulseAnimation = undefined;
    }

    this.originalScale = scale;
    this.config.scale = scale;
    this.container.scale.set(scale);

    if (this.config.enablePulse) {
      this.startPulse();
    }
  }

  /**
   * Уничтожение контроллера
   */
  public dispose(): void {
    this.stopPulse();
    this.container.removeAllListeners();
  }
}
