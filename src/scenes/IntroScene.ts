import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { Scene } from './Scene';
import { GameDimensions } from '@utils/ResponsiveManager';
import { AssetManager } from '@utils/AssetManager';
import { GameConfig } from '@models/GameConfig';
import { ButtonController } from '@controllers/ButtonController';
import { SceneManager } from './SceneManager';

export class IntroScene extends Scene {
  private background!: Graphics;
  private logo!: Sprite;
  private titleText!: Text;
  private startButton!: Container;
  private buttonController!: ButtonController;
  private startButtonBaseWidth = 1;
  private startButtonBaseHeight = 1;
  private readonly START_BUTTON_MAX_WIDTH = 400;
  private readonly START_BUTTON_MAX_HEIGHT = 170;

  constructor() {
    super();
  }

  public async init(): Promise<void> {
    this.createBackground();
    this.createLogo();
    this.createTitle();
    this.createStartButton();

    // Применяем начальные размеры
    this.resize(this.dimensions);
  }

  /**
   * Создание фона
   */
  private createBackground(): void {
    this.background = new Graphics();
    this.background.beginFill(GameConfig.BACKGROUND_COLOR);
    this.background.drawRect(0, 0, 100, 100);
    this.background.endFill();
    this.addChild(this.background);
  }

  /**
   * Создание логотипа
   * Если у вас есть изображение логотипа - замените Graphics на Sprite
   */
  private createLogo(): void {
    const assetManager = AssetManager.getInstance();

    // Проверяем, загружен ли ассет логотипа
    if (assetManager.hasAsset(GameConfig.ASSET_LOGO)) {
      const texture = assetManager.getAsset<Texture>(GameConfig.ASSET_LOGO);
      this.logo = new Sprite(texture);
    } else {
      // Временный placeholder если нет ассета
      this.logo = this.createLogoPlaceholder();
    }

    this.logo.anchor.set(0, 0);
    this.addChild(this.logo);
  }

