import type { Tool } from '@xsai/shared-chat'

import { defineInvoke } from '@moeru/eventa'
import { createContext } from '@moeru/eventa/adapters/electron/renderer'
import { useBrowserAutoStore } from '@proj-airi/stage-ui/stores/modules/browser-auto'
import { tool } from '@xsai/tool'
import { z } from 'zod'

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

type BrowserAutoInvokers = ReturnType<typeof createInvokers>
let cachedInvokers: BrowserAutoInvokers | undefined

function createInvokers() {
  const { context } = createContext(window.electron.ipcRenderer)
  return {
    navigate: defineInvoke(context, browserAutoNavigate),
    getPageInfo: defineInvoke(context, browserAutoGetPageInfo),
    getHtml: defineInvoke(context, browserAutoGetHtml),
    findElements: defineInvoke(context, browserAutoFindElements),
    fillInput: defineInvoke(context, browserAutoFillInput),
    click: defineInvoke(context, browserAutoClick),
    eval: defineInvoke(context, browserAutoEval),
    close: defineInvoke(context, browserAutoClose),
  }
}

function getInvokers(): BrowserAutoInvokers {
  if (!cachedInvokers)
    cachedInvokers = createInvokers()
  return cachedInvokers
}

/**
 * Returns the Browser Automation tool array when the module is enabled.
 *
 * These tools let the AI control a dedicated Electron browser window to
 * navigate websites, read page content, fill forms, and click buttons.
 *
 * Ideal for:
 *   - Filling in registration forms on regular websites
 *   - Extracting data from web pages
 *   - Automating repetitive web tasks
 *
 * NOTE: Sites with CAPTCHA, phone verification, or biometric checks will
 * pause the flow at those steps so the user can complete them manually.
 */
export async function browserAutoTools(): Promise<Tool[]> {
  const store = useBrowserAutoStore()
  if (!store.enabled)
    return []

  const inv = getInvokers()

  return await Promise.all([
    // ── browser_navigate ────────────────────────────────────────────────
    tool({
      name: 'browser_navigate',
      description: [
        'Open a URL in the AIRI automation browser window.',
        'Waits for the page to finish loading before returning.',
        'Returns the final URL, page title, and document ready state.',
        'Use browser_get_page_html after navigation to read the page content.',
      ].join(' '),
      execute: async ({ url, waitMs }) => {
        try {
          const info = await inv.navigate({ url, waitMs })
          if (!info)
            return `Navigation failed for ${url}`
          return `Navigated to: ${info.title}\nURL: ${info.url}\nReady: ${info.readyState}`
        }
        catch (err) {
          return `Navigation error: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({
        url: z.string().url().describe('Full URL to navigate to'),
        waitMs: z.number().int().min(0).max(10000).optional().describe('Extra milliseconds to wait after page load (for JS-heavy SPAs; default 0)'),
      }),
    }),

    // ── browser_get_page_info ────────────────────────────────────────────
    tool({
      name: 'browser_get_page_info',
      description: 'Get the current page URL, title, and ready state of the automation browser.',
      execute: async () => {
        try {
          const info = await inv.getPageInfo(undefined)
          if (!info)
            return 'No page loaded yet.'
          return `Title: ${info.title}\nURL: ${info.url}\nReady: ${info.readyState}`
        }
        catch (err) {
          return `Error: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({}),
    }),

    // ── browser_get_page_html ────────────────────────────────────────────
    tool({
      name: 'browser_get_page_html',
      description: [
        'Get the HTML source of the current page in the automation browser.',
        'Use this to understand the page structure — find form fields, buttons, and their CSS selectors.',
        'Returns up to 80 000 characters of HTML.',
      ].join(' '),
      execute: async () => {
        try {
          const result = await inv.getHtml(undefined)
          if (!result)
            return 'No page loaded.'
          return `URL: ${result.url}\n\n${result.html}`
        }
        catch (err) {
          return `Error: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({}),
    }),

    // ── browser_find_elements ────────────────────────────────────────────
    tool({
      name: 'browser_find_elements',
      description: [
        'Find elements on the current page matching a CSS selector.',
        'Returns element details: tag, id, name, type, placeholder, current value, and a usable selector.',
        'Use this to discover form fields before filling them.',
        'Examples: "input[type=text]", "input[name=email]", "button[type=submit]", "form".',
      ].join(' '),
      execute: async ({ selector, limit }) => {
        try {
          const elements = await inv.findElements({ selector, limit })
          if (!elements || elements.length === 0)
            return `No elements found matching: ${selector}`
          return elements.map((el, i) =>
            `[${i + 1}] <${el.tag}> selector="${el.selector}"${el.type ? ` type="${el.type}"` : ''}${el.name ? ` name="${el.name}"` : ''}${el.placeholder ? ` placeholder="${el.placeholder}"` : ''}${el.value ? ` value="${el.value}"` : ''}${el.text ? ` text="${el.text}"` : ''}`,
          ).join('\n')
        }
        catch (err) {
          return `Error: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({
        selector: z.string().describe('CSS selector, e.g. "input[type=text]", "#email", "button[type=submit]"'),
        limit: z.number().int().min(1).max(50).optional().describe('Maximum elements to return (default 20)'),
      }),
    }),

    // ── browser_fill_input ───────────────────────────────────────────────
    tool({
      name: 'browser_fill_input',
      description: [
        'Fill an input field on the current page with a value.',
        'Triggers input and change events so the page framework detects the change.',
        'Use browser_find_elements first to get the correct selector.',
        'Works for text inputs, email fields, password fields, textareas, and select dropdowns.',
      ].join(' '),
      execute: async ({ selector, value }) => {
        try {
          const result = await inv.fillInput({ selector, value })
          if (!result?.success)
            return `Field not found: ${selector}`
          const display = selector.toLowerCase().includes('password') ? '••••••••' : value
          return `Filled "${selector}" with: ${display}`
        }
        catch (err) {
          return `Fill error: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({
        selector: z.string().describe('CSS selector of the input field to fill'),
        value: z.string().describe('Value to enter into the field'),
      }),
    }),

    // ── browser_click ────────────────────────────────────────────────────
    tool({
      name: 'browser_click',
      description: [
        'Click an element on the current page.',
        'Use this to submit forms, press buttons, check checkboxes, or follow links.',
        'Use browser_find_elements to discover the correct selector first.',
      ].join(' '),
      execute: async ({ selector }) => {
        try {
          const result = await inv.click({ selector })
          if (!result?.success)
            return `Element not found: ${selector}`
          return `Clicked: ${selector}`
        }
        catch (err) {
          return `Click error: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({
        selector: z.string().describe('CSS selector of the element to click'),
      }),
    }),

    // ── browser_eval ─────────────────────────────────────────────────────
    tool({
      name: 'browser_eval',
      description: [
        'Run a JavaScript expression in the automation browser page and return the result.',
        'Use for advanced page interaction not covered by other tools.',
        'Returns a JSON-serialisable value.',
        'Example: "document.title" or "document.forms[0].elements.length".',
      ].join(' '),
      execute: async ({ js }) => {
        try {
          const result = await inv.eval({ js })
          return JSON.stringify(result?.result ?? null, null, 2)
        }
        catch (err) {
          return `Eval error: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({
        js: z.string().describe('JavaScript expression to evaluate in the page context'),
      }),
    }),

    // ── browser_close ────────────────────────────────────────────────────
    tool({
      name: 'browser_close',
      description: 'Close the automation browser window and clean up.',
      execute: async () => {
        try {
          await inv.close(undefined)
          return 'Automation browser closed.'
        }
        catch (err) {
          return `Close error: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({}),
    }),
  ])
}
