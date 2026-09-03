import '@testing-library/jest-dom/vitest'

// jsdom no implementa `ResizeObserver` (usado por componentes Radix como
// Checkbox/Select) ni algunas APIs de puntero: se stubean globalmente para
// que cualquier test pueda montar esos componentes sin repetir el mock.
if (typeof window !== 'undefined') {
  if (!window.ResizeObserver) {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
  if (!window.HTMLElement.prototype.hasPointerCapture) {
    window.HTMLElement.prototype.hasPointerCapture = () => false
  }
  if (!window.HTMLElement.prototype.releasePointerCapture) {
    window.HTMLElement.prototype.releasePointerCapture = () => {}
  }
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = () => {}
  }
  // jsdom tampoco implementa `matchMedia`, usado por `useIsMobile`
  // (`use-mobile.ts`) dentro del bloque `Sidebar` de shadcn.
  if (!window.matchMedia) {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
  }
}
