import { readJSON, writeJSON, uid } from "./storage";
import type { AnswerSubmission } from "@/lib/types";

const KEY = "trainingSubmissions";

/** 读取全部答案提交记录 */
export function loadSubmissions(): AnswerSubmission[] {
  return readJSON<AnswerSubmission[]>(KEY, []);
}

/** 按题目读取提交记录（新提交在前） */
export function loadSubmissionsByQuestion(questionId: string): AnswerSubmission[] {
  return loadSubmissions()
    .filter((s) => s.questionId === questionId)
    .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
}

/**
 * 提交答案。V0.1 不调用 AI，统一标记为 pending（等待 AI 评分）。
 * 未来由 AI Examiner Agent 更新 score / feedback / status。
 */
export function addSubmission(questionId: string, answer: string): AnswerSubmission {
  const submission: AnswerSubmission = {
    id: uid(),
    questionId,
    answer: answer.trim(),
    submittedAt: new Date().toISOString(),
    status: "pending",
  };
  writeJSON(KEY, [submission, ...loadSubmissions()]);
  return submission;
}