import { Container, Graphics, Text, TextStyle, Texture, Sprite } from 'pixi.js';
import { Scene } from './Scene';
import { GameDimensions } from '@services/ResponsiveManager';
import { AssetManager } from '@services/AssetManager';
import { GameConfig } from '@models/GameConfig';
import { ButtonController } from '@controllers/ButtonController';
import { SceneManager } from '@services/SceneManager';

export class IntroScene extends Scene {
  private backgroundSprite?: Sprite;
  private backgroundFallback?: Graphics;
  private titleText!: Text;
  private startButton!: Container;
  private buttonController!: ButtonController;
  private startButtonBaseWidth = 1;
  private startButtonBaseHeight = 1;
  private readonly START_BUTTON_MAX_WIDTH = 400;
  private readonly START_BUTTON_MAX_HEIGHT = 170;
  private readonly TITLE_BASE_FONT_SIZE = 110;
  private readonly TITLE_SCALE_BONUS = 0.9;
  private readonly START_BUTTON_SCALE_FACTOR = 0.65;
  private readonly START_BUTTON_MIN_SCALE = 0.35;
  private readonly START_BUTTON_VERTICAL_OFFSET = 0.30;

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
    const assetManager = AssetManager.getInstance();

    if (assetManager.hasAsset(GameConfig.ASSET_BACKGROUND)) {
      const texture = assetManager.getAsset<Texture>(GameConfig.ASSET_BACKGROUND);
      this.backgroundSprite = new Sprite(texture);
      this.backgroundSprite.anchor.set(0.5);
      this.addChildAt(this.backgroundSprite, 0);
    } else {
      this.backgroundFallback = new Graphics();
      this.backgroundFallback.beginFill(GameConfig.BACKGROUND_COLOR);
      this.backgroundFallback.drawRect(0, 0, 100, 100);
      this.backgroundFallback.endFill();
      this.addChildAt(this.backgroundFallback, 0);
    }
  }

  private createTitle(): void {
    const style = new TextStyle({
      fontFamily: 'Arlon SemiBold, sans-serif',
      fontSize: this.TITLE_BASE_FONT_SIZE,
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
      fontFamily: 'Arlon SemiBold, sans-serif',
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

    if (this.backgroundSprite) {
      const texture = this.backgroundSprite.texture;
      const baseWidth = texture.width || texture.baseTexture.realWidth || 1;
      const baseHeight = texture.height || texture.baseTexture.realHeight || 1;
      const scale = Math.max(width / baseWidth, height / baseHeight);
      this.backgroundSprite.scale.set(scale);
      this.backgroundSprite.position.set(width / 2, height / 2);
    }

    if (this.backgroundFallback) {
      this.backgroundFallback.clear();
      this.backgroundFallback.beginFill(GameConfig.BACKGROUND_COLOR);
      this.backgroundFallback.drawRect(0, 0, width, height);
      this.backgroundFallback.endFill();
    }

    const centerX = safe.x + safe.width / 2;
    const centerY = safe.y + safe.height / 2;
    const margin = Math.max(16, Math.round(Math.min(safe.width, safe.height) * 0.025));

    // Title centered and scaled up
    const titleScale = Math.min(safe.width / GameConfig.DESIGN_WIDTH, safe.height / GameConfig.DESIGN_HEIGHT);
    const fontSizeUnclamped = this.TITLE_BASE_FONT_SIZE * Math.max(0.7, titleScale * this.TITLE_SCALE_BONUS);
    const maxFontSize = this.TITLE_BASE_FONT_SIZE * this.TITLE_SCALE_BONUS;
    const computedFontSize = Math.min(maxFontSize, Math.max(56, fontSizeUnclamped));

    this.titleText.style.wordWrapWidth = Math.max(300, Math.floor(safe.width * 0.8));
    this.titleText.style.fontSize = computedFontSize;
    this.titleText.position.set(centerX, centerY);

    // Start button: slightly smaller and positioned 10% below the title
    const responsiveScale = this.calculateStartButtonScale({ ...dimensions, width: safe.width, height: safe.height });
    const adjustedScale = Math.max(this.START_BUTTON_MIN_SCALE, responsiveScale * this.START_BUTTON_SCALE_FACTOR);
    const reducedScale = Math.max(this.START_BUTTON_MIN_SCALE, adjustedScale * 0.75);
    this.buttonController?.setBaseScale(reducedScale);

    const buttonHeight = this.startButtonBaseHeight * reducedScale;
    const verticalOffset = safe.height * this.START_BUTTON_VERTICAL_OFFSET;
    const desiredButtonY = centerY + verticalOffset;
    const maxButtonY = safe.y + safe.height - margin - buttonHeight / 2;
    const finalButtonY = Math.min(maxButtonY, desiredButtonY);

    this.startButton.position.set(centerX, finalButtonY);
  }

  public dispose(): void {
    this.buttonController?.dispose();
    super.dispose();
  }
}
