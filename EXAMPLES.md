# Примеры использования

## Добавление нового ассета

### 1. Зарегистрируйте в GameConfig.ts

```typescript
// src/models/GameConfig.ts
export class GameConfig {
  // ... остальные константы
  
  // Добавьте ваш ассет
  public static readonly ASSET_PUZZLE_PIECE = 'puzzle_piece';
}
```

### 2. Добавьте в загрузчик

```typescript
// src/GameApplication.ts - метод loadAssets()
const assetsList: AssetConfig[] = [
  { name: GameConfig.ASSET_PUZZLE_PIECE, path: '/assets/images/puzzle_piece.png' },
];
```

### 3. Используйте в сцене

```typescript
// В любой сцене
const assetManager = AssetManager.getInstance();
const texture = assetManager.getAsset<Texture>(GameConfig.ASSET_PUZZLE_PIECE);
const sprite = new Sprite(texture);
sprite.position.set(100, 100);
this.addChild(sprite);
```

## Создание интерактивной кнопки

```typescript
import { Container, Sprite, Texture } from 'pixi.js';
import { ButtonController } from '@controllers/ButtonController';

// Создайте контейнер с кнопкой
const button = new Container();
const buttonSprite = new Sprite(Texture.from('button_texture'));
buttonSprite.anchor.set(0.5);
button.addChild(buttonSprite);

// Добавьте интерактивность
const buttonController = new ButtonController(button, {
  onPress: () => {
    console.log('Button pressed!');
    // Ваша логика здесь
  },
  enablePulse: true,      // Пульсация
  enableHover: true,      // Эффект при наведении
  scale: 1,
});

// Не забудьте очистить при уничтожении
buttonController.dispose();
```

## Работа с анимациями (GSAP)

```typescript
import gsap from 'gsap';

// Простая анимация появления
gsap.from(sprite, {
  alpha: 0,
  duration: 0.5,
  ease: 'power2.out',
});

// Анимация движения
gsap.to(sprite.position, {
  x: 500,
  y: 300,
  duration: 1,
  ease: 'back.out(1.7)',
});

// Анимация с повторением
gsap.to(sprite.scale, {
  x: 1.2,
  y: 1.2,
  duration: 1,
  repeat: -1,        // Бесконечно
  yoyo: true,        // Туда-обратно
  ease: 'sine.inOut',
});

// Последовательность анимаций (timeline)
const timeline = gsap.timeline();
timeline
  .to(sprite, { alpha: 0, duration: 0.3 })
  .to(sprite.position, { y: -100, duration: 0.5 })
  .to(sprite, { alpha: 1, duration: 0.3 });
```

## Создание новой сцены

```typescript
// src/scenes/MyNewScene.ts
import { Scene } from './Scene';
import { GameDimensions } from '@utils/ResponsiveManager';

export class MyNewScene extends Scene {
  constructor() {
    super();
  }

  public async init(): Promise<void> {
    // Инициализация элементов сцены
    this.createElements();
    this.resize(this.dimensions);
  }

  private createElements(): void {
    // Создайте ваши элементы здесь
  }

  protected onResize(dimensions: GameDimensions): void {
    // Обработка изменения размеров
    const { width, height } = dimensions;
    // Позиционируйте элементы
  }

  protected onUpdate(deltaTime: number): void {
    // Логика обновления каждый кадр (опционально)
  }

  public dispose(): void {
    // Очистка ресурсов
    super.dispose();
  }
}
```

### Регистрация новой сцены

```typescript
// src/GameApplication.ts - метод createScenes()
const myNewScene = new MyNewScene();
this.sceneManager.addScene('my_scene', myNewScene);

// Переключение на сцену
this.sceneManager.switchTo('my_scene');
```

## Добавление звука

