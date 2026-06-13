# Stratos App Integration — Implementation Steps

Derived from `prd.txt` (App Ecosystem & Live Telemetry). Steps are ordered by dependency: build the pipeline before the views that consume it. Each phase ends at an acceptance gate tied to the PRD KPIs.

**PRD KPIs (global acceptance gates):**
- **Latency:** live telemetry renders on the app within **< 200 ms** of sensor capture over BLE.
- **Power:** background sync uses **< 3 %** of phone battery per 24 h.
- **Integrity:** **zero** data points dropped during offline backfill from device flash.

---

## Phase A — Data Architecture & Telemetry Pipeline
*(PRD §1 — foundation; everything else depends on it)*

1. Define the telemetry data model: one reading = `{ts, temp, pressure, humidity, uv, altitude, deviceId}`; version the schema.
2. Implement the **BLE transport**: device discovery, pairing, GATT service/characteristics for the 5-sensor stream.
3. Add a **Wi-Fi fallback transport** with the same payload contract, so the app is transport-agnostic.
4. Implement **dual refresh modes**: high-frequency (5 s) and low-power (10 min); expose a toggle and auto-switch on rapid pressure deltas.
5. Build the **on-device ring buffer** spec (what the device caches when off-grid) and the app-side store to receive it.
6. Implement **offline backfill/sync**: on reconnect, pull cached readings, de-dupe by `ts`, and merge in order.
7. **Gate A:** prove BLE capture→render < 200 ms, and a forced offline→reconnect cycle backfills with zero dropped points.

## Phase B — Live Metrics & Dashboard
*(PRD §2 — primary UI, consumes Phase A)*

8. Build the dashboard shell with glanceable cards for the 5 core metrics (temp, pressure, humidity, UV, altitude).
9. Wire each card to the live store with smooth interpolation between updates (no jumpy values).
10. Implement the **Microclimate Delta**: fetch regional data from a public weather API, diff against Stratos-local readings, show the gap.
11. Render the **AI 12-hour forecast** trend line + plain-language readout (e.g. "78% rain in 40 min").
12. Add interactive history (pinch/scroll time range) backed by the synced buffer.
13. **Gate B:** dashboard stays smooth at the 5 s refresh; delta + forecast render from real (or simulated) device data.

## Phase C — Hardware Usage & Device Health
*(PRD §3 — device transparency)*

14. **Battery analytics:** show % remaining, estimated days left from current usage pattern, and charge-cycle health.
15. **Storage monitor:** show device flash usage of offline logs (e.g. "45% full") with a clear/export action.
16. **Sensor calibration matrix:** per-sensor nominal/needs-recalibration status with a guided recalibration flow.
17. **Gate C:** health values reflect real device state and update on reconnect.

## Phase D — Technical Specifications Reference
*(PRD §4 — info architecture / troubleshooting)*

18. **Hardware ledger:** in-app spec sheet — sensor models, tolerances, operating ranges (e.g. pressure 300–1100 hPa).
19. **Firmware versioning:** show current version + "Check for OTA Updates" action; define the OTA check/apply flow.
20. **Gate D:** spec sheet is reachable from troubleshooting; OTA check returns a real status.

## Phase E — Cost, Billing & API Accounting
*(PRD §5 — commercial layer; last, optional per business model)*

21. **API credit consumption:** meter third-party cellular/satellite weather-data tokens used for off-grid cloud pulls.
22. **Premium tiers:** subscription management surface (e.g. "Stratos Pro Advanced AI Models") if freemium applies.
23. **Data-export accounting:** track server compute for heavy CSV/JSON exports of historic trail logs.
24. **Gate E:** usage meters increment correctly; a paid action is gated behind tier check.

---

## Build order summary
A → B → C → D → E. A is blocking; B is the core user value; C/D are transparency/support; E ships only if the business model needs it.

## Suggested first slice (MVP)
Steps 1–4, 8–9, 11 — a live dashboard showing the 5 core metrics + AI forecast over BLE. That alone proves the latency KPI and delivers the headline "the weather, wherever you are" promise.
