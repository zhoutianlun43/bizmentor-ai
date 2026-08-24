/** Identity Layer（V0.4.1 Phase 8B-2）对外出口 */
export { getCurrentIdentity, getCurrentUserId, resolveCurrentUserId, setIdentityOverride } from "./resolver";
export { createAuthIdentityProvider, authIdentityProvider } from "./auth-provider";
export type { AuthIdentityProvider, AuthUser } from "./auth-provider";
export type { Identity, IdentitySource } from "./types";