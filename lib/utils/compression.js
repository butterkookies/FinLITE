/**
 * Client-Side Image Compression Utility
 * Prevents 10MB+ phone camera images from exhausting storage.
 */
import imageCompression from 'browser-image-compression';

export async function compressReceiptImage(file) {
  if (!file || !file.type.startsWith('image/')) {
    return file;
  }

  const options = {
    maxSizeMB: 0.35, // Compress to max 350KB
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: 'image/jpeg',
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.warn('Image compression fallback to original file:', error);
    return file;
  }
}
