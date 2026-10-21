'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageUp, Loader2, RotateCw, Trash2 } from 'lucide-react';
import { Alert, Badge, Button, Card, Field, Notice, Textarea } from './ui';

/**
 * Screenshot and QR handling run entirely in the browser.
 *
 * Nothing in this file uploads an image. The file is decoded locally, redrawn onto a
 * canvas (which also drops EXIF and every other metadata block), and either read by
 * the local OCR worker or decoded as a QR code. Only text the user has reviewed is
 * submitted, through the surrounding server-action form.
 */

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_PIXELS = 25_000_000; // guards against a decompression-bomb image
const MAX_EDGE = 2000;

type Loaded = { canvas: HTMLCanvasElement; width: number; height: number; mime: string };

async function sniffImage(file: File): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const is = (...bytes: number[]) => bytes.every((b, i) => head[i] === b);
  if (is(0x89, 0x50, 0x4e, 0x47)) return 'image/png';
  if (is(0xff, 0xd8, 0xff)) return 'image/jpeg';
  const ascii = (from: number, to: number) => String.fromCharCode(...head.slice(from, to));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  return null;
}

async function loadToCanvas(file: File, rotation: number): Promise<Loaded> {
  const mime = await sniffImage(file);
  if (!mime) throw new Error('That file is not a PNG, JPEG or WebP image. Only real image files are accepted.');
  if (file.size > MAX_BYTES) throw new Error('Images must be 8 MB or smaller.');

  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > MAX_PIXELS) {
      throw new Error('That image is too large to process safely. Crop it to the part that matters.');
    }
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const swap = rotation === 90 || rotation === 270;

    const canvas = document.createElement('canvas');
    canvas.width = swap ? h : w;
    canvas.height = swap ? w : h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Your browser could not process the image.');
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(bitmap, -w / 2, -h / 2, w, h);
    ctx.restore();
    return { canvas, width: canvas.width, height: canvas.height, mime };
  } finally {
    bitmap.close();
  }
}

function usePreview() {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return [url, setUrl] as const;
}

/* ------------------------------------------------------------------ OCR ---- */

export function ScreenshotReader({ textareaName = 'content' }: { textareaName?: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'reading' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [rotation, setRotation] = useState(0);
  const [preview, setPreview] = usePreview();
  const fileRef = useRef<File | null>(null);

  const run = useCallback(async (file: File, rotate: number) => {
    setStatus('loading');
    setMessage(null);
    setProgress(0);
    try {
      const { canvas } = await loadToCanvas(file, rotate);
      setPreview(canvas.toDataURL('image/png'));
      setStatus('reading');

      // Loaded lazily so visitors who never upload a screenshot never fetch the worker.
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        workerPath: '/ocr/worker.min.js',
        corePath: '/ocr',
        langPath: '/ocr',
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100));
        },
      });
      try {
        const { data } = await worker.recognize(canvas);
        const extracted = (data.text ?? '').replace(/\n{3,}/g, '\n\n').trim();
        setText(extracted);
        setStatus('done');
        if (!extracted) {
          setMessage(
            'No text could be read from this image. TrustCircle will not guess at what it might have said — type the message out instead, or try a sharper screenshot.',
          );
        }
      } finally {
        await worker.terminate();
      }
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Could not read that image.');
    }
  }, [setPreview]);

  return (
    <div className="space-y-4">
      <Card tone="sunken">
        <label className="block text-sm font-medium" htmlFor="screenshot">Screenshot</label>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">
          PNG, JPEG or WebP, up to 8 MB. The image stays on this device — it is read here in your browser and
          is never uploaded or stored.
        </p>
        <input
          id="screenshot"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="mt-3 block w-full cursor-pointer rounded-xl border border-[var(--border-strong)] bg-[var(--bg-raised)] p-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--accent)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--accent-fg)]"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            fileRef.current = file;
            setRotation(0);
            void run(file, 0);
          }}
        />

        {(status === 'loading' || status === 'reading') && (
          <p className="mt-3 flex items-center gap-2 text-sm text-[var(--fg-muted)]" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {status === 'loading' ? 'Preparing the image…' : `Reading text on your device… ${progress}%`}
          </p>
        )}

        {preview && (
          <div className="mt-4 space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="The screenshot you selected" className="max-h-64 w-auto rounded-xl border border-[var(--border)]" />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                tone="secondary"
                onClick={() => {
                  const next = (rotation + 90) % 360;
                  setRotation(next);
                  if (fileRef.current) void run(fileRef.current, next);
                }}
              >
                <RotateCw className="h-4 w-4" aria-hidden /> Rotate and read again
              </Button>
              <Button
                type="button"
                tone="ghost"
                onClick={() => {
                  fileRef.current = null;
                  setPreview(null);
                  setText('');
                  setStatus('idle');
                  setMessage(null);
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden /> Remove
              </Button>
            </div>
          </div>
        )}
      </Card>

      {message && <Alert tone={status === 'error' ? 'high' : 'caution'}>{message}</Alert>}

      <Field
        label="Text to check"
        htmlFor={textareaName}
        hint="Correct anything the reader got wrong before checking. Text extraction makes mistakes, especially with small or stylised type."
        required
      >
        <Textarea
          id={textareaName}
          name={textareaName}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Upload a screenshot above, or type the message out here."
          required
          maxLength={20000}
        />
      </Field>

      {status === 'done' && text && (
        <Badge tone="accent">
          <ImageUp className="h-3.5 w-3.5" aria-hidden /> Extracted on this device · {text.length} characters
        </Badge>
      )}

      <Notice>
        Remove anything you would rather not store before checking — though TrustCircle also strips OTPs, PINs,
        CVVs, card numbers, Aadhaar and PAN automatically before saving anything.
      </Notice>
    </div>
  );
}

