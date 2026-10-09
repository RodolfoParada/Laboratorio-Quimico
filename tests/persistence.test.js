import test from 'node:test'
import assert from 'node:assert/strict'
import { readPersistentValue, writePersistentValue } from '../src/hooks/usePersistentState.js'

function createStorage(values = new Map()) {
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null
    },
    setItem(key, value) {
      values.set(key, value)
    },
  }
}

test('writes and restores persistent values under the simulator namespace', () => {
  const storage = createStorage()
  const state = { atoms: ['H', 'H', 'O'], result: { formula: 'H2O' } }

  assert.equal(writePersistentValue('app.test', state, storage), null)
  assert.deepEqual(readPersistentValue('app.test', null, storage), { value: state, error: null })
})

test('uses defaults and reports invalid or unreadable saved data', () => {
  const storage = createStorage(new Map([['simulador-quimico:v1:app.test', '{invalid']]))
  const originalError = console.error
  console.error = () => {}

  try {
    const result = readPersistentValue('app.test', [], storage)
    assert.deepEqual(result.value, [])
    assert.match(result.error, /No se pudieron leer/)
  } finally {
    console.error = originalError
  }
})

test('reports browser storage write failures instead of silently discarding changes', () => {
  const storage = {
    getItem() {
      return null
    },
    setItem() {
      throw new Error('quota exceeded')
    },
  }
  const originalError = console.error
  console.error = () => {}

  try {
    assert.match(writePersistentValue('app.test', { atoms: [] }, storage), /No se pudieron guardar/)
  } finally {
    console.error = originalError
  }
})
