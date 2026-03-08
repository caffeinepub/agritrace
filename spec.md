# AgriTrace

## Current State
Full-stack agricultural traceability app for coffee farms. Farmers can register their farm, generate a QR code, and anyone who scans it sees the traceability page. Admin dashboard shows farm records, map, and scan analytics.

Current FarmRecord fields: farmerName, corporateName, phoneNumber, commodity (coffee species), grade (Standard/Special — 2 buttons), adminArea, latitude, longitude, createdAt.

Backend compile error: `Int` module not imported but `Int.compare` is used in `ScanEvent.compareByTimestamp`.

## Requested Changes (Diff)

### Add
- `mount` field (Text) to FarmRecord — text input placed below `adminArea` in the registration form and displayed on traceability page
- `scoring` field (Text, optional) to FarmRecord — shown after grade is selected
- Grade options expanded from 2 (Standard/Special) to 4 choices: Specialty, Premium, Commercial, Standard
- After selecting a grade, a "Scoring" text input appears below the grade buttons
- Fix backend compile error: add `import Int "mo:core/Int"` 

### Modify
- FarmerRegistrationPage: grade section shows 4 buttons (Specialty, Premium, Commercial, Standard); after selection show a Scoring input field; add Mount input below Administrative Area
- TraceabilityPage: display Mount and Scoring fields in the farm details card
- AdminDashboardPage: show Mount and Scoring in farm records table and QR modal if present

### Remove
- Nothing removed

## Implementation Plan
1. Generate new backend with updated FarmRecord (add `mount`, `scoring` fields; fix Int import)
2. Update FarmerRegistrationPage: 4-grade buttons, scoring input, mount input after adminArea
3. Update TraceabilityPage: render mount and scoring fields
4. Update AdminDashboardPage farm records table to show mount/scoring where relevant
5. Validate and deploy
