export type IOnCompleteCallback = (duration: number) => void
export type IOnProgressCallback = (duration: number) => void

interface IFileMetadata {
  frameDuration: number
  layer: number
  sampleRate: number
  samples: number
  version: number
}

interface IReadableStreamChunkAvailable {
  done: false
  value: Uint8Array
}

interface IReadableStreamClosed {
  done: true
  value: undefined
}

type IReadableStreamChunk = IReadableStreamChunkAvailable | IReadableStreamClosed

enum MASKS {
  FRAME_HEADER = 0b1111111111100000,
  ID3 = 0b11111111111111111111111100000000,
  VERSION = 0b00000000000110000000000000000000,
  LAYER = 0b00000000000001100000000000000000,
  PROTECTED = 0b00000000000000010000000000000000,
  BIT_RATE = 0b00000000000000001111000000000000,
  SAMPLE_RATE = 0b0000000000000000000011000000000,
  PADDING_BIT = 0b00000000000000000000001000000000,
}

enum BIT_SHIFT {
  BIT_RATE = 12,
  SAMPLE_RATE = 10,
  PADDING_BIT = 9,
}

enum FRAME_HEADERS {
  MP3 = 0b1111111111100000,
  ID3_V1 = 0b01010100010000010100011100000000, // TAG
  ID3_V2 = 0b01001001010001000011001100000000, // ID3
}

enum VERSION {
  ONE = 0b00000000000110000000000000000000,
  TWO = 0b00000000000100000000000000000000,
  TWO_FIVE = 0b00000000000000000000000000000000,
}

enum LAYER {
  ONE = 0b00000000000001100000000000000000,
  TWO = 0b00000000000001000000000000000000,
  THREE = 0b00000000000000100000000000000000,
}

const ID3_V1_FRAME_SIZE = 128

const BIT_RATES = {
  [VERSION.ONE]: {
    [LAYER.ONE]: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
    [LAYER.TWO]: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
    [LAYER.THREE]: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  },
  [VERSION.TWO]: {
    [LAYER.ONE]: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
    [LAYER.TWO]: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
    [LAYER.THREE]: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  },
  [VERSION.TWO_FIVE]: {
    [LAYER.ONE]: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
    [LAYER.TWO]: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
    [LAYER.THREE]: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  },
}

const SAMPLE_RATES = {
  [VERSION.ONE]: [44100, 48000, 32000],
  [VERSION.TWO]: [22050, 24000, 16000],
  [VERSION.TWO_FIVE]: [11025, 12000, 8000],
}

const FRAME_SAMPLES = {
  [VERSION.ONE]: {
    [LAYER.ONE]: 384,
    [LAYER.TWO]: 1152,
    [LAYER.THREE]: 1152,
  },
  [VERSION.TWO]: {
    [LAYER.ONE]: 384,
    [LAYER.TWO]: 1152,
    [LAYER.THREE]: 576,
  },
  [VERSION.TWO_FIVE]: {
    [LAYER.ONE]: 384,
    [LAYER.TWO]: 1152,
    [LAYER.THREE]: 576,
  },
}

export class MP3Decoder {
  public onComplete: IOnCompleteCallback | undefined
  public onProgress: IOnProgressCallback | undefined

  private fileMetaData: IFileMetadata
  private frames: number[] = []
  private chunks: Uint8Array[] = []
  private bytes: number[] = []
  private totalBytesRead = 0

  public getSafeByteOffsetForTime(time: number): number {
    const frame = Math.ceil(time / this.fileMetaData.frameDuration)
    if (frame < this.frames.length) {
      const startByte = this.frames[frame]
      return startByte
    } else {
      throw Error('Time is out of range.')
    }
  }

