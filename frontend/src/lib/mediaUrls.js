import { api } from "./api";

// Presigned URLs are private but short lived.  Memory-only caching avoids
// storing protected URLs on disk and makes revisiting a patient instant.
const cache = new Map();
const TTL_MS = 55 * 60 * 1000; // backend URLs expire after 60 minutes

function cacheId(key, variant) {
  return `${key}|${variant}`;
}

function directUrl(file) {
  if (!file) return null;
  if (typeof file === "string") return file;
  return file.url || (typeof file.data === "string" ? file.data : null);
}

export async function prefetchMediaUrls(files, variant = "thumb") {
  const keys = [...new Set(files
    .map((file) => (file && typeof file === "object" ? file.key : null))
    .filter(Boolean))];
  const missing = keys.filter((key) => {
    const hit = cache.get(cacheId(key, variant));
    return !hit || hit.expiresAt <= Date.now();
  });
  if (!missing.length) return;
  const response = await api.post("/files/urls", {
    files: missing.map((key) => ({ key, variant })),
  });
  const expiresAt = Date.now() + TTL_MS;
  Object.entries(response.data?.urls || {}).forEach(([id, url]) => {
    cache.set(id, { url, expiresAt });
  });
}

export async function getMediaUrl(file, patientId, variant = "display", forceRefresh = false) {
  const direct = directUrl(file);
  if (direct) return direct;
  if (!file || typeof file !== "object") return null;

  if (file.key) {
    const id = cacheId(file.key, variant);
    const hit = cache.get(id);
    if (!forceRefresh && hit && hit.expiresAt > Date.now()) return hit.url;
    await prefetchMediaUrls([file], variant);
    return cache.get(id)?.url || null;
  }

  // Compatibility for legacy records that contain only a file id.
  if (file.id && patientId) {
    const response = await api.get(`/files/${patientId}/${file.id}`, { params: { variant, redirect: false } });
    return response.data?.url || null;
  }
  if (patientId) {
    const response = await api.get(`/files/${patientId}/photo`, { params: { variant, redirect: false } });
    return response.data?.url || null;
  }
  return null;
}
