import Axios, { AxiosResponse } from 'axios'

export type IOnNewFramesCallback = (
  frames: ArrayBuffer,
  numberOfFrames: number,
  numberOfBytes: number
) => void
export type IOnCompleteCallback = (duration: number) => void
export type IOnStartCallback = (contentLength: number) => void

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
  FRAME_HEADER = Number(0b11111111111000000000000000000000),
  ID3 = Number(0b11111111111111111111111100000000),
  VERSION = Number(0b00000000000110000000000000000000),
  LAYER = Number(0b00000000000001100000000000000000),
  PROTECTED = Number(0b00000000000000010000000000000000),
  BIT_RATE = Number(0b00000000000000001111000000000000),
  SAMPLE_RATE = Number(0b0000000000000000000011000000000),
  PADDING_BIT = Number(0b00000000000000000000001000000000),
}

enum BIT_SHIFT {
  BIT_RATE = 12,
  SAMPLE_RATE = 10,
  PADDING_BIT = 9,
}

enum FRAME_HEADERS {
  MP3 = Number(0b11111111111000000000000000000000),
  ID3_V1 = Number(0b01010100010000010100011100000000), // TAG
  ID3_V2 = 0b01001001010001000011001100000000, // ID3
}

enum VERSION {
  ONE = Number(0b00000000000110000000000000000000),
  TWO = Number(0b00000000000100000000000000000000),
  TWO_FIVE = Number(0b00000000000000000000000000000000),
}

enum LAYER {
  ONE = Number(0b00000000000001100000000000000000),
  TWO = Number(0b00000000000001000000000000000000),
  THREE = Number(0b00000000000000100000000000000000),
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

export class GetMp3 {
  public onComplete: IOnCompleteCallback | undefined
  public onNewFrames: IOnNewFramesCallback | undefined
  public onStart: IOnStartCallback | undefined

  private url: string
  private contentLength: number
  private duration: number
  private preparedFrames: Uint8Array[]

  private currentBytes: Uint8Array = new Uint8Array(0)

  constructor(url: string) {
    this.url = url
  }

  public get() {
    Axios.head(this.url).then((redirect: AxiosResponse) => {
      if (redirect.request) {
        const url = redirect.request.responseURL
        if (!(window.fetch || ReadableStream)) {
          console.log('doing a lame array buffer')
          Axios.get(url, { responseType: 'arraybuffer' }).then(
            (response: AxiosResponse<ArrayBuffer>) => {
              this.parseResponseStart(response)
              if (this.onComplete || this.onNewFrames) {
                const frames = this.parseArrayBuffer(response.data)
                if (this.onNewFrames) {
                  this.onNewFrames(response.data, frames, this.contentLength)
                }
                if (this.onComplete) {
                  this.onComplete(this.duration)
                }
              }
            }
          )
        } else {
          console.log('trying streams...')
          fetch(url)
            .then(response => {
              this.parseResponseStart(response)
              return response.body
            })
            .then(body => {
              if (body) {
                const reader = body.getReader()
                this.parseStream(reader)
              } else {
                throw Error('Got null response.body instead of a readable stream.')
              }
            })
        }
      }
    })
  }

  private parseResponseStart(response: Response | AxiosResponse<ArrayBuffer>) {
    this.contentLength = 0
    if (this.onStart) {
      this.onStart(this.contentLength)
    }
  }

  private parseArrayBuffer(data: ArrayBuffer) {
    this.duration = 0

    let frameStart = 0
    let frameEnd: number | undefined
    let frames = 0

    const bytes = new DataView(data)
    while (frameEnd === undefined || frameEnd < data.byteLength) {
      if (frameEnd !== undefined) {
        frameStart = frameEnd
        frameEnd = undefined
      }

      if (this.isFrameHeader(bytes, frameStart)) {
        frameEnd = this.getFrameSize(bytes, frameStart) + frameStart
        this.duration += this.getFrameDuration(bytes, frameStart)
        frames += 1
      } else if (this.isID3v1Tag(bytes, frameStart)) {
        console.log('found an ID3v1 tag!')
        frameEnd = ID3_V1_FRAME_SIZE + frameStart
      } else if (this.isID3v2Tag(bytes, frameStart)) {
        console.log('found an ID3v2 tag!')
        frameEnd = this.getID3v2TagSize(bytes, frameStart)
      } else {
        throw Error(`Error parsing ${this.url}`)
      }
    }
    return frames
  }

  private parseStream(reader: ReadableStreamReader) {
    this.duration = 0
    this.currentBytes = new Uint8Array(0)
    this.preparedFrames = []

    let frameStart = 0
    let frameEnd: number | undefined

    const readStream = () => {
      reader.read().then((chunk: IReadableStreamChunk) => {
        if (!chunk.done) {
          const { newArray } = this.appendIntArray(this.currentBytes, chunk.value)
          this.currentBytes = newArray

          console.log('reading chunk')
          const bytes = new DataView(this.currentBytes.buffer)
          while (frameEnd === undefined || frameEnd < this.currentBytes.byteLength) {
            if (frameEnd !== undefined) {
              this.prepareFrame(frameStart, frameEnd)
              frameStart = frameEnd
              frameEnd = undefined
            }

            if (this.isFrameHeader(bytes, frameStart)) {
              console.log('found a frame header!')
              frameEnd = this.getFrameSize(bytes, frameStart) + frameStart
              this.duration += this.getFrameDuration(bytes, frameStart)
            } else if (this.isID3v1Tag(bytes, frameStart)) {
              console.log('found an ID3v1 tag!')
              frameEnd = ID3_V1_FRAME_SIZE + frameStart
            } else if (this.isID3v2Tag(bytes, frameStart)) {
              console.log('found an ID3v2 tag!')
              frameEnd = this.getID3v2TagSize(bytes, frameStart)
            } else {
              throw Error(`Error parsing ${this.url}`)
            }
          }

          const sentBytes = this.sendFrames()
          if (sentBytes) {
            this.currentBytes = this.currentBytes.slice(sentBytes)
            frameStart = frameStart - sentBytes
            if (frameEnd) {
              frameEnd = frameEnd - sentBytes
            }
          }
        } else {
          if (this.onComplete) {
            this.onComplete(this.duration)
          }
        }
        readStream()
      })
    }

    readStream()
  }

