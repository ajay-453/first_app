import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';

// One-off seeder for the Stratos (weather_tracker) nested task list.
// GET  -> inspect version1 schema + existing top-level phases (read-only).
// POST?token=SEED_TOKEN -> idempotent insert of the nested tree.
// Remove this route after seeding.

const PHASE = 6;
const PHASE_TITLE = 'Phase 6 — Stratos App Integration';
const PHASE_DESC = 'Weather_tracker companion-app integration & live telemetry (from prd.txt).';

// Sections (level 2) and their steps (level 3), derived from prd_steps.md.
const SECTIONS: { title: string; desc: string; steps: string[] }[] = [
  {
    title: 'A. Data Architecture & Telemetry Pipeline',
    desc: 'PRD §1 — foundation; everything depends on it.',
    steps: [
      'Define telemetry data model + schema version',
      'Implement BLE transport (pairing, GATT, 5-sensor stream)',
      'Add Wi-Fi fallback transport (same payload contract)',
      'Dual refresh modes (5s high-frequency / 10min low-power)',
      'Device-side ring buffer spec + app-side store',
      'Offline backfill/sync with de-dupe by timestamp',
      'Gate A: <200ms BLE render + zero-drop offline backfill',
    ],
  },
  {
    title: 'B. Live Metrics & Dashboard',
    desc: 'PRD §2 — primary UI, consumes Phase A.',
    steps: [
      'Dashboard shell — 5 core metric cards',
      'Wire cards to live store with interpolation',
      'Microclimate Delta (regional API vs Stratos-local)',
      'AI 12-hour forecast trend line + readout',
      'Interactive history (time-range scrub)',
      'Gate B: smooth at 5s; delta + forecast render',
    ],
  },
  {
    title: 'C. Hardware Usage & Device Health',
    desc: 'PRD §3 — device transparency.',
    steps: [
      'Battery analytics (%, est. days left, cycle health)',
      'Storage monitor (flash log usage + clear/export)',
      'Sensor calibration matrix + recalibration flow',
      'Gate C: health values reflect real device state',
    ],
  },
  {
    title: 'D. Technical Specifications Reference',
    desc: 'PRD §4 — info architecture / troubleshooting.',
    steps: [
      'Hardware ledger (models, tolerances, operating ranges)',
      'Firmware versioning + OTA update check',
      'Gate D: spec sheet reachable; OTA returns status',
    ],
  },
  {
    title: 'E. Cost, Billing & API Accounting',
    desc: 'PRD §5 — commercial layer (ships if model needs it).',
    steps: [
      'API credit consumption metering (off-grid cloud pulls)',
      'Premium tiers / subscription management',
      'Data-export compute accounting',
      'Gate E: meters increment; paid action gated',
    ],
  },
];

export async function GET() {
  const client = getClient();
  try {
    await client.connect();
    const cols = await client.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns WHERE table_name='version1' ORDER BY ordinal_position`
    );
    const phases = await client.query(
      `SELECT id, phase, title, status FROM version1 WHERE parent_id IS NULL ORDER BY phase`
    );
    return NextResponse.json({ columns: cols.rows, phases: phases.rows });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'inspect failed' }, { status: 500 });
  } finally {
    await client.end().catch(() => {});
  }
}

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!process.env.SEED_TOKEN || token !== process.env.SEED_TOKEN) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const client = getClient();
  try {
    await client.connect();

    // Idempotent: bail if the Stratos phase already exists.
    const existing = await client.query(
      `SELECT id FROM version1 WHERE parent_id IS NULL AND title=$1`,
      [PHASE_TITLE]
    );
    if (existing.rows[0]) {
      return NextResponse.json({ status: 'already-seeded', phaseId: existing.rows[0].id });
    }

    await client.query('BEGIN');

    const ins = async (parentId: number | null, title: string, description: string, position: number) => {
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO version1 (phase, parent_id, title, description, status, position)
         VALUES ($1,$2,$3,$4,'pending',$5) RETURNING id`,
        [PHASE, parentId, title, description, position]
      );
      return rows[0].id;
    };

    const phaseId = await ins(null, PHASE_TITLE, PHASE_DESC, PHASE);
    let inserted = 1;
    let sectionPos = 1;
    for (const section of SECTIONS) {
      const sectionId = await ins(phaseId, section.title, section.desc, sectionPos++);
      inserted++;
      let stepPos = 1;
      for (const step of section.steps) {
        await ins(sectionId, `${sectionPos - 1}.${stepPos}  ${step}`, '', stepPos);
        stepPos++;
        inserted++;
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ status: 'seeded', phaseId, rowsInserted: inserted });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    return NextResponse.json({ error: e instanceof Error ? e.message : 'seed failed' }, { status: 500 });
  } finally {
    await client.end().catch(() => {});
  }
}
