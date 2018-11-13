export function appendIntArrays(...arrays: Array<Uint8Array | undefined>): Uint8Array {
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

export function getUint32(data: Uint8Array, offset: number): number {
  // tslint:disable:no-bitwise
  const byte1 = (data[offset + 0] << 24) >>> 0
  const byte2 = (data[offset + 1] << 16) >>> 0
  const byte3 = (data[offset + 2] << 8) >>> 0
  const byte4 = data[offset + 3]
  return (byte1 | byte2 | byte3 | byte4) >>> 0
  // tslint:enable:no-bitwise
}

export function getUint16(data: Uint8Array, offset: number): number {
  // tslint:disable:no-bitwise
  const byte1 = (data[offset + 0] << 8) >>> 0
  const byte2 = data[offset + 1] >>> 0
  return (byte1 | byte2) >>> 0
  // tslint:enable:no-bitwise
}
