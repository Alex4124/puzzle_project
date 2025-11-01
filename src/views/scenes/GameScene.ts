import { Container, FederatedPointerEvent, Graphics, RenderTexture, Sprite, Texture, BlurFilter, Point, BLEND_MODES, Text, TextStyle } from 'pixi.js';
import { Scene } from './Scene';
import { GameDimensions } from '@services/ResponsiveManager';
import { GameConfig } from '@models/GameConfig';
import { AssetManager } from '@services/AssetManager';
import gsap from 'gsap';
import { SceneManager } from '@services/SceneManager';
import { ButtonController } from '@controllers/ButtonController';

interface TileData {
  index: number;
  row: number;
  col: number;
  container: Container;
  image: Sprite;
  ghost: Sprite;
  targetX: number;
  targetY: number;
  homeX: number;
  homeY: number;
  isMissing: boolean;
  placed: boolean;
  dragging: boolean;
  dragOffsetX: number;
  dragOffsetY: number;
}

/**
 * Игровая сцена: пазл 4x4
 * - 4 случайных детали отсутствуют и лежат слева
 * - На местах отсутствующих деталей — серый силуэт
 * - Может работать как с отдельными ассетами тайлов, так и разрезать целое изображение
 */
export class GameScene extends Scene {
  private background!: Graphics;
  private tilesContainer!: Container;
  private ghostContainer!: Container;
  private leftPanel!: Container;
  private leftPanelContent!: Container;
  private contentContainer!: Container;
  private readonly LEFT_TILE_MAX_W = 145;
  private readonly LEFT_TILE_MAX_H = 120;
  private readonly LEFT_PANEL_MAX_W = 780;
  private readonly LEFT_PANEL_MAX_H = 180;
  private leftPanelBg!: Graphics;
  private leftPanelShadow!: Graphics;
  private leftPanelMask!: Graphics;
  private leftPanelHeight = 0;
  private readonly PLAY_BUTTON_MAX_WIDTH = 250;
  private readonly PLAY_BUTTON_MAX_HEIGHT = 175;
  private readonly HAND_FADE_IN = 0.8;
  private readonly HAND_MOVE = 1.5;
  private readonly HAND_FADE_OUT = 0.8;
  private readonly HAND_REPEAT_DELAY = 0.6;
  private readonly HAND_TARGET_MAX_HEIGHT = 140; // было 120, чуть больше
  private readonly HAND_TILE_FACTOR = 1.0; // было 0.8, делаем крупнее относительно тайла
  private readonly HAND_MAX_SCALE = 1.35; // лимит на общий масштаб
  private readonly HAND_MIN_SCALE = 0.75;
  private headingText!: Text;
  private playButton!: Container;
  private playButtonController?: ButtonController;
  private playButtonBaseWidth = 1;
  private playButtonBaseHeight = 1;
  private handSprite?: Sprite;
  private handTimeline?: gsap.core.Timeline;
  private userTouchedTiles = false;

  private readonly GRID_SIZE = 4;
  private tiles: TileData[] = [];
  private missingIndices: number[] = [];
  private isTransitioning = false;

  // Layout cache
  private puzzleSize = 0;
  private tileSize = 0;
  private leftPanelWidth = 0;
  private puzzleOriginX = 0;
  private puzzleOriginY = 0;
  private margin = 16;
  private portraitTileScale = 1;

  constructor() {
    super();
  }

  public async init(): Promise<void> {
    this.createBackground();
    this.contentContainer = new Container();
    this.ghostContainer = new Container();
    this.tilesContainer = new Container();
    this.leftPanel = new Container();
    this.leftPanelContent = new Container();
    this.leftPanelBg = new Graphics();
    this.leftPanelShadow = new Graphics();
    this.leftPanelMask = new Graphics();

    // Основной контейнер с игрой (левая панель + доска)
    this.addChild(this.contentContainer);
    // Контент панели + маска (маска не является дочерним контейнером контента)
    this.leftPanel.addChild(this.leftPanelContent);
    this.leftPanelContent.addChild(this.leftPanelBg);
    this.leftPanelContent.addChild(this.leftPanelShadow);
    this.leftPanel.addChild(this.leftPanelMask); // маска как отдельный ребёнок панели
    this.leftPanelMask.visible = true; // делаем видимой, чтобы PIXI гарантированно использовал геометрию
    (this.leftPanelMask as any).eventMode = 'none';
    // Маскируем только тень, фон и тайлы не маскируем, чтобы исключить артефакты скрытия
    // (тень маскируется в drawLeftPanel)
    this.contentContainer.addChild(this.leftPanel);
    this.contentContainer.addChild(this.ghostContainer);
    this.contentContainer.addChild(this.tilesContainer);

    // Подсказка рукой (добавим до UI, чтобы UI был поверх)
    this.createHand();

    // UI: заголовок над панелью и кнопка под панелью
    this.createHeading();
    this.createPlayButton();

    this.setupPuzzle();
    this.resize(this.dimensions);
  }

