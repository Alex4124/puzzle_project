import { Container, FederatedPointerEvent, Graphics, RenderTexture, Sprite, Texture } from 'pixi.js';
import { Scene } from './Scene';
import { GameDimensions } from '@utils/ResponsiveManager';
import { GameConfig } from '@models/GameConfig';
import { AssetManager } from '@utils/AssetManager';
import gsap from 'gsap';
import { SceneManager } from './SceneManager';

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

  constructor() {
    super();
  }

  public async init(): Promise<void> {
    this.createBackground();
    this.ghostContainer = new Container();
    this.tilesContainer = new Container();
    this.leftPanel = new Container();

    this.addChild(this.ghostContainer);
    this.addChild(this.tilesContainer);
    this.addChild(this.leftPanel);

    this.setupPuzzle();
    this.resize(this.dimensions);
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

    // Выбираем 4 уникальных случайных индекса от 0 до 15
    const indices = Array.from({ length: this.GRID_SIZE * this.GRID_SIZE }, (_, i) => i);
    this.shuffle(indices);
    this.missingIndices = indices.slice(0, 4).sort((a, b) => a - b);

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
      this.tilesContainer.addChild(container);

      if (tile.isMissing) {
        this.makeTileDraggable(tile);
      } else {
        // Неинтерактивные уже установленные тайлы
        container.eventMode = 'none';
      }
    }
  }

  private makeTileDraggable(tile: TileData): void {
    tile.container.eventMode = 'static';
    tile.container.cursor = 'pointer';

    const onDown = (e: FederatedPointerEvent) => {
      tile.dragging = true;
      const local = this.toLocal(e.global);
      tile.dragOffsetX = local.x - tile.container.x;
      tile.dragOffsetY = local.y - tile.container.y;
      this.tilesContainer.addChild(tile.container); // на верх
      gsap.to(tile.container, { alpha: 0.9, duration: 0.1 });
      tile.container.cursor = 'grabbing';
    };

    const onMove = (e: FederatedPointerEvent) => {
      if (!tile.dragging) return;
      const local = this.toLocal(e.global);
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
        tile.ghost.visible = false;
        this.checkCompletion();
      } else {
        // Возвращаем в левую панель
        gsap.to(tile.container, {
          x: tile.homeX,
          y: tile.homeY,
          alpha: 1,
          duration: 0.2,
          ease: 'power2.out',
        });
      }
    };

    tile.container.on('pointerdown', onDown);
    tile.container.on('pointermove', onMove);
    tile.container.on('pointerup', onUp);
    tile.container.on('pointerupoutside', onUp);
  }

  protected onResize(dimensions: GameDimensions): void {
    const { width, height } = dimensions;

    // Фон на весь экран
    this.background.clear();
    this.background.beginFill(GameConfig.BACKGROUND_COLOR);
    this.background.drawRect(0, 0, width, height);
    this.background.endFill();

    // Адаптивный лэйаут
    this.margin = Math.max(16, Math.round(Math.min(width, height) * 0.02));
    let puzzleSize = Math.min(width * 0.75, height * 0.85);
    let tileSize = puzzleSize / this.GRID_SIZE;
    let leftPanelWidth = tileSize + this.margin * 2;

    const needWidth = puzzleSize + leftPanelWidth + this.margin * 2;
    if (needWidth > width) {
      puzzleSize = Math.max(100, width - leftPanelWidth - this.margin * 2);
      tileSize = puzzleSize / this.GRID_SIZE;
      leftPanelWidth = tileSize + this.margin * 2;
    }

    this.puzzleSize = puzzleSize;
    this.tileSize = tileSize;
    this.leftPanelWidth = leftPanelWidth;
    this.puzzleOriginX = leftPanelWidth + this.margin;
    this.puzzleOriginY = Math.max(this.margin, (height - puzzleSize) / 2);

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

      // Призрак всегда в ячейке. Видимость зависит от placed
      tile.ghost.position.set(targetX, targetY);
      tile.ghost.visible = !tile.placed;

      if (tile.placed && !tile.dragging) {
        // Зафиксированный тайл — в своей ячейке
        tile.container.position.set(targetX, targetY);
      }
    }

    // Разложим отсутствующие тайлы в левой панели, по вертикали
    const missingTiles = this.tiles.filter(t => !t.placed);
    const availableHeight = this.puzzleSize;
    const spacing = Math.max(8, (availableHeight - missingTiles.length * this.tileSize) / (missingTiles.length + 1));
    const startY = this.puzzleOriginY + spacing;
    const homeX = this.margin + (this.leftPanelWidth - this.tileSize) / 2;

    missingTiles.forEach((t, idx) => {
      t.homeX = homeX;
      t.homeY = startY + idx * (this.tileSize + spacing);
      if (!t.dragging && !t.placed) {
        t.container.position.set(t.homeX, t.homeY);
      }
    });
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
    this.isTransitioning = true;

    // Отключаем взаимодействия
    this.tiles.forEach(t => (t.container.eventMode = 'none'));

    // Небольшой "поп" и затем затемнение сцены
    const tl = gsap.timeline({
      defaults: { ease: 'power2.out' },
      onComplete: async () => {
        const sceneManager = SceneManager.getInstance();
        await sceneManager.switchTo(GameConfig.SCENE_PACKSHOT);
      },
    });

    tl.to(this.ghostContainer, { alpha: 0, duration: 0.2 })
      .to(this.tilesContainer.scale, { x: 1.05, y: 1.05, duration: 0.15 })
      .to(this.tilesContainer.scale, { x: 1.0, y: 1.0, duration: 0.15 })
      .to(this, { alpha: 0, duration: 0.35, ease: 'power1.inOut' }, '>-0.05');
  }

  /**
   * Доступ к app.renderer для создания текстур
   */
  private get app() {
    // Получаем renderer из текущей stage
    return this.parent?.parent as any;
  }
}