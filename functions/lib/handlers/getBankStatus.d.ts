export declare const getBankStatus: import('firebase-functions/v2/https').CallableFunction<
  any,
  Promise<
    {
      id: string;
      bankName: any;
      status: any;
      accountCount: any;
      lastSync: string | null;
      consentExpiresAt: string | null;
    }[]
  >
>;
