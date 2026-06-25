import { api } from "./api";

/**
 * Converts a base64 data URI to a File object.
 */
export function base64ToFile(base64Data, filename = "file") {
  const arr = base64Data.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[arr.length - 1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

/**
 * Uploads a File object to Cloudinary via the backend upload endpoint.
 * @param {File} file
 * @returns {Promise<{url: string, public_id: string, type: string}>}
 */
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

/**
 * Uploads a base64 data URI (e.g., from signature or camera) to Cloudinary.
 * If the data is already a URL, returns it immediately.
 * @param {string} base64Data
 * @param {string} filename
 * @returns {Promise<{url: string, public_id: string, type: string}>}
 */
export async function uploadBase64(base64Data, filename = "upload.png") {
  if (!base64Data) return null;
  if (base64Data.startsWith("http")) {
    return { url: base64Data, public_id: null };
  }
  try {
    const file = base64ToFile(base64Data, filename);
    return await uploadFile(file);
  } catch (error) {
    console.error("Failed to upload base64 image:", error);
    throw error;
  }
}

/**
 * Deletes a file from Cloudinary by its public ID.
 * @param {string} publicId
 * @returns {Promise<{ok: boolean, result: string}>}
 */
export async function deleteFile(publicId) {
  if (!publicId) return null;
  const response = await api.delete(`/upload/${encodeURIComponent(publicId)}`);
  return response.data;
}
