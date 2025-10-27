# Magic Jigsaw Puzzles Playable

Playable-реклама на TypeScript + PixiJS с MVC архитектурой.

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Запуск проекта в режиме разработки

```bash
npm run dev
```

Откроется браузер с адресом `http://localhost:3000`

### 3. Сборка финального HTML

```bash
npm run build
```

Результат будет в папке `dist/` - один HTML файл со всеми встроенными ассетами.

## 📁 Структура проекта

```
magic-jigsaw-playable/
├── src/
│   ├── models/           # Модели данных (MVC)
│   │   └── GameConfig.ts # Конфигурация игры
│   ├── views/            # Представления (пока пустая)
│   ├── controllers/      # Контроллеры (MVC)
│   │   └── ButtonController.ts
│   ├── scenes/           # Игровые сцены
│   │   ├── Scene.ts           # Базовый класс сцены
│   │   ├── SceneManager.ts    # Менеджер сцен
│   │   ├── IntroScene.ts      # Интро-сцена ✅
│   │   ├── GameScene.ts       # Игровая сцена (TODO)
│   │   └── PackshotScene.ts   # Packshot-сцена (TODO)
│   ├── utils/            # Утилиты
│   │   ├── AssetManager.ts    # Управление ассетами
│   │   └── ResponsiveManager.ts # Адаптивность
│   ├── GameApplication.ts # Главный класс приложения
│   └── main.ts           # Точка входа
├── assets/
│   ├── images/          # Поместите сюда ваши изображения
│   └── sounds/          # Поместите сюда ваши звуки
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🎨 Добавление ваших ассетов

### Шаг 1: Добавьте файлы в папку assets

Поместите ваши изображения в:
- `assets/images/logo.png` - логотип
- `assets/images/start_button.png` - кнопка Start
- `assets/images/background.jpg` - фон
- и другие...

### Шаг 2: Зарегистрируйте ассеты в GameConfig

Откройте `src/models/GameConfig.ts` и добавьте константы:

```typescript
public static readonly ASSET_YOUR_IMAGE = 'your_image';
```

### Шаг 3: Добавьте ассеты в загрузчик

Откройте `src/GameApplication.ts`, найдите метод `loadAssets()` и добавьте:

```typescript
const assetsList: AssetConfig[] = [
  { name: GameConfig.ASSET_LOGO, path: '/assets/images/logo.png' },
  { name: GameConfig.ASSET_START_BUTTON, path: '/assets/images/start_button.png' },
  { name: GameConfig.ASSET_BACKGROUND, path: '/assets/images/background.jpg' },
  // Добавьте свои ассеты здесь
];
```

### Шаг 4: Используйте ассеты в сцене

В любой сцене (например, `IntroScene.ts`):

```typescript
const assetManager = AssetManager.getInstance();
const texture = assetManager.getAsset<Texture>(GameConfig.ASSET_YOUR_IMAGE);
const sprite = new Sprite(texture);
```

## 🎮 Реализованные функции

### ✅ Интро-сцена
- Фон единого цвета для всех сцен
- Логотип в левом верхнем углу (с placeholder'ом)
- Текст "Solve the puzzle"
- Кнопка Start с пульсацией
- Переход к игровой сцене при нажатии

### ✅ Адаптивность
- Поддержка вертикальной и горизонтальной ориентации
- Автоматическая адаптация под размер экрана
- Responsive дизайн для всех элементов

### ✅ MVC архитектура
- **Models**: `GameConfig` для конфигурации
- **Views**: Сцены (`IntroScene`, `GameScene`, `PackshotScene`)
- **Controllers**: `ButtonController` для интерактивных элементов

### ✅ Производительность
- Использование PixiJS для оптимизированного рендеринга
- GSAP для плавных анимаций
- Эффективное управление ресурсами

## 📝 Что дальше?

### TODO: Игровая сцена (`GameScene.ts`)
1. Реализовать логику пазла
2. Добавить кусочки пазла
3. Реализовать drag & drop
4. Добавить проверку правильности расположения
5. Переход к packshot при завершении

### TODO: Packshot-сцена (`PackshotScene.ts`)
1. Показать финальное изображение/логотип
2. Добавить CTA-кнопку
3. Добавить анимацию появления

### TODO: Дополнительно
- Добавить звуковые эффекты
- Добавить партиклы (если нужны)
- Оптимизация размера финального файла

## 🛠 Технические детали

### Зависимости
- **PixiJS 7.3.2** - 2D WebGL рендеринг
- **GSAP 3.12.4** - анимации
- **TypeScript 5.3.3** - типизация
- **Vite 5.0.8** - сборщик
- **vite-plugin-singlefile** - встраивание всех ассетов

### Особенности сборки
- Все ассеты автоматически конвертируются в base64 и встраиваются в HTML
- Финальный файл - один HTML без внешних зависимостей
- CSS и JS тоже inline

### Размер финального файла
- Текущий размер без ассетов: ~200-300 KB
- С ассетами: зависит от размера изображений
- Рекомендуется оптимизировать изображения перед добавлением

## 🎯 Рекомендации по оптимизации

1. **Изображения**:
   - Используйте WebP формат
   - Сжимайте изображения (TinyPNG, ImageOptim)
   - Оптимальный размер: 1080x1920 для вертикальной ориентации

2. **Звуки**:
   - Используйте MP3 с битрейтом 128kbps
   - Длительность эффектов: до 1-2 секунд

3. **Код**:
   - Vite автоматически минифицирует код
   - Избегайте неиспользуемых зависимостей

## 📚 Полезные ссылки

- [PixiJS Documentation](https://pixijs.com/docs)
- [GSAP Documentation](https://greensock.com/docs/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## 💡 Советы

1. Всегда запускайте `npm run dev` во время разработки для hot reload
2. Проверяйте размер файла после каждой сборки: `ls -lh dist/index.html`
3. Тестируйте на разных разрешениях и ориентациях
4. Используйте Chrome DevTools для проверки производительности

---

Удачи в создании playable! 🎮✨
