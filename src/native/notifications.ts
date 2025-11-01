import { LocalNotifications } from '@capacitor/local-notifications'
import { isNative } from './platform'

export async function scheduleLocal(title: string, body: string) {
  if (!isNative()) {
    console.info('[web-toast]', title, body)
    return { ok: true, web: true }
  }
  await LocalNotifications.requestPermissions()
  const id = Math.floor(Math.random() * 1e9)
  await LocalNotifications.schedule({
    notifications: [{ id, title, body, schedule: { at: new Date(Date.now() + 1000) } }]
  })
  return { ok: true, id }
}
