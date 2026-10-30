"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Copy, Check } from "lucide-react";

// Session cache of URLs that have already loaded in the browser
const loadedUrlsCache = new Set<string>();

// Shared IntersectionObserver across all ProductImage instances for low mobile memory/CPU overhead
const observerCallbacks = new Map<Element, () => void>();
let sharedObserver: IntersectionObserver | null = null;

function getSharedObserver(): IntersectionObserver | null {
  if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
    return null;
  }
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const cb = observerCallbacks.get(entry.target);
            if (cb) {
              observerCallbacks.delete(entry.target);
              sharedObserver?.unobserve(entry.target);
              cb();
            }
          }
        }
      },
      { rootMargin: "180px 0px" }
    );
  }
  return sharedObserver;
}

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

  // Only mount <img> when the row is near or inside the viewport using a single shared observer
  useEffect(() => {
    if (!cleanSrc || hasFailed || shouldLoad) return;

    const el = containerRef.current;
    const observer = getSharedObserver();
    if (!el || !observer) {
      setShouldLoad(true);
      return;
    }

    observerCallbacks.set(el, () => {
      setShouldLoad(true);
    });
    observer.observe(el);

    return () => {
      observerCallbacks.delete(el);
      observer.unobserve(el);
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

interface CopyableCodeProps {
  code?: string | null;
}

export function CopyableCode({ code }: CopyableCodeProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const cleanCode = (code || "").trim();
  if (!cleanCode) return null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(cleanCode);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = cleanCode;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(25);
      }

      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 1600);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Toca para copiar código"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        alignSelf: "flex-start",
        marginTop: "0.15rem",
        padding: "0.15rem 0.45rem",
        marginLeft: "-0.45rem",
        borderRadius: "4px",
        border: copied ? "1px solid rgba(22, 163, 74, 0.35)" : "1px solid transparent",
        background: copied ? "rgba(22, 163, 74, 0.1)" : "transparent",
        color: copied ? "#16a34a" : "var(--text-secondary)",
        fontSize: "0.85rem",
        fontWeight: copied ? 600 : 500,
        fontFamily: "inherit",
        cursor: "pointer",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        transition: "all 150ms ease",
      }}
    >
      <span>{cleanCode}</span>
      {copied ? (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.15rem",
            fontSize: "0.72rem",
            color: "#16a34a",
            fontWeight: 700,
          }}
        >
          <Check size={13} strokeWidth={2.5} />
          Copiado
        </span>
      ) : (
        <Copy
          size={12}
          style={{ opacity: 0.45, flexShrink: 0 }}
        />
      )}
    </button>
  );
}

