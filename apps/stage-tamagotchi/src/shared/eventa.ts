import { defineEventa, defineInvokeEventa } from '@moeru/eventa'

export const electronStartTrackMousePosition = defineInvokeEventa('eventa:invoke:electron:start-tracking-mouse-position')
export const electronStartDraggingWindow = defineInvokeEventa('eventa:invoke:electron:start-dragging-window')

export const electronOpenMainDevtools = defineInvokeEventa('eventa:invoke:electron:windows:main:devtools:open')
export const electronOpenSettings = defineInvokeEventa('eventa:invoke:electron:windows:settings:open')
export const electronOpenChat = defineInvokeEventa('eventa:invoke:electron:windows:chat:open')
export const electronOpenSettingsDevtools = defineInvokeEventa('eventa:invoke:electron:windows:settings:devtools:open')
export const electronOpenDevtoolsWindow = defineInvokeEventa<void, { route?: string }>('eventa:invoke:electron:windows:devtools:open')

export interface ElectronServerChannelTlsConfig {
  [key: string]: unknown
}
export const electronStartWebSocketServer = defineInvokeEventa<void, { websocketTlsConfig: ElectronServerChannelTlsConfig | null }>('eventa:invoke:electron:start-websocket-server')
export const electronRestartWebSocketServer = defineInvokeEventa<void, { websocketTlsConfig: ElectronServerChannelTlsConfig | null }>('eventa:invoke:electron:restart-websocket-server')
export interface ElectronServerChannelConfig {
  websocketTlsConfig: ElectronServerChannelTlsConfig | null
}
export const electronGetServerChannelConfig = defineInvokeEventa<ElectronServerChannelConfig>('eventa:invoke:electron:server-channel:get-config')
export const electronApplyServerChannelConfig = defineInvokeEventa<ElectronServerChannelConfig, Partial<ElectronServerChannelConfig>>('eventa:invoke:electron:server-channel:apply-config')

export const electronPluginList = defineInvokeEventa<PluginRegistrySnapshot>('eventa:invoke:electron:plugins:list')
export const electronPluginSetEnabled = defineInvokeEventa<PluginRegistrySnapshot, { name: string, enabled: boolean, path?: string }>('eventa:invoke:electron:plugins:set-enabled')
export const electronPluginLoadEnabled = defineInvokeEventa<PluginRegistrySnapshot>('eventa:invoke:electron:plugins:load-enabled')
export const electronPluginLoad = defineInvokeEventa<PluginRegistrySnapshot, { name: string }>('eventa:invoke:electron:plugins:load')
export const electronPluginUnload = defineInvokeEventa<PluginRegistrySnapshot, { name: string }>('eventa:invoke:electron:plugins:unload')
export const electronPluginInspect = defineInvokeEventa<PluginHostDebugSnapshot>('eventa:invoke:electron:plugins:inspect')
export const electronPluginUpdateCapability = defineInvokeEventa<PluginCapabilityState, PluginCapabilityPayload>('eventa:invoke:electron:plugins:capability:update')

export const pluginProtocolListProvidersEventName = 'proj-airi:plugin-sdk:apis:protocol:resources:providers:list-providers'
export const pluginProtocolListProviders = defineInvokeEventa<Array<{ name: string }>>(pluginProtocolListProvidersEventName)

export const captionIsFollowingWindowChanged = defineEventa<boolean>('eventa:event:electron:windows:caption-overlay:is-following-window-changed')
export const captionGetIsFollowingWindow = defineInvokeEventa<boolean>('eventa:invoke:electron:windows:caption-overlay:get-is-following-window')

export type RequestWindowActionDefault = 'confirm' | 'cancel' | 'close'
export interface RequestWindowPayload {
  id?: string
  route: string
  type?: string
  payload?: Record<string, any>
}
export interface RequestWindowPending {
  id: string
  type?: string
  payload?: Record<string, any>
}

// Reference window helpers are generic; callers can alias for clarity
export type NoticeAction = 'confirm' | 'cancel' | 'close'

export function createRequestWindowEventa(namespace: string) {
  const prefix = (name: string) => `eventa:${name}:electron:windows:${namespace}`
  return {
    openWindow: defineInvokeEventa<boolean, RequestWindowPayload>(prefix('invoke:open')),
    windowAction: defineInvokeEventa<void, { id: string, action: RequestWindowActionDefault }>(prefix('invoke:action')),
    pageMounted: defineInvokeEventa<RequestWindowPending | undefined, { id?: string }>(prefix('invoke:page-mounted')),
    pageUnmounted: defineInvokeEventa<void, { id?: string }>(prefix('invoke:page-unmounted')),
  }
}

// Notice window events built from generic factory
export const noticeWindowEventa = createRequestWindowEventa('notice')

// Widgets / Adhoc window events
export interface WidgetsAddPayload {
  id?: string
  componentName: string
  componentProps?: Record<string, any>
  // size presets or explicit spans; renderer decides mapping
  size?: 's' | 'm' | 'l' | { cols?: number, rows?: number }
  // auto-dismiss in ms; if omitted, persistent until closed by user
  ttlMs?: number
}

export interface WidgetSnapshot {
  id: string
  componentName: string
  componentProps: Record<string, any>
  size: 's' | 'm' | 'l' | { cols?: number, rows?: number }
  ttlMs: number
}

export interface PluginManifestSummary {
  name: string
  entrypoints: Record<string, string | undefined>
  path: string
  enabled: boolean
  loaded: boolean
  isNew: boolean
}

export interface PluginRegistrySnapshot {
  root: string
  plugins: PluginManifestSummary[]
}

export interface PluginCapabilityPayload {
  key: string
  state: 'announced' | 'ready'
  metadata?: Record<string, unknown>
}