  private sendFrames(): number {
    let totalBytes = 0
    if (this.onNewFrames) {
      let buffer: ArrayBuffer | undefined
      let bytes = new Uint8Array(0)

      for (const frame of this.preparedFrames) {
        const { newArray, newBuffer } = this.appendIntArray(bytes, frame)
        buffer = newBuffer
        bytes = newArray
      }

      totalBytes = bytes.byteLength
      if (buffer) {
        this.onNewFrames(buffer, this.preparedFrames.length, totalBytes)
      }
    } else {
      for (const frame of this.preparedFrames) {
        totalBytes += frame.byteLength
      }
    }
    this.preparedFrames = []
    return totalBytes
  }

  private appendIntArray(
    target: Uint8Array,
    withArray: Uint8Array
  ): { newArray: Uint8Array; newBuffer: ArrayBuffer } {
    const newBuffer = new ArrayBuffer(target.byteLength + withArray.byteLength)
    const newArray = new Uint8Array(newBuffer)
    if (target.byteLength) {
      newArray.set(target)
    }
    newArray.set(withArray, target.byteLength)
    return {
      newArray,
      newBuffer,
    }
  }

  private prepareFrame(frameStart: number, frameEnd: number) {
    const frame = new Uint8Array(frameEnd - frameStart)
    frame.set(this.currentBytes.slice(frameStart, frameEnd))
    this.preparedFrames.push(frame)
  }

  private isFrameHeader(data: DataView, offset: number): boolean {
    // tslint:disable-next-line:no-bitwise
    return Number((data.getUint32(offset) & MASKS.FRAME_HEADER) >>> 0) === FRAME_HEADERS.MP3
  }

  private isID3v1Tag(data: DataView, offset: number): boolean {
    // tslint:disable-next-line:no-bitwise
    return Number((data.getUint32(offset) & MASKS.ID3) >>> 0) === FRAME_HEADERS.ID3_V1
  }

  private isID3v2Tag(data: DataView, offset: number): boolean {
    // tslint:disable-next-line:no-bitwise
    return Number((data.getUint32(offset) & MASKS.ID3) >>> 0) === FRAME_HEADERS.ID3_V2
  }

  private getID3v2TagSize(data: DataView, offset: number): number {
    // tslint:disable:no-bitwise
    const byte1 = Number((data.getUint8(offset + 6) << 21) >>> 0)
    const byte2 = Number((data.getUint8(offset + 7) << 14) >>> 0)
    const byte3 = Number((data.getUint8(offset + 8) << 7) >>> 0)
    const byte4 = Number(data.getUint8(offset + 9))
    return Number((byte1 | byte2 | byte3 | byte4) >>> 0) + 10
    // tslint:enable:no-bitwise
  }

  private getVersion(header: number): number {
    // tslint:disable-next-line:no-bitwise
    return Number((header & MASKS.VERSION) >>> 0)
  }

  private getLayer(header: number): number {
    // tslint:disable-next-line:no-bitwise
    return Number((header & MASKS.LAYER) >>> 0)
  }

  private getBitRate(header: number, version: number, layer: number): number {
    // tslint:disable-next-line:no-bitwise
    const bitRateIndex = Number((header & MASKS.BIT_RATE) >>> BIT_SHIFT.BIT_RATE)
    return BIT_RATES[version][layer][bitRateIndex]
  }

  private getSampleRate(header: number, version: number): number {
    // tslint:disable-next-line:no-bitwise
    const sampleRateIndex = Number((header & MASKS.SAMPLE_RATE) >>> BIT_SHIFT.SAMPLE_RATE)
    return SAMPLE_RATES[version][sampleRateIndex]
  }

  private getSamples(version: number, layer: number): number {
    return FRAME_SAMPLES[version][layer]
  }

  private getPadding(header: number) {
    // tslint:disable-next-line:no-bitwise
    return Number((header & MASKS.PADDING_BIT) >>> BIT_SHIFT.PADDING_BIT)
  }

  private getFrameSize(data: DataView, offset: number): number {
    const header = data.getUint32(offset)

    const version = this.getVersion(header)
    const layer = this.getLayer(header)
    const bitRate = this.getBitRate(header, version, layer)
    const sampleRate = this.getSampleRate(header, version)
    const padding = this.getPadding(header)
    const samples = this.getSamples(version, layer)

    // tslint:disable:no-bitwise
    let frameSize: number
    if (layer === LAYER.ONE) {
      frameSize = ((samples * bitRate * 125) / sampleRate + padding * 4) | 0
    } else {
      frameSize = ((samples * bitRate * 125) / sampleRate + padding) | 0
    }
    // tslint:enable:no-bitwise
    return frameSize
  }

  private getFrameDuration(data: DataView, offset: number): number {
    const header = data.getUint32(offset)

    const version = this.getVersion(header)
    const layer = this.getLayer(header)
    const sampleRate = this.getSampleRate(header, version)
    const samples = this.getSamples(version, layer)
    return samples / sampleRate
  }
}
