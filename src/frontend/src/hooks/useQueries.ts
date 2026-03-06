import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FarmRecord, ScanEvent, ScanStats, UserRole } from "../backend.d";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export function useGetFarmRecord(farmId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<FarmRecord>({
    queryKey: ["farmRecord", farmId],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getFarmRecord(farmId);
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
      return actor.getAllFarmRecords();
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
      return actor.addFarmRecord(farmId, record);
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
