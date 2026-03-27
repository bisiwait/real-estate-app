/**
 * タブ用アイコンを「枠いっぱい」に近づける: 余白 trim → 高解像度へ再サンプリング。
 * ソース: src/app/apple-icon.png（拡張子 .png でも JPEG 可）
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const sharp = require("sharp");

const root = path.join(__dirname, "..");
const srcPath = path.join(root, "src/app/apple-icon.png");
const white = { r: 255, g: 255, b: 255, alpha: 1 };

const inputBuf = fs.readFileSync(srcPath);

async function createPipelineFactory() {
  try {
    const meta = await sharp(inputBuf).rotate().trim({ threshold: 20 }).metadata();
    if (meta.width >= 8 && meta.height >= 8) {
      return () => sharp(inputBuf).rotate().trim({ threshold: 20 });
    }
  } catch {
    /* trim 不可 */
  }
  return () => sharp(inputBuf).rotate();
}

async function main() {
  const { default: pngToIco } = await import("png-to-ico");
  const pipeline = await createPipelineFactory();

  await pipeline()
    .resize(512, 512, { fit: "contain", background: white })
    .png()
    .toFile(path.join(root, "src/app/icon.png"));

  await pipeline()
    .resize(180, 180, { fit: "contain", background: white })
    .png()
    .toFile(path.join(root, "src/app/apple-icon.png"));

  const b48 = await pipeline()
    .resize(48, 48, { fit: "contain", background: white })
    .png()
    .toBuffer();
  const b32 = await pipeline()
    .resize(32, 32, { fit: "contain", background: white })
    .png()
    .toBuffer();
  const b16 = await pipeline()
    .resize(16, 16, { fit: "contain", background: white })
    .png()
    .toBuffer();

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "chbh-ico-"));
  const p48 = path.join(tmp, "48.png");
  const p32 = path.join(tmp, "32.png");
  const p16 = path.join(tmp, "16.png");
  fs.writeFileSync(p48, b48);
  fs.writeFileSync(p32, b32);
  fs.writeFileSync(p16, b16);

  const ico = await pngToIco([p48, p32, p16]);
  fs.rmSync(tmp, { recursive: true, force: true });

  fs.writeFileSync(path.join(root, "src/app/favicon.ico"), ico);
  fs.writeFileSync(path.join(root, "public/favicon.ico"), ico);
  fs.copyFileSync(path.join(root, "src/app/apple-icon.png"), path.join(root, "public/apple-touch-icon.png"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
