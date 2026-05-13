export type ScannerLifecycleState =
  | "off"
  | "ready"
  | "checking"
  | "active"
  | "denied"
  | "unsupported"
  | "error";

export const scannerStateService = {
  isEnabled(state: ScannerLifecycleState) {
    return state !== "off";
  },

  isActive(state: ScannerLifecycleState) {
    return state === "active";
  },

  getLabel(state: ScannerLifecycleState) {
    switch (state) {
      case "off":
        return "Scanner off";
      case "ready":
        return "Scanner ready";
      case "checking":
        return "Checking scanner";
      case "active":
        return "Scanner active";
      case "denied":
        return "Permission denied";
      case "unsupported":
        return "Unsupported";
      case "error":
        return "Scanner error";
    }
  },
};
