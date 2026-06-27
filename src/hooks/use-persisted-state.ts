import { useEffect, useState } from 'react'

function readStoredValue<T>(storageKey: string, initialValue: T): T {
  if (typeof window === 'undefined') {
    return initialValue
  }

  try {
    const storedValue = window.sessionStorage.getItem(storageKey)
    if (storedValue === null) {
      return initialValue
    }

    return JSON.parse(storedValue) as T
  } catch {
    return initialValue
  }
}

export function usePersistedState<T>(
  storageKey: string,
  initialValue: T | (() => T),
): [T, (value: T | ((current: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    const resolvedInitialValue =
      typeof initialValue === 'function'
        ? (initialValue as () => T)()
        : initialValue

    return readStoredValue(storageKey, resolvedInitialValue)
  })

  useEffect(() => {
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(state))
    } catch {
      // Ignore storage quota or serialization errors.
    }
  }, [state, storageKey])

  return [state, setState]
}
