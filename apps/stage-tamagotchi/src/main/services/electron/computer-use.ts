import type { createContext } from '@moeru/eventa/adapters/electron/main'
import type { BrowserWindow } from 'electron'

import { spawn } from 'node:child_process'

import { defineInvokeHandler } from '@moeru/eventa'
import { desktopCapturer, screen } from 'electron'

import {
  computerUseGetCursorPos,
  computerUseGetScreenSize,
  computerUseKeyboardPress,
  computerUseKeyboardType,
  computerUseMouseClick,
  computerUseMouseMove,
  computerUseScreenshot,
} from '../../../shared/eventa'

/** Run a fire-and-forget shell command, resolving with stdout string. */
function runCmd(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    child.stdout?.on('data', (d: Buffer) => { out += d.toString('utf8') })
    child.stderr?.on('data', (d: Buffer) => { err += d.toString('utf8') })
    child.on('error', reject)
    child.on('close', (code: number) => {
      if (code === 0)
        resolve(out)
      else
        reject(new Error(`Command failed (${code}): ${err.trim() || cmd}`))
    })
  })
}

/**
 * Move the mouse cursor to (x, y) in screen coordinates.
 * Uses platform-native tooling.
 */
async function moveMouse(x: number, y: number): Promise<void> {
  if (process.platform === 'darwin') {
    // cliclick is a common macOS mouse automation tool.
    // NOTICE: requires cliclick installed: brew install cliclick
    await runCmd('cliclick', [`m:${x},${y}`])
  }
  else if (process.platform === 'linux') {
    // xdotool is widely available on Linux desktops.
    // NOTICE: requires xdotool: apt install xdotool / dnf install xdotool
    await runCmd('xdotool', ['mousemove', String(x), String(y)])
  }
  else {
    // Windows: PowerShell with .NET to move the cursor.
    const script = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})`
    await runCmd('powershell', ['-NoProfile', '-NonInteractive', '-Command', script])
  }
}

/** Click the mouse at (x, y) with the given button. */
async function clickMouse(x: number, y: number, button: 'left' | 'right' | 'middle', clicks: number): Promise<void> {
  if (process.platform === 'darwin') {
    const btnFlag = button === 'right' ? 'rc' : button === 'middle' ? 'mc' : 'c'
    // Move first, then click
    await runCmd('cliclick', [`m:${x},${y}`])
    for (let i = 0; i < clicks; i++) {
      await runCmd('cliclick', [`${btnFlag}:${x},${y}`])
    }
  }
  else if (process.platform === 'linux') {
    const btnNum = button === 'right' ? '3' : button === 'middle' ? '2' : '1'
    await runCmd('xdotool', ['mousemove', String(x), String(y)])
    for (let i = 0; i < clicks; i++) {
      await runCmd('xdotool', ['click', '--clearmodifiers', btnNum])
    }
  }
  else {
    const btnName = button === 'right' ? 'Right' : button === 'middle' ? 'Middle' : 'Left'
    const script = `
      Add-Type -AssemblyName System.Windows.Forms;
      [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y});
      $btn = [System.Windows.Forms.MouseButtons]::${btnName};
      [System.Windows.Forms.SendKeys]::SendWait('');
    `
    await runCmd('powershell', ['-NoProfile', '-NonInteractive', '-Command', script])
  }
}

/** Type a string of text via keyboard. */
async function typeText(text: string): Promise<void> {
  if (process.platform === 'darwin') {
    // Use osascript to type text safely (handles special characters)
    const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    await runCmd('osascript', ['-e', `tell application "System Events" to keystroke "${escaped}"`])
  }
  else if (process.platform === 'linux') {
    await runCmd('xdotool', ['type', '--clearmodifiers', '--', text])
  }
  else {
    const escaped = text.replace(/'/g, '\'\'')
    const script = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escaped}')`
    await runCmd('powershell', ['-NoProfile', '-NonInteractive', '-Command', script])
  }
}

/**
 * Press one or more keys (e.g. ["ctrl", "c"], ["Return"], ["Escape"]).
 * Key names follow xdotool conventions on Linux / cliclick on macOS / SendKeys on Windows.
 */
async function pressKeys(keys: string[]): Promise<void> {
  if (process.platform === 'darwin') {
    // Map common key names to cliclick / osascript equivalents
    const keyStr = keys.join('+')
    const escaped = keyStr.replace(/"/g, '\\"')
    await runCmd('osascript', ['-e', `tell application "System Events" to key code (${escaped}) using {}`])
  }
  else if (process.platform === 'linux') {
    await runCmd('xdotool', ['key', '--clearmodifiers', keys.join('+')])
  }
  else {
    // Map to SendKeys notation
    const keyMap: Record<string, string> = {
      ctrl: '^',
      alt: '%',
      shift: '+',
      win: '^%',
      return: '{ENTER}',
      enter: '{ENTER}',
      escape: '{ESC}',
      esc: '{ESC}',
      tab: '{TAB}',
      backspace: '{BACKSPACE}',
      delete: '{DELETE}',
      up: '{UP}',
      down: '{DOWN}',
      left: '{LEFT}',
      right: '{RIGHT}',
      f1: '{F1}',
      f2: '{F2}',
      f3: '{F3}',
      f4: '{F4}',
      f5: '{F5}',
    }
    const mapped = keys.map(k => keyMap[k.toLowerCase()] ?? k).join('')
    const script = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${mapped}')`
    await runCmd('powershell', ['-NoProfile', '-NonInteractive', '-Command', script])
  }
}

/**
 * Capture a screenshot of the primary display.
 * Returns the image as a base64-encoded PNG data URL.
 */
async function captureScreen(window: BrowserWindow): Promise<{ dataUrl: string, width: number, height: number }> {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.size

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width, height },
  })

  const primary = sources.find(s => s.display_id === String(primaryDisplay.id)) ?? sources[0]
  if (!primary)
    throw new Error('No screen source available')

  const png = primary.thumbnail.toPNG()
  const dataUrl = `data:image/png;base64,${png.toString('base64')}`
  return { dataUrl, width, height }
}

/**
 * Register all Computer Use IPC handlers on the given Eventa context.
 *
 * NOTICE: Mouse and keyboard automation use platform-native CLI tools
 * (cliclick on macOS, xdotool on Linux, PowerShell on Windows).
 * The screenshot path uses Electron's built-in desktopCapturer.
 */
export function createComputerUseService(params: {
  context: ReturnType<typeof createContext>['context']
  window: BrowserWindow
}) {
  const { context, window } = params

  defineInvokeHandler(context, computerUseScreenshot, async () => {
    return captureScreen(window)
  })

  defineInvokeHandler(context, computerUseGetScreenSize, () => {
    const { width, height } = screen.getPrimaryDisplay().size
    return { width, height }
  })

  defineInvokeHandler(context, computerUseGetCursorPos, () => {
    return screen.getCursorScreenPoint()
  })

  defineInvokeHandler(context, computerUseMouseMove, async (payload) => {
    if (!payload)
      return
    await moveMouse(payload.x, payload.y)
  })

  defineInvokeHandler(context, computerUseMouseClick, async (payload) => {
    if (!payload)
      return
    const { x, y, button = 'left', clicks = 1 } = payload
    await clickMouse(x, y, button, clicks)
  })

  defineInvokeHandler(context, computerUseKeyboardType, async (payload) => {
    if (!payload)
      return
    await typeText(payload.text)
  })

  defineInvokeHandler(context, computerUseKeyboardPress, async (payload) => {
    if (!payload)
      return
    await pressKeys(payload.keys)
  })
}
