/**
 * Remove fundo das PNGs já geradas (chroma verde ou estúdio escuro).
 * Uso: npm run images:hero:cutout
 *      npm run images:hero:cutout -- --only=mx,hr
 */
import fs from "node:fs";
import path from "path";
import { HERO_DIR, heroImageFile } from "../src/lib/heroImage";
import { cutoutHeroPng } from "../src/lib/chromaKey";

const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const ONLY = onlyArg
  ? new Set(onlyArg.slice(7).split(",").map((c) => c.trim().toLowerCase()))
  : null;

async function main() {
  const files = fs
    .readdirSync(HERO_DIR)
    .filter((f) => f.endsWith(".png"))
    .map((f) => ({
      code: f.replace(/\.png$/i, ""),
      file: path.join(HERO_DIR, f),
    }))
    .filter((x) => !ONLY || ONLY.has(x.code.toLowerCase()));

  if (files.length === 0) {
    console.log("Nenhuma imagem para processar.");
    return;
  }

  console.log(`Recortando fundo de ${files.length} imagem(ns)…`);
  for (const { code, file } of files) {
    const raw = fs.readFileSync(file);
    const cutout = await cutoutHeroPng(raw);
    fs.writeFileSync(file, cutout);
    console.log(`✓ ${code}`);
  }
  console.log("Concluído. Atualize a página do jogo (cache v=3).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
