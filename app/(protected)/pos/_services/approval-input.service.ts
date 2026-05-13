export type ApprovalInputMethod = "pin" | "barcode_badge" | "nfc_tap";

export interface ApprovalInputStrategyDto {
  method: ApprovalInputMethod;
  label: string;
  enabled: boolean;
  status: "ready" | "prepared" | "unsupported";
  description: string;
}

export function getApprovalInputStrategies(input: {
  barcodeBadgeEnabled?: boolean;
  nfcSupported?: boolean;
}): ApprovalInputStrategyDto[] {
  return [
    {
      method: "pin",
      label: "PIN",
      enabled: true,
      status: "ready",
      description: "Current online and offline manager approval method.",
    },
    {
      method: "barcode_badge",
      label: "Badge",
      enabled: input.barcodeBadgeEnabled === true,
      status: input.barcodeBadgeEnabled ? "ready" : "prepared",
      description: "Prepared for manager badge or card barcode approval.",
    },
    {
      method: "nfc_tap",
      label: "RFID/NFC",
      enabled: false,
      status: input.nfcSupported ? "prepared" : "unsupported",
      description: input.nfcSupported
        ? "NFC capability is detectable; authorization mapping is not enabled yet."
        : "Prepared for a future native NFC/RFID provider.",
    },
  ];
}