/* ------------------------------------------------------------------- QR ---- */

export function QrReader({ textareaName = 'content' }: { textareaName?: string }) {
  const [status, setStatus] = useState<'idle' | 'reading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [preview, setPreview] = usePreview();

  const run = useCallback(async (file: File) => {
    setStatus('reading');
    setMessage(null);
    try {
      const { canvas } = await loadToCanvas(file, 0);
      setPreview(canvas.toDataURL('image/png'));
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const jsQR = (await import('jsqr')).default;
      const code = jsQR(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' });
      if (!code?.data) {
        setStatus('error');
        setMessage(
          'No QR code could be read from this image. Nothing has been guessed or filled in. Try a clearer, closer picture of just the code.',
        );
        return;
      }
      setValue(code.data);
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Could not read that image.');
    }
  }, [setPreview]);

  return (
    <div className="space-y-4">
      <Alert tone="caution" title="Nothing is opened or paid">
        TrustCircle reads what the code contains and shows it to you as text. It does not open a link, launch a
        payment app, or start a transaction. Scanning a UPI QR code in a payment app <em>sends</em> money — there
        is no QR code that receives it.
      </Alert>

      <Card tone="sunken">
        <label className="block text-sm font-medium" htmlFor="qr-image">Picture of the QR code</label>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">
          Decoded in your browser. The image is never uploaded.
        </p>
        <input
          id="qr-image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="mt-3 block w-full cursor-pointer rounded-xl border border-[var(--border-strong)] bg-[var(--bg-raised)] p-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--accent)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--accent-fg)]"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void run(file);
          }}
        />
        {status === 'reading' && (
          <p className="mt-3 flex items-center gap-2 text-sm text-[var(--fg-muted)]" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Decoding on this device…
          </p>
        )}
        {preview && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={preview} alt="The image you selected" className="mt-4 max-h-56 w-auto rounded-xl border border-[var(--border)]" />
        )}
      </Card>

      {message && <Alert tone={status === 'error' ? 'high' : 'caution'}>{message}</Alert>}

      <Field
        label="What the code contains"
        htmlFor={textareaName}
        hint="Shown as plain text. You can paste a code's contents here directly if you already have it."
        required
      >
        <Textarea
          id={textareaName}
          name={textareaName}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Upload a picture of the QR code above, or paste its contents."
          required
          maxLength={20000}
          className="font-mono text-xs"
        />
      </Field>
    </div>
  );
}
