import { ref, watch, onScopeDispose } from 'vue'
import type { Ref } from 'vue'
import type { AllocationMode } from '../api/device'

interface AllocationApi {
  get: (sn: string) => Promise<AllocationMode>
  set: (sn: string, mode: AllocationMode) => Promise<unknown>
}

/** Keeps firmware configuration requests bound to the selected online device. */
export function useAllocationMode(
  activeSn: Readonly<Ref<string | null>>,
  api: AllocationApi,
  notify: { saved: () => void; failed: () => void },
) {
  const mode = ref<AllocationMode | null>(null)
  const phase = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const saving = ref(false)
  const dialogOpen = ref(false)
  const draft = ref<AllocationMode | null>(null)
  let context = 0
  let query = 0

  async function refresh() {
    const sn = activeSn.value
    if (!sn || saving.value) return
    const currentContext = context
    const currentQuery = ++query
    const isCurrent = () => context === currentContext && query === currentQuery && activeSn.value === sn
    mode.value = null
    phase.value = 'loading'
    console.info('[AllocationMode] Query', sn)
    try {
      const value = await api.get(sn)
      if (!isCurrent()) return
      if (value !== 'Average' && value !== 'FIFO') throw new Error('Invalid AllocationMode')
      mode.value = value
      phase.value = 'ready'
      console.info('[AllocationMode] Query confirmed', sn, value)
    } catch {
      if (!isCurrent()) return
      phase.value = 'error'
      console.info('[AllocationMode] Query failed', sn)
    }
  }

  function edit() {
    if (!activeSn.value || saving.value || phase.value !== 'ready' || !mode.value) return
    draft.value = mode.value
    dialogOpen.value = true
  }

  async function save() {
    const sn = activeSn.value
    const value = draft.value
    if (!sn || !dialogOpen.value || saving.value || phase.value !== 'ready'
      || (value !== 'Average' && value !== 'FIFO') || value === mode.value) return
    const currentContext = context
    const isCurrent = () => context === currentContext && activeSn.value === sn
    ++query
    saving.value = true
    console.info('[AllocationMode] Setting', sn, value)
    try {
      await api.set(sn, value)
      if (!isCurrent()) return
      dialogOpen.value = false
      saving.value = false
      notify.saved()
      // Read back the actual device value; do not substitute the requested mode.
      await refresh()
    } catch {
      if (!isCurrent()) return
      // A failed acknowledgement can still mean the device saved it; force a read.
      dialogOpen.value = false
      mode.value = null
      phase.value = 'error'
      notify.failed()
    } finally {
      if (isCurrent()) saving.value = false
    }
  }

  watch(activeSn, () => {
    ++context
    ++query
    mode.value = null
    draft.value = null
    phase.value = 'idle'
    saving.value = false
    dialogOpen.value = false
    void refresh()
  }, { immediate: true, flush: 'sync' })

  onScopeDispose(() => { ++context; ++query })

  return { mode, phase, saving, dialogOpen, draft, refresh, edit, save }
}
