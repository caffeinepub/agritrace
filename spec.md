# AgriTrace GeoTag

## Current State
App has full registration form, QR code generation, public traceability page, and admin dashboard with Farm Records, Map View, Scan Analytics, and QR Logo tabs. FarmRecord stores farmer info, coffee species, grade, variety composition, farm & tree data, and location.

## Requested Changes (Diff)

### Add
- `sequenceNumber: Nat` field to FarmRecord — auto-assigned on registration (1, 2, 3...)
- `areaCode: ?Text` field to FarmRecord — filled by admin after curation
- `farmSequenceCounter` stable var in backend for auto-increment
- `getAllFarmRecordsWithIds()` backend function returns `[(Text, FarmRecord)]` so admin can set area code by farmId
- `setFarmAreaCode(farmId, code)` admin-only backend function
- `addFarmRecord` returns `Nat` (the sequenceNumber) instead of `()`
- Member number display: below QR code on registration success page
- Member number display: next to farmer name / below grade on traceability page
- Admin: Member No. column in Farm Records table
- Admin: "Set Kode Area" button per row to assign alphabet code

### Modify
- `addFarmRecord` — auto-increments counter, assigns sequenceNumber, returns it
- `farmRecordFromCandid` / `farmRecordToCandid` in useQueries.ts — handle new fields
- `backend.d.ts` — add sequenceNumber, areaCode, new methods
- Registration success card — show member number below QR
- TraceabilityPage — show member number next to name/below grade
- AdminDashboardPage — use `getAllFarmRecordsWithIds`, add Member No. column and set area code UI

### Remove
- Nothing removed

## Implementation Plan
1. Update `main.mo` — add fields, counter, new functions, change addFarmRecord return type
2. Update `backend.d.ts` — reflect new types and methods
3. Update `useQueries.ts` — add hooks for new functions, handle new fields
4. Update `FarmerRegistrationPage.tsx` — show member number below QR after registration
5. Update `TraceabilityPage.tsx` — show member number next to name/below grade
6. Update `AdminDashboardPage.tsx` — member no. column + set area code dialog
