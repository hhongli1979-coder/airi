import { useLocalStorageManualReset } from '@proj-airi/stage-shared/composables'
import { defineStore } from 'pinia'
import { computed } from 'vue'

/**
 * Computer Use module store.
 *
 * When enabled AIRI gains the ability to see and control the desktop:
 *   • `computer_screenshot`         — capture the primary display as PNG
 *   • `computer_mouse_move`         — move the cursor to (x, y)
 *   • `computer_mouse_click`        — single/double/right-click at (x, y)
 *   • `computer_keyboard_type`      — type text into the focused window
 *   • `computer_keyboard_press`     — press keyboard shortcuts (ctrl+c, etc.)
 *   • `computer_get_screen_size`    — get primary display dimensions
 *   • `computer_get_cursor_position`— get current cursor coordinates
 *
 * NOTICE: These tools require the Electron desktop app.  Mouse and keyboard
 * automation uses platform-native CLI tools:
 *   - macOS : cliclick (brew install cliclick) + osascript (built-in)
 *   - Linux : xdotool  (apt/dnf install xdotool)
 *   - Windows: PowerShell + System.Windows.Forms (built-in)
 *
 * The screenshot path uses Electron's built-in desktopCapturer — no extra
 * dependencies needed.
 */
export const useComputerUseStore = defineStore('modules:computer-use', () => {
  const enabled = useLocalStorageManualReset<boolean>('settings/computer-use/enabled', false)

  const configured = computed(() => enabled.value)

  function resetState() {
    enabled.reset()
  }

  return {
    enabled,
    configured,
    resetState,
  }
})
