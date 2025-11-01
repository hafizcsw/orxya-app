import { supabase } from '@/integrations/supabase/client'
import { getQueued, removeQueued } from './localdb/dexie'
import type { PendingCommand } from '../types'

export const genIdem = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

export async function flushQueueOnce(): Promise<{ flushed: number; failed?: string }> {
  try {
    const { data: sess } = await supabase.auth.getSession()
    if (!sess?.session) return { flushed: 0, failed: 'NO_SESSION' }
    const items = await getQueued()
    let flushed = 0
    for (const item of items) {
      const { data, error } = await supabase.functions.invoke('commands', {
        body: {
          command: item.command,
          idempotency_key: item.idempotency_key,
          payload: item.payload
        }
      })
      if (error) return { flushed, failed: String(error.message ?? error) }
      if (item.id != null) await removeQueued(item.id)
      flushed++
    }
    return { flushed }
  } catch (e: any) {
    return { flushed: 0, failed: String(e?.message ?? e) }
  }
}

export function initOnlineSync() {
  const tryFlush = () => void flushQueueOnce()
  setTimeout(tryFlush, 1500)
  window.addEventListener('online', tryFlush)
  setInterval(tryFlush, 120_000)
}
