import { prisma } from "@/lib/prisma";
import {
  type CreateTerminalRequestInput,
  type TerminalRequestDTO,
} from "./terminal-request.dto";
import { withOptionalCompanyTable } from "./company-schema-guard.service";
import { notificationService } from "@/app/(protected)/notifications/_services/notification.service";

function mapTerminalRequest(request: {
  id: string;
  companyId: string;
  requestedById: string;
  reviewedById: string | null;
  requestedTerminals: number;
  status: "pending" | "approved" | "fulfilled" | "rejected" | "cancelled";
  notes: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  requestedBy: {
    fullName: string | null;
  };
  reviewedBy: {
    fullName: string | null;
  } | null;
}): TerminalRequestDTO {
  return {
    id: request.id,
    companyId: request.companyId,
    requestedById: request.requestedById,
    reviewedById: request.reviewedById,
    requestedTerminals: request.requestedTerminals,
    status: request.status,
    notes: request.notes,
    reviewedAt: request.reviewedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    requestedByName: request.requestedBy.fullName,
    reviewedByName: request.reviewedBy?.fullName ?? null,
  };
}

export const terminalRequestService = {
  async getTerminalRequestsByCompany(companyId: string): Promise<TerminalRequestDTO[]> {
    const requests = await withOptionalCompanyTable(
      () =>
        prisma.terminalRequest.findMany({
          where: {
            companyId,
          },
          include: {
            requestedBy: {
              select: {
                fullName: true,
              },
            },
            reviewedBy: {
              select: {
                fullName: true,
              },
            },
          },
          orderBy: [{ createdAt: "desc" }],
        }),
      [],
      "public.terminal_request",
    );

    return requests.map(mapTerminalRequest);
  },

  async createTerminalRequest(
    companyId: string,
    requestedById: string,
    payload: CreateTerminalRequestInput,
  ): Promise<TerminalRequestDTO> {
    const request = await prisma.terminalRequest.create({
      data: {
        companyId,
        requestedById,
        requestedTerminals: payload.requestedTerminals,
        notes: payload.notes ?? null,
      },
      include: {
        requestedBy: {
          select: {
            fullName: true,
          },
        },
        reviewedBy: {
          select: {
            fullName: true,
          },
        },
      },
    });

    const admins = await prisma.profile.findMany({
      where: { role: "admin", status: "active" },
      select: { id: true },
    });
    await notificationService.createMany(
      admins.map((admin) => ({
        profileId: admin.id,
        companyId,
        category: "TERMINAL_REQUEST" as const,
        type: "terminal_request_submitted",
        title: "Terminal request submitted",
        body: `${request.requestedBy.fullName ?? "A manager"} requested ${request.requestedTerminals} terminal${request.requestedTerminals === 1 ? "" : "s"}.`,
        href: `/companies/${companyId}/terminals`,
        relatedEntityType: "terminal_request",
        relatedEntityId: request.id,
      })),
    );

    return mapTerminalRequest(request);
  },

  async updateTerminalRequestStatus(
    id: string,
    companyId: string,
    reviewedById: string,
    status: "pending" | "approved" | "fulfilled" | "rejected" | "cancelled",
  ): Promise<TerminalRequestDTO> {
    const existing = await prisma.terminalRequest.findFirst({
      where: {
        id,
        companyId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new Error("Terminal request not found");
    }

    const request = await prisma.terminalRequest.update({
      where: {
        id,
      },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedById,
      },
      include: {
        requestedBy: {
          select: {
            fullName: true,
          },
        },
        reviewedBy: {
          select: {
            fullName: true,
          },
        },
      },
    });

    if (status === "approved" || status === "rejected") {
      await notificationService.create({
        profileId: request.requestedById,
        companyId,
        category: "TERMINAL_REQUEST",
        type:
          status === "approved"
            ? "terminal_request_approved"
            : "terminal_request_rejected",
        title:
          status === "approved"
            ? "Terminal request approved"
            : "Terminal request rejected",
        body:
          status === "approved"
            ? `${request.requestedTerminals} terminal request${request.requestedTerminals === 1 ? "" : "s"} approved.`
            : `${request.requestedTerminals} terminal request${request.requestedTerminals === 1 ? "" : "s"} rejected.`,
        href: `/companies/${companyId}/terminals`,
        relatedEntityType: "terminal_request",
        relatedEntityId: request.id,
      });
    }

    return mapTerminalRequest(request);
  },
};
