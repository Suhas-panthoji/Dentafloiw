import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/** Loads private R2 media through the authenticated API and retries a refreshed URL once. */
export default function SecureImage({ patientId, file, variant = "display", ...props }) {
  const [src, setSrc] = useState(typeof file === "string" ? file : null);
  useEffect(() => {
    if (!file || typeof file === "string") return;
    let objectUrl;
    let active = true;
    const load = async (retry = true) => {
      try {
        const response = await api.get(`/files/${patientId}/${file.id}?variant=${variant}`, { responseType: "blob" });
        objectUrl = URL.createObjectURL(response.data);
        if (active) setSrc(objectUrl);
      } catch (error) {
        if (retry && error?.response?.status === 403) return load(false);
        if (active) setSrc(null);
      }
    };
    load();
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [patientId, file, variant]);
  return src ? <img src={src} {...props} loading="lazy" /> : null;
}
