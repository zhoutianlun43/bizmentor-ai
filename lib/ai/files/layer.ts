/**
 * 文件理解层接口（V1.7）：预留未来 PDF/Excel/Word/PPT/图片/视频 解析。
 * 当前只建立接口 + Mock 实现；接入真实解析器（pdf-parse/xlsx/docx/视觉模型）时无需改业务。
 */
export type FileKind = "pdf" | "excel" | "word" | "ppt" | "image" | "video" | "text";

export interface FileAnalysisResult {
  kind: FileKind;
  fileName: string;
  /** 抽取到的文本/结构化数据（未来由解析器填充） */
  extracted?: string;
  /** 是否真正解析成功 */
  parsed: boolean;
  note?: string;
}

export interface FileAnalyzer {
  id: string;
  canHandle(kind: FileKind): boolean;
  analyze(kind: FileKind, fileName: string, content?: string): Promise<FileAnalysisResult>;
}

export const mockFileAnalyzer: FileAnalyzer = {
  id: "mock",
  canHandle: () => true,
  async analyze(kind, fileName) {
    return { kind, fileName, parsed: false, note: "文件解析器未接入（当前支持文本粘贴分析）。未来接入 PDF/Excel/Word 解析后自动生效。" };
  },
};

/** File Understanding Layer：上传文件 → 分析器 → 抽取 → 写入项目知识库 → AI 分析（接口） */
export class FileUnderstandingLayer {
  constructor(private readonly analyzer: FileAnalyzer = mockFileAnalyzer) {}
  async analyze(kind: FileKind, fileName: string, content?: string): Promise<FileAnalysisResult> {
    if (!this.analyzer.canHandle(kind)) {
      return { kind, fileName, parsed: false, note: "暂不支持该文件类型。" };
    }
    return this.analyzer.analyze(kind, fileName, content);
  }
}

export const fileUnderstandingLayer = new FileUnderstandingLayer();
