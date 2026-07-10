export interface DonationAccountDto {
  id: string;
  label: string | null;
  providerName: string | null;
  accountHolder: string | null;
  accountDetail: string | null;
  imageUrl: string | null;
  notes: string | null;
  enabled: boolean;
  displayOrder: number;
}

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
  donationAccounts: DonationAccountDto[];
}
