const MINUTE_IN_SECONDS = 60
const HOUR_IN_MINUTES = 60
const HOUR_IN_SECONDS = HOUR_IN_MINUTES * MINUTE_IN_SECONDS

interface ITimeParts {
  hours: number
  minutes: number
  seconds: number
}

interface ILocaleStringOptions {
  hour: 'numeric' | '2-digit'
  minute: 'numeric' | '2-digit'
  second?: 'numeric' | '2-digit'
}

function secondsToTimeParts(time: number): ITimeParts {
  const totalSeconds = Math.round(time)
  const totalMinutes = Math.floor(totalSeconds / MINUTE_IN_SECONDS)

  const hours = Math.floor(totalMinutes / HOUR_IN_MINUTES)
  const minutes = totalMinutes - hours * HOUR_IN_MINUTES
  const seconds = totalSeconds - minutes * MINUTE_IN_SECONDS - hours * HOUR_IN_SECONDS

  return { hours, minutes, seconds }
}

export function formatTimeMarker(seconds: number): string {
  const timeParts = secondsToTimeParts(seconds)

  const padCharacter = '0'
  const padWidth = 2

  const paddedHours =
    timeParts.hours === 0
      ? timeParts.hours.toString().padStart(padWidth, padCharacter)
      : timeParts.hours.toString()
  const paddedMinutes = timeParts.minutes.toString().padStart(padWidth, padCharacter)
  const paddedSeconds = timeParts.seconds.toString().padStart(padWidth, padCharacter)

  return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`
}

export function formatDuration(seconds: number): string {
  const timeParts = secondsToTimeParts(seconds)
  const hourString = timeParts.hours === 1 ? 'hour' : 'hours'
  const minuteString = timeParts.minutes === 1 ? 'minute' : 'minutes'
  const secondString = timeParts.seconds === 1 ? 'second' : 'seconds'
  return `${timeParts.hours} ${hourString} ${timeParts.minutes} ${minuteString} ${
    timeParts.seconds
  } ${secondString}`
}

export function formatDate(datetime: string): string {
  const date = new Date(datetime)
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  return date.toLocaleString(navigator.language, options)
}

export function formatTime(datetime: string, seconds: boolean = false): string {
  const date = new Date(datetime)
  const options: ILocaleStringOptions = { hour: 'numeric', minute: 'numeric' }
  if (seconds) {
    options.second = 'numeric'
  }
  return date.toLocaleString(navigator.language, options)
}
