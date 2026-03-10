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
    corporateName: string;
    adminArea: string;
    longitude: number;
    grade: string;
    phoneNumber: string;
    commodity: string;
    farmerName: string;
    varieties: string | null;
    farmSize: string | null;
    coffeeTreeCount: string | null;
    shadeTreePct: string | null;
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
export interface UserProfile {
    name: string;
    email: string;
    organization: string;
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
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getFarmRecord(farmId: string): Promise<FarmRecord>;
    getFarmScanStats(farmId: string): Promise<ScanStats>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    logScan(farmId: string, userAgent: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
}
