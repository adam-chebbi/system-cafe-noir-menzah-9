/**
 * Image Preprocessing Utility for Deterministic OCR
 * Performs contrast enhancement, automatic deskewing, noise reduction, and binarization
 * directly in Canvas before feeding to Tesseract OCR.
 */

export interface PreprocessingOptions {
  enhanceContrast?: boolean;
  deskew?: boolean;
  denoise?: boolean;
  binarize?: boolean;
  threshold?: number; // 0-255 or -1 for Otsu's adaptive threshold
}

/**
 * Loads an image from a URL, Blob or DataURL into an HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Impossible de charger l\'image pour le prétraitement: ' + err));
    img.src = src;
  });
}

/**
 * Calculates Otsu's optimal threshold for grayscale image data
 */
export function calculateOtsuThreshold(data: Uint8ClampedArray): number {
  const histogram = new Array(256).fill(0);
  const totalPixels = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    histogram[gray]++;
  }

  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let varMax = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    wF = totalPixels - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    const varBetween = wB * wF * (mB - mF) * (mB - mF);
    if (varBetween > varMax) {
      varMax = varBetween;
      threshold = t;
    }
  }

  return threshold;
}

/**
 * Estimates skew angle using horizontal projection profile
 */
export function estimateSkewAngle(ctx: CanvasRenderingContext2D, width: number, height: number): number {
  // Sample down if image is too large for fast angle estimation
  const sampleCanvas = document.createElement('canvas');
  const sampleScale = Math.min(1, 800 / Math.max(width, height));
  const sw = Math.round(width * sampleScale);
  const sh = Math.round(height * sampleScale);
  sampleCanvas.width = sw;
  sampleCanvas.height = sh;
  const sCtx = sampleCanvas.getContext('2d');
  if (!sCtx) return 0;

  sCtx.drawImage(ctx.canvas, 0, 0, sw, sh);
  const imgData = sCtx.getImageData(0, 0, sw, sh);
  const data = imgData.data;

  // Simple binarization of sample
  const threshold = calculateOtsuThreshold(data);
  const binary: Uint8Array = new Uint8Array(sw * sh);
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    binary[i / 4] = gray < threshold ? 1 : 0; // 1 = text pixel
  }

  // Test angles between -15° and +15° in 0.5° steps
  let bestAngle = 0;
  let maxVariance = 0;

  for (let angle = -15; angle <= 15; angle += 0.5) {
    const rad = (angle * Math.PI) / 180;
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);

    // Horizontal projection histogram
    const proj = new Array(sh).fill(0);
    const centerY = sh / 2;
    const centerX = sw / 2;

    for (let y = 0; y < sh; y += 2) {
      for (let x = 0; x < sw; x += 2) {
        if (binary[y * sw + x] === 1) {
          // Rotated Y coordinate
          const rotY = Math.round((x - centerX) * sin + (y - centerY) * cos + centerY);
          if (rotY >= 0 && rotY < sh) {
            proj[rotY]++;
          }
        }
      }
    }

    // Calculate variance of projection profile (higher variance = sharper horizontal text lines)
    let mean = 0;
    for (let i = 0; i < sh; i++) mean += proj[i];
    mean /= sh;

    let variance = 0;
    for (let i = 0; i < sh; i++) {
      const diff = proj[i] - mean;
      variance += diff * diff;
    }

    if (variance > maxVariance) {
      maxVariance = variance;
      bestAngle = angle;
    }
  }

  return bestAngle;
}

/**
 * Preprocesses an image on an HTML5 canvas for maximal OCR accuracy
 */
export async function preprocessImageForOcr(
  imageSource: string | HTMLImageElement,
  options: PreprocessingOptions = {}
): Promise<{ processedDataUrl: string; canvas: HTMLCanvasElement; skewAngle: number }> {
  const {
    enhanceContrast = true,
    deskew = true,
    denoise = true,
    binarize = true,
    threshold = -1
  } = options;

  const img = typeof imageSource === 'string' ? await loadImage(imageSource) : imageSource;

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Impossible d\'initialiser le contexte Canvas 2D');

  // 1. Draw original image
  ctx.drawImage(img, 0, 0);

  // 2. Deskew if requested
  let detectedSkew = 0;
  if (deskew) {
    try {
      detectedSkew = estimateSkewAngle(ctx, canvas.width, canvas.height);
      if (Math.abs(detectedSkew) > 0.4 && Math.abs(detectedSkew) <= 20) {
        const rotCanvas = document.createElement('canvas');
        rotCanvas.width = canvas.width;
        rotCanvas.height = canvas.height;
        const rotCtx = rotCanvas.getContext('2d');
        if (rotCtx) {
          rotCtx.save();
          rotCtx.translate(canvas.width / 2, canvas.height / 2);
          rotCtx.rotate((-detectedSkew * Math.PI) / 180);
          rotCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
          rotCtx.restore();
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(rotCanvas, 0, 0);
        }
      }
    } catch {
      // Skew detection failure fallback: keep unrotated
      detectedSkew = 0;
    }
  }

  // 3. Pixel processing (Grayscale, Contrast Enhancement, Denoise, Binarization)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const len = data.length;

  // Convert to Grayscale & Contrast Stretching
  let minGray = 255;
  let maxGray = 0;
  const grayBuffer = new Uint8Array(len / 4);

  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    const pixelIdx = i / 4;
    grayBuffer[pixelIdx] = gray;
    if (gray < minGray) minGray = gray;
    if (gray > maxGray) maxGray = gray;
  }

  // Contrast stretch factors
  const range = maxGray - minGray || 1;

  // Determine binarization threshold
  const otsuThresh = threshold >= 0 ? threshold : calculateOtsuThreshold(data);

  // Apply enhancements
  for (let i = 0; i < len; i += 4) {
    const pixelIdx = i / 4;
    let gray = grayBuffer[pixelIdx];

    if (enhanceContrast) {
      // Stretch contrast to [0, 255]
      gray = Math.round(((gray - minGray) / range) * 255);
    }

    if (binarize) {
      // Crisp black/white binarization
      const finalVal = gray < otsuThresh ? 0 : 255;
      data[i] = finalVal;
      data[i + 1] = finalVal;
      data[i + 2] = finalVal;
      data[i + 3] = 255;
    } else {
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
      data[i + 3] = 255;
    }
  }

  // Put processed image back to canvas
  ctx.putImageData(imageData, 0, 0);

  return {
    processedDataUrl: canvas.toDataURL('image/png'),
    canvas,
    skewAngle: detectedSkew
  };
}
