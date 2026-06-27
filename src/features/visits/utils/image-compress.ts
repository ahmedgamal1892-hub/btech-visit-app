const DEFAULT_MAX_DIMENSION = 1920
const DEFAULT_QUALITY = 0.82

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error(`Could not read image "${file.name}".`))
    }

    image.src = objectUrl
  })
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Image compression failed.'))
          return
        }

        resolve(blob)
      },
      mimeType,
      quality,
    )
  })
}

export async function compressImageFile(
  file: File,
  maxDimension = DEFAULT_MAX_DIMENSION,
  quality = DEFAULT_QUALITY,
): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file
  }

  const image = await loadImageFromFile(file)
  const largestSide = Math.max(image.width, image.height)

  if (largestSide <= maxDimension && file.size <= 1024 * 1024) {
    return file
  }

  const scale = largestSide > maxDimension ? maxDimension / largestSide : 1
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')

  if (!context) {
    return file
  }

  context.drawImage(image, 0, 0, width, height)

  const mimeType =
    file.type === 'image/png' || file.type === 'image/webp'
      ? 'image/jpeg'
      : file.type

  const blob = await canvasToBlob(canvas, mimeType, quality)
  const extension = mimeType === 'image/jpeg' ? '.jpg' : ''
  const baseName = file.name.replace(/\.[^.]+$/, '')

  return new File([blob], `${baseName}${extension}`, {
    type: mimeType,
    lastModified: Date.now(),
  })
}

export async function compressImageFiles(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => compressImageFile(file)))
}
