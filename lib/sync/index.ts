/** 数据同步基础层（V0.4.2 Phase 9B-5-D/E）对外出口 */
export { SyncManager, lwwWins } from "./manager";
export { LocalAgentStateRepository } from "./agent-state-repository";
export type { AgentStateRepository, AgentStateSnapshot } from "./agent-state-repository";
export type { SyncEntity, SyncSource, SyncSummary } from "./types";