import { useLocalStorageManualReset } from '@proj-airi/stage-shared/composables'
import { defineStore } from 'pinia'
import { computed } from 'vue'

/**
 * Repo Reader module store.
 *
 * Gives AIRI four tools to read and search GitHub repositories:
 *   • `repo_read_file`    — fetch the content of a specific file
 *   • `repo_list_files`   — list files and directories at a path
 *   • `repo_search_code`  — search code across GitHub using the Search API
 *   • `repo_get_info`     — get repository metadata (stars, description, topics…)
 *
 * Public repositories work without any token (60 requests/hour via GitHub's
 * unauthenticated API).  A Personal Access Token raises this to 5,000/hour
 * and also enables access to private repositories the token has access to.
 *
 * All tools use plain HTTP (ofetch) so they work identically on web, the
 * Electron desktop app, and mobile.
 */
export const useRepoReaderStore = defineStore('modules:repo-reader', () => {
  const enabled = useLocalStorageManualReset<boolean>('settings/repo-reader/enabled', false)

  /**
   * Optional GitHub Personal Access Token.
   * Stored in localStorage — users should use a fine-grained token with
   * read-only repository contents scope.
   */
  const githubToken = useLocalStorageManualReset<string>('settings/repo-reader/github-token', '')

  const configured = computed(() => enabled.value)

  function resetState() {
    enabled.reset()
    githubToken.reset()
  }

  return {
    enabled,
    githubToken,
    configured,
    resetState,
  }
})