  private createHand(): void {
    const assetManager = AssetManager.getInstance();
    if (!assetManager.hasAsset(GameConfig.ASSET_HAND)) return;
    const tex = assetManager.getAsset<Texture>(GameConfig.ASSET_HAND);
    const hand = new Sprite(tex);
    hand.anchor.set(0.2);
    hand.alpha = 0;
    (hand as any).eventMode = 'none';
    this.contentContainer.addChild(hand);
    this.handSprite = hand;
  }

  private createHeading(): void {
    const style = new TextStyle({
      fontFamily: 'S FRounded',
      fontSize: 60,
      fontWeight: '800',
      fill: 0x944215,
      align: 'center',
    });
    this.headingText = new Text('Complete the puzzle', style);
    this.headingText.anchor.set(0.5);
    this.contentContainer.addChild(this.headingText);
  }

  private createPlayButton(): void {
    this.playButton = new Container();

    const assetManager = AssetManager.getInstance();
    if (assetManager.hasAsset(GameConfig.ASSET_PLAY_BUTTON)) {
      const tex = assetManager.getAsset<Texture>(GameConfig.ASSET_PLAY_BUTTON);
      const sprite = new Sprite(tex);
      sprite.anchor.set(0.5);
      this.playButton.addChild(sprite);
      this.playButtonBaseWidth = sprite.width || 1;
      this.playButtonBaseHeight = sprite.height || 1;
    } else {
      // Fallback: простая кнопка-плейсхолдер
      const bg = new Graphics();
      bg.beginFill(0x4CAF50);
      bg.drawRoundedRect(-180, -55, 360, 110, 28);
      bg.endFill();
      const textStyle = new TextStyle({
        fontFamily: 'S FRounded',
        fontSize: 48,
        fontWeight: '600',
        fill: 0xffffff,
        align: 'center',
      });
      const t = new Text('Play', textStyle);
      t.anchor.set(0.5);
      this.playButton.addChild(bg, t);
      const bounds = this.playButton.getLocalBounds();
      this.playButtonBaseWidth = bounds.width || 1;
      this.playButtonBaseHeight = bounds.height || 1;
    }

    this.contentContainer.addChild(this.playButton);
    this.playButtonController = new ButtonController(this.playButton, {
      onPress: () => this.navigateToStore(),
      enablePulse: false,
      scale: 1,
    });
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
      // Fallback
      (window as any).location.href = url;
    }
  }

  private createBackground(): void {
    this.background = new Graphics();
    this.background.beginFill(GameConfig.BACKGROUND_COLOR);
    this.background.drawRect(0, 0, 100, 100);
    this.background.endFill();
    this.addChild(this.background);
  }

  /**
   * Создание текстур тайлов
   * Если есть отдельные ассеты - использует их
   * Если нет - разрезает полное изображение
   */
  private createTileTextures(): Texture[] {
    const assetManager = AssetManager.getInstance();
    const textures: Texture[] = [];

    // Проверяем, есть ли отдельные тайлы
    const hasIndividualTiles = assetManager.hasAsset(`${GameConfig.ASSET_PUZZLE_TILE_PREFIX}1`);

    if (hasIndividualTiles) {
      // Используем готовые тайлы
      for (let i = 0; i < this.GRID_SIZE * this.GRID_SIZE; i++) {
        const texName = `${GameConfig.ASSET_PUZZLE_TILE_PREFIX}${i + 1}`;
        textures.push(assetManager.getAsset<Texture>(texName));
      }
      console.log('✅ Using individual tile assets');
    } else if (assetManager.hasAsset(GameConfig.ASSET_PUZZLE_COMPLETE)) {
      // Разрезаем полное изображение
      const completeTexture = assetManager.getAsset<Texture>(GameConfig.ASSET_PUZZLE_COMPLETE);
      const tileWidth = completeTexture.width / this.GRID_SIZE;
      const tileHeight = completeTexture.height / this.GRID_SIZE;

      for (let i = 0; i < this.GRID_SIZE * this.GRID_SIZE; i++) {
        const row = Math.floor(i / this.GRID_SIZE);
        const col = i % this.GRID_SIZE;

        // Создаём текстуру из части полного изображения
        const rect = {
          x: col * tileWidth,
          y: row * tileHeight,
          width: tileWidth,
          height: tileHeight,
        };

        const tileTexture = new Texture(
          completeTexture.baseTexture,
          rect as any
        );
        textures.push(tileTexture);
      }
      console.log('✅ Sliced complete image into tiles');
    } else {
      // Создаём placeholder тайлы
      console.warn('⚠️ No puzzle assets found, creating placeholders');
      for (let i = 0; i < this.GRID_SIZE * this.GRID_SIZE; i++) {
        textures.push(this.createPlaceholderTexture(i));
      }
    }

    return textures;
  }

  /**
   * Создание placeholder текстуры для тайла
   */
  private createPlaceholderTexture(index: number): Texture {
    const size = 200;
    const graphics = new Graphics();
    
    // Случайный цвет для каждого тайла
    const hue = (index * 360) / (this.GRID_SIZE * this.GRID_SIZE);
    const color = this.hslToHex(hue, 70, 60);
    
    graphics.beginFill(color);
    graphics.drawRect(0, 0, size, size);
    graphics.endFill();
    
    // Граница
    graphics.lineStyle(4, 0xFFFFFF);
    graphics.drawRect(0, 0, size, size);
    
    // Номер тайла
    graphics.endFill();

    return this.app.renderer.generateTexture(graphics);
  }

  /**
   * HSL to HEX конверсия для цветов
   */
  private hslToHex(h: number, s: number, l: number): number {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const r = Math.round(255 * f(0));
    const g = Math.round(255 * f(8));
    const b = Math.round(255 * f(4));
    return (r << 16) + (g << 8) + b;
  }

  private setupPuzzle(): void {
    const tileTextures = this.createTileTextures();

    // Выбираем 4 отсутствующих тайла, распределяя их по разным квадрантам
    this.missingIndices = this.selectDistributedMissingIndices(4);

    // Создаём все 16 тайлов
    for (let i = 0; i < this.GRID_SIZE * this.GRID_SIZE; i++) {
      const row = Math.floor(i / this.GRID_SIZE);
      const col = i % this.GRID_SIZE;
      const texture = tileTextures[i];

      const container = new Container();
      const sprite = new Sprite(texture);
      sprite.anchor.set(0);
      container.addChild(sprite);

      // Серый силуэт — тот же тайл, но затонированный
      const ghost = new Sprite(texture);
      ghost.anchor.set(0);
      ghost.tint = 0x808080;
      ghost.alpha = 0.5;
      this.ghostContainer.addChild(ghost);

      const tile: TileData = {
        index: i,
        row,
        col,
        container,
        image: sprite,
        ghost,
        targetX: 0,
        targetY: 0,
        homeX: 0,
        homeY: 0,
        isMissing: this.missingIndices.includes(i),
        placed: !this.missingIndices.includes(i),
        dragging: false,
        dragOffsetX: 0,
        dragOffsetY: 0,
      };

      this.tiles.push(tile);
      // Изначально отсутствующие – внутри контента левой панели, остальные – на поле
      if (tile.isMissing) {
        this.leftPanelContent.addChild(container);
      } else {
        this.tilesContainer.addChild(container);
      }

      if (tile.isMissing) {
        this.makeTileDraggable(tile);
      } else {
        // Неинтерактивные уже установленные тайлы
        container.eventMode = 'none';
      }
    }
  }

  /**
   * Выбор индексов недостающих тайлов с равномерным распределением по полю
   * Для сетки 4x4 берём по одному тайлу из каждого квадранта 2x2
   */
  private selectDistributedMissingIndices(count: number): number[] {
    const size = this.GRID_SIZE;
    const total = size * size;
    if (size === 4 && count === 4) {
      const quadrants: number[][] = [];
      const split = size / 2; // 2
      for (let qr = 0; qr < 2; qr++) {
        for (let qc = 0; qc < 2; qc++) {
          const r0 = qr * split;
          const r1 = r0 + split - 1;
          const c0 = qc * split;
          const c1 = c0 + split - 1;
          const indices: number[] = [];
          for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
              indices.push(r * size + c);
            }
          }
          this.shuffle(indices);
          quadrants.push(indices);
        }
      }
      // Берём первый случайный из каждого квадранта
      const result = quadrants.map(q => q[0]);
      this.shuffle(result); // перемешаем для доп. случайности
      return result;
    }

    // Общий случай: случайные уникальные индексы
    const all = Array.from({ length: total }, (_, i) => i);
    this.shuffle(all);
    return all.slice(0, count);
  }

  private makeTileDraggable(tile: TileData): void {
    tile.container.eventMode = 'static';
    tile.container.cursor = 'pointer';

    const onDown = (e: FederatedPointerEvent) => {
      if (!this.userTouchedTiles) {
        this.userTouchedTiles = true;
        this.stopHandGuide();
      }
      tile.dragging = true;
      // Переместим тайл к контейнеру тайлов, сохранив мировую позицию (чтобы не "прыгнул")
      const world = tile.container.getGlobalPosition(new Point());
      this.tilesContainer.addChild(tile.container);
      const localInTiles = this.tilesContainer.toLocal(world);
      tile.container.position.copyFrom(localInTiles);
      // При начале перетаскивания возвращаем реальный масштаб
      tile.container.scale.set(1);
      // Смещение курсора относительно тайла (в системе tilesContainer)
      const pointerLocal = this.tilesContainer.toLocal(e.global);
      tile.dragOffsetX = pointerLocal.x - tile.container.x;
      tile.dragOffsetY = pointerLocal.y - tile.container.y;
      gsap.to(tile.container, { alpha: 0.9, duration: 0.1 });
      tile.container.cursor = 'grabbing';
    };

    const onMove = (e: FederatedPointerEvent) => {
      if (!tile.dragging) return;
      const local = this.tilesContainer.toLocal(e.global);
      tile.container.position.set(local.x - tile.dragOffsetX, local.y - tile.dragOffsetY);
    };

    const onUp = () => {
      if (!tile.dragging) return;
      tile.dragging = false;
      tile.container.cursor = 'pointer';

      const dx = tile.container.x - tile.targetX;
      const dy = tile.container.y - tile.targetY;
      const dist = Math.hypot(dx, dy);
      const snapTolerance = this.tileSize * 0.35;

      if (dist <= snapTolerance) {
        // Ставим на место
        tile.placed = true;
        tile.isMissing = false;
        tile.container.eventMode = 'none';
        gsap.to(tile.container, {
          x: tile.targetX,
          y: tile.targetY,
          alpha: 1,
          duration: 0.2,
          ease: 'power2.out',
        });
        gsap.to(tile.container.scale, { x: 1, y: 1, duration: 0.2, ease: 'power2.out' });
        tile.ghost.visible = false;
        this.checkCompletion();
      } else {
        // Возвращаем в левую панель: сперва репарентим, сохраняя мировую позицию
        const world = tile.container.getGlobalPosition(new Point());
        this.leftPanelContent.addChild(tile.container);
        tile.container.position.copyFrom(this.leftPanelContent.toLocal(world));

        const leftScale = this.getLeftTileScale();
        gsap.to(tile.container, {
          x: tile.homeX,
          y: tile.homeY,
          alpha: 1,
          duration: 0.2,
          ease: 'power2.out',
        });
        gsap.to(tile.container.scale, { x: leftScale, y: leftScale, duration: 0.2, ease: 'power2.out' });
      }
    };

    tile.container.on('pointerdown', onDown);
    tile.container.on('pointermove', onMove);
    tile.container.on('pointerup', onUp);
    tile.container.on('pointerupoutside', onUp);
  }

  protected onResize(dimensions: GameDimensions): void {
    const fullWidth = dimensions.width;
    const fullHeight = dimensions.height;
    const safe = (dimensions as any).safe;
    const width = safe ? safe.width : fullWidth;
    const height = safe ? safe.height : fullHeight;
    const offsetX = safe ? safe.x : 0;
    const offsetY = safe ? safe.y : 0;

    // Фон на весь экран
    this.background.clear();
    this.background.beginFill(GameConfig.BACKGROUND_COLOR);
    this.background.drawRect(0, 0, fullWidth, fullHeight);
    this.background.endFill();

    if (height > width) {
      this.layoutPortrait(dimensions, width, height, offsetX, offsetY);
      return;
    }

    // Адаптивный лэйаут
    this.portraitTileScale = 1;
    this.margin = Math.max(16, Math.round(Math.min(width, height) * 0.02));
    let puzzleSize = Math.min(width * 0.75, height * 0.85);
    let tileSize = puzzleSize / this.GRID_SIZE;

    // Для горизонтального расположения недостающих деталей ширина учитывает уменьшенный размер тайлов
    const missingCount = this.missingIndices.length || 4;
    let leftTileScale = Math.min(this.LEFT_TILE_MAX_W / tileSize, this.LEFT_TILE_MAX_H / tileSize, 1);
    let leftTileDisplayWidth = tileSize * leftTileScale;
    let leftPanelWidth = missingCount * leftTileDisplayWidth + this.margin * (missingCount + 1);
    leftPanelWidth = Math.min(leftPanelWidth, this.LEFT_PANEL_MAX_W);

    let needWidth = puzzleSize + leftPanelWidth + this.margin * 2;
    if (needWidth > width) {
      // Пересчитаем размеры, учитывая необходимую ширину панели слева
      puzzleSize = Math.max(100, width - leftPanelWidth - this.margin * 2);
      tileSize = puzzleSize / this.GRID_SIZE;
      leftTileScale = Math.min(this.LEFT_TILE_MAX_W / tileSize, this.LEFT_TILE_MAX_H / tileSize, 1);
      leftTileDisplayWidth = tileSize * leftTileScale;
      leftPanelWidth = Math.min(missingCount * leftTileDisplayWidth + this.margin * (missingCount + 1), this.LEFT_PANEL_MAX_W);
      needWidth = puzzleSize + leftPanelWidth + this.margin * 2;
    }

    this.puzzleSize = puzzleSize;
    this.tileSize = tileSize;
    this.leftPanelWidth = leftPanelWidth;
    // Высота панели и ее позиция по Y (центрируем относительно пазла)
    // В портретной ориентации уменьшаем высоту панели до фактической высоты тайлов + отступы
    const scaledHeightForPanel = tileSize * leftTileScale;
    let computedLeftPanelHeight = Math.min(this.LEFT_PANEL_MAX_H, puzzleSize);
    if (height > width) {
      const desired = Math.max(0, Math.round(scaledHeightForPanel + this.margin * 2));
      computedLeftPanelHeight = Math.min(computedLeftPanelHeight, desired);
    }
    this.leftPanelHeight = computedLeftPanelHeight;
    const panelY = (puzzleSize - this.leftPanelHeight) / 2;
    this.leftPanel.position.set(0, panelY);
    // Внутри contentContainer начало по Y = 0, пазл смещаем по X после левой панели
    this.puzzleOriginX = leftPanelWidth + this.margin;
    this.puzzleOriginY = 0;

    // Отрисуем фон и внутреннюю тень панели
    this.drawLeftPanel(this.leftPanelWidth, this.leftPanelHeight);

    // Позиции и размеры призраков и тайлов
    for (const tile of this.tiles) {
      const targetX = this.puzzleOriginX + tile.col * this.tileSize;
      const targetY = this.puzzleOriginY + tile.row * this.tileSize;
      tile.targetX = targetX;
      tile.targetY = targetY;

      // Размеры картинок
      tile.image.width = this.tileSize;
      tile.image.height = this.tileSize;
      tile.ghost.width = this.tileSize;
      tile.ghost.height = this.tileSize;

      // Масштаб контейнера: для отсутствующих в панели уменьшаем
      if (tile.placed || tile.dragging) {
        tile.container.scale.set(1);
      } else {
        tile.container.scale.set(leftTileScale);
      }

      // Призрак всегда в ячейке. Видимость зависит от placed
      tile.ghost.position.set(targetX, targetY);
      tile.ghost.visible = !tile.placed;

      if (tile.placed && !tile.dragging) {
        // Зафиксированный тайл — в своей ячейке
        tile.container.position.set(targetX, targetY);
      }
    }

    // Разложим отсутствующие тайлы в левой панели по горизонтали
    const missingTiles = this.tiles.filter(t => !t.placed);
    // Для большего разнообразия порядок на панели случайный
    const orderedTiles = missingTiles.slice();
    this.shuffle(orderedTiles);
    const spacing = this.margin;
    const startX = spacing;
    const scaledWidth = this.tileSize * leftTileScale;
    const scaledHeight = this.tileSize * leftTileScale;
    const homeY = (this.leftPanelHeight - scaledHeight) / 2;

    orderedTiles.forEach((t, idx) => {
      t.homeX = startX + idx * (scaledWidth + spacing);
      t.homeY = homeY;
      if (!t.dragging && !t.placed) {
        // Убедимся, что тайл действительно внутри левой панели
        if (t.container.parent !== this.leftPanelContent) {
          const world = t.container.getGlobalPosition(new Point());
          this.leftPanelContent.addChild(t.container);
          t.container.position.copyFrom(this.leftPanelContent.toLocal(world));
        }
        t.container.position.set(t.homeX, t.homeY);
      }
    });

    // Позиционирование заголовка и кнопки относительно левой панели
    const panelTop = this.leftPanel.y; // относительно contentContainer (пазл начинается с 0 по Y)
    const panelBottom = this.leftPanel.y + this.leftPanelHeight;

    // Кнопка: адаптивный масштаб (с учётом ширины панели и ограничений)
    const buttonScale = this.calculatePlayButtonScale(dimensions);
    if (this.playButtonController) {
      this.playButtonController.setBaseScale(buttonScale);
    } else {
      this.playButton.scale.set(buttonScale);
    }
    const buttonHeight = this.playButtonBaseHeight * (this.playButton.scale.y || buttonScale);
    this.playButton.position.set(this.leftPanelWidth / 2, panelBottom + 50 + buttonHeight / 2);

    // Заголовок: базовый стиль, адаптивный масштаб по ширине панели и доступной высоте
    const localHeadingWidth = this.headingText.getLocalBounds().width || 1;
    const localHeadingHeight = this.headingText.getLocalBounds().height || 1;
    const maxHeadingWidth = Math.max(1, this.leftPanelWidth - this.margin * 2);
    const widthScale = Math.min(1, maxHeadingWidth / localHeadingWidth);
    const maxHeadingHeight = Math.max(1, panelTop - 50);
    const heightScale = Math.min(1, maxHeadingHeight / localHeadingHeight);
    const headingScale = Math.max(0.2, Math.min(widthScale, heightScale)) * 0.85;
    this.headingText.scale.set(headingScale);
    const headingHeight = localHeadingHeight * headingScale;
    this.headingText.position.set(this.leftPanelWidth / 2, panelTop - 50 - headingHeight / 2);

    // Центрирование и масштабирование основного контейнера
    const contentWidth = this.leftPanelWidth + this.margin + this.puzzleSize;
    // Учтём заголовок сверху и кнопку снизу вне области пазла
    const labelTop = this.headingText.position.y - this.headingText.height / 2;
    const topExtent = Math.max(0, -labelTop);
    const buttonBottom = this.playButton.position.y + (buttonHeight / 2);
    const bottomExtent = Math.max(0, buttonBottom - this.puzzleSize);
    const contentHeight = this.puzzleSize + topExtent + bottomExtent;
    const fitScale = Math.min(width / contentWidth, height / contentHeight);
    const desiredScale = Math.min(1, fitScale) * 0.9; // немного уменьшаем масштаб
    this.contentContainer.scale.set(desiredScale);
    const extraYOffset = Math.max(this.margin, height * 0.05);
    this.contentContainer.position.set(
      (width - contentWidth * desiredScale) / 2 + offsetX,
      (height - contentHeight * desiredScale) / 2 + offsetY + extraYOffset
    );

    // Обновим/запустим подсказку рукой, если пользователь ещё не взаимодействовал
    this.refreshHandGuide();
  }

  private shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  private checkCompletion(): void {
    if (this.isTransitioning) return;
    const allPlaced = this.tiles.every(t => t.placed);
    if (allPlaced) {
      this.onPuzzleCompleted();
    }
  }

  private onPuzzleCompleted(): void {
    this.stopHandGuide();
    this.isTransitioning = true;

    // Отключаем взаимодействия с тайлами
    this.tiles.forEach(t => (t.container.eventMode = 'none'));

    // Рассчитаем центр пазла в координатах contentContainer
    const dims: any = this.dimensions as any;
    const safe = dims.safe;
    const width = safe ? safe.width : dims.width;
    const height = safe ? safe.height : dims.height;
    const offsetX = safe ? safe.x : 0;
    const offsetY = safe ? safe.y : 0;
    const puzzleSize = this.puzzleSize;
    const fitScale = Math.min(width / puzzleSize, height / puzzleSize);
    const targetScale = Math.min(1, fitScale) * 0.95;
    const puzzleCenterX = this.puzzleOriginX + puzzleSize / 2;
    const puzzleCenterY = this.puzzleOriginY + puzzleSize / 2;
    const targetX = offsetX + width / 2 - puzzleCenterX * targetScale;
    const targetY = offsetY + height / 2 - puzzleCenterY * targetScale;

    // Анимация: плавно скрываем левую панель и UI, центрируем собранный пазл
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.to(this.ghostContainer, { alpha: 0, duration: 0.25 }, 0)
      .to([this.headingText, this.playButton], { alpha: 0, duration: 0.3 }, 0)
      .to(this.leftPanel, { alpha: 0, duration: 0.4 }, 0)
      .to(this.contentContainer.scale, { x: targetScale, y: targetScale, duration: 0.7, ease: 'power2.inOut' }, 0)
      .to(this.contentContainer, { x: targetX, y: targetY, duration: 0.7, ease: 'power2.inOut' }, 0)
      .add(async () => {
        const sceneManager = SceneManager.getInstance();
        await sceneManager.switchTo(GameConfig.SCENE_PACKSHOT);
      });
  }

  /**
   * Доступ к app.renderer для создания текстур
   */
  private get app() {
    // Получаем renderer из текущей stage
    return this.parent?.parent as any;
  }

  /**
   * Масштаб тайла для левой панели с ограничениями 145x175
   */
  private getLeftTileScale(): number {
    if (this.tileSize <= 0) return 1;
    const dims = this.dimensions;
    const safe = (dims as any).safe;
    const currentWidth = safe ? safe.width : dims.width;
    const currentHeight = safe ? safe.height : dims.height;
    if (currentHeight > currentWidth) {
      return this.portraitTileScale;
    }
    return Math.min(this.LEFT_TILE_MAX_W / this.tileSize, this.LEFT_TILE_MAX_H / this.tileSize, 1);
  }

  /**
   * Отрисовка фона левой панели с закруглениями и внутренней тенью
   */
  private drawLeftPanel(width: number, height: number): void {
    const radius = 21;

    // Фон
    this.leftPanelBg.clear();
    this.leftPanelBg.beginFill(0x685739, 0.53);
    this.leftPanelBg.drawRoundedRect(0, 0, width, height, radius);
    this.leftPanelBg.endFill();

    // Маска панели (для скруглений и инсет-эффекта)
    this.leftPanelMask.clear();
    this.leftPanelMask.beginFill(0xffffff, 1);
    this.leftPanelMask.drawRoundedRect(0, 0, width, height, radius);
    this.leftPanelMask.endFill();

    // Аутентичный inner shadow: рисуем внутреннее "кольцо" и размываем
    const inset = 6; // толщина внутреннего кольца до размытия (аналог spread ~0 c мягким краем)
    this.leftPanelShadow.clear();
    this.leftPanelShadow.beginFill(0x000000, 1);
    this.leftPanelShadow.drawRoundedRect(0, 0, width, height, radius);
    this.leftPanelShadow.beginHole();
    this.leftPanelShadow.drawRoundedRect(inset, inset, Math.max(0, width - inset * 2), Math.max(0, height - inset * 2), Math.max(0, radius - inset));
    this.leftPanelShadow.endHole();
    this.leftPanelShadow.endFill();

    // Смещение, размытие и режим наложения как у CSS box-shadow: inset 0.707px 0.707px 5px
    this.leftPanelShadow.position.set(0.707, 0.707);
    this.leftPanelShadow.alpha = 0.35;
    this.leftPanelShadow.filters = [new BlurFilter(5)];
    this.leftPanelShadow.blendMode = BLEND_MODES.MULTIPLY;
    this.leftPanelShadow.mask = this.leftPanelMask; // обрезаем по форме панели
  }

  private calculatePlayButtonScale(dimensions: GameDimensions): number {
    const baseW = this.playButtonBaseWidth || 1;
    const baseH = this.playButtonBaseHeight || 1;
    // Целевой размер: до 387x175, но не шире панели
    const widthLimit = (this.leftPanelWidth - this.margin * 2) / baseW;
    const explicitMaxWidthLimit = this.PLAY_BUTTON_MAX_WIDTH / baseW; // 387
    const heightLimit = this.PLAY_BUTTON_MAX_HEIGHT / baseH; // 175
    const scale = Math.min(widthLimit, explicitMaxWidthLimit, heightLimit);
    const baseScale = Math.max(0.2, isFinite(scale) && scale > 0 ? scale : 1);
    return Math.max(0.2, baseScale * 0.9);
  }

  private refreshHandGuide(): void {
    if (!this.handSprite) return;
    if (this.userTouchedTiles) {
      this.stopHandGuide();
      return;
    }
    const tile = this.tiles.find(t => !t.placed && !t.dragging);
    if (!tile) {
      this.stopHandGuide();
      return;
    }

    // Старт: точный центр спрайта тайла в левой панели (учитывает масштаб контейнера)
    const globalCenter = tile.container.toGlobal(new Point(tile.image.width / 2, tile.image.height / 2));
    const localCenter = this.contentContainer.toLocal(globalCenter);
    const startX = localCenter.x;
    const startY = localCenter.y;
    const endX = tile.targetX + this.tileSize / 2;
    const endY = tile.targetY + this.tileSize / 2;

    // Масштаб руки относительно размера тайла (слегка увеличен)
    const baseH = this.handSprite.texture.height || 1;
    const desiredH = Math.min(this.HAND_TARGET_MAX_HEIGHT, this.tileSize * this.HAND_TILE_FACTOR);
    const handScale = Math.max(this.HAND_MIN_SCALE, Math.min(this.HAND_MAX_SCALE, desiredH / baseH));
    this.handSprite.scale.set(handScale);

    // Перезапустим анимацию
    if (this.handTimeline) {
      this.handTimeline.kill();
      this.handTimeline = undefined;
    }
    this.handSprite.alpha = 0;
    this.handSprite.position.set(startX, startY);

    this.handTimeline = gsap.timeline({ repeat: -1, repeatDelay: this.HAND_REPEAT_DELAY, defaults: { ease: 'power2.out' } });
    this.handTimeline
      .to(this.handSprite, { alpha: 1, duration: this.HAND_FADE_IN })
      .to(this.handSprite, { x: endX, y: endY, duration: this.HAND_MOVE, ease: 'power2.inOut' })
      .to(this.handSprite, { alpha: 0, duration: this.HAND_FADE_OUT })
      .add(() => {
        this.handSprite!.position.set(startX, startY);
      });
  }

  private stopHandGuide(): void {
    if (this.handTimeline) {
      this.handTimeline.kill();
      this.handTimeline = undefined;
    }
    if (this.handSprite) this.handSprite.alpha = 0;
  }

  private layoutPortrait(dimensions: GameDimensions, width: number, height: number, offsetX: number, offsetY: number): void {
    const missingCount = this.missingIndices.length || 4;

    this.margin = Math.max(14, Math.round(Math.min(width, height) * 0.03));

    let puzzleSize = Math.min(width * 0.92, height * 0.48);
    puzzleSize = Math.max(140, puzzleSize);
    const tileSize = puzzleSize / this.GRID_SIZE;

    let leftTileScale = Math.min(this.LEFT_TILE_MAX_W / tileSize, this.LEFT_TILE_MAX_H / tileSize, 1);
    if (leftTileScale < 0.9) {
      leftTileScale = Math.min(1, leftTileScale * 1.1);
    }
    leftTileScale = Math.max(0.6, leftTileScale);

    const tilesPerRow = Math.min(2, Math.max(1, missingCount));
    const rows = Math.max(1, Math.ceil(missingCount / tilesPerRow));

    let scaledWidth = tileSize * leftTileScale;
    let scaledHeight = tileSize * leftTileScale;

    const maxPanelWidth = Math.min(this.LEFT_PANEL_MAX_W, width * 0.94);
    let basePanelWidth = tilesPerRow * scaledWidth + this.margin * (tilesPerRow + 1);
    if (basePanelWidth > maxPanelWidth && basePanelWidth > 0) {
      const adjust = maxPanelWidth / basePanelWidth;
      leftTileScale = Math.max(0.6, leftTileScale * adjust);
      scaledWidth = tileSize * leftTileScale;
      scaledHeight = tileSize * leftTileScale;
      basePanelWidth = tilesPerRow * scaledWidth + this.margin * (tilesPerRow + 1);
    }

    let leftPanelWidth = Math.min(maxPanelWidth, basePanelWidth);
    leftPanelWidth = Math.max(leftPanelWidth, scaledWidth + this.margin * 2);

    let leftPanelHeight = rows * scaledHeight + this.margin * (rows + 1);
    leftPanelHeight = Math.max(leftPanelHeight, scaledHeight + this.margin * 2);

    this.puzzleSize = puzzleSize;
    this.tileSize = tileSize;
    this.leftPanelWidth = leftPanelWidth;
    this.leftPanelHeight = leftPanelHeight;
    this.portraitTileScale = leftTileScale;

    const headingFontSize = Math.round(Math.max(36, Math.min(80, width * 0.12)));
    this.headingText.style.fontSize = headingFontSize;
    this.headingText.scale.set(1);
    const headingY = offsetY + this.margin * 2 + headingFontSize / 2;
    this.headingText.position.set(offsetX + width / 2, headingY);

    this.puzzleOriginX = offsetX + (width - puzzleSize) / 2;
    this.puzzleOriginY = headingY + headingFontSize / 2 + this.margin * 3;

    this.leftPanel.position.set(offsetX + (width - leftPanelWidth) / 2, this.puzzleOriginY + puzzleSize + this.margin * 3);
    this.drawLeftPanel(this.leftPanelWidth, this.leftPanelHeight);

    for (const tile of this.tiles) {
      const targetX = this.puzzleOriginX + tile.col * this.tileSize;
      const targetY = this.puzzleOriginY + tile.row * this.tileSize;
      tile.targetX = targetX;
      tile.targetY = targetY;

      tile.image.width = this.tileSize;
      tile.image.height = this.tileSize;
      tile.ghost.width = this.tileSize;
      tile.ghost.height = this.tileSize;

      if (tile.placed || tile.dragging) {
        tile.container.scale.set(1);
      } else {
        tile.container.scale.set(leftTileScale);
      }

      tile.ghost.position.set(targetX, targetY);
      tile.ghost.visible = !tile.placed;

      if (tile.placed && !tile.dragging) {
        tile.container.position.set(targetX, targetY);
      }
    }

    const missingTiles = this.tiles.filter(t => !t.placed);
    const orderedTiles = missingTiles.slice();
    this.shuffle(orderedTiles);
    const spacing = this.margin;
    const perRow = Math.max(1, tilesPerRow);
    const contentWidth = perRow * scaledWidth + spacing * (perRow + 1);
    const startX = spacing + Math.max(0, (leftPanelWidth - contentWidth) / 2);
    const startY = spacing;

    orderedTiles.forEach((t, idx) => {
      const row = Math.floor(idx / perRow);
      const col = idx % perRow;
      t.homeX = startX + col * (scaledWidth + spacing);
      t.homeY = startY + row * (scaledHeight + spacing);
      if (!t.dragging && !t.placed) {
        if (t.container.parent !== this.leftPanelContent) {
          const world = t.container.getGlobalPosition(new Point());
          this.leftPanelContent.addChild(t.container);
          t.container.position.copyFrom(this.leftPanelContent.toLocal(world));
        }
        t.container.position.set(t.homeX, t.homeY);
        t.container.scale.set(leftTileScale);
      }
    });

    const buttonScale = Math.max(0.3, this.calculatePlayButtonScale(dimensions) * 0.75);
    if (this.playButtonController) {
      this.playButtonController.setBaseScale(buttonScale);
    } else {
      this.playButton.scale.set(buttonScale);
    }
    const buttonHeight = this.playButtonBaseHeight * (this.playButton.scale.y || buttonScale);
    const buttonY = this.leftPanel.y + this.leftPanelHeight + this.margin * 2 + buttonHeight / 2;
    const finalButtonY = Math.min(offsetY + height - this.margin - buttonHeight / 2, buttonY);
    this.playButton.position.set(offsetX + width / 2, finalButtonY);

    this.contentContainer.scale.set(1);
    this.contentContainer.position.set(0, 0);

    this.refreshHandGuide();
  }
}
