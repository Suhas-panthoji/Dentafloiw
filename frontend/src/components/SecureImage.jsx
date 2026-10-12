import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * Loads private R2 media through the authenticated API.
 *
 * Requests the direct presigned Cloudflare R2 URL from the backend
 * and passes it directly to the <img> tag. This prevents Axios/XHR from
 * forwarding the Bearer token across origins on 302 redirect, which Cloudflare R2
 * rejects with 400 Missing x-amz-content-sha256.
 */
export default function SecureImage({ patientId, file, variant = "display", ...props }) {
  const getInitialSrc = () => {
    if (!file) return null;
    if (typeof file === "string") return file;
    if (file.url) return file.url;
    if (file.data && typeof file.data === "string") return file.data;
    return null;
  };

  const [src, setSrc] = useState(getInitialSrc);

  useEffect(() => {
    if (!file) {
      setSrc(null);
      return;
    }

    // Direct URLs (data URL or external URL)
    if (typeof file === "string") {
      setSrc(file);
      return;
    }
    if (file.url) {
      setSrc(file.url);
      return;
    }
    if (file.data && typeof file.data === "string") {
      setSrc(file.data);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        let endpoint;
        if (file.id) {
          // New-style upload with id
          endpoint = `/files/${patientId}/${file.id}?variant=${variant}&redirect=false`;
        } else if (file.key) {
          // Migrated record with R2 key
          endpoint = `/files/by-key?key=${encodeURIComponent(file.key)}&redirect=false`;
        } else if (patientId) {
          // Patient photo fallback
          endpoint = `/files/${patientId}/photo?variant=${variant}&redirect=false`;
        } else {
          if (active) setSrc(null);
          return;
        }

        const response = await api.get(endpoint);
        if (active && response.data?.url) {
          setSrc(response.data.url);
        }
      } catch (error) {
        console.warn("SecureImage load failed:", file, error?.message);
        if (active) setSrc(null);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [patientId, file, variant]);

  if (!src) return null;

  return (
    <img
      src={src}
      {...props}
      loading="lazy"
      onError={(e) => {
        // If the presigned URL failed or expired, hide or log
        console.warn("SecureImage failed to render:", src);
      }}
    />
  );
}
