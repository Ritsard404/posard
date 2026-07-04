export const businessTypePresets = [
  "RETAIL",
  "PHARMACY",
  "RESTAURANT",
  "SERVICE",
  "REPAIR",
  "WHOLESALE",
  "APPAREL",
  "HARDWARE",
  "SERIALIZED_GOODS",
] as const;

export type BusinessTypePresetDTO = (typeof businessTypePresets)[number];

export interface BusinessFitPresetGuide {
  preset: BusinessTypePresetDTO;
  label: string;
  fitStatus: "ready_now" | "supported_with_setup" | "advanced_setup";
  description: string;
  setupSteps: string[];
  terminalToggles: string[];
  inventoryDefaults: string[];
  receiptLabels: string[];
  helpAnchors: string[];
}

export const businessFitPresetGuides: BusinessFitPresetGuide[] = [
  {
    preset: "RETAIL",
    label: "Retail",
    fitStatus: "ready_now",
    description: "General stores, grocery, convenience, cosmetics, accessories, and daily product checkout.",
    setupSteps: ["Add products and barcodes", "Turn on stock tracking for inventory items", "Set receipt and VAT details"],
    terminalToggles: ["Fast checkout", "Barcode scanner", "Customer display"],
    inventoryDefaults: ["Track resale products", "Use reorder points", "Review inventory health"],
    receiptLabels: ["Walk-in sale", "Retail receipt"],
    helpAnchors: ["sales-and-checkout-create-a-sale", "management-manage-products-and-inventory"],
  },
  {
    preset: "PHARMACY",
    label: "Pharmacy",
    fitStatus: "supported_with_setup",
    description: "Drugstores and pharmacy-style retail that need prescription flags, batches, expiry, and FEFO review.",
    setupSteps: ["Add generic and brand names", "Capture batch and expiry during receiving", "Review prescription verification"],
    terminalToggles: ["Prescription warnings", "Batch/expiry stock", "Supplier receiving"],
    inventoryDefaults: ["Use stock lots", "Set shelf locations", "Block expired or quarantined lots"],
    receiptLabels: ["Prescription ref", "Pharmacist verification"],
    helpAnchors: ["management-use-supplier-and-purchase-order-pages", "management-manage-products-and-inventory"],
  },
  {
    preset: "RESTAURANT",
    label: "Restaurant",
    fitStatus: "supported_with_setup",
    description: "Cafe, food kiosk, quick-service, takeout, delivery, and dine-in workflows.",
    setupSteps: ["Enable restaurant features", "Set fulfillment types", "Review open tickets and kitchen flow"],
    terminalToggles: ["Fulfillment picker", "Table service", "Product modifiers", "Kitchen tickets"],
    inventoryDefaults: ["Use non-stock menu services where needed", "Track ingredients as products", "Review modifiers"],
    receiptLabels: ["Table", "Guest count", "Kitchen station", "Service charge"],
    helpAnchors: ["management-use-kitchen-workflow", "sales-and-checkout-create-a-sale"],
  },
  {
    preset: "SERVICE",
    label: "Service",
    fitStatus: "supported_with_setup",
    description: "Salons, clinics, consulting counters, cleaning services, and fee-based work.",
    setupSteps: ["Mark service products as non-stock/service", "Create service bookings", "Link final checkout to the customer"],
    terminalToggles: ["Non-stock service sale", "Booking calendar", "Staff assignment"],
    inventoryDefaults: ["Disable stock warnings for service items", "Use duration and deposit fields"],
    receiptLabels: ["Service", "Staff", "Booking"],
    helpAnchors: ["getting-started-use-business-fit-workflows", "sales-and-checkout-create-a-sale"],
  },
  {
    preset: "REPAIR",
    label: "Repair",
    fitStatus: "supported_with_setup",
    description: "Phone, appliance, tailoring, computer, watch, bike, and other job-order counters.",
    setupSteps: ["Create repair intake records", "Track parts separately from labor", "Print or share claim details"],
    terminalToggles: ["Job intake", "Parts usage", "Warranty comeback"],
    inventoryDefaults: ["Deduct parts only when used", "Keep serial or IMEI references", "Track warranty until dates"],
    receiptLabels: ["Job number", "Claim stub", "Warranty until"],
    helpAnchors: ["getting-started-use-business-fit-workflows", "management-manage-products-and-inventory"],
  },
  {
    preset: "WHOLESALE",
    label: "Wholesale",
    fitStatus: "supported_with_setup",
    description: "B2B sellers, distributors, suppliers selling to stores, and bulk-order retailers.",
    setupSteps: ["Assign customer account types", "Set payment terms and credit limits", "Create sales orders before invoice"],
    terminalToggles: ["Customer terms", "Bulk order", "Delivery note"],
    inventoryDefaults: ["Use product units for case/pack pricing", "Review customer balances", "Monitor open orders"],
    receiptLabels: ["Terms", "Due date", "Delivery note"],
    helpAnchors: ["getting-started-use-business-fit-workflows", "management-manage-customers-loyalty-and-debts"],
  },
  {
    preset: "APPAREL",
    label: "Apparel",
    fitStatus: "advanced_setup",
    description: "Clothing, shoes, and accessories with sizes, colors, and variants.",
    setupSteps: ["Create variant options", "Use barcodes per variant", "Review variant stock"],
    terminalToggles: ["Variant selection", "Barcode per variant", "Returns by exact item"],
    inventoryDefaults: ["Track size/color variants", "Separate display stock from storage stock"],
    receiptLabels: ["Size", "Color", "Variant"],
    helpAnchors: ["getting-started-use-variants-units-serials-and-bundles", "management-manage-products-and-inventory"],
  },
  {
    preset: "HARDWARE",
    label: "Hardware",
    fitStatus: "advanced_setup",
    description: "Hardware, construction, packaging, and goods sold by piece, pack, meter, kilo, or liter.",
    setupSteps: ["Define unit conversions", "Set pack/case pricing", "Keep base stock units consistent"],
    terminalToggles: ["Unit picker", "Bulk quantity entry", "Stock conversion"],
    inventoryDefaults: ["Use base units", "Add sale units", "Review movement by base quantity"],
    receiptLabels: ["Unit", "Base qty", "Case/pack"],
    helpAnchors: ["getting-started-use-variants-units-serials-and-bundles", "management-manage-products-and-inventory"],
  },
  {
    preset: "SERIALIZED_GOODS",
    label: "Serialized Goods",
    fitStatus: "advanced_setup",
    description: "Electronics, mobile accessories, warranty items, and high-value products with serial or IMEI tracking.",
    setupSteps: ["Record serial or IMEI numbers", "Assign serials during sale", "Track warranty exposure"],
    terminalToggles: ["Serial selection", "Warranty lookup", "High-value audit"],
    inventoryDefaults: ["Use serialized tracking mode", "Keep serial status current", "Link sold serials to customers"],
    receiptLabels: ["Serial", "IMEI", "Warranty until"],
    helpAnchors: ["getting-started-use-variants-units-serials-and-bundles", "management-manage-products-and-inventory"],
  },
];

export function getBusinessFitPresetGuide(preset: BusinessTypePresetDTO) {
  return businessFitPresetGuides.find((guide) => guide.preset === preset);
}

export function formatBusinessTypePreset(preset: BusinessTypePresetDTO | null | undefined) {
  if (!preset) return "Inherit company preset";
  return getBusinessFitPresetGuide(preset)?.label ?? preset.replaceAll("_", " ");
}