export interface PluginCapabilityState {
  key: string
  state: 'announced' | 'ready'
  metadata?: Record<string, unknown>
  updatedAt: number
}

export interface PluginHostSessionSummary {
  id: string
  manifestName: string
  phase: string
  runtime: 'electron' | 'node' | 'web'
  moduleId: string
}

export interface PluginHostDebugSnapshot {
  registry: PluginRegistrySnapshot
  sessions: PluginHostSessionSummary[]
  capabilities: PluginCapabilityState[]
  refreshedAt: number
}

export const widgetsOpenWindow = defineInvokeEventa<void, { id?: string }>('eventa:invoke:electron:windows:widgets:open')
export const widgetsAdd = defineInvokeEventa<string | undefined, WidgetsAddPayload>('eventa:invoke:electron:windows:widgets:add')
export const widgetsRemove = defineInvokeEventa<void, { id: string }>('eventa:invoke:electron:windows:widgets:remove')
export const widgetsClear = defineInvokeEventa('eventa:invoke:electron:windows:widgets:clear')
export const widgetsUpdate = defineInvokeEventa<void, { id: string, componentProps?: Record<string, any> }>('eventa:invoke:electron:windows:widgets:update')
export const widgetsFetch = defineInvokeEventa<WidgetSnapshot | void, { id: string }>('eventa:invoke:electron:windows:widgets:fetch')
export const widgetsPrepareWindow = defineInvokeEventa<string | undefined, { id?: string }>('eventa:invoke:electron:windows:widgets:prepare')

// Internal event from main -> widgets renderer when a widget should render
export const widgetsRenderEvent = defineEventa<WidgetSnapshot>('eventa:event:electron:windows:widgets:render')
export const widgetsRemoveEvent = defineEventa<{ id: string }>('eventa:event:electron:windows:widgets:remove')
export const widgetsClearEvent = defineEventa('eventa:event:electron:windows:widgets:clear')
export const widgetsUpdateEvent = defineEventa<{ id: string, componentProps?: Record<string, any> }>('eventa:event:electron:windows:widgets:update')

export { electron } from '@proj-airi/electron-eventa'
export * from '@proj-airi/electron-eventa/electron-updater'

// ── Computer Use ──────────────────────────────────────────────────────────────
// Contracts for AI-driven desktop automation: screenshot, mouse, keyboard.

export interface ComputerUseScreenshotResult {
  /** PNG image data encoded as a base64 data URL */
  dataUrl: string
  width: number
  height: number
}

export interface ComputerUseMousePayload {
  x: number
  y: number
  /** Mouse button to click (default: 'left') */
  button?: 'left' | 'right' | 'middle'
  /** Number of clicks (default: 1) */
  clicks?: number
}

export interface ComputerUseScrollPayload {
  x: number
  y: number
  /** Positive = scroll down, negative = scroll up */
  deltaY: number
}

export const computerUseScreenshot = defineInvokeEventa<ComputerUseScreenshotResult>(
  'eventa:invoke:computer-use:screenshot',
)
export const computerUseMouseMove = defineInvokeEventa<void, { x: number, y: number }>(
  'eventa:invoke:computer-use:mouse:move',
)
export const computerUseMouseClick = defineInvokeEventa<void, ComputerUseMousePayload>(
  'eventa:invoke:computer-use:mouse:click',
)
export const computerUseKeyboardType = defineInvokeEventa<void, { text: string }>(
  'eventa:invoke:computer-use:keyboard:type',
)
export const computerUseKeyboardPress = defineInvokeEventa<void, { keys: string[] }>(
  'eventa:invoke:computer-use:keyboard:press',
)
export const computerUseGetCursorPos = defineInvokeEventa<{ x: number, y: number }>(
  'eventa:invoke:computer-use:cursor:position',
)
export const computerUseGetScreenSize = defineInvokeEventa<{ width: number, height: number }>(
  'eventa:invoke:computer-use:screen:size',
)

// ── Browser Automation ───────────────────────────────────────────────────────
// Contracts for AI-driven web automation: navigate, fill, click, read pages.
// Powered by a headless Electron BrowserWindow — no Puppeteer/Playwright needed.

export interface BrowserAutoElement {
  tag: string
  id?: string
  name?: string
  type?: string
  placeholder?: string
  value?: string
  text?: string
  href?: string
  selector: string
}

export interface BrowserAutoPageInfo {
  url: string
  title: string
  readyState: string
}

export const browserAutoNavigate = defineInvokeEventa<BrowserAutoPageInfo, { url: string, waitMs?: number }>(
  'eventa:invoke:browser-auto:navigate',
)
export const browserAutoGetPageInfo = defineInvokeEventa<BrowserAutoPageInfo>(
  'eventa:invoke:browser-auto:page-info',
)
export const browserAutoGetHtml = defineInvokeEventa<{ html: string, url: string }>(
  'eventa:invoke:browser-auto:get-html',
)
export const browserAutoFindElements = defineInvokeEventa<BrowserAutoElement[], { selector: string, limit?: number }>(
  'eventa:invoke:browser-auto:find-elements',
)
export const browserAutoFillInput = defineInvokeEventa<{ success: boolean }, { selector: string, value: string }>(
  'eventa:invoke:browser-auto:fill-input',
)
export const browserAutoClick = defineInvokeEventa<{ success: boolean }, { selector: string }>(
  'eventa:invoke:browser-auto:click',
)
export const browserAutoEval = defineInvokeEventa<{ result: unknown }, { js: string }>(
  'eventa:invoke:browser-auto:eval',
)
export const browserAutoClose = defineInvokeEventa<void>(
  'eventa:invoke:browser-auto:close',
)
