import Dexie, { Table } from 'dexie'
import type { PendingCommand } from '../../types'

class OryxaDB extends Dexie {
  pending_queue!: Table<PendingCommand, number>
  constructor() {
    super('oryxa')
    this.version(1).stores({
      pending_queue: '++id, command, idempotency_key, created_at'
    })
  }
}

export const db = new OryxaDB()

export const queueCommand = async (cmd: PendingCommand) => db.pending_queue.add(cmd)
export const getQueued = async () => db.pending_queue.orderBy('created_at').toArray()
export const removeQueued = async (id: number) => db.pending_queue.delete(id)
