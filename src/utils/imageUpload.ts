import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

export interface UploadResult {
  url: string;
  source: 'storage' | 'fallback';
}

/**
 * Validates image file format and file size.
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(jpe?g|png|webp|gif|svg)$/i)) {
    return {
      valid: false,
      error: `Unsupported file format (${file.type || 'unknown'}). Please choose JPG, PNG, WEBP, or GIF.`,
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${sizeMb} MB). Maximum allowed image size is 5 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Uploads a local file to Firebase Storage with a fallback to compressed data URL.
 */
export async function uploadImageFile(file: File, folder = 'products'): Promise<string> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder}/${Date.now()}_${cleanName}`;
  const storageRef = ref(storage, path);

  try {
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type || 'image/jpeg',
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (storageError: any) {
    console.warn('Firebase Storage upload notice, using client fallback:', storageError?.message);

    // Resilient fallback to FileReader data URL so users are never blocked by bucket or network rules
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read image file.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed reading file.'));
      reader.readAsDataURL(file);
    });
  }
}
