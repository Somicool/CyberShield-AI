import { useRef, useState } from 'react'
import { Upload, Loader2, Camera, Link2, Search } from 'lucide-react'
import jsQR from 'jsqr'
import { submitDetection } from '../../api/detect'
import ScanResult from './ScanResult'

const URL_RE = /https?:\/\/[^\s"'<>]+/i

/** Load a File/Blob URL into an HTMLImageElement. */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Decode a QR code from an image file entirely in the browser using jsQR
 * (pure JS, works in every browser — no BarcodeDetector needed). The image is
 * drawn to a canvas and its pixels are scanned; large images are downscaled
 * for speed while keeping enough detail to read the code.
 */
async function decodeQrFromFile(file) {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const maxDim = 1200
    const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1))
    const width = Math.max(1, Math.round((img.width || 1) * scale))
    const height = Math.max(1, Math.round((img.height || 1) * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, width, height)
    const { data } = ctx.getImageData(0, 0, width, height)
    const code = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' })
    return code?.data || null
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Embeddable QR scan panel. Decodes an uploaded QR image in-browser with jsQR
 * and analyzes any embedded link through the existing detection pipeline. A
 * manual-paste box remains as a fallback.
 */
export default function QrScanPanel() {
  const fileRef = useRef(null)
  const [decoded, setDecoded] = useState('')
  const [decoding, setDecoding] = useState(false)
  const [result, setResult] = useState(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [manual, setManual] = useState('')

  const analyze = async (value) => {
    const match = (value || '').match(URL_RE)
    if (!match) return
    setChecking(true)
    setError('')
    try {
      const data = await submitDetection({ type: 'url', content: match[0] })
      setResult(data)
    } catch {
      setError('We decoded the QR code but could not analyze the link. Please try again.')
    } finally {
      setChecking(false)
    }
  }

  const decodeFile = async (file) => {
    if (!file) return
    setError('')
    setResult(null)
    setDecoded('')
    setDecoding(true)
    try {
      const value = await decodeQrFromFile(file)
      if (!value) {
        setError('We could not find a QR code in that image. Try a clearer, straight-on picture, or paste the link below.')
        return
      }
      setDecoded(value)
      await analyze(value)
    } catch {
      setError('We could not read that image. Please try another one or paste the link below.')
    } finally {
      setDecoding(false)
    }
  }

  const decodedIsUrl = decoded && URL_RE.test(decoded)

  return (
    <>
      <p className="mb-3 text-sm text-slate-400">Upload a QR code image and we will read the link inside it and check if it is safe.</p>

      <label
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700 bg-slate-900/72 px-4 py-10 text-center transition hover:border-sky-500/60 hover:bg-slate-900/80"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); decodeFile(e.dataTransfer.files?.[0]) }}
      >
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => decodeFile(e.target.files?.[0])} />
        {decoding ? <Loader2 size={26} className="animate-spin text-sky-400" /> : <Upload size={26} className="text-slate-400" />}
        <span className="text-sm text-slate-300">{decoding ? 'Reading QR code...' : 'Tap to upload a QR code image, or drop it here'}</span>
        <span className="text-xs text-slate-500">We only read the link inside the code.</span>
      </label>

      <button
        disabled
        title="Camera scanning is coming soon"
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/72 py-3 text-sm text-slate-500"
      >
        <Camera size={16} /> Scan with camera (coming soon)
      </button>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/72 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm text-slate-300"><Link2 size={15} /> Or paste the link from the QR code</div>
        <div className="flex gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="https://..."
            className="flex-1 rounded-lg border border-slate-800 bg-slate-950/78 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
          />
          <button
            onClick={() => { setDecoded(manual.trim()); analyze(manual.trim()) }}
            disabled={!manual.trim() || checking}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            <Search size={15} /> Check
          </button>
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>}

      {decoded && (
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/72 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">QR code content</div>
          <p className="mt-1 wrap-break-word font-mono text-sm text-slate-200">{decoded}</p>
          {!decodedIsUrl && <p className="mt-2 text-xs text-slate-500">This QR code does not contain a web link, so there is nothing to analyze.</p>}
        </div>
      )}

      {checking && (
        <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-400"><Loader2 size={15} className="animate-spin" /> Analyzing the link...</p>
      )}

      <ScanResult result={result} reportCategory="QR Scam" />
    </>
  )
}
