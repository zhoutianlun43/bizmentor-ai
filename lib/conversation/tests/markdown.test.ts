/**
 * Markdown 解析测试（V0.8.2）。
 * 核心断言：用户不可见原始 Markdown 符号（##、**、- 等被解析为结构化数据）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMarkdown, parseInline } from "../markdown";

test("标题：## 被解析为 heading，文本不含 # 符号", () => {
  const blocks = parseMarkdown("## 海外市场进入策略");
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, "heading");
  const h = blocks[0] as { level: number; text: string };
  assert.equal(h.level, 2);
  assert.equal(h.text, "海外市场进入策略");
  assert.ok(!h.text.includes("#"));
});

test("加粗/斜体：** 与 * 被解析为 bold/italic，不残留符号", () => {
  const segs = parseInline("这是**重点**和*斜体*内容");
  assert.deepEqual(segs.map((s) => s.kind), ["text", "bold", "text", "italic", "text"]);
  assert.equal((segs[1] as { text: string }).text, "重点");
  assert.ok(!segs.some((s) => s.text.includes("**") || s.text.includes("*")));
});

test("列表：连续 - 行合并为 list，条目不含 - 符号", () => {
  const blocks = parseMarkdown("- 第一项\n- 第二项\n- 第三项");
  assert.equal(blocks.length, 1);
  const l = blocks[0] as { ordered: boolean; items: string[] };
  assert.equal(l.ordered, false);
  assert.deepEqual(l.items, ["第一项", "第二项", "第三项"]);
});

test("有序列表 + 代码块 + 引用 + 分隔线", () => {
  const blocks = parseMarkdown("1. 准备\n2. 执行\n\n```\nconst a = 1;\n```\n\n> 引用一句\n\n---");
  const types = blocks.map((b) => b.type);
  assert.deepEqual(types, ["list", "code", "quote", "divider"]);
  const l = blocks[0] as { ordered: boolean; items: string[] };
  assert.equal(l.ordered, true);
  const code = blocks[1] as { code: string };
  assert.equal(code.code, "const a = 1;");
});

test("链接：解析 href", () => {
  const segs = parseInline("查看[文档](https://bizmentor.top)");
  assert.equal(segs[1].kind, "link");
  const link = segs[1] as { text: string; href: string };
  assert.equal(link.text, "文档");
  assert.equal(link.href, "https://bizmentor.top");
});

test("段落合并：非空行连续归为同一段落；空行分隔", () => {
  const blocks = parseMarkdown("第一行\n第二行\n\n第三行");
  assert.equal(blocks.length, 2);
  assert.equal((blocks[0] as { text: string }).text, "第一行\n第二行");
  assert.equal((blocks[1] as { text: string }).text, "第三行");
});

test("空输入 → 无块", () => {
  assert.deepEqual(parseMarkdown(""), []);
  assert.deepEqual(parseMarkdown("   \n  "), []);
});
