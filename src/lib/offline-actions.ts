import { queueCommand } from './localdb/dexie'
import { genIdem } from './sync'
import type { OryxaCommand } from '../types'

export async function enqueueCommand(command: OryxaCommand, payload: Record<string, any>) {
  return queueCommand({
    command,
    payload,
    idempotency_key: genIdem(),
    created_at: Date.now()
  })
}