  public getBytes(startByte: number, endByte: number): ArrayBuffer {
    if (startByte < this.totalBytesRead && endByte < this.totalBytesRead) {
      const foundChunks: Uint8Array[] = []
      let started = false
      let done = false
      let previousValue = 0
      this.bytes.find((value, index) => {
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

  public parseStream(stream: ReadableStream) {
    const reader = stream.getReader()
    let lastFrameOffset: number | undefined = 0
    let currentChunk: Uint8Array
    let leftOverChunk: Uint8Array | undefined
    let reads = 0

    const readStream = () => {
      reads += 1
      reader.read().then((chunk: IReadableStreamChunk) => {
        if (!chunk.done) {
          if (leftOverChunk) {
            currentChunk = this.appendIntArrays(leftOverChunk, chunk.value)
            leftOverChunk = undefined
          } else {
            currentChunk = chunk.value
          }

          const frames = this.parseFrames(currentChunk, lastFrameOffset, this.totalBytesRead)
          this.frames = [...this.frames, ...frames]
          const lastFrame = frames.pop()

          if (lastFrame !== undefined) {
            lastFrameOffset = lastFrame - this.totalBytesRead
            const nextFrameSize = this.getFrameSize(
              currentChunk,
              this.fileMetaData,
              lastFrameOffset
            )
            const nextFrameOffset = lastFrameOffset + nextFrameSize
            if (nextFrameOffset < currentChunk.byteLength) {
              this.chunks.push(currentChunk.slice(0, nextFrameOffset))
              leftOverChunk = currentChunk.slice(nextFrameOffset)
              this.totalBytesRead += nextFrameOffset
              lastFrameOffset = 0
            } else {
              this.chunks.push(currentChunk)
              this.totalBytesRead += currentChunk.byteLength
              lastFrameOffset = nextFrameOffset - currentChunk.byteLength
            }
            this.bytes.push(this.totalBytesRead)
          } else {
            leftOverChunk = currentChunk
          }

          if (this.onProgress && reads % 50 === 0) {
            const duration = this.frames.length * this.fileMetaData.frameDuration
            this.onProgress(duration)
          }
          readStream()
        } else {
          if (this.onComplete) {
            const duration = this.frames.length * this.fileMetaData.frameDuration
            this.onComplete(duration)
          }
        }
      })
    }
    readStream()
  }

  public parseFile(buffer: ArrayBuffer) {
    const data = new Uint8Array(buffer)
    this.chunks.push(data)
    this.bytes.push(data.byteLength)
    this.frames = this.parseFrames(data)
    this.totalBytesRead = data.byteLength
    if (this.onComplete) {
      const duration = this.frames.length * this.fileMetaData.frameDuration
      this.onComplete(duration)
    }
  }

  private parseFrames(data: Uint8Array, firstFrameBoundary = 0, frameOffset = 0): number[] {
    const frames: number[] = []
    let frameBoundary = firstFrameBoundary
    while (frameBoundary + 2 <= data.byteLength) {
      if (this.isFrameHeader(data, frameBoundary)) {
        if (this.fileMetaData === undefined) {
          this.fileMetaData = this.getFileMetadata(data, frameBoundary)
        }

        let foundNextFrame = false
        let frameSize = this.getFrameSize(data, this.fileMetaData, frameBoundary)
        while (!foundNextFrame && frameSize + frameBoundary < data.byteLength) {
          if (this.isFrameHeader(data, frameBoundary + frameSize)) {
            foundNextFrame = true
          } else {
            frameSize += 1
          }
        }

        if (foundNextFrame) {
          frameBoundary += frameSize
          frames.push(frameBoundary + frameOffset)
        } else {
          break
        }
      } else if (this.isID3v1Tag(data, frameBoundary)) {
        frameBoundary += ID3_V1_FRAME_SIZE
      } else if (this.isID3v2Tag(data, frameBoundary)) {
        frameBoundary += this.getID3v2TagSize(data, frameBoundary)
      } else {
        // Ignore and keep looking for the next frame header.
        frameBoundary += 1
      }
    }
    return frames
  }

  private appendIntArrays(...arrays: Array<Uint8Array | undefined>): Uint8Array {
    const size = arrays.reduce<number>((prev, item) => {
      return item ? prev + item.byteLength : prev
    }, 0)
    const newBuffer = new ArrayBuffer(size)
    const newArray = new Uint8Array(newBuffer)
    arrays.reduce<number>((prev, item) => {
      if (item && item.byteLength) {
        if (item instanceof ArrayBuffer) {
          item = new Uint8Array(item)
        }
        newArray.set(item, prev)
      }
      return item ? prev + item.byteLength : prev
    }, 0)
    return newArray
  }

  private getUint32(data: Uint8Array, offset: number): number {
    // tslint:disable:no-bitwise
    const byte1 = (data[offset + 0] << 24) >>> 0
    const byte2 = (data[offset + 1] << 16) >>> 0
    const byte3 = (data[offset + 2] << 8) >>> 0
    const byte4 = data[offset + 3]
    return (byte1 | byte2 | byte3 | byte4) >>> 0
    // tslint:enable:no-bitwise
  }

  private getUint16(data: Uint8Array, offset: number): number {
    // tslint:disable:no-bitwise
    const byte1 = (data[offset + 0] << 8) >>> 0
    const byte2 = data[offset + 1] >>> 0
    return (byte1 | byte2) >>> 0
    // tslint:enable:no-bitwise
  }

  private isFrameHeader(data: Uint8Array, offset: number): boolean {
    // tslint:disable-next-line:no-bitwise
    return (this.getUint16(data, offset) & MASKS.FRAME_HEADER) >>> 0 === FRAME_HEADERS.MP3
  }

  private isID3v1Tag(data: Uint8Array, offset: number): boolean {
    // tslint:disable-next-line:no-bitwise
    return (this.getUint32(data, offset) & MASKS.ID3) >>> 0 === FRAME_HEADERS.ID3_V1
  }

  private isID3v2Tag(data: Uint8Array, offset: number): boolean {
    // tslint:disable-next-line:no-bitwise
    return (this.getUint32(data, offset) & MASKS.ID3) >>> 0 === FRAME_HEADERS.ID3_V2
  }

  private getID3v2TagSize(data: Uint8Array, offset: number): number {
    // tslint:disable:no-bitwise
    const byte1 = (data[offset + 6] << 21) >>> 0
    const byte2 = (data[offset + 7] << 14) >>> 0
    const byte3 = (data[offset + 8] << 7) >>> 0
    const byte4 = data[offset + 9]
    return ((byte1 | byte2 | byte3 | byte4) >>> 0) + 10
    // tslint:enable:no-bitwise
  }

  private getVersion(header: number): number {
    // tslint:disable-next-line:no-bitwise
    return (header & MASKS.VERSION) >>> 0
  }

  private getLayer(header: number): number {
    // tslint:disable-next-line:no-bitwise
    return (header & MASKS.LAYER) >>> 0
  }

  private getBitRate(header: number, version: number, layer: number): number {
    // tslint:disable-next-line:no-bitwise
    const bitRateIndex = (header & MASKS.BIT_RATE) >>> BIT_SHIFT.BIT_RATE
    return BIT_RATES[version][layer][bitRateIndex]
  }

  private getSampleRate(header: number, version: number): number {
    // tslint:disable-next-line:no-bitwise
    const sampleRateIndex = (header & MASKS.SAMPLE_RATE) >>> BIT_SHIFT.SAMPLE_RATE
    return SAMPLE_RATES[version][sampleRateIndex]
  }

  private getSamples(version: number, layer: number): number {
    return FRAME_SAMPLES[version][layer]
  }

  private getPadding(header: number) {
    // tslint:disable-next-line:no-bitwise
    return (header & MASKS.PADDING_BIT) >>> BIT_SHIFT.PADDING_BIT
  }

  private getFileMetadata(data: Uint8Array, offset: number): IFileMetadata {
    const header = this.getUint32(data, offset)

    const version = this.getVersion(header)
    const layer = this.getLayer(header)
    const sampleRate = this.getSampleRate(header, version)

    const samples = this.getSamples(version, layer)
    const frameDuration = samples / sampleRate
    return {
      frameDuration,
      layer,
      sampleRate,
      samples,
      version,
    }
  }

  private getFrameSize(data: Uint8Array, metadata: IFileMetadata, offset: number): number {
    const header = this.getUint32(data, offset)
    const bitRate = this.getBitRate(header, metadata.version, metadata.layer)
    const padding = this.getPadding(header)

    // tslint:disable:no-bitwise
    let frameSize: number
    if (metadata.layer === LAYER.ONE) {
      frameSize = ((metadata.samples * bitRate * 125) / metadata.sampleRate + padding * 4) | 0
    } else {
      frameSize = ((metadata.samples * bitRate * 125) / metadata.sampleRate + padding) | 0
    }
    // tslint:enable:no-bitwise
    return frameSize
  }
}
