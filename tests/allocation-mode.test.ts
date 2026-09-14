import { test } from 'node:test'
import assert from 'node:assert/strict'
import { effectScope, ref } from 'vue'
import { useAllocationMode } from '../src/composables/useAllocationMode.ts'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const tick = async () => { await Promise.resolve(); await Promise.resolve() }
function fixture(initial: string | null = null) {
  const sn = ref(initial)
  const reads: { sn: string; reply: ReturnType<typeof deferred<'Average' | 'FIFO'>> }[] = []
  const writes: { sn: string; mode: string; reply: ReturnType<typeof deferred<void>> }[] = []
  let successes = 0
  let failures = 0
  const scope = effectScope()
  const ui = scope.run(() => useAllocationMode(sn, {
    get: (target) => { const reply = deferred<'Average' | 'FIFO'>(); reads.push({ sn: target, reply }); return reply.promise },
    set: (target, mode) => { const reply = deferred<void>(); writes.push({ sn: target, mode, reply }); return reply.promise },
  }, { saved: () => { successes++ }, failed: () => { failures++ } }))!
  return { sn, reads, writes, ui, scope, notices: () => ({ successes, failures }) }
}

test('only an online target starts a query; repeating its value does not poll', async () => {
  const f = fixture()
  assert.equal(f.reads.length, 0)
  f.sn.value = 'A'
  assert.equal(f.ui.phase.value, 'loading')
  assert.equal(f.ui.mode.value, null)
  f.ui.edit()
  assert.equal(f.ui.dialogOpen.value, false)
  f.reads[0]!.reply.resolve('FIFO'); await tick()
  assert.equal(f.ui.mode.value, 'FIFO')
  f.sn.value = 'A'
  assert.equal(f.reads.length, 1)
  f.sn.value = null
  assert.equal(f.ui.mode.value, null)
  assert.equal(f.ui.phase.value, 'idle')
  f.scope.stop()
})

test('a late reply from the previous device cannot overwrite the selected device', async () => {
  const f = fixture('A')
  f.sn.value = 'B'
  f.reads[1]!.reply.resolve('FIFO'); await tick()
  f.reads[0]!.reply.resolve('Average'); await tick()
  assert.equal(f.ui.mode.value, 'FIFO')
  assert.equal(f.ui.phase.value, 'ready')
  f.scope.stop()
})

test('offline then online on the same SN invalidates the earlier request', async () => {
  const f = fixture('A')
  f.sn.value = null
  f.sn.value = 'A'
  assert.equal(f.reads.length, 2)
  f.reads[0]!.reply.resolve('Average'); await tick()
  assert.equal(f.ui.phase.value, 'loading')
  f.reads[1]!.reply.resolve('FIFO'); await tick()
  assert.equal(f.ui.mode.value, 'FIFO')
  f.scope.stop()
})

test('failed and invalid replies do not become Average; retry can recover', async () => {
  const f = fixture('A')
  f.reads[0]!.reply.reject(); await tick()
  assert.equal(f.ui.phase.value, 'error')
  assert.equal(f.ui.mode.value, null)
  const retry = f.ui.refresh()
  f.reads[1]!.reply.resolve('fifo' as 'FIFO'); await retry
  assert.equal(f.ui.phase.value, 'error')
  const last = f.ui.refresh()
  f.reads[2]!.reply.resolve('Average'); await last
  assert.equal(f.ui.mode.value, 'Average')
  f.scope.stop()
})

test('saving uses the selected device and reads back after firmware confirmation', async () => {
  const f = fixture('A')
  f.reads[0]!.reply.resolve('Average'); await tick()
  f.ui.edit()
  await f.ui.save()
  assert.equal(f.writes.length, 0)
  f.ui.draft.value = 'FIFO'
  const save = f.ui.save()
  await f.ui.save()
  assert.equal(f.writes.length, 1)
  assert.equal(f.ui.saving.value, true)
  assert.equal(f.reads.length, 1)
  assert.equal(f.writes[0]!.sn, 'A')
  assert.equal(f.writes[0]!.mode, 'FIFO')
  f.writes[0]!.reply.resolve(); await tick()
  assert.equal(f.reads.length, 2)
  assert.equal(f.ui.phase.value, 'loading')
  assert.equal(f.ui.mode.value, null)
  f.reads[1]!.reply.resolve('FIFO'); await save
  assert.equal(f.ui.mode.value, 'FIFO')
  assert.deepEqual(f.notices(), { successes: 1, failures: 0 })
  f.scope.stop()
})

test('failed save clears an uncertain mode and exposes retry instead of false success', async () => {
  const f = fixture('A')
  f.reads[0]!.reply.resolve('Average'); await tick()
  f.ui.edit(); f.ui.draft.value = 'FIFO'
  const save = f.ui.save()
  f.writes[0]!.reply.reject(); await save
  assert.equal(f.ui.mode.value, null)
  assert.equal(f.ui.phase.value, 'error')
  assert.equal(f.ui.dialogOpen.value, false)
  assert.deepEqual(f.notices(), { successes: 0, failures: 1 })
  f.scope.stop()
})

test('switching devices during save closes the dialog and suppresses stale feedback', async () => {
  const f = fixture('A')
  f.reads[0]!.reply.resolve('Average'); await tick()
  f.ui.edit(); f.ui.draft.value = 'FIFO'
  const save = f.ui.save()
  f.sn.value = 'B'
  f.writes[0]!.reply.resolve(); await save
  assert.equal(f.ui.dialogOpen.value, false)
  assert.equal(f.ui.saving.value, false)
  assert.equal(f.ui.phase.value, 'loading')
  assert.deepEqual(f.notices(), { successes: 0, failures: 0 })
  assert.deepEqual(f.reads.map(x => x.sn), ['A', 'B'])
  f.scope.stop()
})

test('unmount discards a pending reply', async () => {
  const f = fixture('A')
  f.scope.stop()
  f.reads[0]!.reply.resolve('FIFO'); await tick()
  assert.equal(f.ui.mode.value, null)
})
