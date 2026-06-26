type PdfImageFormat = 'JPEG' | 'PNG'

type PreparedPhoto = {
  dataUrl: string
  format: PdfImageFormat
  width: number
  height: number
}

function getImageFormat(dataUrl: string): PdfImageFormat {
  if (dataUrl.startsWith('data:image/png')) {
    return 'PNG'
  }

  return 'JPEG'
}

function readUint16(bytes: Uint8Array, offset: number, littleEndian: boolean) {
  return littleEndian
    ? bytes[offset] | (bytes[offset + 1] << 8)
    : (bytes[offset] << 8) | bytes[offset + 1]
}

function readUint32(bytes: Uint8Array, offset: number, littleEndian: boolean) {
  return littleEndian
    ? (bytes[offset] |
        (bytes[offset + 1] << 8) |
        (bytes[offset + 2] << 16) |
        (bytes[offset + 3] << 24)) >>>
        0
    : ((bytes[offset] << 24) |
        (bytes[offset + 1] << 16) |
        (bytes[offset + 2] << 8) |
        bytes[offset + 3]) >>>
        0
}

function readIfdOrientation(
  bytes: Uint8Array,
  ifdOffset: number,
  littleEndian: boolean,
): number | null {
  if (ifdOffset + 2 >= bytes.length) {
    return null
  }

  const entryCount = readUint16(bytes, ifdOffset, littleEndian)

  for (let entry = 0; entry < entryCount; entry += 1) {
    const entryOffset = ifdOffset + 2 + entry * 12
    if (entryOffset + 12 > bytes.length) {
      break
    }

    const tag = readUint16(bytes, entryOffset, littleEndian)

    if (tag === 0x0112) {
      const value = readUint16(bytes, entryOffset + 8, littleEndian)
      return value >= 1 && value <= 8 ? value : 1
    }

    if (tag === 0x8769) {
      const subIfdOffset = readUint32(bytes, entryOffset + 8, littleEndian)
      const nested = readIfdOrientation(bytes, subIfdOffset, littleEndian)
      if (nested) {
        return nested
      }
    }
  }

  return null
}

function readExifOrientationFromBytes(bytes: Uint8Array): number {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return 1
  }

  let offset = 2

  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      break
    }

    const marker = bytes[offset + 1]
    const segmentLength = readUint16(bytes, offset + 2, false)

    if (marker === 0xe1) {
      const exifHeader = String.fromCharCode(
        bytes[offset + 4],
        bytes[offset + 5],
        bytes[offset + 6],
        bytes[offset + 7],
      )

      if (exifHeader === 'Exif') {
        const tiffOffset = offset + 10
        const littleEndian =
          bytes[tiffOffset] === 0x49 && bytes[tiffOffset + 1] === 0x49
        const ifdOffset = readUint32(bytes, tiffOffset + 4, littleEndian)
        const orientation = readIfdOrientation(
          bytes,
          tiffOffset + ifdOffset,
          littleEndian,
        )

        if (orientation) {
          return orientation
        }
      }
    }

    offset += 2 + segmentLength
  }

  return 1
}

async function readBlobBytes(blob: Blob): Promise<Uint8Array> {
  const buffer = await blob.arrayBuffer()
  return new Uint8Array(buffer)
}

function getOrientedCanvasSize(
  width: number,
  height: number,
  orientation: number,
): { width: number; height: number } {
  if (orientation >= 5 && orientation <= 8) {
    return { width: height, height: width }
  }

  return { width, height }
}

function applyOrientationTransform(
  context: CanvasRenderingContext2D,
  orientation: number,
  width: number,
  height: number,
) {
  switch (orientation) {
    case 2:
      context.translate(width, 0)
      context.scale(-1, 1)
      break
    case 3:
      context.translate(width, height)
      context.rotate(Math.PI)
      break
    case 4:
      context.translate(0, height)
      context.scale(1, -1)
      break
    case 5:
      context.rotate(0.5 * Math.PI)
      context.scale(1, -1)
      break
    case 6:
      context.rotate(0.5 * Math.PI)
      context.translate(0, -height)
      break
    case 7:
      context.rotate(0.5 * Math.PI)
      context.translate(width, -height)
      context.scale(-1, 1)
      break
    case 8:
      context.rotate(-0.5 * Math.PI)
      context.translate(-width, 0)
      break
    default:
      break
  }
}

async function loadAppOrientedBitmap(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' })
  } catch {
    const bytes = await readBlobBytes(blob)
    const orientation = readExifOrientationFromBytes(bytes)

    if (orientation === 1) {
      return createImageBitmap(blob)
    }

    const rawBitmap = await createImageBitmap(blob, {
      imageOrientation: 'none',
    })
    const { width, height } = getOrientedCanvasSize(
      rawBitmap.width,
      rawBitmap.height,
      orientation,
    )
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')

    if (!context) {
      rawBitmap.close()
      throw new Error('Unable to prepare photo for PDF export.')
    }

    applyOrientationTransform(context, orientation, width, height)
    context.drawImage(rawBitmap, 0, 0)
    rawBitmap.close()

    const orientedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result)
          } else {
            reject(new Error('Unable to prepare photo for PDF export.'))
          }
        },
        'image/jpeg',
        0.92,
      )
    })

    return createImageBitmap(orientedBlob)
  }
}

async function loadAppOrientedBitmapFromDataUrl(
  dataUrl: string,
): Promise<ImageBitmap> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return loadAppOrientedBitmap(blob)
}

function drawRoundedImageFrame(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  frameWidth: number,
  frameHeight: number,
) {
  const scale = Math.min(frameWidth / sourceWidth, frameHeight / sourceHeight)
  const drawWidth = sourceWidth * scale
  const drawHeight = sourceHeight * scale
  const drawX = (frameWidth - drawWidth) / 2
  const drawY = (frameHeight - drawHeight) / 2
  const radius = Math.min(frameWidth, frameHeight) * 0.06

  context.save()
  context.beginPath()
  context.roundRect(2, 2, frameWidth - 4, frameHeight - 4, radius)
  context.clip()
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight)
  context.restore()

  context.save()
  context.strokeStyle = '#D9E2EC'
  context.lineWidth = 2
  context.beginPath()
  context.roundRect(2, 2, frameWidth - 4, frameHeight - 4, radius)
  context.stroke()
  context.restore()
}

export async function prepareVisitPhotoForPdf(
  dataUrl: string,
  frameWidthPx: number,
  frameHeightPx: number,
): Promise<PreparedPhoto> {
  const bitmap = await loadAppOrientedBitmapFromDataUrl(dataUrl)
  const sourceWidth = bitmap.width
  const sourceHeight = bitmap.height

  const canvas = document.createElement('canvas')
  canvas.width = frameWidthPx
  canvas.height = frameHeightPx
  const context = canvas.getContext('2d')

  if (!context) {
    bitmap.close()
    throw new Error('Unable to prepare photo for PDF export.')
  }

  context.fillStyle = '#FFFFFF'
  context.fillRect(0, 0, frameWidthPx, frameHeightPx)
  context.fillStyle = 'rgba(226, 232, 240, 0.55)'
  context.fillRect(4, 6, frameWidthPx - 4, frameHeightPx - 4)
  drawRoundedImageFrame(
    context,
    bitmap,
    sourceWidth,
    sourceHeight,
    frameWidthPx,
    frameHeightPx,
  )
  bitmap.close()

  const framedDataUrl = canvas.toDataURL('image/jpeg', 0.92)

  return {
    dataUrl: framedDataUrl,
    format: getImageFormat(framedDataUrl),
    width: frameWidthPx,
    height: frameHeightPx,
  }
}
