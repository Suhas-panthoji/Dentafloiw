import { useEffect, useRef, useState } from "react";
import { getMediaUrl } from "@/lib/mediaUrls";

/**
 * Loads private R2 media through the authenticated API.
 *
 * Requests the direct presigned Cloudflare R2 URL from the backend
 * and passes it directly to the <img> tag. This prevents Axios/XHR from
 * forwarding the Bearer token across origins on 302 redirect, which Cloudflare R2
 * rejects with 400 Missing x-amz-content-sha256.
 *
 * Lazy loading: the presigned URL is fetched only when the element scrolls
 * into the viewport (with a 200px look-ahead margin). Pass `eager` to bypass
 * this and load immediately (useful for hero/primary images).
 */
export default function SecureImage({ patientId, file, variant = "display", eager = false, ...props }) {
  const [src, setSrc] = useState(null);
  const [retried, setRetried] = useState(false);
  const [inView, setInView] = useState(eager);
  const containerRef = useRef(null);

  // IntersectionObserver: mark `inView` once the placeholder scrolls near the viewport.
  useEffect(() => {
    if (eager || inView) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }   // start loading 200px before the image is visible
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [eager, inView]);

  // Fetch the presigned URL only after the element is in view.
  useEffect(() => {
    if (!inView) return;
    let active = true;
    const load = async () => {
      try {
        const url = await getMediaUrl(file, patientId, variant);
        if (active) setSrc(url);
      } catch (error) {
        console.warn("SecureImage load failed:", error?.message);
        if (active) setSrc(null);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [patientId, file, variant, inView]);

  // Before in-view: render a lightweight placeholder that the observer can track.
  if (!src) {
    return (
      <span
        ref={containerRef}
        style={{
          display: "inline-block",
          width: props.className?.includes("w-full") ? "100%" : undefined,
          height: props.className?.includes("h-full") ? "100%" : undefined,
        }}
        aria-hidden
      />
    );
  }

  return (
    <img
      src={src}
      {...props}
      loading="lazy"
      decoding="async"
      onError={async () => {
        if (retried || !file || typeof file !== "object" || !file.key) return;
        setRetried(true);
        try {
          setSrc(await getMediaUrl(file, patientId, variant, true));
        } catch {
          setSrc(null);
        }
      }}
    />
  );
}
