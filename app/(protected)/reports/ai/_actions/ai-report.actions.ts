"use server";

import { aiReportService } from "../_services/ai-report.service";
import { AiReportQuestionSchema } from "../_services/_validators/ai-report.schema";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { getCurrentProfile } from "@/lib/auth/current-user";

export async function askAiReportAction(input: unknown) {
  try {
    const validated = AiReportQuestionSchema.parse(input);
    const profile = await getCurrentProfile();
    if (!profile) {
      return { success: false, error: "Unauthorized." } as const;
    }
    await enforceRateLimit({
      bucket: "aiReportChat",
      route: "/reports/ai",
      action: "AI_REPORT_CHAT",
      profileId: profile.id,
      userId: profile.id,
      role: profile.role,
      companyId: validated.companyId ?? profile.companyId,
      terminalId: validated.terminalId,
    });
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
