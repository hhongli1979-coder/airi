import type { Tool } from '@xsai/shared-chat'

import { defineInvoke } from '@moeru/eventa'
import { createContext } from '@moeru/eventa/adapters/electron/renderer'
import { useComputerUseStore } from '@proj-airi/stage-ui/stores/modules/computer-use'
import { tool } from '@xsai/tool'
import { z } from 'zod'

import {
  computerUseGetCursorPos,
  computerUseGetScreenSize,
  computerUseKeyboardPress,
  computerUseKeyboardType,
  computerUseMouseClick,
  computerUseMouseMove,
  computerUseScreenshot,
} from '../../../shared/eventa'

type ComputerUseInvokers = ReturnType<typeof createInvokers>
let cachedInvokers: ComputerUseInvokers | undefined

function createInvokers() {
  const { context } = createContext(window.electron.ipcRenderer)
  return {
    screenshot: defineInvoke(context, computerUseScreenshot),
    getScreenSize: defineInvoke(context, computerUseGetScreenSize),
    getCursorPos: defineInvoke(context, computerUseGetCursorPos),
    mouseMove: defineInvoke(context, computerUseMouseMove),
    mouseClick: defineInvoke(context, computerUseMouseClick),
    keyboardType: defineInvoke(context, computerUseKeyboardType),
    keyboardPress: defineInvoke(context, computerUseKeyboardPress),
  }
}

function getInvokers(): ComputerUseInvokers {
  if (!cachedInvokers)
    cachedInvokers = createInvokers()
  return cachedInvokers
}

/**
 * Returns the Computer Use tool array when the module is enabled, otherwise
 * an empty array.
 *
 * These tools let the AI see and control the desktop:
 *   • `computer_screenshot`    — capture the primary display
 *   • `computer_mouse_move`    — move the cursor to (x, y)
 *   • `computer_mouse_click`   — click at (x, y) with a given button
 *   • `computer_keyboard_type` — type a string of text
 *   • `computer_keyboard_press`— press keyboard shortcuts (e.g. ["ctrl","c"])
 *   • `computer_get_screen_size` — get display dimensions
 *   • `computer_get_cursor_pos`  — get current cursor position
 */
export async function computerUseTools(): Promise<Tool[]> {
  const store = useComputerUseStore()
  if (!store.enabled)
    return []

  const inv = getInvokers()

  return await Promise.all([
    tool({
      name: 'computer_screenshot',
      description: [
        'Capture a screenshot of the primary display.',
        'Returns a base64-encoded PNG data URL plus the screen dimensions.',
        'Use this to see the current state of the desktop before performing mouse or keyboard actions.',
      ].join(' '),
      execute: async () => {
        try {
          const result = await inv.screenshot(undefined)
          if (!result)
            return 'Screenshot failed: no result returned from main process.'
          return JSON.stringify({
            width: result.width,
            height: result.height,
            // Return only a short prefix of the data URL to confirm success without flooding context
            dataUrlPreview: `${result.dataUrl.slice(0, 80)}… [${Math.round(result.dataUrl.length / 1024)} KB]`,
            dataUrl: result.dataUrl,
          })
        }
        catch (err) {
          return `Screenshot failed: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({}),
    }),

    tool({
      name: 'computer_mouse_move',
      description: 'Move the mouse cursor to the given screen coordinates (x, y).',
      execute: async ({ x, y }) => {
        try {
          await inv.mouseMove({ x, y })
          return `Mouse moved to (${x}, ${y}).`
        }
        catch (err) {
          return `Mouse move failed: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({
        x: z.number().int().describe('Horizontal screen coordinate in pixels'),
        y: z.number().int().describe('Vertical screen coordinate in pixels'),
      }),
    }),

    tool({
      name: 'computer_mouse_click',
      description: [
        'Click the mouse at screen coordinates (x, y).',
        'Supports left, right, and middle button.',
        'Use clicks=2 for a double-click.',
      ].join(' '),
      execute: async ({ x, y, button, clicks }) => {
        try {
          await inv.mouseClick({ x, y, button: button ?? 'left', clicks: clicks ?? 1 })
          return `${button ?? 'left'} click${(clicks ?? 1) > 1 ? ` x${clicks}` : ''} at (${x}, ${y}).`
        }
        catch (err) {
          return `Mouse click failed: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({
        x: z.number().int().describe('Horizontal screen coordinate'),
        y: z.number().int().describe('Vertical screen coordinate'),
        button: z.enum(['left', 'right', 'middle']).optional().describe('Mouse button to click (default: left)'),
        clicks: z.number().int().min(1).max(3).optional().describe('Number of clicks (1 = single, 2 = double; default: 1)'),
      }),
    }),

    tool({
      name: 'computer_keyboard_type',
      description: [
        'Type a string of text using the keyboard.',
        'The text is sent to whichever application currently has focus.',
        'Use computer_mouse_click first to focus the desired input field.',
      ].join(' '),
      execute: async ({ text }) => {
        try {
          await inv.keyboardType({ text })
          return `Typed: ${text.slice(0, 50)}${text.length > 50 ? '…' : ''}`
        }
        catch (err) {
          return `Keyboard type failed: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({
        text: z.string().describe('Text to type'),
      }),
    }),

    tool({
      name: 'computer_keyboard_press',
      description: [
        'Press one or more keyboard keys simultaneously (a shortcut).',
        'Keys are specified as an array of key names.',
        'Common modifiers: "ctrl", "alt", "shift", "cmd" / "meta".',
        'Common keys: "return", "escape", "tab", "backspace", "delete", "up", "down", "left", "right", "f1"–"f12".',
        'Examples: ["ctrl","c"] for Copy, ["ctrl","v"] for Paste, ["alt","f4"] to close window.',
      ].join(' '),
      execute: async ({ keys }) => {
        try {
          await inv.keyboardPress({ keys })
          return `Pressed: ${keys.join('+')}`.toUpperCase()
        }
        catch (err) {
          return `Keyboard press failed: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({
        keys: z.array(z.string()).min(1).describe('Key names to press together, e.g. ["ctrl", "c"]'),
      }),
    }),

    tool({
      name: 'computer_get_screen_size',
      description: 'Get the width and height of the primary display in pixels.',
      execute: async () => {
        try {
          const size = await inv.getScreenSize(undefined)
          return `Primary display: ${size?.width ?? '?'} × ${size?.height ?? '?'} pixels.`
        }
        catch (err) {
          return `Get screen size failed: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({}),
    }),

    tool({
      name: 'computer_get_cursor_position',
      description: 'Get the current mouse cursor position in screen coordinates.',
      execute: async () => {
        try {
          const pos = await inv.getCursorPos(undefined)
          return `Cursor is at (${pos?.x ?? '?'}, ${pos?.y ?? '?'}).`
        }
        catch (err) {
          return `Get cursor position failed: ${err instanceof Error ? err.message : String(err)}`
        }
      },
      parameters: z.object({}),
    }),
  ])
}
