'use client';

import { Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';

import type {
  AllowedFormat,
  CloudinaryBucket,
  SignedUploadParams,
} from '@luxematch/cloudinary';

import { Button } from '@/components/ui/button';

export type UploadResult = {
  publicId: string;
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  originalFilename: string | null;
};

type Props = {
  /** Cloudinary bucket; the server forces the per-jeweller folder. */
  bucket: CloudinaryBucket;
  /** Optional fixed public_id (without folder prefix). */
  publicIdHint?: string;
  /** Called after the asset finishes uploading. Persist to DB in the parent. */
  onUploadComplete: (result: UploadResult) => void;
  /** Optional label override. */
  label?: string;
  className?: string;
};

type State =
  | { kind: 'idle' }
  | { kind: 'preview'; file: File; previewUrl: string }
  | { kind: 'uploading'; previewUrl: string; progress: number }
  | { kind: 'done'; result: UploadResult }
  | { kind: 'error'; message: string; previewUrl?: string };

function isFormatAllowed(file: File, allowed: AllowedFormat[]): boolean {
  // file.type can be empty on some browsers; fall back to extension sniff.
  const ext = (file.name.split('.').pop() ?? '').toLowerCase() as AllowedFormat;
  if (allowed.includes(ext)) return true;
  const mimeExt = file.type.split('/')[1]?.toLowerCase() as AllowedFormat | undefined;
  return mimeExt ? allowed.includes(mimeExt) : false;
}

async function fetchSignedParams(
  bucket: CloudinaryBucket,
  publicIdHint?: string,
): Promise<SignedUploadParams> {
  const res = await fetch('/api/cloudinary/sign-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucket, publicId: publicIdHint }),
  });
  const json = (await res.json()) as
    | { data: SignedUploadParams }
    | { error: { message: string } };
  if (!res.ok || 'error' in json) {
    throw new Error(
      'error' in json ? json.error.message : 'Failed to sign upload',
    );
  }
  return json.data;
}

function uploadToCloudinary(
  file: File,
  params: SignedUploadParams,
  onProgress: (pct: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', params.apiKey);
    form.append('timestamp', String(params.timestamp));
    form.append('folder', params.folder);
    if (params.publicId) form.append('public_id', params.publicId);
    form.append('signature', params.signature);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', params.uploadUrl);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Cloudinary upload failed (${xhr.status})`));
        return;
      }
      try {
        const json = JSON.parse(xhr.responseText) as {
          public_id: string;
          url: string;
          secure_url: string;
          width: number;
          height: number;
          format: string;
          bytes: number;
          original_filename?: string;
        };
        resolve({
          publicId: json.public_id,
          url: json.url,
          secureUrl: json.secure_url,
          width: json.width,
          height: json.height,
          format: json.format,
          bytes: json.bytes,
          originalFilename: json.original_filename ?? null,
        });
      } catch {
        reject(new Error('Could not parse Cloudinary response'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(form);
  });
}

export default function MediaUploader({
  bucket,
  publicIdHint,
  onUploadComplete,
  label,
  className,
}: Props) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function resetTo(s: State) {
    if (state.kind === 'preview' || state.kind === 'uploading' || state.kind === 'error') {
      if (state.kind !== 'error' || state.previewUrl) {
        const url = 'previewUrl' in state ? state.previewUrl : undefined;
        if (url) URL.revokeObjectURL(url);
      }
    }
    setState(s);
  }

  async function startUpload(file: File) {
    const previewUrl = URL.createObjectURL(file);
    setState({ kind: 'uploading', previewUrl, progress: 0 });
    try {
      const params = await fetchSignedParams(bucket, publicIdHint);

      if (file.size > params.maxBytes) {
        URL.revokeObjectURL(previewUrl);
        setState({
          kind: 'error',
          message: `File too large (max ${Math.round(params.maxBytes / 1024 / 1024)} MB)`,
        });
        return;
      }
      if (!isFormatAllowed(file, params.allowedFormats)) {
        URL.revokeObjectURL(previewUrl);
        setState({
          kind: 'error',
          message: `Format not allowed for ${bucket}. Use ${params.allowedFormats.join(', ').toUpperCase()}.`,
        });
        return;
      }

      const result = await uploadToCloudinary(file, params, (pct) => {
        setState((prev) =>
          prev.kind === 'uploading' ? { ...prev, progress: pct } : prev,
        );
      });
      URL.revokeObjectURL(previewUrl);
      setState({ kind: 'done', result });
      onUploadComplete(result);
    } catch (e) {
      URL.revokeObjectURL(previewUrl);
      setState({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Upload failed',
      });
    }
  }

  function onFile(file: File) {
    void startUpload(file);
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }
  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
  }
  function onDragLeave() {
    setDragging(false);
  }

  return (
    <div className={className} data-testid={`media-uploader-${bucket}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={onInputChange}
      />

      {state.kind === 'idle' && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-sm transition-colors ${
            dragging
              ? 'border-[#C9A84C] bg-[#FAF8F5]'
              : 'border-muted hover:border-foreground/30'
          }`}
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <span className="text-muted-foreground">
            {label ?? `Drop ${bucket} image here, or click to browse`}
          </span>
        </div>
      )}

      {state.kind === 'uploading' && (
        <div className="relative overflow-hidden rounded-2xl border bg-muted/30">
          <div className="relative aspect-square w-full">
            <Image
              src={state.previewUrl}
              alt="Uploading"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Uploading… {state.progress}%</span>
          </div>
        </div>
      )}

      {state.kind === 'done' && (
        <div className="relative overflow-hidden rounded-2xl border">
          <div className="relative aspect-square w-full">
            <Image
              src={state.result.secureUrl}
              alt="Uploaded"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="absolute right-2 top-2"
            onClick={() => resetTo({ kind: 'idle' })}
          >
            <X className="h-4 w-4" />
            Replace
          </Button>
        </div>
      )}

      {state.kind === 'error' && (
        <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div>{state.message}</div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => resetTo({ kind: 'idle' })}
          >
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
