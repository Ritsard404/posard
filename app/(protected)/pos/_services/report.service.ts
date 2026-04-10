import "server-only";
import { prisma } from "@/lib/prisma";
import { CashTrackReportDto } from "./_dto/pos.dto";

export const reportService = {
  /**
   * Generates a cash track report for a specific session (Timestamp).
   * 
   * Logic:
   * 1. Fetches basic session info (Opening Cash, Withdrawals).
   * 2. Calculates total cash sales from paid invoices in the session timeframe.
   * 3. Calculates total e-payment sales for reference.
   * 
   * @param timestampId Unique ID of the session
   */
  async getTimestampCashTrack(timestampId: string): Promise<CashTrackReportDto> {
    const timestamp = await prisma.timestamp.findUnique({
      where: { id: timestampId },
      include: {
        cashier: { select: { fullName: true } },
        posTerminal: { select: { posName: true, isTrainMode: true } }
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
      const returned = Number(invoice.returnedAmount || 0); // Note: schema has returnedAmount with camelCase but map is different? 
      // Checking schema again: 567: returnedAmount Decimal? @map("returned_amount") @db.Decimal(15, 2)
      // So in Prisma Client it is returnedAmount.
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
      cashierName: timestamp.cashier.fullName || "Unknown",
      terminalName: timestamp.posTerminal.posName,
      timestampIn: timestamp.timestampIn,
      isTrainMode: timestamp.posTerminal.isTrainMode,
      
      openingCash,
      totalCashSales,
      totalWithdrawals,
      withdrawnCount: Number(timestamp.withdrawnDrawerCount),
      expectedDrawerAmount,
      
      totalEPaymentSales
    };
  }
};
