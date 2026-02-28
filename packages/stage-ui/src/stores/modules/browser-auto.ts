import { useLocalStorageManualReset } from '@proj-airi/stage-shared/composables'
import { defineStore } from 'pinia'
import { computed } from 'vue'

/**
 * Browser Automation module store.
 *
 * When enabled AIRI gains an embedded browser it can control to:
 *   - Navigate to any URL
 *   - Read page HTML and discover form fields
 *   - Fill input fields, select dropdowns, check boxes
 *   - Click buttons and links
 *   - Evaluate JavaScript in the page context
 *
 * Common use cases:
 *   - Help fill in online registration forms (give AIRI your info once)
 *   - Automate repetitive web tasks
 *   - Extract data from websites
 *
 * NOTICE: Works on regular websites. Sites using CAPTCHA, phone SMS
 * verification, biometric checks, or bot-detection will pause at those
 * steps so the user can complete them manually.
 *
 * NOTE: Financial account registration (banks, payment platforms) is
 * subject to KYC/AML regulations that require human identity verification
 * and cannot be automated by design.
 */
export const useBrowserAutoStore = defineStore('modules:browser-auto', () => {
  const enabled = useLocalStorageManualReset<boolean>('settings/browser-auto/enabled', false)

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
