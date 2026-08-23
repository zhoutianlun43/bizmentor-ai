/**
 * 从 public/icon.svg 生成 PWA 图标（PNG）。
 * 用法：pnpm run icons
 * 输出：public/icons/icon-192.png、icon-512.png、apple-touch-icon.png、maskable-512.png
 */
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const svgPath = path.join(root, "public", "icon.svg");
const outDir = path.join(root, "public", "icons");

mkdirSync(outDir, { recursive: true });
const svg = readFileSync(svgPath);

// 常规图标（圆角方块铺满）
await sharp(svg).resize(192, 192).png().toFile(path.join(outDir, "icon-192.png"));
await sharp(svg).resize(512, 512).png().toFile(path.join(outDir, "icon-512.png"));
await sharp(svg).resize(180, 180).png().toFile(path.join(outDir, "apple-touch-icon.png"));

// maskable 图标：内容缩至 80% 居中，铺满品牌底色，满足安全区要求
const safeZone = 410; // 512 * 0.8
const inset = Math.round((512 - safeZone) / 2); // 51
const content = await sharp(svg).resize(safeZone, safeZone).png().toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: { r: 79, g: 70, b: 229, alpha: 1 } },
})
  .composite([{ input: content, left: inset, top: inset }])
  .png()
  .toFile(path.join(outDir, "maskable-512.png"));

console.log("✓ 图标已生成到 public/icons/");