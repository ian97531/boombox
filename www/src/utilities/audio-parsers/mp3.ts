import { getUint16, getUint32 } from 'utilities/binaryUtils'

interface IFrameMetadata {
  frameDuration: number
  layer: number
  sampleRate: number
  samples: number
  version: number
}

interface IParsedFrames {
  frameBoundaries: number[]
  metadata?: IFrameMetadata
  nextFrameBoundary?: number
}

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

export function parseFrames(
  data: Uint8Array,
  firstFrameBoundary = 0,
  chunkOffset = 0
): IParsedFrames {
  const frameBoundaries: number[] = []
  let frameBoundary = firstFrameBoundary
  let metadata: IFrameMetadata | undefined

  while (frameBoundary + 4 <= data.byteLength) {
    if (isFrameHeader(data, frameBoundary)) {
      if (metadata === undefined) {
        metadata = getFileMetadata(data, frameBoundary)
      }

      frameBoundaries.push(frameBoundary + chunkOffset)
      const frameSize = getFrameSize(data, metadata, frameBoundary)
      if (frameSize) {
        frameBoundary += frameSize
      } else {
        frameBoundary += 1
      }
    } else if (isID3v1Tag(data, frameBoundary)) {
      frameBoundary += ID3_V1_FRAME_SIZE
    } else if (isID3v2Tag(data, frameBoundary)) {
      frameBoundary += getID3v2TagSize(data, frameBoundary)
    } else {
      // Ignore and keep looking for the next frame header.
      frameBoundary += 1
    }
  }
  return {
    frameBoundaries,
    metadata,
    nextFrameBoundary: frameBoundary + chunkOffset,
  }
}

function isFrameHeader(data: Uint8Array, offset: number): boolean {
  // tslint:disable-next-line:no-bitwise
  return (getUint16(data, offset) & MASKS.FRAME_HEADER) >>> 0 === FRAME_HEADERS.MP3
}

function isID3v1Tag(data: Uint8Array, offset: number): boolean {
  // tslint:disable-next-line:no-bitwise
  return (getUint32(data, offset) & MASKS.ID3) >>> 0 === FRAME_HEADERS.ID3_V1
}

function isID3v2Tag(data: Uint8Array, offset: number): boolean {
  // tslint:disable-next-line:no-bitwise
  return (getUint32(data, offset) & MASKS.ID3) >>> 0 === FRAME_HEADERS.ID3_V2
}

function getID3v2TagSize(data: Uint8Array, offset: number): number {
  // tslint:disable:no-bitwise
  const byte1 = (data[offset + 6] << 21) >>> 0
  const byte2 = (data[offset + 7] << 14) >>> 0
  const byte3 = (data[offset + 8] << 7) >>> 0
  const byte4 = data[offset + 9]
  return ((byte1 | byte2 | byte3 | byte4) >>> 0) + 10
  // tslint:enable:no-bitwise
}

function getVersion(header: number): number {
  // tslint:disable-next-line:no-bitwise
  return (header & MASKS.VERSION) >>> 0
}

function getLayer(header: number): number {
  // tslint:disable-next-line:no-bitwise
  return (header & MASKS.LAYER) >>> 0
}

function getBitRate(header: number, version: number, layer: number): number {
  // tslint:disable-next-line:no-bitwise
  const bitRateIndex = (header & MASKS.BIT_RATE) >>> BIT_SHIFT.BIT_RATE
  return BIT_RATES[version][layer][bitRateIndex]
}

function getSampleRate(header: number, version: number): number {
  // tslint:disable-next-line:no-bitwise
  const sampleRateIndex = (header & MASKS.SAMPLE_RATE) >>> BIT_SHIFT.SAMPLE_RATE
  return SAMPLE_RATES[version][sampleRateIndex]
}

function getSamples(version: number, layer: number): number {
  return FRAME_SAMPLES[version][layer]
}

function getPadding(header: number) {
  // tslint:disable-next-line:no-bitwise
  return (header & MASKS.PADDING_BIT) >>> BIT_SHIFT.PADDING_BIT
}

function getFileMetadata(data: Uint8Array, offset: number): IFrameMetadata {
  const header = getUint32(data, offset)

  const version = getVersion(header)
  const layer = getLayer(header)
  const sampleRate = getSampleRate(header, version)

  const samples = getSamples(version, layer)
  const frameDuration = samples / sampleRate
  return {
    frameDuration,
    layer,
    sampleRate,
    samples,
    version,
  }
}

function getFrameSize(data: Uint8Array, metadata: IFrameMetadata, offset: number): number {
  const header = getUint32(data, offset)
  const bitRate = getBitRate(header, metadata.version, metadata.layer)
  const padding = getPadding(header)

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
