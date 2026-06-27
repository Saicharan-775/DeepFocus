export interface Donation {
  id: string;
  name: string | null;
  email: string | null;
  amount: number;
  currency: string;
  payment_id: string | null;
  order_id: string;
  signature_verified: boolean;
  anonymous: boolean;
  message: string | null;
  created_at: string;
  status: 'pending' | 'success' | 'failed';
}

export interface DonationStats {
  totalSupporters: number;
  totalAmountRaised: number;
  latestDonation: Donation | null;
  goalAmount: number;
  goalProgress: number; // percentage
}
