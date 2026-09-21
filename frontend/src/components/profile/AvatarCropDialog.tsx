import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'

async function getCroppedBlob(imageSrc: string, crop: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  const size = Math.min(crop.width, crop.height)
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not crop image')

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    size,
    size,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Could not export cropped image'))
        else resolve(blob)
      },
      'image/jpeg',
      0.92,
    )
  })
}

export function AvatarCropDialog({
  open,
  imageSrc,
  onOpenChange,
  onConfirm,
  confirming,
}: {
  open: boolean
  imageSrc: string | null
  onOpenChange: (open: boolean) => void
  onConfirm: (file: File) => void
  confirming?: boolean
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels)
  }, [])

  const handleConfirm = async () => {
    if (!imageSrc || !croppedArea) return
    const blob = await getCroppedBlob(imageSrc, croppedArea)
    const file = new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' })
    onConfirm(file)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Crop profile photo"
      description="Adjust the frame so your face sits clearly in the square."
      className="max-w-xl"
    >
      <div className="relative h-72 overflow-hidden rounded-2xl bg-[#0d2a28]">
        {imageSrc ? (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        ) : null}
      </div>
      <div className="mt-4">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7c78]">
          Zoom
        </label>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-[#0d2a28]"
        />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          className="rounded-xl bg-[#0d2a28] hover:bg-[#16403c]"
          disabled={confirming || !croppedArea}
          onClick={() => void handleConfirm()}
        >
          {confirming ? 'Saving…' : 'Use photo'}
        </Button>
      </div>
    </Dialog>
  )
}
