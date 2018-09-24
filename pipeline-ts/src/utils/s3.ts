export const buildFilename = (
  suffix: string,
  podcastSlug: string,
  episodeSlug: string,
  publishTimestamp: number,
  startTime?: number,
  job?: Date
): string => {
  let filename = `${podcastSlug}/${publishTimestamp}_${episodeSlug}`

  if (startTime !== undefined) {
    filename = `${filename}/${startTime}`
  }

  if (job) {
    filename = `${filename}_${job.getTime()}`
  }

  if (suffix) {
    filename = `${filename}.${suffix}`
  }

  return filename
}
