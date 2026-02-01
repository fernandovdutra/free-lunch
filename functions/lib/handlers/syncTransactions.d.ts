interface SyncResult {
    accountId: string;
    newTransactions: number;
    updatedTransactions: number;
    errors: string[];
}
export declare const syncTransactions: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    results: SyncResult[];
    totalNew: number;
    totalUpdated: number;
}>>;
export {};
