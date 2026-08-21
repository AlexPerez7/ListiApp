const STORAGE_KEY = 'listiapp-swipe-hint-seen'

export function hasSeenSwipeHint(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return true
  }
}

export function markSwipeHintSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // localStorage no disponible (modo privado, etc.), no pasa nada
  }
}
