import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { useDecisionData } from "./use-decision-data";
import { LocalDecisionRepositoryWrapper } from "../local-repository";
import { createMemoryDecisionStorage } from "../repository";
import type { DecisionRepository } from "../repository";
import type { UserDecision } from "../types";

type HookState = ReturnType<typeof useDecisionData>;

function Harness(props: { opportunityId: string; repo: DecisionRepository; snap: HookState[] }) {
  const h = useDecisionData(props.opportunityId, props.repo);
  props.snap.push(h);
  return React.createElement("div");
}

function sampleDecision(overrides: Partial<UserDecision> = {}): UserDecision {
  return {
    id: "d1",
    opportunityId: "opp-1",
    decision: "validate",
    differentFromAi: false,
    judgment: { why: "w", coreJudgment: "c", keyEvidence: "e", biggestRisk: "r", mostImportantAssumption: "a", expectedOutcome: "o" },
    createdAt: "now",
    updatedAt: "now",
    ...overrides,
  };
}

function emptyDecisionRepo(): DecisionRepository {
  return {
    saveDecision: async () => undefined,
    getDecision: async () => undefined,
    listDecisions: async () => [],
    saveReview: async () => undefined,
    getReview: async () => undefined,
    savePlan: async () => undefined,
    getPlan: async () => undefined,
    listPlans: async () => [],
    saveResult: async () => undefined,
    listResults: async () => [],
    saveEvents: async () => undefined,
    listEvents: async () => [],
    saveScoreUpdate: async () => undefined,
    listScoreUpdates: async () => [],
  };
}

test("hook：本地加载（Local wrapper 内存存储，空数据，loading 结束）", async () => {
  const repo = new LocalDecisionRepositoryWrapper(createMemoryDecisionStorage());
  const snap: HookState[] = [];
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Harness, { opportunityId: "opp-1", repo, snap }));
  });
  const last = snap[snap.length - 1];
  assert.equal(last.loading, false);
  assert.equal(last.error, null);
  assert.deepEqual(last.data.decisions, []);
  renderer?.unmount();
});

test("hook：loading（请求挂起时 loading=true，完成后 false）", async () => {
  let resolveList!: (v: UserDecision[]) => void;
  const deferred = {
    ...emptyDecisionRepo(),
    listDecisions: () =>
      new Promise<UserDecision[]>((r) => {
        resolveList = r;
      }),
  };
  const snap: HookState[] = [];
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(React.createElement(Harness, { opportunityId: "opp-1", repo: deferred, snap }));
  });
  assert.ok(snap.find((s) => s.loading === true), "挂起时 loading=true");
  await act(async () => {
    resolveList([sampleDecision()]);
  });
  const last = snap[snap.length - 1];
  assert.equal(last.loading, false);
  assert.equal(last.data.decisions.length, 1);
  renderer?.unmount();
});

test("hook：error（list 失败 → error 设置）", async () => {
  const failRepo = {
    ...emptyDecisionRepo(),
    listDecisions: () => Promise.reject(new Error("boom")),
  };
  const snap: HookState[] = [];
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Harness, { opportunityId: "opp-1", repo: failRepo, snap }));
  });
  const last = snap[snap.length - 1];
  assert.equal(last.error, "boom");
  renderer?.unmount();
});

test("hook：refresh（重新拉取后更新数据）", async () => {
  let calls = 0;
  const ctrl = {
    ...emptyDecisionRepo(),
    listDecisions: async () => {
      calls += 1;
      return calls >= 2 ? [sampleDecision()] : [];
    },
  };
  const snap: HookState[] = [];
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Harness, { opportunityId: "opp-1", repo: ctrl, snap }));
  });
  assert.equal(snap[snap.length - 1].data.decisions.length, 0);
  const before = snap[snap.length - 1];
  await act(async () => {
    await before.refresh();
  });
  assert.equal(snap[snap.length - 1].data.decisions.length, 1, "refresh 后应更新");
  renderer?.unmount();
});

test("hook：saveDecision 后数据刷新", async () => {
  const items: UserDecision[] = [];
  const ctrl = {
    ...emptyDecisionRepo(),
    listDecisions: async () => [...items],
    saveDecision: async (d: UserDecision) => {
      items.push(d);
    },
  };
  const snap: HookState[] = [];
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Harness, { opportunityId: "opp-1", repo: ctrl, snap }));
  });
  await act(async () => {
    await snap[snap.length - 1].saveDecision(sampleDecision());
  });
  assert.equal(snap[snap.length - 1].data.decisions.length, 1, "saveDecision 后应刷新");
  renderer?.unmount();
});
