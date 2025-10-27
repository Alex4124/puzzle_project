import { Container } from 'pixi.js';
import { Scene } from './Scene';
import { GameDimensions } from '@utils/ResponsiveManager';

export class SceneManager {
  private static instance: SceneManager;
  private container: Container;
  private scenes: Map<string, Scene> = new Map();
  private currentScene: Scene | null = null;
  private currentSceneName: string = '';

  private constructor(container: Container) {
    this.container = container;
  }

  public static getInstance(container?: Container): SceneManager {
    if (!SceneManager.instance && container) {
      SceneManager.instance = new SceneManager(container);
    }
    return SceneManager.instance;
  }

  /**
   * Добавить сцену в менеджер
   */
  public addScene(name: string, scene: Scene): void {
    if (this.scenes.has(name)) {
      console.warn(`Scene "${name}" already exists`);
      return;
    }
    this.scenes.set(name, scene);
    scene.visible = false;
    this.container.addChild(scene);
  }

  /**
   * Переключиться на другую сцену
   */
  public async switchTo(sceneName: string): Promise<void> {
    const scene = this.scenes.get(sceneName);
    
    if (!scene) {
      console.error(`Scene "${sceneName}" not found`);
      return;
    }

    // Скрываем текущую сцену
    if (this.currentScene) {
      this.currentScene.hide();
    }

    // Инициализируем новую сцену если ещё не инициализирована
    if (!scene.visible && this.currentSceneName !== sceneName) {
      await scene.init();
    }

    // Показываем новую сцену
    scene.show();
    this.currentScene = scene;
    this.currentSceneName = sceneName;

    console.log(`✅ Switched to scene: ${sceneName}`);
  }

  /**
   * Получить текущую сцену
   */
  public getCurrentScene(): Scene | null {
    return this.currentScene;
  }

  /**
   * Обновить размеры для всех сцен
   */
  public resize(dimensions: GameDimensions): void {
    this.scenes.forEach(scene => {
      scene.resize(dimensions);
    });
  }

  /**
   * Обновление логики текущей сцены
   */
  public update(deltaTime: number): void {
    if (this.currentScene) {
      this.currentScene.update(deltaTime);
    }
  }
}
