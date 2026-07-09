export interface SystemConfigurationDto {
  directRegistrationEnabled: boolean;
  platformBillingMode: "FREE" | "PAID";
  donationEnabled: boolean;
  donationTitle: string | null;
  donationMessage: string | null;
  donationImageUrl: string | null;
  donationProviderName: string | null;
  donationAccountHolder: string | null;
  donationAccountDetail: string | null;
  donationNotes: string | null;
}
