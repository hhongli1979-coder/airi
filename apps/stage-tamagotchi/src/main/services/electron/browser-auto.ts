import type { createContext } from '@moeru/eventa/adapters/electron/main'
import type { BrowserWindow as BW } from 'electron'

import { defineInvokeHandler } from '@moeru/eventa'
import { BrowserWindow } from 'electron'

import {
  browserAutoClick,
  browserAutoClose,
  browserAutoEval,
  browserAutoFillInput,
  browserAutoFindElements,
  browserAutoGetHtml,
  browserAutoGetPageInfo,
  browserAutoNavigate,
} from '../../../shared/eventa'

const MAX_HTML_LENGTH = 80_000

/**
 * Singleton automation browser window.
 * Created lazily on first navigation, reused across calls.
 */
let automationWindow: BW | null = null

function getOrCreateBrowser(): BW {
  if (automationWindow && !automationWindow.isDestroyed()) {
    return automationWindow
  }

  automationWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    // NOTICE: Show the browser so the user can see what the AI is doing.
    // Set show: false for a fully headless mode (useful for server use).
    show: true,
    webPreferences: {
      // Use a dedicated partition so automation cookies/storage are isolated
      // from the AIRI renderer session, preventing credential cross-leaks.
      partition: 'persist:browser-auto',
      nodeIntegration: false,
      contextIsolation: true,
      javascript: true,
    },
    title: 'AIRI Browser Automation',
  })

  automationWindow.on('closed', () => {
    automationWindow = null
  })

  return automationWindow
}

/** Wait for the page to reach a ready state. */
function waitForLoad(win: BW, maxMs = 15_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Page load timed out')), maxMs)

    const check = () => {
      win.webContents.executeJavaScript('document.readyState').then((state: string) => {
        if (state === 'complete' || state === 'interactive') {
          clearTimeout(timeout)
          resolve()
        }
        else {
          setTimeout(check, 300)
        }
      }).catch(() => {
        clearTimeout(timeout)
        resolve() // best-effort
      })
    }

    win.webContents.once('did-finish-load', () => {
      clearTimeout(timeout)
      resolve()
    })
    win.webContents.once('did-fail-load', (_e, _code, desc) => {
      clearTimeout(timeout)
      reject(new Error(`Page failed to load: ${desc}`))
    })

    // If already loaded, resolve immediately
    win.webContents.executeJavaScript('document.readyState').then((state: string) => {
      if (state === 'complete') {
        clearTimeout(timeout)
        resolve()
      }
    }).catch(() => {})
  })
}

/**
 * JS snippet injected into the automation browser to find elements matching a
 * CSS selector and return serialisable descriptors.
 */
function findElementsScript(selector: string, limit: number): string {
  return `
    (() => {
      const els = [...document.querySelectorAll(${JSON.stringify(selector)})].slice(0, ${limit});
      return els.map((el, i) => {
        const tag = el.tagName.toLowerCase();
        const id = el.id || undefined;
        const name = el.getAttribute('name') || undefined;
        const type = el.getAttribute('type') || undefined;
        const placeholder = el.getAttribute('placeholder') || undefined;
        const value = el.value !== undefined ? el.value : undefined;
        const text = (el.textContent || '').trim().slice(0, 120) || undefined;
        const href = el.href || undefined;
        // Build a unique selector for this element
        let sel = tag;
        if (id) sel = '#' + id;
        else if (name) sel = tag + '[name=' + JSON.stringify(name) + ']';
        else sel = tag + ':nth-of-type(' + (i+1) + ')';
        return { tag, id, name, type, placeholder, value, text, href, selector: sel };
      });
    })()
  `
}

/**
 * Register all Browser Automation IPC handlers.
 *
 * The automation browser window is a fully visible Electron BrowserWindow so
 * the user can see (and if needed interrupt) whatever the AI is doing.
 */
export function createBrowserAutoService(params: {
  context: ReturnType<typeof createContext>['context']
  _window: BW
}) {
  const { context } = params

  defineInvokeHandler(context, browserAutoNavigate, async (payload) => {
    if (!payload)
      throw new Error('Navigation payload required')

    const browser = getOrCreateBrowser()
    await browser.webContents.loadURL(payload.url)
    await waitForLoad(browser, 15_000)

    if (payload.waitMs && payload.waitMs > 0) {
      await new Promise(resolve => setTimeout(resolve, payload.waitMs))
    }

    const url: string = browser.webContents.getURL()
    const title: string = browser.webContents.getTitle()
    const readyState: string = await browser.webContents.executeJavaScript('document.readyState')
    return { url, title, readyState }
  })

  defineInvokeHandler(context, browserAutoGetPageInfo, async () => {
    const browser = getOrCreateBrowser()
    const url: string = browser.webContents.getURL()
    const title: string = browser.webContents.getTitle()
    const readyState: string = await browser.webContents.executeJavaScript('document.readyState')
    return { url, title, readyState }
  })

  defineInvokeHandler(context, browserAutoGetHtml, async () => {
    const browser = getOrCreateBrowser()
    const html: string = await browser.webContents.executeJavaScript('document.documentElement.outerHTML')
    const url: string = browser.webContents.getURL()
    return { html: html.slice(0, MAX_HTML_LENGTH), url }
  })

  defineInvokeHandler(context, browserAutoFindElements, async (payload) => {
    if (!payload)
      return []
    const browser = getOrCreateBrowser()
    const script = findElementsScript(payload.selector, payload.limit ?? 20)
    return await browser.webContents.executeJavaScript(script)
  })

  defineInvokeHandler(context, browserAutoFillInput, async (payload) => {
    if (!payload)
      return { success: false }
    const browser = getOrCreateBrowser()
    const script = `
      (() => {
        const el = document.querySelector(${JSON.stringify(payload.selector)});
        if (!el) return false;
        el.focus();
        el.value = ${JSON.stringify(payload.value)};
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `
    const success: boolean = await browser.webContents.executeJavaScript(script)
    return { success }
  })

  defineInvokeHandler(context, browserAutoClick, async (payload) => {
    if (!payload)
      return { success: false }
    const browser = getOrCreateBrowser()
    const script = `
      (() => {
        const el = document.querySelector(${JSON.stringify(payload.selector)});
        if (!el) return false;
        el.click();
        return true;
      })()
    `
    const success: boolean = await browser.webContents.executeJavaScript(script)
    return { success }
  })

  defineInvokeHandler(context, browserAutoEval, async (payload) => {
    if (!payload)
      return { result: null }
    const browser = getOrCreateBrowser()
    // NOTICE: eval is intentionally restricted to the automation partition,
    // which is isolated from the AIRI renderer session.
    const result: unknown = await browser.webContents.executeJavaScript(payload.js)
    return { result }
  })

  defineInvokeHandler(context, browserAutoClose, async () => {
    if (automationWindow && !automationWindow.isDestroyed()) {
      automationWindow.close()
      automationWindow = null
    }
  })
}
