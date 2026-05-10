import "server-only";

import { prisma } from "@/lib/prisma";
import { aiReportQueryService } from "./report-query.service";
import { resolveAiReportProvider } from "./ai-provider.service";
import type { AiReportAnswerDto } from "./_dto/ai-report.dto";
import type { AiReportQuestionInput } from "./_validators/ai-report.schema";

export const aiReportService = {
  async answer(input: AiReportQuestionInput): Promise<AiReportAnswerDto> {
    const facts = await aiReportQueryService.resolveFacts(input);
    const provider = resolveAiReportProvider();
    const answer = await provider.answer({ question: input.question, facts });

    await prisma.aiReportConversation.create({
      data: {
        profileId: facts.scope.profileId,
        companyId: facts.scope.companyId,
        terminalId: facts.scope.terminalId,
        title: input.question.slice(0, 120),
        messages: {
          create: [
            { role: "user", content: input.question },
            {
              role: "assistant",
              content: answer.answer,
              mode: answer.mode,
              factsUsed: answer.factsUsed,
              warnings: answer.warnings ?? undefined,
            },
          ],
        },
      },
    });

    return answer;
  },
};
