/**
 * `XMLHttpRequest` falso para tests de subida (Fase 7d, UC-09): jsdom no
 * emite `upload.onprogress` ni `onload` reales. Cada instancia se registra en
 * `XhrFalso.instancias` y el test la dirige con `progreso()`, `responder()`,
 * `fallarRed()`.
 */
export class XhrFalso {
  static instancias: XhrFalso[] = []

  static reiniciar() {
    XhrFalso.instancias = []
  }

  static instalar() {
    XhrFalso.reiniciar()
    ;(globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = XhrFalso
  }

  method = ''
  url = ''
  withCredentials = false
  body: unknown = null
  abortado = false
  status = 0
  responseText = ''
  upload: { onprogress: ((e: ProgressEvent) => void) | null } = { onprogress: null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null

  constructor() {
    XhrFalso.instancias.push(this)
  }

  open(method: string, url: string) {
    this.method = method
    this.url = url
  }

  send(body: unknown) {
    this.body = body
  }

  abort() {
    this.abortado = true
    this.onabort?.()
  }

  progreso(loaded: number, total: number) {
    this.upload.onprogress?.({ lengthComputable: true, loaded, total } as ProgressEvent)
  }

  responder(status: number, cuerpo: unknown) {
    this.status = status
    this.responseText = JSON.stringify(cuerpo)
    this.onload?.()
  }

  fallarRed() {
    this.onerror?.()
  }
}
