import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { useOpportunities } from "./use-opportunities";
import { LocalOpportunityRepository } from "../local-repository";
import type { OpportunityRepository } from "../repository";
import type { Opportunity, OpportunityInput } from "../../types";

type HookState = ReturnType<typeof useOpportunities>;

function Harness(props: { repo: OpportunityRepository; snap: HookState[] }) {
  const h = useOpportunities(props.repo);
  props.snap.push(h);
  return React.createElement("div");
}

function sampleOpp(): Opportunity {
  return { id: "opp-x", name: "X", description: "d", source: "user", status: "researching", createdAt: "now" };
}

function emptyRepo(): OpportunityRepository {
  return {
    listOpportunities: async () => [],
    createOpportunity: async () => sampleOpp(),
    getOpportunity: async () => undefined,
    updateOpportunity: async () => undefined,
    deleteOpportunity: async () => true,
  };
}

test("hook：本地加载（local fallback → mock 数据，loading 结束，无错误）", async () => {
  const snap: HookState[] = [];
  const repo = new LocalOpportunityRepository();
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Harness, { repo, snap }));
  });
  const last = snap[snap.length - 1];
  assert.equal(last.loading, false);
  assert.equal(last.error, null);
  assert.ok(last.opportunities.length > 0, "local 应返回 mock 商机");
  renderer?.unmount();
});

test("hook：loading（请求挂起时 loading=true，完成后 false）", async () => {
  let resolveList!: (v: Opportunity[]) => void;
  const deferred = {
    ...emptyRepo(),
    listOpportunities: () =>
      new Promise<Opportunity[]>((r) => {
        resolveList = r;
      }),
  };
  const snap: HookState[] = [];
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  // 同步 act：effect 启动 list()，挂起在 promise 上
  act(() => {
    renderer = TestRenderer.create(React.createElement(Harness, { repo: deferred, snap }));
  });
  const during = snap.find((s) => s.loading === true);
  assert.ok(during, "挂起时 loading 应为 true");
  await act(async () => {
    resolveList([sampleOpp()]);
  });
  const last = snap[snap.length - 1];
  assert.equal(last.loading, false);
  assert.equal(last.opportunities.length, 1);
  renderer?.unmount();
});

test("hook：错误（list 失败 → error 设置，opportunities 为空）", async () => {
  const failRepo = {
    ...emptyRepo(),
    listOpportunities: () => Promise.reject(new Error("boom")),
  };
  const snap: HookState[] = [];
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Harness, { repo: failRepo, snap }));
  });
  const last = snap[snap.length - 1];
  assert.equal(last.error, "boom");
  assert.equal(last.opportunities.length, 0);
  renderer?.unmount();
});

test("hook：refresh（重新拉取后更新数据）", async () => {
  let calls = 0;
  const ctrl = {
    ...emptyRepo(),
    listOpportunities: async () => {
      calls += 1;
      return calls >= 2 ? [sampleOpp()] : [];
    },
  };
  const snap: HookState[] = [];
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Harness, { repo: ctrl, snap }));
  });
  assert.equal(snap[snap.length - 1].opportunities.length, 0, "首次为空");
  const before = snap[snap.length - 1];
  await act(async () => {
    await before.refresh();
  });
  assert.equal(snap[snap.length - 1].opportunities.length, 1, "refresh 后应更新");
  renderer?.unmount();
});

test("hook：create 成功后列表刷新", async () => {
  const items: Opportunity[] = [];
  const ctrl: OpportunityRepository = {
    ...emptyRepo(),
    listOpportunities: async () => [...items],
    createOpportunity: async (input: OpportunityInput) => {
      const o: Opportunity = { id: "c1", name: input.name, description: input.description, source: input.source, status: "researching", createdAt: "now" };
      items.push(o);
      return o;
    },
  };
  const snap: HookState[] = [];
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Harness, { repo: ctrl, snap }));
  });
  const before = snap[snap.length - 1].opportunities.length;
  let created: Opportunity | undefined;
  await act(async () => {
    created = await snap[snap.length - 1].create({ name: "新商机", description: "d", source: "user" });
  });
  assert.ok(created);
  assert.equal(snap[snap.length - 1].opportunities.length, before + 1, "create 后应刷新列表");
  renderer?.unmount();
});
