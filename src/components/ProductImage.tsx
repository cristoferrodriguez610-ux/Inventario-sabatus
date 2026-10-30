"use client";

import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

// Session cache of URLs that have already loaded in the browser
const loadedUrlsCache = new Set<string>();

export function cleanImageUrl(url?: string | null): string {
  if (!url) return "";
  return url.trim().replace(/^http:\/\//i, "https://");
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
  const alreadyCached = Boolean(cleanSrc) && loadedUrlsCache.has(cleanSrc);

  const [shouldLoad, setShouldLoad] = useState<boolean>(alreadyCached);
  const [isLoaded, setIsLoaded] = useState<boolean>(alreadyCached);
  const [hasFailed, setHasFailed] = useState<boolean>(!cleanSrc);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync state when src prop changes
  useEffect(() => {
    const clean = cleanImageUrl(src);
    if (!clean) {
      setHasFailed(true);
      setIsLoaded(false);
      setShouldLoad(false);
      return;
    }
    const cached = loadedUrlsCache.has(clean);
    setHasFailed(false);
    setIsLoaded(cached);
    if (cached) {
      setShouldLoad(true);
    }
  }, [src]);

  // Only mount <img> when the row is near or inside the viewport
  useEffect(() => {
    if (!cleanSrc || hasFailed || shouldLoad) return;

    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "150px 0px" }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [cleanSrc, hasFailed, shouldLoad]);

  if (!cleanSrc || hasFailed) {
    return <div className={placeholderClassName}>{fallbackEmoji}</div>;
  }

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
      {!isLoaded && (
        <div className={placeholderClassName}>{fallbackEmoji}</div>
      )}
      {shouldLoad && (
        <img
          src={cleanSrc}
          alt={alt}
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
            opacity: isLoaded ? 1 : 0,
            position: isLoaded ? "static" : "absolute",
            inset: 0,
            transition: "opacity 150ms ease-in-out",
          }}
          onLoad={() => {
            loadedUrlsCache.add(cleanSrc);
            setIsLoaded(true);
          }}
          onError={() => {
            setHasFailed(true);
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
  const [isLoaded, setIsLoaded] = useState(() =>
    Boolean(cleanSrc && loadedUrlsCache.has(cleanSrc))
  );

  useEffect(() => {
    const clean = cleanImageUrl(src);
    setIsLoaded(Boolean(clean && loadedUrlsCache.has(clean)));
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
              zIndex: 2,
            }}
          >
            <span className="animate-spin">⟳</span> Cargando imagen...
          </div>
        )}

        <img
          src={cleanSrc}
          alt="Vista previa"
          decoding="async"
          className={imgClassName}
          style={{
            opacity: isLoaded ? 1 : 0.3,
            transition: "opacity 150ms ease",
          }}
          onLoad={() => {
            loadedUrlsCache.add(cleanSrc);
            setIsLoaded(true);
          }}
          onError={() => {
            setIsLoaded(true);
          }}
        />
      </div>
    </div>
  );
}
