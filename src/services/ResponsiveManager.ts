import { Application } from 'pixi.js';
import { GameConfig } from '@models/GameConfig';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameDimensions {
  width: number;        // viewport width in CSS pixels
  height: number;       // viewport height in CSS pixels
  scale: number;        // scale factor vs design resolution inside safe area
  isPortrait: boolean;  // true if portrait orientation
  safe: Rect;           // safe content rect (excludes notches/system UI)
  resolution: number;   // renderer resolution (devicePixelRatio)
  dpi: number;          // alias for devicePixelRatio
}

export class ResponsiveManager {
  private app: Application;
  private designWidth = GameConfig.DESIGN_WIDTH;
  private designHeight = GameConfig.DESIGN_HEIGHT;
  private onResizeCallback?: (dimensions: GameDimensions) => void;
  private lastDimensions?: GameDimensions;
  private rafPending = false;

  constructor(app: Application) {
    this.app = app;
    this.setupResize();
  }

  /**
   * Subscribe browser events and trigger initial layout measurement.
   */
  private setupResize(): void {
    const schedule = () => {
      if (this.rafPending) return;
      this.rafPending = true;
      requestAnimationFrame(() => {
        this.rafPending = false;
        this.handleResize();
      });
    };

    window.addEventListener('resize', schedule, { passive: true } as any);
    window.addEventListener('orientationchange', () => setTimeout(schedule, 60));
    // Some mobile browsers update visualViewport separately
    if ((window as any).visualViewport) {
      (window as any).visualViewport.addEventListener('resize', schedule, { passive: true } as any);
      (window as any).visualViewport.addEventListener('scroll', schedule, { passive: true } as any);
    }

    // Initial measurement
    this.handleResize();
  }

  /**
   * Compute layout, resize renderer and notify subscribers.
   */
  private handleResize(): void {
    const dimensions = this.calculateDimensions();

    // Keep renderer sized to the full viewport; PIXI may already do this via resizeTo
    if (this.app?.renderer) {
      this.app.renderer.resize(dimensions.width, dimensions.height);
    }

    this.lastDimensions = dimensions;
    if (this.onResizeCallback) this.onResizeCallback(dimensions);
  }

  /**
   * Measure viewport, safe area insets and compute content scale vs design.
   */
  public calculateDimensions(): GameDimensions {
    const vv = (window as any).visualViewport;
    const windowWidth: number = Math.round((vv?.width ?? window.innerWidth) || document.documentElement.clientWidth || 0);
    const windowHeight: number = Math.round((vv?.height ?? window.innerHeight) || document.documentElement.clientHeight || 0);

    const insets = this.readSafeAreaInsets();
    const safeX = Math.max(0, insets.left);
    const safeY = Math.max(0, insets.top);
    const safeWidth = Math.max(0, windowWidth - insets.left - insets.right);
    const safeHeight = Math.max(0, windowHeight - insets.top - insets.bottom);

    // Orientation based on safe rect for stability
    const isPortrait = safeHeight >= safeWidth;

    // Orient-aware design frame: swap for landscape
    const targetWidth = isPortrait ? this.designWidth : this.designHeight;
    const targetHeight = isPortrait ? this.designHeight : this.designWidth;

    const scaleX = safeWidth / targetWidth;
    const scaleY = safeHeight / targetHeight;
    const scale = Math.max(0.0001, Math.min(scaleX, scaleY));

    const dpi = Math.max(1, window.devicePixelRatio || 1);

    return {
      width: windowWidth,
      height: windowHeight,
      scale,
      isPortrait,
      safe: { x: safeX, y: safeY, width: safeWidth, height: safeHeight },
      resolution: dpi,
      dpi,
    };
  }

  /**
   * Subscribe to resize updates. Immediately invokes with current dimensions.
   */
  public onResize(callback: (dimensions: GameDimensions) => void): void {
    this.onResizeCallback = callback;
    callback(this.getDimensions());
  }

  /**
   * Get last known dimensions or compute fresh if not available.
   */
  public getDimensions(): GameDimensions {
    if (this.lastDimensions) return this.lastDimensions;
    this.lastDimensions = this.calculateDimensions();
    return this.lastDimensions;
  }

  /**
   * Override design dimensions (e.g., if switching design reference).
   */
  public setDesignDimensions(width: number, height: number): void {
    this.designWidth = width;
    this.designHeight = height;
    this.handleResize();
  }

  /**
   * Read iOS/Android safe area insets via CSS env(). Fallback to 0s.
   */
  private readSafeAreaInsets(): { top: number; right: number; bottom: number; left: number } {
    // Create a transient element to materialize env(safe-area-inset-*) into pixels
    const el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.top = '0';
    el.style.left = '0';
    el.style.width = '0';
    el.style.height = '0';
    el.style.paddingTop = 'env(safe-area-inset-top)';
    el.style.paddingRight = 'env(safe-area-inset-right)';
    el.style.paddingBottom = 'env(safe-area-inset-bottom)';
    el.style.paddingLeft = 'env(safe-area-inset-left)';
    document.body.appendChild(el);
    const cs = window.getComputedStyle(el);
    const top = parseFloat(cs.paddingTop) || 0;
    const right = parseFloat(cs.paddingRight) || 0;
    const bottom = parseFloat(cs.paddingBottom) || 0;
    const left = parseFloat(cs.paddingLeft) || 0;
    document.body.removeChild(el);
    return { top, right, bottom, left };
  }
}

