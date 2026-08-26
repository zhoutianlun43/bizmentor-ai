/**
 * 多模态能力接口（V1.7）：预留未来接入 GPT-4.1 Vision / Claude Vision / Gemini / Qwen-VL / DeepSeek Vision。
 * 当前只实现 MockProvider（"当前未接入视觉模型"）；接入真实模型时替换 provider，无需修改业务逻辑。
 */
export interface ImageAnalysisInput {
  imageUrl?: string;
  base64?: string;
  mime?: string;
  hint?: string;
}
export interface VideoAnalysisInput {
  videoUrl?: string;
  hint?: string;
}
export interface DocumentAnalysisInput {
  fileName: string;
  content?: string;
  mime?: string;
}
export interface VisualGenerationInput {
  prompt: string;
  format?: "image" | "poster";
}

export interface MultimodalProvider {
  id: string;
  analyzeImage(input: ImageAnalysisInput): Promise<string>;
  analyzeVideo(input: VideoAnalysisInput): Promise<string>;
  analyzeDocument(input: DocumentAnalysisInput): Promise<string>;
  generateVisual(input: VisualGenerationInput): Promise<string>;
}

/** 占位实现：返回明确提示，供前端展示（不假装分析成功） */
export const mockMultimodalProvider: MultimodalProvider = {
  id: "mock",
  async analyzeImage() { return "当前未接入视觉模型：无法分析图片。请把图片中的关键文字（价格/卖点/评论等）粘贴到「分析资料」。"; },
  async analyzeVideo() { return "当前未接入视频模型：无法分析视频。请描述视频结构（前三秒钩子/镜头/字幕/卖点）粘贴到「分析资料」。"; },
  async analyzeDocument() { return "当前未接入文档解析模型：无法分析该文件。可粘贴文档关键内容到「分析资料」。"; },
  async generateVisual() { return "当前未接入图像生成模型：无法生成视觉内容。"; },
};

let current: MultimodalProvider = mockMultimodalProvider;

export function registerMultimodalProvider(provider: MultimodalProvider): void {
  current = provider;
}

export function getMultimodalProvider(): MultimodalProvider {
  return current;
}
