import "server-only";

import { InvoiceDocumentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildReprintContent } from "./print-format.service";

export interface PrintArchiveDto {
  id: string;
  type: InvoiceDocumentType;
  content: string;
  reprintCount: number;
  isTrainMode: boolean;
  invoiceId: string | null;
}

function decodeContent(value: Uint8Array) {
  return new TextDecoder().decode(value);
}

function encodeContent(value: string) {
  return new TextEncoder().encode(value);
}

export const printArchiveService = {
  async createArchive(input: {
    type: InvoiceDocumentType;
    content: string;
    isTrainMode: boolean;
    invoiceId?: string | null;
  }): Promise<PrintArchiveDto> {
    const document = await prisma.invoiceDocument.create({
      data: {
        type: input.type,
        invoiceBlob: encodeContent(input.content),
        isTrainMode: input.isTrainMode,
        invoiceId: input.invoiceId ?? null,
      },
      select: {
        id: true,
        type: true,
        invoiceBlob: true,
        reprintCount: true,
        isTrainMode: true,
        invoiceId: true,
      },
    });

    return {
      id: document.id,
      type: document.type,
      content: decodeContent(document.invoiceBlob),
      reprintCount: document.reprintCount,
      isTrainMode: document.isTrainMode,
      invoiceId: document.invoiceId,
    };
  },

  async getLatestInvoiceArchive(invoiceId: string) {
    const document = await prisma.invoiceDocument.findFirst({
      where: {
        invoiceId,
        type: InvoiceDocumentType.INVOICE,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        type: true,
        invoiceBlob: true,
        reprintCount: true,
        isTrainMode: true,
        invoiceId: true,
      },
    });

    if (!document) {
      return null;
    }

    return {
      id: document.id,
      type: document.type,
      content: decodeContent(document.invoiceBlob),
      reprintCount: document.reprintCount,
      isTrainMode: document.isTrainMode,
      invoiceId: document.invoiceId,
    } satisfies PrintArchiveDto;
  },

  async createInvoiceArchiveIfMissing(input: {
    content: string;
    isTrainMode: boolean;
    invoiceId: string;
  }): Promise<PrintArchiveDto> {
    const existing = await this.getLatestInvoiceArchive(input.invoiceId);

    if (existing) {
      return existing;
    }

    return this.createArchive({
      type: InvoiceDocumentType.INVOICE,
      content: input.content,
      isTrainMode: input.isTrainMode,
      invoiceId: input.invoiceId,
    });
  },

  async getArchive(documentId: string) {
    const document = await prisma.invoiceDocument.findUnique({
      where: {
        id: documentId,
      },
      select: {
        id: true,
        type: true,
        invoiceBlob: true,
        reprintCount: true,
        isTrainMode: true,
        invoiceId: true,
      },
    });

    if (!document) {
      return null;
    }

    return {
      id: document.id,
      type: document.type,
      content: decodeContent(document.invoiceBlob),
      reprintCount: document.reprintCount,
      isTrainMode: document.isTrainMode,
      invoiceId: document.invoiceId,
    } satisfies PrintArchiveDto;
  },

  async createReprint(documentId: string, type: InvoiceDocumentType) {
    const document = await prisma.invoiceDocument.findFirst({
      where: {
        id: documentId,
        type,
      },
      select: {
        id: true,
        type: true,
        invoiceBlob: true,
        reprintCount: true,
        isTrainMode: true,
        invoiceId: true,
      },
    });

    if (!document) {
      throw new Error("Print archive not found.");
    }

    const content = decodeContent(document.invoiceBlob);
    const nextReprintCount = document.reprintCount + 1;
    const reprintContent = buildReprintContent(content, nextReprintCount);

    const updatedDocument = await prisma.invoiceDocument.update({
      where: {
        id: document.id,
      },
      data: {
        reprintCount: {
          increment: 1,
        },
      },
      select: {
        reprintCount: true,
      },
    });

    return {
      id: document.id,
      type: document.type,
      content: reprintContent,
      reprintCount: updatedDocument.reprintCount,
      isTrainMode: document.isTrainMode,
      invoiceId: document.invoiceId,
    } satisfies PrintArchiveDto;
  },
};