```typescript
// 1. Зарегистрируйте звук
// src/models/GameConfig.ts
public static readonly SOUND_CLICK = 'click_sound';

// 2. Загрузите звук
// src/GameApplication.ts
{ name: GameConfig.SOUND_CLICK, path: '/assets/sounds/click.mp3' }

// 3. Используйте звук
const assetManager = AssetManager.getInstance();
const sound = assetManager.getAsset<HTMLAudioElement>(GameConfig.SOUND_CLICK);

// Воспроизведение
sound.play();

// Для более продвинутой работы со звуком можно использовать howler.js или pixi-sound
```

## Переход между сценами с анимацией

```typescript
import { SceneManager } from '@scenes/SceneManager';
import gsap from 'gsap';

// Плавный переход с fade
async function fadeTransition(toScene: string) {
  const sceneManager = SceneManager.getInstance();
  const currentScene = sceneManager.getCurrentScene();
  
  if (currentScene) {
    // Затемнение текущей сцены
    await gsap.to(currentScene, {
      alpha: 0,
      duration: 0.3,
    });
  }
  
  // Переключение
  await sceneManager.switchTo(toScene);
  
  const newScene = sceneManager.getCurrentScene();
  if (newScene) {
    newScene.alpha = 0;
    // Появление новой сцены
    await gsap.to(newScene, {
      alpha: 1,
      duration: 0.3,
    });
  }
}

// Использование
fadeTransition(GameConfig.SCENE_GAME);
```

## Работа с текстом

```typescript
import { Text, TextStyle } from 'pixi.js';

// Создание стилизованного текста
const style = new TextStyle({
  fontFamily: 'Arial, sans-serif',
  fontSize: 48,
  fontWeight: 'bold',
  fill: 0xFFFFFF,           // Цвет
  stroke: 0x000000,          // Обводка
  strokeThickness: 4,
  dropShadow: true,          // Тень
  dropShadowColor: 0x000000,
  dropShadowBlur: 4,
  dropShadowDistance: 2,
  wordWrap: true,            // Перенос строк
  wordWrapWidth: 400,
  align: 'center',
});

const text = new Text('Hello World!', style);
text.anchor.set(0.5);
text.position.set(width / 2, height / 2);
this.addChild(text);
```

## Drag & Drop

```typescript
import { Sprite } from 'pixi.js';

// Настройка Drag & Drop для спрайта
function setupDragDrop(sprite: Sprite) {
  sprite.eventMode = 'static';
  sprite.cursor = 'pointer';
  
  let dragData: any = null;

  sprite.on('pointerdown', (event) => {
    dragData = event.data;
    sprite.alpha = 0.5;
    dragData.dragging = true;
  });

  sprite.on('pointermove', (event) => {
    if (dragData && dragData.dragging) {
      const newPosition = dragData.getLocalPosition(sprite.parent);
      sprite.position.set(newPosition.x, newPosition.y);
    }
  });

  sprite.on('pointerup', () => {
    if (dragData) {
      sprite.alpha = 1;
      dragData.dragging = false;
      dragData = null;
    }
  });

  sprite.on('pointerupoutside', () => {
    if (dragData) {
      sprite.alpha = 1;
      dragData.dragging = false;
      dragData = null;
    }
  });
}
```

## Проверка столкновений

```typescript
import { Sprite } from 'pixi.js';

function checkCollision(sprite1: Sprite, sprite2: Sprite): boolean {
  const bounds1 = sprite1.getBounds();
  const bounds2 = sprite2.getBounds();

  return bounds1.x < bounds2.x + bounds2.width &&
         bounds1.x + bounds1.width > bounds2.x &&
         bounds1.y < bounds2.y + bounds2.height &&
         bounds1.y + bounds1.height > bounds2.y;
}

// Использование
if (checkCollision(pieceA, pieceB)) {
  console.log('Collision detected!');
}
```

## Полезные утилиты

```typescript
// Генерация случайного числа
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Линейная интерполяция
function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

// Расстояние между точками
function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Проверка нахождения точки в круге
function isPointInCircle(
  px: number, py: number,
  cx: number, cy: number,
  radius: number
): boolean {
  return distance(px, py, cx, cy) <= radius;
}
```

---

Эти примеры помогут вам быстро начать работу с проектом! 🚀
