import { useEffect, useRef, useState } from 'react'

const STORAGE_PREFIX = 'simulador-quimico:v1:'

function getStorage(storage) {
  if (storage) return storage
  if (typeof window === 'undefined') throw new Error('El almacenamiento no está disponible.')
  return window.localStorage
}

export function readPersistentValue(key, initialValue, storage, validate = () => true) {
  try {
    const storedValue = getStorage(storage).getItem(`${STORAGE_PREFIX}${key}`)
    if (storedValue === null) return { value: initialValue, error: null }

    const value = JSON.parse(storedValue)
    if (!validate(value)) throw new Error('El formato de los datos guardados no es válido.')
    return { value, error: null }
  } catch (error) {
    console.error(`No se pudieron leer los datos guardados (${key}).`, error)
    return {
      value: initialValue,
      error: 'No se pudieron leer los datos guardados. Se iniciará con los valores predeterminados.',
    }
  }
}

export function writePersistentValue(key, value, storage) {
  try {
    getStorage(storage).setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value))
    return null
  } catch (error) {
    console.error(`No se pudieron guardar los datos (${key}).`, error)
    return 'No se pudieron guardar los datos en este dispositivo. Los cambios se perderán al cerrar o recargar la página.'
  }
}

export default function usePersistentState(
  key,
  initialValue,
  onPersistenceError,
  validate,
) {
  const [initial] = useState(() => readPersistentValue(key, initialValue, undefined, validate))
  const [value, setValue] = useState(initial.value)
  const [storageError, setStorageError] = useState(initial.error)
  const onPersistenceErrorRef = useRef(onPersistenceError)
  const initialErrorRef = useRef(initial.error)

  useEffect(() => {
    onPersistenceErrorRef.current = onPersistenceError
  }, [onPersistenceError])

  useEffect(() => {
    const error = writePersistentValue(key, value)
    if (error) {
      setStorageError(error)
      onPersistenceErrorRef.current?.(key, error)
      return
    }
    if (initialErrorRef.current) {
      setStorageError(initialErrorRef.current)
      onPersistenceErrorRef.current?.(key, initialErrorRef.current)
      initialErrorRef.current = null
      return
    }
    if (storageError) {
      setStorageError(null)
      onPersistenceErrorRef.current?.(key, null)
    }
  }, [key, value, storageError])

  return [value, setValue]
}
