import { parseFrames } from 'utilities/audio-parsers/mp3'
import { appendIntArrays } from 'utilities/binaryUtils'

export type IOnCompleteCallback = (duration: number) => void
export type IOnProgressCallback = (progress: number) => void

interface IReadableStreamChunkAvailable {
  done: false
  value: Uint8Array
}

interface IReadableStreamClosed {
  done: true
  value: undefined
}

type IReadableStreamChunk = IReadableStreamChunkAvailable | IReadableStreamClosed

export default class AudioParser {
  public onComplete: IOnCompleteCallback | undefined
  public onProgress: IOnProgressCallback | undefined

  private chunks: Uint8Array[] = []
  private chunkByteLengths: number[] = []

  private frames: number[] = []
  private frameDuration: number

  private totalBytesRead = 0

  public getArrayBufferForTime(startTime: number, endTime: number): ArrayBuffer {
    const startByte = this.getSafeByteOffsetForTime(startTime)
    const endByte = this.getSafeByteOffsetForTime(endTime)
    if (startByte < this.totalBytesRead && endByte < this.totalBytesRead) {
      const foundChunks: Uint8Array[] = []
      let started = false
      let done = false
      let previousValue = 0
      this.chunkByteLengths.find((value, index) => {
        if (!started && startByte < value) {
          started = true
          const start = startByte - previousValue
          if (endByte < value) {
            const end = endByte - previousValue
            foundChunks.push(this.chunks[index].slice(start, end))
            done = true
          } else {
            foundChunks.push(this.chunks[index].slice(start))
            done = false
          }
        } else if (started) {
          if (endByte < value) {
            const end = endByte - previousValue
            foundChunks.push(this.chunks[index].slice(0, end))
            done = true
          } else {
            foundChunks.push(this.chunks[index])
            done = false
          }
        }
        previousValue = value
        return done
      })

      const byteLength = endByte - startByte
      const newBuffer = new ArrayBuffer(byteLength)
      const newArray = new Uint8Array(newBuffer)
      foundChunks.reduce<number>((prev, item) => {
        if (item && item.byteLength) {
          if (item instanceof ArrayBuffer) {
            item = new Uint8Array(item)
          }
          newArray.set(item, prev)
        }
        return item ? prev + item.byteLength : prev
      }, 0)
      return newBuffer
    } else {
      throw Error('Start byte or end byte is out of range.')
    }
  }

  public parseStream(stream: ReadableStream, totalBytes?: number) {
    const reader = stream.getReader()
    let nextFrameOffset: number = 0
    let currentChunk: Uint8Array
    let leftOverChunk: Uint8Array | undefined

    const readStream = () => {
      reader.read().then((chunk: IReadableStreamChunk) => {
        if (!chunk.done) {
          if (leftOverChunk) {
            currentChunk = appendIntArrays(leftOverChunk, chunk.value)
            leftOverChunk = undefined
          } else {
            currentChunk = chunk.value
          }

          if (nextFrameOffset < currentChunk.byteLength) {
            const parsed = parseFrames(currentChunk, nextFrameOffset, this.totalBytesRead)
            this.frames = [...this.frames, ...parsed.frameBoundaries]
            if (!this.frameDuration && parsed.metadata) {
              this.frameDuration = parsed.metadata.frameDuration
            }

            if (parsed.nextFrameBoundary) {
              nextFrameOffset = parsed.nextFrameBoundary - this.totalBytesRead
              if (parsed.frameBoundaries.length) {
                if (nextFrameOffset < currentChunk.byteLength) {
                  leftOverChunk = currentChunk.slice(nextFrameOffset)
                  this.chunks.push(currentChunk.slice(0, nextFrameOffset))
                  this.totalBytesRead += nextFrameOffset
                  nextFrameOffset = 0
                } else {
                  this.chunks.push(currentChunk)
                  this.totalBytesRead += currentChunk.byteLength
                  nextFrameOffset = nextFrameOffset - currentChunk.byteLength
                }
                this.chunkByteLengths.push(this.totalBytesRead)
              } else {
                // Probably found the start of a large ID3 tag.
                leftOverChunk = currentChunk
              }
            } else {
              // Nothing in the current chunk was parsable...
              leftOverChunk = currentChunk
              nextFrameOffset = currentChunk.byteLength
            }
          } else {
            // Probably jumping over chunks that only contain ID3 tag frames.
            leftOverChunk = currentChunk
          }

          if (this.onProgress && totalBytes) {
            if (this.chunks.length && this.chunks.length % 50 === 0) {
              this.onProgress(this.totalBytesRead / totalBytes)
            }
          }

          readStream()
        } else {
          if (this.onComplete) {
            const duration = this.frames.length * this.frameDuration
            this.onComplete(duration)
          }
        }
      })
    }
    readStream()
  }

  public parseFile(buffer: ArrayBuffer) {
    const data = new Uint8Array(buffer)
    const parsed = parseFrames(data)

    this.chunks.push(data)
    this.chunkByteLengths.push(data.byteLength)

    this.frames = parsed.frameBoundaries
    this.totalBytesRead = data.byteLength

    if (parsed.metadata) {
      this.frameDuration = parsed.metadata.frameDuration
    }

    if (this.onComplete) {
      const duration = this.frames.length * this.frameDuration
      this.onComplete(duration)
    }
  }

  private getSafeByteOffsetForTime(time: number): number {
    if (this.frameDuration) {
      const frame = Math.ceil(time / this.frameDuration)
      if (frame < this.frames.length) {
        const startByte = this.frames[frame]
        return startByte
      } else {
        throw Error('Time is out of the loaded range.')
      }
    } else {
      throw Error('No frame duration is set for this audio data.')
    }
  }
}
