// #4471 split by problem, counted with the desk's own view: each report stays under the cause it
// is filed under (causes.ts, as CauseTable counts it). The one-day moves the desk recorded in
// desk-notes.json are a problem of their own, so they get their own row too, while still being
// counted under the cause they are filed under.
import { groupByCause, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'one-day' | 'unplaced';

const ISSUES = 'https://github.com/sitek94/mega-s01e03-what-it-shows/issues';

export const PROBLEMS: Record<Problem, { title: string; issue: number | null }> = {
  parser: { title: 'Shared date parser reads day-first dates month first', issue: 1 },
  hint: { title: 'booking-v3 form: date hint says MM/DD but the field reads day first', issue: 2 },
  'one-day': { title: 'Invite date moves by one day (not a day/month swap)', issue: 3 },
  unplaced: { title: 'Tenant not on file or not day-first: no cause yet', issue: null },
};

export const issueUrl = (n: number) => `${ISSUES}/${n}`;

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  // Problems these reports are also counted under (the cause the desk files them under).
  alsoIn: Problem[];
  tenants: number;
  channels: Record<string, number>;
  taggedAs: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

const tally = (rs: Report[], key: (r: Report) => string) =>
  rs.reduce<Record<string, number>>((n, r) => ({ ...n, [key(r)]: (n[key(r)] ?? 0) + 1 }), {});

function group(problem: Problem, rs: Report[], alsoIn: Problem[]): ProblemGroup {
  const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
  return {
    problem,
    reports: rs,
    alsoIn,
    tenants: new Set(rs.map((r) => r.tenant)).size,
    channels: tally(rs, (r) => r.channel),
    taggedAs: tally(rs, (r) => r.meta.intakeTag),
    firstSeen: days[0],
    lastSeen: days[days.length - 1],
  };
}

// Unique reports merged into the ticket: one group per cause as the desk files them, largest
// first, then the one-day moves.
export function splitTicket(
  reports: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): { merged: Report[]; groups: ProblemGroup[] } {
  const merged = uniqueById(reports).filter((r) => r.mergedInto === ticket);
  const byCause = groupByCause(merged, tenantOf);
  const groups = byCause.map((g) => group(g.cause, g.reports, []));
  const moved = merged.filter((r) => oneDayMove.includes(r.id));
  if (moved.length) {
    const filedUnder = byCause.filter((g) => g.reports.some((r) => oneDayMove.includes(r.id))).map((g) => g.cause);
    groups.push(group('one-day', moved, filedUnder));
  }
  return { merged, groups };
}
