export function calculateDurationMinutes(
  clockIn: Date,
  clockOut?: Date | null,
  breakMinutes: number = 0
): number | null {
  if (!clockOut) {
    return null
  }

  const breakSafe = Number.isFinite(breakMinutes) ? Math.max(0, Math.floor(breakMinutes)) : 0
  const diffMs = clockOut.getTime() - clockIn.getTime()

  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return 0
  }

  const totalMinutes = Math.floor(diffMs / 60000)
  return Math.max(0, totalMinutes - breakSafe)
}
