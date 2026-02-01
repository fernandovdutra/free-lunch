// Enable Banking API Types
export interface ASPSP {
  name: string;
  country: string;
  logo: string;
  bic: string;
  transaction_total_days: number;
  payment_auth_methods: AuthMethod[];
  auth_methods: AuthMethod[];
}

export interface AuthMethod {
  name: string;
  credentials: CredentialField[];
  approach: 'redirect' | 'decoupled' | 'embedded';
}

export interface CredentialField {
  name: string;
  type: 'text' | 'password' | 'select';
  values?: string[];
}

export interface AuthResponse {
  url: string;
}

export interface SessionResponse {
  session_id: string;
  accounts: AccountInfo[];
  aspsp: {
    name: string;
    country: string;
  };
  access: {
    valid_until: string;
  };
}

export interface AccountInfo {
  uid: string;
  iban: string;
  account_id: {
    iban: string;
  };
  name?: string;
  currency: string;
  identification_hash: string;
}

export interface TransactionResponse {
  transactions: EnableBankingTransaction[];
  continuation_key?: string;
}

export interface EnableBankingTransaction {
  entry_reference: string;
  transaction_amount: {
    amount: string;
    currency: string;
  };
  creditor?: {
    name?: string;
  };
  debtor?: {
    name?: string;
  };
  creditor_account?: {
    iban?: string;
  };
  debtor_account?: {
    iban?: string;
  };
  booking_date: string;
  value_date?: string;
  transaction_date?: string;
  remittance_information_unstructured?: string;
  remittance_information_unstructured_array?: string[];
  bank_transaction_code?: string;
  status: 'booked' | 'pending';
}
