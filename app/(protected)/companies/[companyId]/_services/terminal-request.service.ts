import { prisma } from "@/lib/prisma";
import {
  type CreateTerminalRequestInput,
  type TerminalRequestDTO,
} from "./terminal-request.dto";
import { withOptionalCompanyTable } from "./company-schema-guard.service";

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

    return mapTerminalRequest(request);
  },
};
