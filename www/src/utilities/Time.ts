const IN_SECONDS = 60
const IN_MINUTES = 60

function padNumber(num: number, width = 2, character = '0'): string {
  let stringNum = num.toString()
  while (stringNum.length < width) {
    stringNum = character + stringNum
  }
  return stringNum
}

export function formatTime(time: number): string {
  const totalSeconds = Math.round(time)
  const totalMinutes = Math.floor(totalSeconds / IN_MINUTES)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes - hours * IN_MINUTES
  const seconds = totalSeconds - minutes * IN_SECONDS - hours * IN_MINUTES * IN_SECONDS

  return `${padNumber(hours)}:${padNumber(minutes)}:${padNumber(seconds)}`
}
