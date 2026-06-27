import { useEffect, useRef } from 'react'

const AUTO_SAVE_INTERVAL_MS = 30_000

type UseVisitDraftAutosaveOptions = {
  enabled: boolean
  onSave: () => Promise<void>
}

export function useVisitDraftAutosave({
  enabled,
  onSave,
}: UseVisitDraftAutosaveOptions) {
  const saveRef = useRef(onSave)

  useEffect(() => {
    saveRef.current = onSave
  }, [onSave])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const intervalId = window.setInterval(() => {
      void saveRef.current()
    }, AUTO_SAVE_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [enabled])
}
