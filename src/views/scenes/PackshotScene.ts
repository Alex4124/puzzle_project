import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { Scene } from './Scene';
import { GameDimensions } from '@services/ResponsiveManager';
import { GameConfig } from '@models/GameConfig';
import { AssetManager } from '@services/AssetManager';
import { ButtonController } from '@controllers/ButtonController';

export class PackshotScene extends Scene {
  private background!: Graphics;
  private finalImage!: Sprite;
  private ctaButton!: Container;
  private ctaController!: ButtonController;
  private ctaBaseW = 1;
  private ctaBaseH = 1;

  constructor() {
    super();
  }

  public async init(): Promise<void> {
    this.createBackground();
    this.createFinalImage();
    this.createCTA();
    this.resize(this.dimensions);
  }

  private createBackground(): void {
    this.background = new Graphics();
    this.background.beginFill(GameConfig.BACKGROUND_COLOR);
    this.background.drawRect(0, 0, 100, 100);
    this.background.endFill();
    this.addChild(this.background);
  }

  private createFinalImage(): void {
    const assets = AssetManager.getInstance();
    if (assets.hasAsset(GameConfig.ASSET_PUZZLE_COMPLETE)) {
      const tex = assets.getAsset<Texture>(GameConfig.ASSET_PUZZLE_COMPLETE);
      this.finalImage = new Sprite(tex);
    } else {
      const g = new Graphics();
      g.beginFill(0xffffff, 0.2);
      g.drawRoundedRect(0, 0, 600, 600, 20);
      g.endFill();
      const rt = (this.parent?.parent as any).renderer.generateTexture(g);
      this.finalImage = new Sprite(rt);
    }
    this.finalImage.anchor.set(0.5);
    this.addChild(this.finalImage);
  }

  private createCTA(): void {
    this.ctaButton = new Container();
    const assets = AssetManager.getInstance();
    if (assets.hasAsset(GameConfig.ASSET_PLAY_BUTTON)) {
      const tex = assets.getAsset<Texture>(GameConfig.ASSET_PLAY_BUTTON);
      const s = new Sprite(tex);
      s.anchor.set(0.5);
      this.ctaBaseW = s.width || 1;
      this.ctaBaseH = s.height || 1;
      this.ctaButton.addChild(s);
    } else {
      const g = new Graphics();
      g.beginFill(0x4CAF50);
      g.drawRoundedRect(-120, -45, 240, 90, 24);
      g.endFill();
      const ts = new TextStyle({ fontSize: 42, fill: 0xffffff, fontWeight: '700', fontFamily: 'Arial' });
      const t = new Text('Play', ts);
      t.anchor.set(0.5);
      this.ctaButton.addChild(g, t);
      const b = this.ctaButton.getLocalBounds();
      this.ctaBaseW = b.width || 1;
      this.ctaBaseH = b.height || 1;
    }
    this.addChild(this.ctaButton);
    this.ctaController = new ButtonController(this.ctaButton, {
      onPress: () => this.navigateToStore(),
      enablePulse: true,
      pulseFactor: 1.3,
      pulseDuration: 0.9,
      scale: 1,
    });
  }

  protected onResize(dimensions: GameDimensions): void {
    const { width, height, safe } = dimensions;

    // Background covers viewport
    this.background.clear();
    this.background.beginFill(GameConfig.BACKGROUND_COLOR);
    this.background.drawRect(0, 0, width, height);
    this.background.endFill();

    // Scale image to fit inside safe area
    if (this.finalImage) {
      const maxW = safe.width * 0.9;
      const maxH = safe.height * 0.9;
      const scale = Math.min(maxW / this.finalImage.texture.width, maxH / this.finalImage.texture.height, 1);
      this.finalImage.scale.set(scale);
      this.finalImage.position.set(safe.x + safe.width / 2, safe.y + safe.height / 2);
    }

    // CTA placement and scale within safe area
    if (this.ctaButton) {
      const margin = Math.max(12, Math.round(Math.min(safe.width, safe.height) * 0.02));
      const SPACING_X = Math.max(24, Math.min(80, Math.round(safe.width * 0.04)));

      const baseW = this.ctaBaseW || 1;
      const baseH = this.ctaBaseH || 1;
      const scaleByViewportW = (safe.width * 0.18) / baseW;
      const scaleByViewportH = (safe.height * 0.10) / baseH;
      const scaleUpper = Math.min(scaleByViewportW, scaleByViewportH, 1);
      const MIN_SCALE = 0.25;
      let scale = Math.max(MIN_SCALE, scaleUpper);

      const imgCenterX = safe.x + safe.width / 2;
      const imgCenterY = safe.y + safe.height / 2;
      const imgW = this.finalImage ? this.finalImage.width : 0;
      const imgH = this.finalImage ? this.finalImage.height : 0;
      const imgRight = imgCenterX + imgW / 2;
      const imageBottom = imgCenterY + imgH / 2;

      const availableRight = safe.x + safe.width - margin - imgRight;
      const desiredBtnW = baseW * scale;
      if (availableRight < SPACING_X + desiredBtnW) {
        const allowedW = Math.max(0, availableRight - SPACING_X);
        const fitScale = allowedW > 0 ? allowedW / baseW : MIN_SCALE;
        scale = Math.max(MIN_SCALE, Math.min(scale, fitScale));
      }

      this.ctaController.setBaseScale(scale);
      const w = baseW * scale;
      const h = baseH * scale;

      let targetX = Math.max(imgRight + SPACING_X + w / 2, safe.x + safe.width - margin - w / 2);
      const bottomCandidate = safe.y + safe.height - margin - h / 2;
      let targetY = Math.min(bottomCandidate, imageBottom - h / 2);

      const minX = safe.x + margin + w / 2;
      const maxX = safe.x + safe.width - margin - w / 2;
      const minY = safe.y + margin + h / 2;
      const maxY = safe.y + safe.height - margin - h / 2;
      targetX = Math.max(minX, Math.min(maxX, targetX));
      targetY = Math.max(minY, Math.min(maxY, targetY));

      this.ctaButton.position.set(targetX, targetY);
    }
  }

  private navigateToStore(): void {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);

    let url = '';
    if (isIOS) {
      url = GameConfig.IOS_GAME_URL;
    } else if (isAndroid) {
      url = GameConfig.ANDROID_GAME_URL;
    }

    if (!url) {
      console.warn('Store URL is not configured for this platform');
      return;
    }

    try {
      window.open(url, '_blank');
    } catch (e) {
      (window as any).location.href = url;
    }
  }
}

