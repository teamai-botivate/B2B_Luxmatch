'use client';

import {
  TryOnEngine,
  type Calibration,
  type EngineMetrics,
  type EngineStatus,
  type JewelleryType,
} from '@luxematch/ar-engine';
import { useCallback, useEffect, useRef, useState } from 'react';

type Args = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
};

export type UseTryOnEngineResult = {
  status: EngineStatus;
  /**
   * Metrics ref — read on the rAF loop side, not in render. Use this when
   * you want to draw a HUD without re-rendering the component every frame.
   */
  metricsRef: React.MutableRefObject<EngineMetrics>;
  /** Snapshot of metrics, updated ~1Hz. Cheap to render. */
  metricsSnapshot: EngineMetrics;
  start: () => Promise<void>;
  stop: () => void;
  setProduct: (imageUrl: string, jewelleryType: JewelleryType, calibration?: Calibration | null) => Promise<void>;
  captureFrame: () => Promise<Blob | null>;
  error: Error | null;
};

const EMPTY_METRICS: EngineMetrics = {
  fps: 0,
  inferenceMs: 0,
  confidence: 0,
  trackedKind: 'none',
};

/**
 * React adapter for TryOnEngine. Creates the engine on mount, disposes it on
 * unmount. Engine instance lives in a ref — never written to React state, so
 * the rAF loop doesn't trigger re-renders.
 */
export function useTryOnEngine({ videoRef, canvasRef }: Args): UseTryOnEngineResult {
  const engineRef = useRef<TryOnEngine | null>(null);
  const metricsRef = useRef<EngineMetrics>(EMPTY_METRICS);
  const [status, setStatus] = useState<EngineStatus>('idle');
  const [metricsSnapshot, setMetricsSnapshot] = useState<EngineMetrics>(EMPTY_METRICS);
  const [error, setError] = useState<Error | null>(null);

  // Lazy-construct the engine the first time start() is called. Building it
  // earlier would mean SSR'd pages try to instantiate Three.js in a server
  // bundle.
  const ensureEngine = useCallback((): TryOnEngine => {
    if (engineRef.current) return engineRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      throw new Error('video/canvas refs must be attached before starting the engine');
    }
    const engine = new TryOnEngine({
      video,
      canvas,
      onStatusChange: (s) => setStatus(s),
    });
    engineRef.current = engine;
    return engine;
  }, [videoRef, canvasRef]);

  // Poll metrics ~1Hz so React only re-renders the HUD when numbers change.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!engineRef.current) return;
      const m = engineRef.current.getMetrics();
      metricsRef.current = m;
      setMetricsSnapshot((prev) =>
        prev.fps === m.fps &&
        prev.inferenceMs === m.inferenceMs &&
        prev.confidence === m.confidence &&
        prev.trackedKind === m.trackedKind
          ? prev
          : { ...m },
      );
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Always dispose on unmount.
  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const engine = ensureEngine();
      await engine.start();
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    }
  }, [ensureEngine]);

  const stop = useCallback(() => {
    engineRef.current?.stop();
  }, []);

  const setProduct = useCallback(
    async (imageUrl: string, jewelleryType: JewelleryType, calibration?: Calibration | null) => {
      const engine = ensureEngine();
      engine.setJewelleryType(jewelleryType);
      engine.setCalibration(calibration ?? null);
      await engine.setProduct(imageUrl);
    },
    [ensureEngine],
  );

  const captureFrame = useCallback(async () => {
    return (await engineRef.current?.captureFrame()) ?? null;
  }, []);

  return {
    status,
    metricsRef,
    metricsSnapshot,
    start,
    stop,
    setProduct,
    captureFrame,
    error,
  };
}
