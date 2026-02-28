import { useLocalStorageManualReset } from '@proj-airi/stage-shared/composables'
import { defineStore } from 'pinia'
import { computed } from 'vue'

/**
 * Vision store – controls whether AIRI can access the user's camera or screen.
 *
 * Actual camera/screen-capture integration (face-tracking, emotion recognition,
 * screen reading) is planned and tracked under each capability flag below.
 */
export const useVisionStore = defineStore('modules:vision', () => {
  /** Master switch: request camera/screen permission when enabled */
  const enabled = useLocalStorageManualReset<boolean>('settings/vision/enabled', false)

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
