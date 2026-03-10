import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FarmRecord, ScanEvent, ScanStats, UserRole } from "../backend.d";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

// Candid represents optional Text as [] | [string].
// The bindgen wrapper doesn't convert these for FarmRecord, so we do it here.
function optToCandid(val: string | null): [] | [string] {
  return val != null && val !== "" ? [val] : [];
}

function optFromCandid(
  val: [] | [string] | string | null | undefined,
): string | null {
  if (val == null) return null;
  if (Array.isArray(val)) return val.length > 0 ? (val[0] as string) : null;
  return val as string;
}

function farmRecordToCandid(record: FarmRecord): unknown {
  return {
    ...record,
    varieties: optToCandid(record.varieties),
    farmSize: optToCandid(record.farmSize),
    coffeeTreeCount: optToCandid(record.coffeeTreeCount),
    shadeTreePct: optToCandid(record.shadeTreePct),
  };
}

function farmRecordFromCandid(raw: unknown): FarmRecord {
  const r = raw as Record<string, unknown>;
  return {
    farmerName: r.farmerName as string,
    corporateName: r.corporateName as string,
    phoneNumber: r.phoneNumber as string,
    commodity: r.commodity as string,
    grade: r.grade as string,
    adminArea: r.adminArea as string,
    latitude: r.latitude as number,
    longitude: r.longitude as number,
    createdAt: r.createdAt as bigint,
    varieties: optFromCandid(r.varieties as [] | [string] | null),
    farmSize: optFromCandid(r.farmSize as [] | [string] | null),
    coffeeTreeCount: optFromCandid(r.coffeeTreeCount as [] | [string] | null),
    shadeTreePct: optFromCandid(r.shadeTreePct as [] | [string] | null),
  };
}

export function useGetFarmRecord(farmId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<FarmRecord>({
    queryKey: ["farmRecord", farmId],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      const raw = await actor.getFarmRecord(farmId);
      return farmRecordFromCandid(raw);
    },
    enabled: !!actor && !isFetching && !!farmId,
    retry: 1,
  });
}

export function useGetAllFarmRecords() {
  const { actor, isFetching } = useActor();
  return useQuery<FarmRecord[]>({
    queryKey: ["allFarmRecords"],
    queryFn: async () => {
      if (!actor) return [];
      const records = await actor.getAllFarmRecords();
      return records.map(farmRecordFromCandid);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetAllScanStats() {
  const { actor, isFetching } = useActor();
  return useQuery<ScanEvent[]>({
    queryKey: ["allScanStats"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllScanStats();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetFarmScanStats(farmId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<ScanStats>({
    queryKey: ["farmScanStats", farmId],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getFarmScanStats(farmId);
    },
    enabled: !!actor && !isFetching && !!farmId,
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isCallerAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddFarmRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      farmId,
      record,
    }: { farmId: string; record: FarmRecord }) => {
      if (!actor) throw new Error("Actor not available");
      // Convert optional fields to Candid [] | [string] format before sending
      const candidRecord = farmRecordToCandid(record);
      return actor.addFarmRecord(farmId, candidRecord as FarmRecord);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allFarmRecords"] });
    },
  });
}

export function useLogScan() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      farmId,
      userAgent,
    }: { farmId: string; userAgent: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.logScan(farmId, userAgent);
    },
  });
}

export function useAssignSelfAsAdmin() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      if (!identity) throw new Error("Not authenticated");
      const principal = identity.getPrincipal();
      return actor.assignCallerUserRole(
        principal,
        "admin" as unknown as UserRole,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isCallerAdmin"] });
    },
  });
}

export function useGetQrLogoUrl() {
  const { actor, isFetching } = useActor();
  return useQuery<string>({
    queryKey: ["qrLogoUrl"],
    queryFn: async () => {
      if (!actor) return "";
      return (actor as any).getQrLogoUrl();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetQrLogoUrl() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (url: string) => {
      if (!actor) throw new Error("Actor not available");
      return (actor as any).setQrLogoUrl(url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qrLogoUrl"] });
    },
  });
}
