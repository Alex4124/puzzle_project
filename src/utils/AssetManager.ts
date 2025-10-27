import { Assets } from 'pixi.js';

export interface AssetConfig {
  name: string;
  path: string;
}

export class AssetManager {
  private static instance: AssetManager;
  private assets: Map<string, any> = new Map();

  private constructor() {}

  public static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }

  /**
   * Добавить ассет для загрузки
   * После того как вы добавите изображения в папку assets/images,
   * зарегистрируйте их здесь
   */
  public async loadAssets(assetsList: AssetConfig[]): Promise<void> {
    try {
      // Регистрируем все ассеты
      assetsList.forEach(asset => {
        Assets.add(asset.name, asset.path);
      });

      // Загружаем все ассеты
      const loadedAssets = await Assets.load(assetsList.map(a => a.name));
      
      // Сохраняем в Map
      Object.keys(loadedAssets).forEach(key => {
        this.assets.set(key, loadedAssets[key]);
      });

      console.log('✅ All assets loaded successfully');
    } catch (error) {
      console.error('❌ Error loading assets:', error);
      throw error;
    }
  }

  /**
   * Получить загруженный ассет по имени
   */
  public getAsset<T = any>(name: string): T {
    const asset = this.assets.get(name);
    if (!asset) {
      console.warn(`Asset "${name}" not found`);
    }
    return asset;
  }

  /**
   * Проверить, загружен ли ассет
   */
  public hasAsset(name: string): boolean {
    return this.assets.has(name);
  }
}
