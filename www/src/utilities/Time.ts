const MINUTE_IN_SECONDS = 60
const HOUR_IN_MINUTES = 60
const HOUR_IN_SECONDS = HOUR_IN_MINUTES * MINUTE_IN_SECONDS

interface ITimeParts {
  hours: number
  minutes: number
  seconds: number
}

interface ILocaleStringOptions {
  weekday?: 'narrow' | 'short' | 'long'
  year?: 'numeric' | '2-digit'
  month?: 'numeric' | '2-digit' | 'narrow' | 'short' | 'long'
  day?: 'numeric' | '2-digit'
  hour?: 'numeric' | '2-digit'
  minute?: 'numeric' | '2-digit'
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

export function formatTimeMarker(time: number): string {
  const { hours, minutes, seconds } = secondsToTimeParts(time)
  const parts = [minutes, seconds]

  if (hours) {
    parts.unshift(hours)
  }

  return parts
    .map((part, index) => (index === 0 ? part.toString() : part.toString().padStart(2, '0')))
    .join(':')
}

export function formatDuration(seconds: number): string {
  const timeParts = secondsToTimeParts(seconds)
  const hourString = timeParts.hours === 1 ? 'hour' : 'hours'
  const minuteString = timeParts.minutes === 1 ? 'minute' : 'minutes'
  const secondString = timeParts.seconds === 1 ? 'second' : 'seconds'

  let durationString = ''

  if (timeParts.seconds || !(timeParts.minutes || timeParts.hours)) {
    durationString = `${timeParts.seconds} ${secondString}`
  }

  if (timeParts.minutes) {
    durationString = `${timeParts.minutes} ${minuteString} ${durationString}`
  }

  if (timeParts.hours) {
    durationString = `${timeParts.hours} ${hourString} ${durationString}`
  }

  return durationString.trim()
}

export function formatDate(date: Date): string {
  const options: ILocaleStringOptions = {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    year: 'numeric',
  }
  return date.toLocaleString(navigator.language, options)
}

export function formatTime(date: Date, seconds: boolean = false): string {
  const options: ILocaleStringOptions = { hour: 'numeric', minute: 'numeric' }
  if (seconds) {
    options.second = 'numeric'
  }
  return date.toLocaleString(navigator.language, options)
}
