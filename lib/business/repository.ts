/** BusinessProfileRepository（V0.5.0 Phase 10A-2）：save/get/update；Local 先实现，Supabase 预留 */
import type { BusinessProfile, BusinessProfileInput } from "./types";

export interface BusinessProfileRepository {
  save(profile: BusinessProfile): Promise<void>;
  get(userId: string): Promise<BusinessProfile | undefined>;
  update(userId: string, patch: BusinessProfileInput): Promise<BusinessProfile | undefined>;
}