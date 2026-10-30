"use client";

import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

const loadedUrlsCache = new Set<string>();
const failedUrlsCache = new Set<string>();

// Concurrency queue so cold-cache loads never flood the network or decoder
const MAX_CONCURRENT_LOADS = 6;
let activeLoads = 0;
const loadQueue: Array<() => void> = [];

function enqueueLoad(startFn: () => void): () => void {
  let cancelled = false;
  const wrapped = () => {
    if (cancelled) {
      pumpQueue();
      return;
    }
    startFn();
  };

  if (activeLoads < MAX_CONCURRENT_LOADS) {
    activeLoads++;
    startFn();
  } else {
    loadQueue.push(wrapped);
  }

  return () => {
    cancelled = true;
    const idx = loadQueue.indexOf(wrapped);
    if (idx !== -1) {
      loadQueue.splice(idx, 1);
    }
  };
}

function finishLoadSlot() {
  activeLoads = Math.max(0, activeLoads - 1);
  pumpQueue();
}

function pumpQueue() {
  while (activeLoads < MAX_CONCURRENT_LOADS && loadQueue.length > 0) {
    const next = loadQueue.shift();
    if (next) {
      activeLoads++;
      next();
    }
  }
}

export function cleanImageUrl(url?: string | null): string {
  if (!url) return "";
  return url.trim().replace(/^http:\/\//i, "https://");
}

export function getOptimizedImageUrl(
  rawUrl: string | undefined | null,
  width: 96 | 256 | 1080 = 96
): string {
  const clean = cleanImageUrl(rawUrl);
  if (!clean) return "";
  if (
    clean.startsWith("data:") ||
    clean.startsWith("blob:") ||
    clean.startsWith("/_next/")
  ) {
    return clean;
  }
  if (clean.startsWith("https://") || clean.startsWith("http://")) {
    return `/_next/image?url=${encodeURIComponent(clean)}&w=${width}&q=75`;
  }
  return clean;
}

interface ProductImageProps {
  src?: string | null;
  alt: string;
  fallbackEmoji?: string;
  imageClassName: string;
  placeholderClassName: string;
  onPreview?: (src: string) => void;
}

export function ProductImage({
  src,
  alt,
  fallbackEmoji = "👟",
  imageClassName,
  placeholderClassName,
  onPreview,
}: ProductImageProps) {
  const cleanSrc = cleanImageUrl(src);
  const optimizedSrc = getOptimizedImageUrl(cleanSrc, 96);

  const isAlreadyLoaded =
    Boolean(optimizedSrc) &&
    (loadedUrlsCache.has(optimizedSrc) || loadedUrlsCache.has(cleanSrc));
  const isKnownFailed =
    !cleanSrc ||
    (failedUrlsCache.has(optimizedSrc) && failedUrlsCache.has(cleanSrc));

  const [shouldLoad, setShouldLoad] = useState<boolean>(isAlreadyLoaded);
  const [useRawFallback, setUseRawFallback] = useState<boolean>(() =>
    Boolean(optimizedSrc && failedUrlsCache.has(optimizedSrc) && !failedUrlsCache.has(cleanSrc))
  );
  const [isLoaded, setIsLoaded] = useState<boolean>(isAlreadyLoaded);
  const [hasFailed, setHasFailed] = useState<boolean>(isKnownFailed);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const slotActiveRef = useRef<boolean>(false);

  const releaseSlot = () => {
    if (slotActiveRef.current) {
      slotActiveRef.current = false;
      finishLoadSlot();
    }
  };

  // Reset state if src prop changes
  useEffect(() => {
    const clean = cleanImageUrl(src);
    const opt = getOptimizedImageUrl(clean, 96);
    if (!clean) {
      setHasFailed(true);
      setIsLoaded(false);
      setShouldLoad(false);
      return;
    }
    const cached = loadedUrlsCache.has(opt) || loadedUrlsCache.has(clean);
    const failed = failedUrlsCache.has(opt) && failedUrlsCache.has(clean);

    setUseRawFallback(failedUrlsCache.has(opt) && !failedUrlsCache.has(clean));
    setHasFailed(failed);
    setIsLoaded(cached);
    if (cached) {
      setShouldLoad(true);
    }
  }, [src]);

  useEffect(() => {
    if (!cleanSrc || hasFailed || shouldLoad) return;

    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelQueue: (() => void) | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          // Small 35ms debounce so rapid scrolling skips off-screen rows
          timer = setTimeout(() => {
            cancelQueue = enqueueLoad(() => {
              slotActiveRef.current = true;
              setShouldLoad(true);
            });
          }, 35);
        } else {
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
          if (cancelQueue && !slotActiveRef.current) {
            cancelQueue();
            cancelQueue = null;
          }
        }
      },
      { rootMargin: "220px 0px" }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
      if (cancelQueue && !slotActiveRef.current) cancelQueue();
      releaseSlot();
    };
  }, [cleanSrc, hasFailed, shouldLoad]);

  // Safety timeout so a hung network request never holds a queue slot forever
  useEffect(() => {
    if (!shouldLoad || isLoaded || hasFailed) return;
    const safetyTimer = setTimeout(() => {
      releaseSlot();
    }, 8000);
    return () => clearTimeout(safetyTimer);
  }, [shouldLoad, isLoaded, hasFailed]);

  if (!cleanSrc || hasFailed) {
    return <div className={placeholderClassName}>{fallbackEmoji}</div>;
  }

  const activeSrc = useRawFallback ? cleanSrc : optimizedSrc;

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {!isLoaded && <div className={placeholderClassName}>{fallbackEmoji}</div>}
      {shouldLoad && (
        <img
          src={activeSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={imageClassName}
          onClick={(e) => {
            if (onPreview) {
              e.stopPropagation();
              onPreview(cleanSrc);
            }
          }}
          style={{
            cursor: onPreview ? "pointer" : "default",
            display: isLoaded ? "block" : "none",
          }}
          onLoad={() => {
            loadedUrlsCache.add(activeSrc);
            loadedUrlsCache.add(optimizedSrc);
            releaseSlot();
            setIsLoaded(true);
          }}
          onError={() => {
            failedUrlsCache.add(activeSrc);
            if (!useRawFallback && activeSrc !== cleanSrc) {
              setUseRawFallback(true);
            } else {
              releaseSlot();
              setHasFailed(true);
            }
          }}
        />
      )}
    </div>
  );
}

