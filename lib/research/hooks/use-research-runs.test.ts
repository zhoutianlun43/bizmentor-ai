import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { useResearchRuns } from "./use-research-runs";
import { LocalResearchRepository, createMemoryResearchStorage } from "../repository";
import type { ResearchRepository } from "../repository";
import type { ResearchRun } from "../types";

type HookState = ReturnType<typeof useResearchRuns>;

function Harness(props: { repo: ResearchRepository; snap: HookState[] }) {
  const h = useResearchRuns(props.repo);
  props.snap.push(h);
  return React.createElement("div");
}

function sampleRun(opportunityId = "opp-1"): ResearchRun {
  return {
    runId: "run-1",
    opportunityId,
    status: "completed",
    createdAt: "now",
    updatedAt: "now",
    stages: [],
    findings: [],
    scoreHistory: [],
    sourceDocuments: [],
  };
}

function emptyRepo(): ResearchRepository {
  return {
    listRuns: async () => [],
    getRun: async () => undefined,
    saveRun: async () => undefined,
  };
}

test("hook：本地加载（LocalResearchRepository 内存存储，空列表，loading 结束）", async () => {
  const repo = new LocalResearchRepository(createMemoryResearchStorage());
  const snap: HookState[] = [];
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Harness, { repo, snap }));
  });
  const last = snap[snap.length - 1];
  assert.equal(last.loading, false);
  assert.equal(last.error, null);
  assert.deepEqual(last.runs, []);
  renderer?.unmount();
});

test("hook：loading（请求挂起时 loading=true，完成后 false）", async () => {
  let resolveList!: (v: ResearchRun[]) => void;
  const deferred = {
    ...emptyRepo(),
    listRuns: () =>
      new Promise<ResearchRun[]>((r) => {
        resolveList = r;
      }),
  };
  const snap: HookState[] = [];
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(React.createElement(Harness, { repo: deferred, snap }));
  });
  assert.ok(snap.find((s) => s.loading === true), "挂起时 loading=true");
  await act(async () => {
    resolveList([sampleRun()]);
  });
  const last = snap[snap.length - 1];
  assert.equal(last.loading, false);
  assert.equal(last.runs.length, 1);
  renderer?.unmount();
});

test("hook：error（list 失败 → error 设置）", async () => {
  const failRepo = {
    ...emptyRepo(),
    listRuns: () => Promise.reject(new Error("boom")),
  };
  const snap: HookState[] = [];
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Harness, { repo: failRepo, snap }));
  });
  const last = snap[snap.length - 1];
  assert.equal(last.error, "boom");
  renderer?.unmount();
});

test("hook：refresh（重新拉取后更新数据）", async () => {
  let calls = 0;
  const ctrl = {
    ...emptyRepo(),
    listRuns: async () => {
      calls += 1;
      return calls >= 2 ? [sampleRun()] : [];
    },
  };
  const snap: HookState[] = [];
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Harness, { repo: ctrl, snap }));
  });
  assert.equal(snap[snap.length - 1].runs.length, 0);
  const before = snap[snap.length - 1];
  await act(async () => {
    await before.refresh();
  });
  assert.equal(snap[snap.length - 1].runs.length, 1, "refresh 后应更新");
  renderer?.unmount();
});

test("hook：getRun / saveRun（读取与保存）", async () => {
  const repo = new LocalResearchRepository(createMemoryResearchStorage());
  const snap: HookState[] = [];
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Harness, { repo, snap }));
  });
  const h = snap[snap.length - 1];
  let saved: boolean | undefined;
  let got: ResearchRun | undefined;
  await act(async () => {
    await h.saveRun(sampleRun());
    saved = true;
  });
  await act(async () => {
    got = await h.getRun("opp-1");
  });
  assert.equal(saved, true);
  assert.equal(got?.runId, "run-1");
  renderer?.unmount();
});
