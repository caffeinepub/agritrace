import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface FarmRecord {
    latitude: number;
    createdAt: bigint;
    adminArea: string;
    longitude: number;
    grade: string;
    commodity: string;
    farmerName: string;
}
export interface ScanEvent {
    timestamp: bigint;
    deviceType: string;
    userAgent: string;
    farmId: string;
}
export interface ScanStats {
    scanEvents: Array<ScanEvent>;
    totalScans: bigint;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addFarmRecord(farmId: string, record: FarmRecord): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    getAllFarmRecords(): Promise<Array<FarmRecord>>;
    getAllScanStats(): Promise<Array<ScanEvent>>;
    getCallerUserRole(): Promise<UserRole>;
    getFarmRecord(farmId: string): Promise<FarmRecord>;
    getFarmScanStats(farmId: string): Promise<ScanStats>;
    isCallerAdmin(): Promise<boolean>;
    logScan(farmId: string, userAgent: string): Promise<void>;
}
