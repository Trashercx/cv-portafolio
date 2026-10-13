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
  // `motion` (`whileInView`/`useInView`) y `BloqueNavegacion` usan
  // `IntersectionObserver`, que jsdom no trae (Fase 7, 7.3). Stub inerte: los
  // tests que necesitan disparar entradas lo reemplazan con su propio mock.
  if (!window.IntersectionObserver) {
    window.IntersectionObserver = class IntersectionObserver {
      readonly root = null
      readonly rootMargin = ''
      readonly thresholds = []
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    } as unknown as typeof window.IntersectionObserver
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
