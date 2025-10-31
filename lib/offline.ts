import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface TaskDB extends DBSchema {
  tasks: {
    key: string
    value: any
    indexes: { 'by-board': string; 'by-status': string }
  }
  boards: {
    key: string
    value: any
  }
  pendingSync: {
    key: number
    value: {
      id?: number
      type: 'create' | 'update' | 'delete'
      entity: 'task' | 'comment' | 'attachment'
      data: any
      timestamp: number
    }
    indexes: { 'by-timestamp': number }
  }
}

let db: IDBPDatabase<TaskDB>

export async function initDB() {
  if (db) return db

  db = await openDB<TaskDB>('project-management', 1, {
    upgrade(db) {
      // Tasks store
      const taskStore = db.createObjectStore('tasks', { keyPath: 'id' })
      taskStore.createIndex('by-board', 'boardId')
      taskStore.createIndex('by-status', 'status')

      // Boards store
      db.createObjectStore('boards', { keyPath: 'id' })

      // Pending sync store
      const syncStore = db.createObjectStore('pendingSync', {
        keyPath: 'id',
        autoIncrement: true
      })
      syncStore.createIndex('by-timestamp', 'timestamp')
    }
  })

  return db
}

// Cache tasks locally
export async function cacheTasks(tasks: any[]) {
  const database = await initDB()
  const tx = database.transaction('tasks', 'readwrite')
  
  await Promise.all(tasks.map(task => tx.store.put(task)))
  await tx.done
}

// Get cached tasks
export async function getCachedTasks(boardId?: string) {
  const database = await initDB()
  
  if (boardId) {
    return database.getAllFromIndex('tasks', 'by-board', boardId)
  }
  
  return database.getAll('tasks')
}

// Cache boards
export async function cacheBoards(boards: any[]) {
  const database = await initDB()
  const tx = database.transaction('boards', 'readwrite')
  
  await Promise.all(boards.map(board => tx.store.put(board)))
  await tx.done
}

// Get cached boards
export async function getCachedBoards() {
  const database = await initDB()
  return database.getAll('boards')
}

// Add pending sync operation
export async function addPendingSync(operation: {
  type: 'create' | 'update' | 'delete'
  entity: 'task' | 'comment' | 'attachment'
  data: any
}) {
  const database = await initDB()
  
  await database.add('pendingSync', {
    ...operation,
    timestamp: Date.now()
  })
}

// Get pending sync operations
export async function getPendingSync() {
  const database = await initDB()
  return database.getAllFromIndex('pendingSync', 'by-timestamp')
}

// Clear pending sync operation
export async function clearPendingSync(id: number) {
  const database = await initDB()
  await database.delete('pendingSync', id)
}

// Sync pending operations when online
export async function syncPendingOperations() {
  if (!navigator.onLine) return

  const operations = await getPendingSync()

  for (const op of operations) {
    try {
      let endpoint = ''
      let method = ''

      switch (op.type) {
        case 'create':
          endpoint = `/api/${op.entity}s`
          method = 'POST'
          break
        case 'update':
          endpoint = `/api/${op.entity}s/${op.data.id}`
          method = 'PUT'
          break
        case 'delete':
          endpoint = `/api/${op.entity}s/${op.data.id}`
          method = 'DELETE'
          break
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: op.type !== 'delete' ? JSON.stringify(op.data) : undefined
      })

      if (response.ok) {
        await clearPendingSync(op.id!)
      }
    } catch (error) {
      console.error('Failed to sync operation:', error)
    }
  }
}

// Register service worker
export function registerServiceWorker() {
  if (process.env.NODE_ENV !== 'production') {
    return
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Force update existing service workers
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.update()
        })
      })

      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered:', registration)
          
          // Check for updates every hour
          setInterval(() => {
            registration.update()
          }, 60 * 60 * 1000)

          // Force immediate activation
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available, reload page
                  if (confirm('New version available! Reload to update?')) {
                    window.location.reload()
                  }
                }
              })
            }
          })
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error)
        })
    })
  }

  // Sync when coming back online
  window.addEventListener('online', () => {
    syncPendingOperations()
  })
}

// Check if online
export function isOnline(): boolean {
  return navigator.onLine
}
