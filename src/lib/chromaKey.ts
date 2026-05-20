import sharp from "sharp";

/** Distância RGB ao quadrado (evita sqrt). */
function dist2(
  r: number,
  g: number,
  b: number,
  tr: number,
  tg: number,
  tb: number
) {
  const dr = r - tr;
  const dg = g - tg;
  const db = b - tb;
  return dr * dr + dg * dg + db * db;
}

/** Só o verde-limão do chroma (#00FF00) — não remove camisas verdes (México, etc.). */
function isChromaGreenScreen(r: number, g: number, b: number): boolean {
  return g >= 200 && r <= 130 && b <= 130 && g - Math.max(r, b) >= 70;
}

function isBackgroundPixel(r: number, g: number, b: number): boolean {
  if (isChromaGreenScreen(r, g, b)) return true;

  // Fundos escuros das gerações antigas (navy / slate de estúdio)
  if (r < 55 && g < 65 && b < 95 && r + g + b < 160) return true;
  if (dist2(r, g, b, 18, 25, 38) < 45 * 45) return true; // #121926
  if (dist2(r, g, b, 42, 58, 82) < 40 * 40) return true; // #2a3a52

  return false;
}

/**
 * Converte PNG em recorte com alpha — remove chroma verde e fundos de estúdio.
 */
export async function cutoutHeroPng(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data);
  const w = info.width;
  const h = info.height;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      if (isBackgroundPixel(r, g, b)) {
        pixels[i + 3] = 0;
      }
    }
  }

  // Suaviza borda (1px): semi-transparente se vizinho opaco
  const alpha = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      alpha[y * w + x] = pixels[(y * w + x) * 4 + 3];
    }
  }
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      if (pixels[i + 3] > 0) continue;
      let near = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (alpha[(y + dy) * w + (x + dx)] > 200) near++;
        }
      }
      if (near >= 2) pixels[i + 3] = 90;
    }
  }

  return sharp(pixels, {
    raw: { width: w, height: h, channels: 4 },
  })
    .png()
    .toBuffer();
}
