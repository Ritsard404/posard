import "server-only";

import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { businessFitPresetGuides } from "@/app/(protected)/_services/business-fit-presets";
import type {
  BusinessFitMatrixRowDTO,
  BusinessFitQueueItemDTO,
  BusinessFitWorkspaceDTO,
  PosOpenTicketCreateInput,
  PrescriptionVerificationCreateInput,
  RepairJobCreateInput,
  SalesOrderCreateInput,
  ServiceBookingCreateInput,
} from "./business-fit.dto";

async function requireContext() {
  const profile = await getCurrentProfile();

  if (!profile) {
    throw new Error("Authenticated profile is required.");
  }

  return {
    profileId: profile.id,
    companyId: profile.companyId,
    branchId: profile.branchId,
    role: profile.role,
  };
}

function toNumber(value: { toNumber: () => number } | number | null | undefined) {
  if (value === null || value === undefined) return null;
  return typeof value === "number" ? value : value.toNumber();
}

function buildNumber(prefix: string, companyId: string, count: number) {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `${prefix}-${companyId.slice(0, 8).toUpperCase()}-${stamp}-${String(count + 1).padStart(4, "0")}`;
}

function companyWhere(companyId: string | null) {
  return companyId ? { companyId } : {};
}

async function validateCompanyReferences(input: {
  companyId: string;
  terminalId?: string | null;
  customerId?: string | null;
  productId?: string | null;
  staffId?: string | null;
}) {
  const [terminal, customer, product, staff] = await Promise.all([
    input.terminalId
      ? prisma.posTerminalInfo.findFirst({ where: { id: input.terminalId, companyId: input.companyId }, select: { id: true } })
      : null,
    input.customerId
      ? prisma.customer.findFirst({ where: { id: input.customerId, companyId: input.companyId }, select: { id: true } })
      : null,
    input.productId
      ? prisma.product.findFirst({ where: { id: input.productId, companyId: input.companyId, isDeleted: false }, select: { id: true } })
      : null,
    input.staffId
      ? prisma.profile.findFirst({ where: { id: input.staffId, companyId: input.companyId }, select: { id: true } })
      : null,
  ]);
  if (input.terminalId && !terminal) throw new Error("Selected terminal was not found.");
  if (input.customerId && !customer) throw new Error("Selected customer was not found.");
  if (input.productId && !product) throw new Error("Selected product was not found.");
  if (input.staffId && !staff) throw new Error("Selected staff member was not found.");
}

function buildMatrix(): BusinessFitMatrixRowDTO[] {
  return businessFitPresetGuides.map((guide) => {
    const present: string[] = [];
    const partial: string[] = [];
    const missing: string[] = [];

    if (["RETAIL", "PHARMACY", "RESTAURANT"].includes(guide.preset)) {
      present.push("Core POS checkout", "Products and reports");
    }
    if (guide.preset === "PHARMACY") {
      present.push("Batch/expiry and prescription product flags");
      partial.push("Prescription verification queue");
    }
    if (guide.preset === "RESTAURANT") {
      present.push("Fulfillment details and kitchen tickets");
      partial.push("Open POS ticket queue");
    }
    if (guide.preset === "SERVICE") {
      partial.push("Service product mode and booking queue");
    }
    if (guide.preset === "REPAIR") {
      partial.push("Repair job intake, parts, deposits, and warranty comeback records");
    }
    if (guide.preset === "WHOLESALE") {
      partial.push("Customer account terms and sales order records");
    }
    if (["APPAREL", "HARDWARE", "SERIALIZED_GOODS"].includes(guide.preset)) {
      partial.push("Variant, unit, serial, and bundle records");
    }
    if (guide.fitStatus === "advanced_setup") {
      missing.push("Full checkout selection and report drill-down integration");
    }

    return {
      preset: guide.preset,
      label: guide.label,
      status: guide.fitStatus,
      present,
      partial,
      missing,
      helpAnchors: guide.helpAnchors,
    };
  });
}

