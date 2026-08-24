/**
 * 商机数据层抽象（V0.4.1 Phase 2 Task 2B）。
 * - OpportunityRepository 接口：Local / Supabase 可切换
 * - SupabaseOpportunityRepository：create/get/list/update/delete
 * 说明：当前业务仍走 lib/store/opportunity-store.ts（未切换），本模块为数据层接入预留。
 */
export type { OpportunityRepository } from "./repository";
export { SupabaseOpportunityRepository } from "./supabase-repository";
export { SupabaseRepositoryError } from "../supabase/errors";
export type { SupabaseOpportunityRepositoryOptions } from "./supabase-repository";