interface ImageLightboxProps {
  src: string | null;
  onClose: () => void;
  overlayClassName: string;
  closeBtnClassName: string;
  imgClassName: string;
}

export function ImageLightbox({
  src,
  onClose,
  overlayClassName,
  closeBtnClassName,
  imgClassName,
}: ImageLightboxProps) {
  const cleanSrc = cleanImageUrl(src);
  const fullOptimizedSrc = getOptimizedImageUrl(cleanSrc, 1080);
  const thumbOptimizedSrc = getOptimizedImageUrl(cleanSrc, 96);

  const [useRawFallback, setUseRawFallback] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setUseRawFallback(false);
    setIsLoaded(false);
  }, [src]);

  useEffect(() => {
    if (!src) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [src, onClose]);

  if (!cleanSrc) return null;

  const activeFullSrc = useRawFallback ? cleanSrc : fullOptimizedSrc;
  const hasCachedThumb = loadedUrlsCache.has(thumbOptimizedSrc);

  return (
    <div className={overlayClassName} onClick={onClose}>
      <button
        type="button"
        className={closeBtnClassName}
        onClick={onClose}
        aria-label="Cerrar vista previa"
      >
        <X size={28} />
      </button>

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Instant blurred thumbnail preview while high-res image loads */}
        {!isLoaded && hasCachedThumb && (
          <img
            src={thumbOptimizedSrc}
            alt="Cargando vista previa..."
            className={imgClassName}
            style={{
              width: "min(75vw, 420px)",
              height: "min(75vw, 420px)",
              objectFit: "contain",
              filter: "blur(8px)",
              opacity: 0.75,
            }}
          />
        )}

        {!isLoaded && (
          <div
            style={{
              position: "absolute",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "rgba(0, 0, 0, 0.7)",
              color: "#fff",
              padding: "0.5rem 1rem",
              borderRadius: "999px",
              fontSize: "0.85rem",
              fontWeight: 600,
              pointerEvents: "none",
            }}
          >
            <span className="animate-spin">⟳</span> Cargando imagen...
          </div>
        )}

        <img
          src={activeFullSrc}
          alt="Vista previa"
          decoding="async"
          className={imgClassName}
          style={{
            display: isLoaded || !hasCachedThumb ? "block" : "none",
            opacity: isLoaded ? 1 : 0.25,
            transition: "opacity 150ms ease",
          }}
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            if (!useRawFallback && activeFullSrc !== cleanSrc) {
              setUseRawFallback(true);
            } else {
              setIsLoaded(true);
            }
          }}
        />
      </div>
    </div>
  );
}
