import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import type { NotificationLogEntry } from './types.ts'

type NotificationLogFile = {
  entries: NotificationLogEntry[]
}

function logPath() {
  return path.join(process.cwd(), 'data', 'seyf-notification-log.json')
}

async function loadLog(): Promise<NotificationLogFile> {
  try {
    const raw = await readFile(logPath(), 'utf-8')
    const parsed = JSON.parse(raw) as NotificationLogFile
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.entries)) {
      return { entries: [] }
    }
    return parsed
  } catch {
    return { entries: [] }
  }
}

async function saveLog(file: NotificationLogFile) {
  await mkdir(path.dirname(logPath()), { recursive: true })
  await writeFile(logPath(), JSON.stringify(file, null, 2), 'utf-8')
}

export async function appendNotificationLog(
  entry: Omit<NotificationLogEntry, 'id' | 'createdAt'>,
): Promise<NotificationLogEntry> {
  const file = await loadLog()
  const full: NotificationLogEntry = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry,
  }
  file.entries.unshift(full)
  await saveLog(file)
  return full
}

export async function listNotificationLog(input?: {
  userId?: string
  limit?: number
}): Promise<NotificationLogEntry[]> {
  const file = await loadLog()
  const filtered = input?.userId
    ? file.entries.filter((entry) => entry.userId === input.userId)
    : file.entries
  return filtered.slice(0, input?.limit ?? 50)
}
