import '@testing-library/jest-dom/vitest'

// jsdomにはmatchMediaがないため、内部で利用するAstryxのDateInput向けに
// デスクトップ表示として応答する最小限のモックを用意する。
Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: (media: string): MediaQueryList => ({
    matches: false,
    media,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
})