  /**
   * Создание временного placeholder'а для логотипа
   */
  private createLogoPlaceholder(): Sprite {
    const graphics = new Graphics();
    
    // Внешняя синяя область
    graphics.beginFill(0x1E88E5);
    graphics.drawRoundedRect(0, 0, 200, 80, 15);
    graphics.endFill();

    // Оранжевая деталь пазла слева
    graphics.beginFill(0xFF9800);
    graphics.moveTo(20, 20);
    graphics.lineTo(50, 20);
    graphics.lineTo(55, 15);
    graphics.lineTo(60, 20);
    graphics.lineTo(60, 50);
    graphics.lineTo(55, 55);
    graphics.lineTo(50, 50);
    graphics.lineTo(20, 50);
    graphics.lineTo(20, 20);
    graphics.endFill();

    // Текст "MAGIC JIGSAW PUZZLES"
    const style = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 16,
      fontWeight: 'bold',
      fill: 0xFFFFFF,
    });
    const text = new Text('MAGIC\nJIGSAW\nPUZZLES', style);
    text.position.set(75, 15);

    const container = new Container();
    container.addChild(graphics, text);

    // Конвертируем в текстуру для использования как Sprite
    const texture = this.app.renderer.generateTexture(container);
    return new Sprite(texture);
  }

  /**
   * Создание заголовка "Solve the puzzle"
   */
  private createTitle(): void {
    const style = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 80,
      fontWeight: 'bold',
      fill: GameConfig.PRIMARY_COLOR,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 900,
    });

    this.titleText = new Text('Solve the puzzle', style);
    this.titleText.anchor.set(0.5);
    this.addChild(this.titleText);
  }

  /**
   * Создание кнопки Start
   */
  private createStartButton(): void {
    this.startButton = new Container();

    const assetManager = AssetManager.getInstance();

    // Проверяем, загружен ли ассет кнопки
    if (assetManager.hasAsset(GameConfig.ASSET_START_BUTTON)) {
      const texture = assetManager.getAsset<Texture>(GameConfig.ASSET_START_BUTTON);
      const buttonSprite = new Sprite(texture);
      buttonSprite.anchor.set(0.5);
      this.startButtonBaseWidth = buttonSprite.width || 1;
      this.startButtonBaseHeight = buttonSprite.height || 1;
      this.startButton.addChild(buttonSprite);
    } else {
      // Создаём placeholder кнопки
      const button = this.createButtonPlaceholder();
      const bounds = button.getLocalBounds();
      this.startButtonBaseWidth = bounds.width || 1;
      this.startButtonBaseHeight = bounds.height || 1;
      this.startButton.addChild(button);
    }

    this.addChild(this.startButton);

    // Добавляем интерактивность к кнопке
    this.buttonController = new ButtonController(this.startButton, {
      onPress: this.onStartButtonPress.bind(this),
      enablePulse: true,
      scale: 1,
    });
  }

  private calculateStartButtonScale(dimensions: GameDimensions): number {
    const responsiveScale = Math.min(dimensions.width / 1080, dimensions.height / 1920);
    const widthLimit = this.startButtonBaseWidth > 0
      ? this.START_BUTTON_MAX_WIDTH / this.startButtonBaseWidth
      : Number.POSITIVE_INFINITY;
    const heightLimit = this.startButtonBaseHeight > 0
      ? this.START_BUTTON_MAX_HEIGHT / this.startButtonBaseHeight
      : Number.POSITIVE_INFINITY;

    return Math.min(responsiveScale, widthLimit, heightLimit);
  }

  /**
   * Создание placeholder'а кнопки
   */
  private createButtonPlaceholder(): Container {
    const container = new Container();

    // Зелёная кнопка с тенью
    const shadow = new Graphics();
    shadow.beginFill(0x2D7A2D, 0.5);
    shadow.drawRoundedRect(-150, -45, 300, 90, 25);
    shadow.endFill();
    shadow.position.set(0, 5);

    const button = new Graphics();
    button.beginFill(0x4CAF50);
    button.drawRoundedRect(-150, -50, 300, 90, 25);
    button.endFill();

    // Текст "Start"
    const style = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 48,
      fontWeight: 'bold',
      fill: 0xFFFFFF,
    });
    const text = new Text('Start', style);
    text.anchor.set(0.5);

    container.addChild(shadow, button, text);
    return container;
  }

  /**
   * Обработчик нажатия на кнопку Start
   */
  private onStartButtonPress(): void {
    console.log('Start button pressed!');
    
    // Переход к игровой сцене
    const sceneManager = SceneManager.getInstance();
    sceneManager.switchTo(GameConfig.SCENE_GAME);
  }

  /**
   * Обновление позиций элементов при изменении размера
   */
  protected onResize(dimensions: GameDimensions): void {
    const { width, height } = dimensions;

    // Фон на весь экран
    this.background.clear();
    this.background.beginFill(GameConfig.BACKGROUND_COLOR);
    this.background.drawRect(0, 0, width, height);
    this.background.endFill();

    // Логотип в левом верхнем углу
    const logoScale = Math.min(width / 1080, height / 1920) * 0.8;
    this.logo.scale.set(logoScale);
    this.logo.position.set(0, 20);

    // Заголовок в центре экрана (чуть выше середины)
    const titleScale = Math.min(width / 1080, height / 1920);
    this.titleText.style.fontSize = 80 * titleScale;
    this.titleText.position.set(width / 2, height * 0.35);

    // Кнопка Start в центре (ниже заголовка)
    const buttonScale = this.calculateStartButtonScale(dimensions);
    if (this.buttonController) {
      this.buttonController.setBaseScale(buttonScale);
    } else {
      this.startButton.scale.set(buttonScale);
    }
    this.startButton.position.set(width / 2, height * 0.55);
  }

  /**
   * Очистка ресурсов
   */
  public dispose(): void {
    this.buttonController?.dispose();
    super.dispose();
  }
}
