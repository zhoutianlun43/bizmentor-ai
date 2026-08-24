/** Business Domain Layer（V0.4.1 Phase 6.1B）对外出口 */
export { BUILTIN_DOMAINS, getDomainProfile } from "./registry";
export { detectDomain, detectDomainByRules, domainClassificationPrompt } from "./detect";
export { domainHintsText } from "./hints";
export type { DomainInput } from "./detect";
export type {
  BusinessDomain,
  BusinessDomainProfile,
  DomainDetection,
  DomainScoreDimension,
} from "./types";