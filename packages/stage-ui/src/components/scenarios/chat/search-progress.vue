<script setup lang="ts">
/**
 * SearchProgress – Perplexity/AgenticsJS-style live search step display.
 *
 * Shows the sequential RETRIEVE→DISTILL flow visually while AIRI is
 * searching and reading pages, so the user can see exactly what's happening.
 */
const props = defineProps<{
  toolName: string
  args: string
  result?: string
  isStreaming?: boolean
}>()

const stepIcon: Record<string, string> = {
  web_search: 'i-solar:magnifer-bold-duotone',
  web_read_page: 'i-solar:document-text-bold-duotone',
  default: 'i-solar:sledgehammer-bold-duotone',
}

const stepLabel: Record<string, (args: Record<string, unknown>) => string> = {
  web_search: args => `Searching: "${args.query ?? ''}"`,
  web_read_page: args => `Reading: ${String(args.url ?? '').replace(/^https?:\/\//, '').split('/')[0]}`,
  default: args => `${props.toolName}(${Object.keys(args).join(', ')})`,
}

function parseArgs(): Record<string, unknown> {
  try {
    return JSON.parse(props.args)
  }
  catch {
    return {}
  }
}

function parseResults(): Array<{ title: string, url: string, snippet: string }> | null {
  if (props.toolName !== 'web_search' || !props.result)
    return null
  const lines = props.result.split('\n\n').filter(Boolean)
  const results = lines.map((block) => {
    const parts = block.split('\n')
    const titleLine = parts[0]?.replace(/^\[\d+\]\s*/, '') ?? ''
    const url = parts[1] ?? ''
    const snippet = parts.slice(2).join(' ') ?? ''
    return { title: titleLine, url, snippet }
  })
  return results.filter(r => r.url.startsWith('http'))
}

const args = parseArgs()
const icon = stepIcon[props.toolName] ?? stepIcon.default
const label = (stepLabel[props.toolName] ?? stepLabel.default)(args)
const sources = parseResults()
</script>

<template>
  <div
    :class="[
      'rounded-lg border my-1',
      'border-primary-100 bg-primary-50/60 dark:border-primary-900/60 dark:bg-primary-950/30',
      'flex flex-col gap-0 overflow-hidden',
    ]"
  >
    <!-- Step header -->
    <div flex="~ row items-center gap-2" px-3 py-2>
      <div
        :class="[icon, 'shrink-0 text-primary-500 dark:text-primary-400', isStreaming && !result ? 'animate-pulse' : '']"
        text-base
      />
      <span flex-1 text-sm text-primary-700 dark:text-primary-300>{{ label }}</span>
      <div
        v-if="!result && isStreaming"
        :class="['i-solar:spinner-bold-duotone animate-spin text-primary-400']"
        text-sm
      />
      <div v-else-if="result" i-solar:check-circle-bold-duotone text-sm text-green-500 dark:text-green-400 />
    </div>

    <!-- Source cards (AgenticsJS-style) – only for web_search results -->
    <template v-if="sources && sources.length > 0">
      <div
        :class="['border-t border-primary-100 dark:border-primary-900/60 px-3 py-2 flex gap-2 overflow-x-auto']"
        style="scrollbar-width: none"
      >
        <a
          v-for="(src, i) in sources"
          :key="i"
          :href="src.url"
          target="_blank"
          rel="noopener noreferrer"
          :class="[
            'flex-shrink-0 rounded-lg border px-2.5 py-1.5 flex flex-col gap-0.5 min-w-36 max-w-52',
            'border-neutral-200 bg-white hover:border-primary-300 hover:shadow-sm transition-all',
            'dark:border-neutral-700 dark:bg-neutral-800/80 dark:hover:border-primary-700',
            'no-underline',
          ]"
        >
          <div flex="~ row items-center gap-1.5">
            <img
              :src="(() => {
                try { return `https://www.google.com/s2/favicons?domain=${new URL(src.url).hostname}&sz=16` }
                catch { return '' }
              })()"
              width="12"
              height="12"
              :class="['rounded-sm shrink-0']"
              alt=""
              loading="lazy"
            >
            <span :class="['text-xs text-neutral-500 dark:text-neutral-400 truncate']">
              {{ (() => {
                try { return new URL(src.url).hostname.replace(/^www\./, '') }
                catch { return src.url }
              })() }}
            </span>
          </div>
          <span :class="['text-xs font-medium text-neutral-700 dark:text-neutral-300 line-clamp-2 leading-tight']">
            {{ src.title }}
          </span>
        </a>
      </div>
    </template>
  </div>
</template>
