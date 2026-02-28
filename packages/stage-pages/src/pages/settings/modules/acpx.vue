<script setup lang="ts">
import { ACPX_AGENTS, useAcpxStore } from '@proj-airi/stage-ui/stores/modules/acpx'
import { Button, FieldCheckbox, FieldInput } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const store = useAcpxStore()
const { enabled, defaultAgent, defaultCwd, permissionMode, recentSessions } = storeToRefs(store)

const tools = [
  { name: 'code_agent_exec', desc: 'One-shot coding task — no saved session, great for quick fixes' },
  { name: 'code_agent_prompt', desc: 'Multi-turn prompt in a persistent session — keeps context across messages' },
  { name: 'code_agent_sessions', desc: 'List, create, or close coding agent sessions' },
  { name: 'code_agent_status', desc: 'Check whether the agent is running, idle, or not started' },
  { name: 'code_agent_cancel', desc: 'Cancel a running coding task gracefully' },
]

const permOptions = [
  { value: 'approve-reads', label: t('settings.pages.modules.acpx.perm-approve-reads') },
  { value: 'approve-all', label: t('settings.pages.modules.acpx.perm-approve-all') },
  { value: 'deny-all', label: t('settings.pages.modules.acpx.perm-deny-all') },
]
</script>

<template>
  <div flex="~ col gap-6">
    <FieldCheckbox
      v-model="enabled"
      :label="t('settings.pages.modules.acpx.enable')"
      :description="t('settings.pages.modules.acpx.enable-description')"
    />

    <!-- What is this -->
    <div
      :class="[
        'rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700',
        'dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300',
      ]"
    >
      <div i-solar:info-circle-bold-duotone mr-1 inline-block translate-y-0.5 />
      {{ t('settings.pages.modules.acpx.note') }}
    </div>

    <template v-if="enabled">
      <!-- Default agent selector -->
      <div flex="~ col gap-1.5">
        <label text-sm font-medium text-neutral-700 dark:text-neutral-300>
          {{ t('settings.pages.modules.acpx.default-agent') }}
        </label>
        <p text-xs text-neutral-400>
          {{ t('settings.pages.modules.acpx.default-agent-description') }}
        </p>
        <div flex="~ row flex-wrap gap-2" mt-1>
          <button
            v-for="ag in ACPX_AGENTS"
            :key="ag.id"
            :class="[
              'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
              defaultAgent === ag.id
                ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-950/40 dark:text-primary-300'
                : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800/40 dark:text-neutral-400',
            ]"
            @click="defaultAgent = ag.id"
          >
            {{ ag.label }}
          </button>
        </div>
      </div>

      <!-- Default working directory -->
      <FieldInput
        v-model="defaultCwd"
        :label="t('settings.pages.modules.acpx.default-cwd')"
        :description="t('settings.pages.modules.acpx.default-cwd-description')"
        :placeholder="t('settings.pages.modules.acpx.default-cwd-placeholder')"
      />

      <!-- Permission mode -->
      <div flex="~ col gap-1.5">
        <label text-sm font-medium text-neutral-700 dark:text-neutral-300>
          {{ t('settings.pages.modules.acpx.permission-mode') }}
        </label>
        <p text-xs text-neutral-400>
          {{ t('settings.pages.modules.acpx.permission-mode-description') }}
        </p>
        <div flex="~ col gap-1" mt-1>
          <label
            v-for="opt in permOptions"
            :key="opt.value"
            :class="[
              'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer',
              permissionMode === opt.value
                ? 'border-primary-400 bg-primary-50 dark:border-primary-600 dark:bg-primary-950/30'
                : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800/40',
            ]"
          >
            <input
              v-model="permissionMode"
              type="radio"
              :value="opt.value"
              class="accent-primary-500"
            >
            <span text-neutral-700 dark:text-neutral-300>{{ opt.label }}</span>
          </label>
        </div>
      </div>

      <!-- Available LLM tools -->
      <div flex="~ col gap-2">
        <h3 text-sm font-medium text-neutral-700 dark:text-neutral-300>
          {{ t('settings.pages.modules.acpx.tools-title') }}
        </h3>
        <div flex="~ col gap-1.5">
          <div
            v-for="toolItem in tools"
            :key="toolItem.name"
            :class="[
              'rounded-lg border border-neutral-200 bg-white px-3 py-2.5',
              'dark:border-neutral-700 dark:bg-neutral-800/40',
            ]"
          >
            <code text-xs font-mono text-primary-600 dark:text-primary-400>{{ toolItem.name }}</code>
            <p text-xs text-neutral-400 mt-0.5>
              {{ toolItem.desc }}
            </p>
          </div>
        </div>
      </div>

      <!-- Prerequisites -->
      <div
        :class="[
          'rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700',
          'dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300',
        ]"
      >
        <p font-medium mb-1>
          {{ t('settings.pages.modules.acpx.prereqs-title') }}
        </p>
        <ul list-disc pl-4 flex="~ col gap-0.5">
          <li>{{ t('settings.pages.modules.acpx.prereq-acpx') }}</li>
          <li>{{ t('settings.pages.modules.acpx.prereq-opencode') }}</li>
          <li>{{ t('settings.pages.modules.acpx.prereq-codex') }}</li>
        </ul>
      </div>

      <!-- Recent sessions -->
      <div v-if="recentSessions.length > 0" flex="~ col gap-2">
        <div flex="~ row items-center justify-between">
          <h3 text-sm font-medium text-neutral-700 dark:text-neutral-300>
            {{ t('settings.pages.modules.acpx.recent-sessions') }}
          </h3>
          <button
            text-xs text-neutral-400 hover:text-red-500
            @click="store.clearSessions()"
          >
            {{ t('settings.pages.modules.acpx.clear-sessions') }}
          </button>
        </div>
        <div flex="~ col gap-1">
          <div
            v-for="sess in recentSessions.slice(0, 5)"
            :key="sess.id"
            :class="[
              'rounded-lg border border-neutral-200 bg-white px-3 py-2',
              'dark:border-neutral-700 dark:bg-neutral-800/40',
            ]"
          >
            <div flex="~ row items-center gap-2">
              <span text-xs font-mono text-primary-600 dark:text-primary-400>{{ sess.agent }}</span>
              <span text-xs text-neutral-400 truncate>{{ sess.cwd }}</span>
            </div>
            <p v-if="sess.lastPromptPreview" text-xs text-neutral-500 mt-0.5 truncate italic>
              "{{ sess.lastPromptPreview }}"
            </p>
          </div>
        </div>
      </div>

      <!-- Configured indicator -->
      <div
        v-if="store.configured"
        :class="[
          'rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700',
          'dark:border-green-800 dark:bg-green-950/30 dark:text-green-400',
          'flex items-center gap-2',
        ]"
      >
        <div i-solar:check-circle-bold-duotone />
        {{ t('settings.pages.modules.acpx.configured') }}
      </div>
    </template>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.modules.acpx.title
  subtitleKey: settings.title
  stageTransition:
    name: slide
</route>
