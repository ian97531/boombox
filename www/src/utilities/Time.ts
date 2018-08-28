const MINUTE_IN_SECONDS = 60
const HOUR_IN_MINUTES = 60
const HOUR_IN_SECONDS = HOUR_IN_MINUTES * MINUTE_IN_SECONDS

export function formatTime(time: number): string {
  const totalSeconds = Math.round(time)
  const totalMinutes = Math.floor(totalSeconds / MINUTE_IN_SECONDS)

  const hours = Math.floor(totalMinutes / HOUR_IN_MINUTES)
  const minutes = totalMinutes - hours * HOUR_IN_MINUTES
  const seconds = totalSeconds - minutes * MINUTE_IN_SECONDS - hours * HOUR_IN_SECONDS

  const padCharacter = '0'
  const padWidth = 2
  const paddedHours = hours.toString().padStart(padWidth, padCharacter)
  const paddedMinutes = minutes.toString().padStart(padWidth, padCharacter)
  const paddedSeconds = seconds.toString().padStart(padWidth, padCharacter)
  return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`
}
