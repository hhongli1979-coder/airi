<script setup lang="ts">
import { useMcpStore } from '@proj-airi/stage-ui/stores/mcp'
import { FieldInput } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const mcpStore = useMcpStore()
const { serverCmd, serverArgs, connected } = storeToRefs(mcpStore)
</script>

<template>
  <div flex="~ col gap-6">
    <!-- Status indicator -->
    <div
      :class="[
        'rounded-xl border p-4 flex gap-3 items-center',
        connected
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
          : 'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/40',
      ]"
    >
      <div
        :class="[
          'size-2.5 rounded-full shrink-0',
          connected ? 'bg-green-500 animate-pulse' : 'bg-neutral-300 dark:bg-neutral-600',
        ]"
      />
      <span :class="['text-sm font-medium', connected ? 'text-green-700 dark:text-green-400' : 'text-neutral-500']">
        {{ connected ? t('settings.pages.modules.mcp-server.status-connected') : t('settings.pages.modules.mcp-server.status-disconnected') }}
      </span>
    </div>

    <!-- Server command -->
    <FieldInput
      v-model="serverCmd"
      :label="t('settings.pages.modules.mcp-server.server-cmd')"
      :description="t('settings.pages.modules.mcp-server.server-cmd-description')"
      :placeholder="t('settings.pages.modules.mcp-server.server-cmd-placeholder')"
      font-mono
    />

    <!-- Server args -->
    <FieldInput
      v-model="serverArgs"
      :label="t('settings.pages.modules.mcp-server.server-args')"
      :description="t('settings.pages.modules.mcp-server.server-args-description')"
      :placeholder="t('settings.pages.modules.mcp-server.server-args-placeholder')"
      font-mono
    />

    <!-- Info note -->
    <div
      :class="[
        'rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700',
        'dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300',
      ]"
    >
      <div i-solar:info-circle-bold-duotone mr-1 inline-block translate-y-0.5 />
      {{ t('settings.pages.modules.mcp-server.note') }}
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.modules.mcp-server.title
  subtitleKey: settings.title
  stageTransition:
    name: slide
</route>
