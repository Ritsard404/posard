"use server";

import { aiReportService } from "../_services/ai-report.service";
import { AiReportQuestionSchema } from "../_services/_validators/ai-report.schema";

export async function askAiReportAction(input: unknown) {
  try {
    const validated = AiReportQuestionSchema.parse(input);
    const data = await aiReportService.answer(validated);
    return { success: true, data } as const;
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: "Unable to answer that report question.",
    } as const;
  }
}
