// Rasterize the RoastMode logo (assets/logo/*.svg) into every app icon asset
// app.json references. Run: `npm run icons`. Requires `sharp` (devDependency).
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'assets', 'images');
const BRAND_DARK = '#17131c';

const markSvg = readFileSync(join(root, 'assets', 'logo', 'mark-white.svg'));
const monoSvg = readFileSync(join(root, 'assets', 'logo', 'mono.svg'));

/** Render an SVG buffer to a PNG buffer at `size`px (square). */
const render = (svg, size) => sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();

/** A `size`px canvas (bg or transparent) with `mark` centered at `markPx`. */
async function composed(size, markPx, svg, background) {
  const mark = await render(svg, markPx);
  const base = background
    ? sharp({ create: { width: size, height: size, channels: 4, background } })
    : sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  return base.composite([{ input: mark, gravity: 'center' }]).png().toBuffer();
}

async function main() {
  // iOS / main icon — opaque dark square, white bubble + orange flame ~80%.
  const icon = await composed(1024, 840, markSvg, BRAND_DARK);
  await sharp(icon).toFile(join(OUT, 'icon.png'));

  // Web favicon — same look, small.
  await sharp(icon).resize(196, 196).toFile(join(OUT, 'favicon.png'));

  // Android adaptive — foreground mark at ~60% (safe zone; launcher masks edges).
  await sharp(await composed(1024, 620, markSvg))
    .toFile(join(OUT, 'android-icon-foreground.png'));

  // Android adaptive background — solid brand dark.
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BRAND_DARK } })
    .png()
    .toFile(join(OUT, 'android-icon-background.png'));

  // Android themed (monochrome) — white silhouette, flame knocked out.
  await sharp(await composed(1024, 620, monoSvg))
    .toFile(join(OUT, 'android-icon-monochrome.png'));

  // Splash — transparent white+flame mark; expo-splash-screen scales it to imageWidth.
  await sharp(await render(markSvg, 900))
    .extend({
      top: 62, bottom: 62, left: 62, right: 62,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toFile(join(OUT, 'splash-icon.png'));

  console.log('✓ icons written to assets/images/: icon, favicon, android-icon-{foreground,background,monochrome}, splash-icon');
}

main().catch((e) => {
  console.error('✗ icon gen failed:', e.message ?? e);
  process.exit(1);
});
