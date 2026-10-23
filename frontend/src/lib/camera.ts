/** Camera + image helpers for the scan flow. */

export type CameraState = 'starting' | 'live' | 'unavailable'

export async function openCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera not supported')
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1920 } },
  })
}

export function stopCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop())
}

/** Whether the rear camera's torch can be toggled (Android Chrome / WebView). */
export function torchSupported(stream: MediaStream | null): boolean {
  const track = stream?.getVideoTracks()[0]
  const caps = track?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined
  return Boolean(caps?.torch)
}

export async function setTorch(stream: MediaStream | null, on: boolean) {
  const track = stream?.getVideoTracks()[0]
  await track?.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] })
}

/**
 * Centre-crop to a square JPEG. The scan screen shows photos in a square frame and the
 * model's pin coordinates are relative to the uploaded image, so both must match.
 */
export function squareJpeg(source: HTMLVideoElement | HTMLImageElement, maxSide = 1280): Promise<Blob> {
  const w = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth
  const h = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight
  if (!w || !h) return Promise.reject(new Error('Image has no size'))
  const side = Math.min(w, h)
  const out = Math.min(side, maxSide)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = out
  canvas.getContext('2d')!.drawImage(source, (w - side) / 2, (h - side) / 2, side, side, 0, 0, out, out)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode photo'))), 'image/jpeg', 0.88),
  )
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('That file isn’t an image we can read.'))
    img.src = url
  })
}