export const businessFitService = {
  async getWorkspace(): Promise<BusinessFitWorkspaceDTO> {
    const viewer = await requireContext();
    const company = viewer.companyId
      ? await prisma.company.findUnique({
          where: { id: viewer.companyId },
          select: { id: true, name: true, businessTypePreset: true },
        })
      : null;

    const where = companyWhere(viewer.companyId);

    const [
      serviceBookings,
      repairJobs,
      salesOrders,
      openTickets,
      prescriptionChecks,
      variantCount,
      serialCount,
      bundleCount,
      customers,
      products,
      staff,
      terminals,
    ] = await Promise.all([
      prisma.serviceBooking.findMany({
        where,
        orderBy: { scheduledStart: "asc" },
        take: 10,
        select: {
          id: true,
          bookingNumber: true,
          scheduledStart: true,
          status: true,
          depositAmount: true,
          finalAmount: true,
          notes: true,
          customer: { select: { name: true, phone: true } },
          serviceProduct: { select: { name: true } },
          assignedStaff: { select: { fullName: true, email: true } },
        },
      }),
      prisma.repairJob.findMany({
        where,
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        take: 10,
        select: {
          id: true,
          jobNumber: true,
          itemLabel: true,
          issueSummary: true,
          status: true,
          estimateAmount: true,
          depositAmount: true,
          dueDate: true,
          customer: { select: { name: true, phone: true } },
        },
      }),
      prisma.salesOrder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          paymentTermsDays: true,
          deliveryStatus: true,
          customer: { select: { name: true, accountType: true } },
        },
      }),
      prisma.posOpenTicket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          ticketNumber: true,
          ticketName: true,
          status: true,
          fulfillmentType: true,
          tableNumber: true,
          createdAt: true,
          customer: { select: { name: true } },
          terminal: { select: { posName: true } },
        },
      }),
      prisma.prescriptionVerification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          status: true,
          prescriptionReference: true,
          createdAt: true,
          product: { select: { name: true } },
          customer: { select: { name: true } },
          terminal: { select: { posName: true } },
        },
      }),
      prisma.productVariant.count({ where }),
      prisma.productSerial.count({ where }),
      prisma.productBundle.count({ where }),
      prisma.customer.findMany({
        where,
        orderBy: { name: "asc" },
        take: 100,
        select: { id: true, name: true, phone: true, accountType: true },
      }),
      prisma.product.findMany({
        where: { ...where, isDeleted: false },
        orderBy: { name: "asc" },
        take: 150,
        select: {
          id: true,
          name: true,
          barcode: true,
          trackInventory: true,
          trackingMode: true,
        },
      }),
      prisma.profile.findMany({
        where: { ...where, status: "active" },
        orderBy: [{ fullName: "asc" }, { email: "asc" }],
        take: 100,
        select: { id: true, fullName: true, email: true, role: true },
      }),
      prisma.posTerminalInfo.findMany({
        where,
        orderBy: { posName: "asc" },
        take: 100,
        select: { id: true, posName: true, businessTypePresetOverride: true },
      }),
    ]);

    const mapCustomer = (customer: { name: string } | null) =>
      customer?.name ?? "Walk-in customer";

    return {
      company: {
        id: company?.id ?? null,
        name: company?.name ?? "No company selected",
        businessTypePreset: company?.businessTypePreset ?? null,
      },
      summary: {
        serviceBookings: serviceBookings.length,
        repairJobs: repairJobs.length,
        salesOrders: salesOrders.length,
        openTickets: openTickets.length,
        prescriptionChecks: prescriptionChecks.length,
        variants: variantCount,
        serials: serialCount,
        bundles: bundleCount,
      },
      matrix: buildMatrix(),
      serviceBookings: serviceBookings.map((booking): BusinessFitQueueItemDTO => ({
        id: booking.id,
        number: booking.bookingNumber,
        title: booking.serviceProduct?.name ?? "Service booking",
        status: booking.status,
        customer: mapCustomer(booking.customer),
        amount: toNumber(booking.finalAmount) ?? toNumber(booking.depositAmount),
        schedule: booking.scheduledStart,
        helper: booking.assignedStaff?.fullName ?? booking.assignedStaff?.email ?? booking.notes ?? "No staff assigned",
      })),
      repairJobs: repairJobs.map((job): BusinessFitQueueItemDTO => ({
        id: job.id,
        number: job.jobNumber,
        title: job.itemLabel,
        status: job.status,
        customer: mapCustomer(job.customer),
        amount: toNumber(job.estimateAmount) ?? toNumber(job.depositAmount),
        schedule: job.dueDate,
        helper: job.issueSummary,
      })),
      salesOrders: salesOrders.map((order): BusinessFitQueueItemDTO => ({
        id: order.id,
        number: order.orderNumber,
        title: order.customer?.accountType ?? "Sales order",
        status: order.status,
        customer: mapCustomer(order.customer),
        amount: toNumber(order.totalAmount),
        helper: order.deliveryStatus ?? (order.paymentTermsDays ? `${order.paymentTermsDays} day terms` : "No terms set"),
      })),
      openTickets: openTickets.map((ticket): BusinessFitQueueItemDTO => ({
        id: ticket.id,
        number: ticket.ticketNumber,
        title: ticket.ticketName ?? ticket.tableNumber ?? ticket.fulfillmentType,
        status: ticket.status,
        customer: mapCustomer(ticket.customer),
        schedule: ticket.createdAt,
        helper: ticket.terminal.posName ?? "Unnamed terminal",
      })),
      prescriptionChecks: prescriptionChecks.map((check): BusinessFitQueueItemDTO => ({
        id: check.id,
        number: check.prescriptionReference ?? check.id.slice(0, 8),
        title: check.product.name,
        status: check.status,
        customer: mapCustomer(check.customer),
        schedule: check.createdAt,
        helper: check.terminal?.posName ?? "No terminal",
      })),
      options: {
        customers: customers.map((customer) => ({
          id: customer.id,
          label: customer.name,
          helper: customer.phone ?? customer.accountType,
        })),
        products: products.map((product) => ({
          id: product.id,
          label: product.name,
          helper: product.barcode ?? product.trackingMode,
        })),
        serviceProducts: products
          .filter((product) => product.trackingMode === "SERVICE" || !product.trackInventory)
          .map((product) => ({
            id: product.id,
            label: product.name,
            helper: product.trackingMode,
          })),
        staff: staff.map((member) => ({
          id: member.id,
          label: member.fullName ?? member.email,
          helper: member.role,
        })),
        terminals: terminals.map((terminal) => ({
          id: terminal.id,
          label: terminal.posName ?? "Unnamed terminal",
          helper: terminal.businessTypePresetOverride,
        })),
      },
    };
  },

  async createServiceBooking(input: ServiceBookingCreateInput): Promise<void> {
    const viewer = await requireContext();
    if (!viewer.companyId) throw new Error("Company context is required.");
    await validateCompanyReferences({
      companyId: viewer.companyId,
      terminalId: input.terminalId,
      customerId: input.customerId,
      productId: input.serviceProductId,
      staffId: input.assignedStaffId,
    });
    const count = await prisma.serviceBooking.count({ where: { companyId: viewer.companyId } });

    await prisma.serviceBooking.create({
      data: {
        bookingNumber: buildNumber("SB", viewer.companyId, count),
        companyId: viewer.companyId,
        terminalId: input.terminalId,
        customerId: input.customerId,
        serviceProductId: input.serviceProductId,
        assignedStaffId: input.assignedStaffId,
        createdById: viewer.profileId,
        scheduledStart: input.scheduledStart,
        scheduledEnd: input.scheduledEnd,
        depositAmount: input.depositAmount,
        finalAmount: input.finalAmount ?? null,
        notes: input.notes,
      },
    });
  },

  async createRepairJob(input: RepairJobCreateInput): Promise<void> {
    const viewer = await requireContext();
    if (!viewer.companyId) throw new Error("Company context is required.");
    await validateCompanyReferences({
      companyId: viewer.companyId,
      terminalId: input.terminalId,
      customerId: input.customerId,
      productId: input.laborProductId,
      staffId: input.assignedStaffId,
    });
    const count = await prisma.repairJob.count({ where: { companyId: viewer.companyId } });

    await prisma.repairJob.create({
      data: {
        jobNumber: buildNumber("RJ", viewer.companyId, count),
        companyId: viewer.companyId,
        terminalId: input.terminalId,
        customerId: input.customerId,
        laborProductId: input.laborProductId,
        assignedStaffId: input.assignedStaffId,
        createdById: viewer.profileId,
        itemLabel: input.itemLabel,
        serialReference: input.serialReference,
        issueSummary: input.issueSummary,
        intakeNotes: input.intakeNotes,
        estimateAmount: input.estimateAmount ?? null,
        depositAmount: input.depositAmount,
        dueDate: input.dueDate,
        warrantyUntil: input.warrantyUntil,
        notes: input.notes,
      },
    });
  },

  async createSalesOrder(input: SalesOrderCreateInput): Promise<void> {
    const viewer = await requireContext();
    if (!viewer.companyId) throw new Error("Company context is required.");
    await validateCompanyReferences({
      companyId: viewer.companyId,
      terminalId: input.terminalId,
      customerId: input.customerId,
      productId: input.productId,
    });
    const count = await prisma.salesOrder.count({ where: { companyId: viewer.companyId } });
    const quantity = input.quantity ?? 0;
    const lineTotal = Math.max(0, quantity * input.unitPrice - input.discountAmount);

    await prisma.salesOrder.create({
      data: {
        orderNumber: buildNumber("SO", viewer.companyId, count),
        companyId: viewer.companyId,
        terminalId: input.terminalId,
        customerId: input.customerId,
        createdById: viewer.profileId,
        status: "QUOTED",
        quoteValidUntil: input.quoteValidUntil,
        paymentTermsDays: input.paymentTermsDays,
        subtotalAmount: quantity * input.unitPrice,
        discountAmount: input.discountAmount,
        totalAmount: lineTotal,
        deliveryStatus: input.deliveryStatus,
        deliveryNotes: input.deliveryNotes,
        notes: input.notes,
        items:
          input.productId && quantity > 0
            ? {
                create: {
                  productId: input.productId,
                  quantity,
                  unitPrice: input.unitPrice,
                  discountAmount: input.discountAmount,
                  lineTotal,
                },
              }
            : undefined,
      },
    });
  },

  async createOpenTicket(input: PosOpenTicketCreateInput): Promise<void> {
    const viewer = await requireContext();
    if (!viewer.companyId) throw new Error("Company context is required.");
    await validateCompanyReferences({
      companyId: viewer.companyId,
      terminalId: input.terminalId,
      customerId: input.customerId,
    });
    const count = await prisma.posOpenTicket.count({ where: { companyId: viewer.companyId } });

    await prisma.posOpenTicket.create({
      data: {
        ticketNumber: buildNumber("OT", viewer.companyId, count),
        companyId: viewer.companyId,
        terminalId: input.terminalId,
        cashierId: viewer.profileId,
        customerId: input.customerId,
        status: "HELD",
        fulfillmentType: input.fulfillmentType,
        tableNumber: input.tableNumber,
        guestCount: input.guestCount,
        ticketName: input.ticketName,
        kitchenStation: input.kitchenStation,
        cartSnapshot: {
          items: [],
          source: "business_fit_workspace",
          inventoryTiming: "deduct_on_settlement",
        },
        totalsSnapshot: { subtotal: 0, total: 0 },
        notes: input.notes,
      },
    });
  },

  async createPrescriptionVerification(input: PrescriptionVerificationCreateInput): Promise<void> {
    const viewer = await requireContext();
    if (!viewer.companyId) throw new Error("Company context is required.");
    await validateCompanyReferences({
      companyId: viewer.companyId,
      terminalId: input.terminalId,
      customerId: input.customerId,
      productId: input.productId,
    });

    await prisma.prescriptionVerification.create({
      data: {
        companyId: viewer.companyId,
        terminalId: input.terminalId,
        customerId: input.customerId,
        productId: input.productId,
        verifiedById: input.status === "VERIFIED" ? viewer.profileId : null,
        prescriptionReference: input.prescriptionReference,
        status: input.status,
        notes: input.notes,
        verifiedAt: input.status === "VERIFIED" ? new Date() : null,
      },
    });
  },
};
