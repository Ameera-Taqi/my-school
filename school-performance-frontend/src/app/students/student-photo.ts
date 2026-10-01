/** Resize and compress a portrait to a JPEG data-URL suitable for Student.PhotoUrl. */
export async function compressStudentPhoto(file: File, size = 320, quality = 0.82): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('الملف المحدد ليس صورة');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('حجم الصورة يجب ألا يتجاوز 8 ميغابايت');
  }

  const bitmap = await loadImage(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('تعذر معالجة الصورة');

    const scale = Math.max(size / bitmap.width, size / bitmap.height);
    const drawW = bitmap.width * scale;
    const drawH = bitmap.height * scale;
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(bitmap, (size - drawW) / 2, (size - drawH) / 2, drawW, drawH);

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length > 350_000) {
      return canvas.toDataURL('image/jpeg', 0.65);
    }
    return dataUrl;
  } finally {
    bitmap.close?.();
  }
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement & { close?: () => void }> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file);
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('تعذر قراءة الصورة'));
      img.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}
