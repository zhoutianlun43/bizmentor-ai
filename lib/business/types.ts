/**
 * Business Profile Layer（V0.5.0 Phase 10A-2）。
 * BusinessProfile 描述「用户的经营世界」——不绑定行业。
 * 行业能力未来通过 Domain Plugin 扩展；本层只存通用经营画像。
 */
/** 通用经营类型（行业无关；未来 Domain Plugin 可扩展更多） */
export type BusinessType =
  | "commerce" // 电商/贸易
  | "service" // 服务
  | "product" // 实体产品
  | "content" // 内容/媒体
  | "saas" // 软件/订阅
  | "marketplace" // 平台/双边
  | "local_service"; // 本地生活服务

export interface BusinessProfile {
  id: string;
  userId: string;
  /** 经营主体名称（如店铺/品牌/工作室名，非行业绑定） */
  name: string;
  description: string;
  /** 经营类型（通用枚举；可多个） */
  businessTypes: BusinessType[];
  /** 通用经营偏好（不绑定行业） */
  preferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessProfileInput {
  name?: string;
  description?: string;
  businessTypes?: BusinessType[];
  preferences?: Record<string, unknown>;
}