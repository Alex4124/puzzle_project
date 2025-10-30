import { Container, Graphics, Text, TextStyle, Texture, Sprite } from 'pixi.js';
import { Scene } from './Scene';
import { GameDimensions } from '@services/ResponsiveManager';
import { AssetManager } from '@services/AssetManager';
import { GameConfig } from '@models/GameConfig';
import { ButtonController } from '@controllers/ButtonController';
import { SceneManager } from '@services/SceneManager';

export class IntroScene extends Scene {
  private background!: Graphics;
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
    this.createTitle();
    this.createStartButton();
    this.resize(this.dimensions);
  }

  private createBackground(): void {
    this.background = new Graphics();
    this.background.beginFill(GameConfig.BACKGROUND_COLOR);
    this.background.drawRect(0, 0, 100, 100);
    this.background.endFill();
    this.addChild(this.background);
  }

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

  private createStartButton(): void {
    this.startButton = new Container();

    const assetManager = AssetManager.getInstance();
    if (assetManager.hasAsset(GameConfig.ASSET_START_BUTTON)) {
      const texture = assetManager.getAsset<Texture>(GameConfig.ASSET_START_BUTTON);
      const buttonSprite = new Sprite(texture);
      buttonSprite.anchor.set(0.5);
      this.startButtonBaseWidth = buttonSprite.width || 1;
      this.startButtonBaseHeight = buttonSprite.height || 1;
      this.startButton.addChild(buttonSprite);
    } else {
      const button = this.createButtonPlaceholder();
      const bounds = button.getLocalBounds();
      this.startButtonBaseWidth = bounds.width || 1;
      this.startButtonBaseHeight = bounds.height || 1;
      this.startButton.addChild(button);
    }

    this.addChild(this.startButton);

    this.buttonController = new ButtonController(this.startButton, {
      onPress: this.onStartButtonPress.bind(this),
      enablePulse: true,
      scale: 1,
    });
  }

  private calculateStartButtonScale(dimensions: GameDimensions): number {
    const responsiveScale = Math.min(dimensions.width / GameConfig.DESIGN_WIDTH, dimensions.height / GameConfig.DESIGN_HEIGHT);
    const widthLimit = this.startButtonBaseWidth > 0
      ? this.START_BUTTON_MAX_WIDTH / this.startButtonBaseWidth
      : Number.POSITIVE_INFINITY;
    const heightLimit = this.startButtonBaseHeight > 0
      ? this.START_BUTTON_MAX_HEIGHT / this.startButtonBaseHeight
      : Number.POSITIVE_INFINITY;

    return Math.min(responsiveScale, widthLimit, heightLimit);
  }

  private createButtonPlaceholder(): Container {
    const container = new Container();

    const shadow = new Graphics();
    shadow.beginFill(0x2D7A2D, 0.5);
    shadow.drawRoundedRect(-150, -45, 300, 90, 25);
    shadow.endFill();
    shadow.position.set(0, 5);

    const button = new Graphics();
    button.beginFill(0x4CAF50);
    button.drawRoundedRect(-150, -50, 300, 90, 25);
    button.endFill();

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

  private onStartButtonPress(): void {
    const sceneManager = SceneManager.getInstance();
    sceneManager.switchTo(GameConfig.SCENE_GAME);
  }

  protected onResize(dimensions: GameDimensions): void {
    const { width, height, safe } = dimensions;

    // Background covers full viewport
    this.background.clear();
    this.background.beginFill(GameConfig.BACKGROUND_COLOR);
    this.background.drawRect(0, 0, width, height);
    this.background.endFill();

    // Title inside safe area
    const titleScale = Math.min(safe.width / GameConfig.DESIGN_WIDTH, safe.height / GameConfig.DESIGN_HEIGHT);
    this.titleText.style.wordWrapWidth = Math.max(300, Math.floor(safe.width * 0.9));
    this.titleText.style.fontSize = 80 * titleScale;
    this.titleText.position.set(safe.x + safe.width / 2, safe.y + safe.height * 0.35);

    // Start button inside safe area
    const buttonScale = this.calculateStartButtonScale({ ...dimensions, width: safe.width, height: safe.height });
    this.buttonController?.setBaseScale(buttonScale);
    this.startButton.position.set(safe.x + safe.width / 2, safe.y + safe.height * 0.55);
  }

  public dispose(): void {
    this.buttonController?.dispose();
    super.dispose();
  }
}

