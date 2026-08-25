import { test } from "node:test";
import assert from "node:assert/strict";
import { detectChatCommand, stripChatCommand } from "../commands";

test("detectChatCommand：识别中文高级指令", () => {
  assert.equal(detectChatCommand("/深度分析 帮我看看这个项目"), "deep");
  assert.equal(detectChatCommand("/商业报告"), "report");
  assert.equal(detectChatCommand("/市场研究 调研新能源"), "market");
  assert.equal(detectChatCommand("/机会评估 这个想法"), "evaluate");
});

test("detectChatCommand：识别英文指令且忽略大小写", () => {
  assert.equal(detectChatCommand("/deep 分析"), "deep");
  assert.equal(detectChatCommand("/Report 本周"), "report");
  assert.equal(detectChatCommand("/MARKET 东南亚"), "market");
});

test("detectChatCommand：普通对话不误判", () => {
  assert.equal(detectChatCommand("帮我分析一下"), null);
  assert.equal(detectChatCommand("今天天气怎么样"), null);
  assert.equal(detectChatCommand("marketplace 怎么做"), null);
  assert.equal(detectChatCommand("我想做深度分析"), null);
  assert.equal(detectChatCommand(""), null);
});

test("stripChatCommand：去掉指令保留正文", () => {
  assert.equal(stripChatCommand("/深度分析 帮我看看"), "帮我看看");
  assert.equal(stripChatCommand("/商业报告 女装市场"), "女装市场");
  assert.equal(stripChatCommand("/deep 分析"), "分析");
  assert.equal(stripChatCommand("/机会评估"), "");
  assert.equal(stripChatCommand("普通问题"), "普通问题");
});
