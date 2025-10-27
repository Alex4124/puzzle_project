import { Application, Container } from 'pixi.js';
import { AssetManager, AssetConfig } from '@utils/AssetManager';
import { ResponsiveManager } from '@utils/ResponsiveManager';
import { SceneManager } from '@scenes/SceneManager';
import { IntroScene } from '@scenes/IntroScene';
import { GameScene } from '@scenes/GameScene';
import { PackshotScene } from '@scenes/PackshotScene';
import { GameConfig } from '@models/GameConfig';

/**
 * Главный класс приложения
 */
export class GameApplication {
  private app!: Application;
  private responsiveManager!: ResponsiveManager;
  private sceneManager!: SceneManager;
  private sceneContainer!: Container;

  /**
   * Инициализация приложения
   */
  public async init(): Promise<void> {
    this.createApplication();
    this.setupResponsive();
    await this.loadAssets();
    this.createScenes();
    this.startGameLoop();

    // Запускаем интро-сцену
    await this.sceneManager.switchTo(GameConfig.SCENE_INTRO);
  }

  /**
   * Создание PIXI Application
   */
  private createApplication(): void {
    this.app = new Application({
      backgroundColor: GameConfig.BACKGROUND_COLOR,
      resizeTo: window,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true,
    });

    // Добавляем canvas в DOM
    const container = document.getElementById('game-container');
    if (container) {
      const view = this.app.view;
      if (view instanceof HTMLCanvasElement) {
        container.appendChild(view);
      }
    }

    console.log('✅ PIXI Application created');
  }

  /**
   * Настройка адаптивности
   */
  private setupResponsive(): void {
    this.responsiveManager = new ResponsiveManager(this.app);
    
    this.responsiveManager.onResize((dimensions) => {
      if (this.sceneManager) {
        this.sceneManager.resize(dimensions);
      }
    });

    console.log('✅ Responsive manager initialized');
  }

  /**
   * Загрузка ассетов
   * Добавьте свои ассеты в этот массив после того, как поместите их в папку assets
   */
  private async loadAssets(): Promise<void> {
    const assetManager = AssetManager.getInstance();

    // Список ассетов для загрузки
    const assetsList: AssetConfig[] = [
      // Раскомментируйте и добавьте свои ассеты:
      { name: GameConfig.ASSET_LOGO, path: '/assets/images/logo.png' },
      { name: GameConfig.ASSET_START_BUTTON, path: '/assets/images/start_button.png' },
      { name: GameConfig.ASSET_BACKGROUND, path: '/assets/images/background.jpg' },
    ];

    if (assetsList.length > 0) {
      await assetManager.loadAssets(assetsList);
    } else {
      console.log('⚠️ No assets to load. Add your assets to the assets folder and register them here.');
    }
  }

  /**
   * Создание всех сцен
   */
  private createScenes(): void {
    this.sceneContainer = new Container();
    this.app.stage.addChild(this.sceneContainer);

    this.sceneManager = SceneManager.getInstance(this.sceneContainer);

    // Создаём и регистрируем сцены
    const introScene = new IntroScene();
    const gameScene = new GameScene();
    const packshotScene = new PackshotScene();

    this.sceneManager.addScene(GameConfig.SCENE_INTRO, introScene);
    this.sceneManager.addScene(GameConfig.SCENE_GAME, gameScene);
    this.sceneManager.addScene(GameConfig.SCENE_PACKSHOT, packshotScene);

    console.log('✅ Scenes created');
  }

  /**
   * Запуск игрового цикла
   */
  private startGameLoop(): void {
    this.app.ticker.add((deltaTime) => {
      this.sceneManager.update(deltaTime);
    });

    console.log('✅ Game loop started');
  }

  /**
   * Получить PIXI Application
   */
  public getApp(): Application {
    return this.app;
  }
}
