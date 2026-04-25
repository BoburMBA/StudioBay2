import UTIF from 'utif';

export async function processFile(file: File): Promise<{ url: string; width: number; height: number }> {
  if (file.type === 'image/tiff' || file.name.endsWith('.tiff') || file.name.endsWith('.tif')) {
    const buffer = await file.arrayBuffer();
    const ifds = UTIF.decode(buffer);
    UTIF.decodeImage(buffer, ifds[0]);
    const rgba = UTIF.toRGBA8(ifds[0]);
    const canvas = document.createElement('canvas');
    canvas.width = ifds[0].width;
    canvas.height = ifds[0].height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    imageData.data.set(rgba);
    ctx.putImageData(imageData, 0, 0);
    return {
      url: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          url: e.target?.result as string,
          width: img.width,
          height: img.height,
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function calculateDpi(pixelDimension: number, inchDimension: number): number {
  return Math.round(pixelDimension / inchDimension);
}

export function getResolutionStatus(dpi: number) {
  if (dpi >= 300) return { label: 'Optimal', color: 'text-green-500', bg: 'bg-green-500/10' };
  if (dpi >= 150) return { label: 'Good', color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
  return { label: 'Poor (Warning)', color: 'text-red-500', bg: 'bg-red-500/10' };
}

/**
 * Simple sharpening filter using convolution
 */
export function sharpenImage(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL();
  
  const width = canvas.width;
  const height = canvas.height;
  const weights = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];
  const side = Math.round(Math.sqrt(weights.length));
  const halfSide = Math.floor(side / 2);
  const src = ctx.getImageData(0, 0, width, height).data;
  const output = ctx.createImageData(width, height);
  const dst = output.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sy = y;
      const sx = x;
      const dstOff = (y * width + x) * 4;
      let r = 0, g = 0, b = 0;
      for (let cy = 0; cy < side; cy++) {
        for (let cx = 0; cx < side; cx++) {
          const scy = sy + cy - halfSide;
          const scx = sx + cx - halfSide;
          if (scy >= 0 && scy < height && scx >= 0 && scx < width) {
            const srcOff = (scy * width + scx) * 4;
            const wt = weights[cy * side + cx];
            r += src[srcOff] * wt;
            g += src[srcOff + 1] * wt;
            b += src[srcOff + 2] * wt;
          }
        }
      }
      dst[dstOff] = r;
      dst[dstOff + 1] = g;
      dst[dstOff + 2] = b;
      dst[dstOff + 3] = src[dstOff + 3];
    }
  }
  ctx.putImageData(output, 0, 0);
  return canvas.toDataURL();
}
