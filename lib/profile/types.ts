/**
 * Personal Profile Layer（V0.5.0 Phase 10A-1）。
 * PersonalProfile 描述「用户是谁」：基本信息 + 时区/语言 + 偏好。
 * 行业能力不在此层绑定（行业能力未来通过 Domain Plugin 扩展）。
 */
export interface PersonalProfile {
  id: string;
  userId: string;
  name: string;
  timezone: string;
  language: string;
  /** 用户偏好（通用，不绑定行业） */
  preferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalProfileInput {
  name?: string;
  timezone?: string;
  language?: string;
  preferences?: Record<string, unknown>;
}