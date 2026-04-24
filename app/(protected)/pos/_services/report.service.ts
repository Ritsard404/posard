import "server-only";
import { prisma } from "@/lib/prisma";
import { CashTrackReportDto } from "./_dto/pos.dto";
import { printConfigService } from "./print-config.service";

export const reportService = {
  /**
   * Generates a cash track report for a specific session (Timestamp).
   * 
   * Logic:
   * 1. Fetches basic session info (Opening Cash, Withdrawals).
   * 2. Calculates total cash sales from paid invoices in the session timeframe.
   * 3. Calculates total reference payment sales.
   * 
   * @param timestampId Unique ID of the session
   */
  async getTimestampCashTrack(timestampId: string): Promise<CashTrackReportDto> {
    const timestamp = await prisma.timestamp.findUnique({
      where: { id: timestampId },
      include: {
        cashier: { select: { fullName: true } },
        posTerminal: {
          select: {
            id: true,
            posName: true,
            isTrainMode: true,
            printerName: true,
            printerDisplayName: true,
            printerConnectionType: true,
            printerTransport: true,
            printerDriver: true,
            printerVendorId: true,
            printerProductId: true,
            printerDeviceId: true,
            printerServiceUuid: true,
            printerCharacteristicUuid: true,
            autoPrintEnabled: true,
          },
        }
      }
    });

    if (!timestamp || !timestamp.timestampIn) {
      throw new Error("Active session not found or invalid.");
    }

    // Fetch all paid invoices for this cashier on this terminal since login
    const invoices = await prisma.invoice.findMany({
      where: {
        posTerminalId: timestamp.posTerminalId,
        cashierId: timestamp.cashierId,
        status: 'PAID',
        createdAt: { gte: timestamp.timestampIn },
        isTrainMode: timestamp.posTerminal.isTrainMode,
        isRead: false // Only include invoices not yet processed in a Z-report
      },
      include: {
        ePayments: true
      }
    });

    // Calculate Cash Sales: Sum(Tendered - Change - Returned)
    const totalCashSales = invoices.reduce((sum, invoice) => {
      const tendered = Number(invoice.cashTendered || 0);
      const change = Number(invoice.changeAmount || 0);
      const returnedVal = Number(invoice.returnedAmount || 0);
      return sum + (tendered - change - returnedVal);
    }, 0);

    // Calculate E-Payment Sales for reference
    const totalEPaymentSales = invoices.reduce((sum, invoice) => {
      const epayTotal = invoice.ePayments.reduce((eSum, ep) => eSum + Number(ep.amount), 0);
      return sum + epayTotal;
    }, 0);

    const openingCash = Number(timestamp.cashInDrawerAmount);
    const totalWithdrawals = Number(timestamp.withdrawnDrawerAmount);
    const expectedDrawerAmount = openingCash + totalCashSales - totalWithdrawals;

    return {
      timestampId: timestamp.id,
      terminalId: timestamp.posTerminal.id,
      cashierName: timestamp.cashier.fullName || "Unknown",
      terminalName: timestamp.posTerminal.posName ?? "Unnamed terminal",
      timestampIn: timestamp.timestampIn,
      timestampOut: timestamp.timestampOut,
      isTrainMode: timestamp.posTerminal.isTrainMode,
      printerConfig: printConfigService.mapPrinterConfig(timestamp.posTerminal),
      
      openingCash,
      totalCashSales,
      totalWithdrawals,
      withdrawnCount: Number(timestamp.withdrawnDrawerCount),
      expectedDrawerAmount,
      
      totalEPaymentSales
    };
  }
};
