/**
 * PWA 基础能力测试（V0.4.2 Phase 9B-5-C）。
 * 覆盖：manifest 配置字段 / sw.js 存在且含缓存+离线+同步逻辑。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pwaManifest } from "../manifest";

test("PWA Manifest：name/short_name/display/icons 符合要求", () => {
  assert.equal(pwaManifest.name, "BizMentor AI");
  assert.equal(pwaManifest.short_name, "BizMentor");
  assert.equal(pwaManifest.display, "standalone");
  assert.equal(pwaManifest.start_url, "/");
  assert.ok(pwaManifest.icons.length >= 3);
  assert.ok(pwaManifest.icons.some((i) => i.sizes === "192x192"));
  assert.ok(pwaManifest.icons.some((i) => i.sizes === "512x512"));
});

test("PWA：sw.js 存在且包含缓存/离线/重同步逻辑", () => {
  const sw = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");
  assert.ok(sw.includes("caches.open"), "应包含缓存逻辑");
  assert.ok(sw.includes("mode === \"navigate\""), "应包含离线导航回退");
  assert.ok(sw.includes("addEventListener(\"sync\""), "应包含网络恢复重同步");
  assert.ok(sw.includes("bizmentor:resync"), "应包含重同步消息");
});