// #4471 split by problem. A cause (causes.ts) says where a report's date went wrong by tenant and
// channel; a problem is what the fix has to change. The one-day moves the desk recorded in
// desk-notes.json are not a day/month swap, so they leave the cause they are filed under.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'one-day' | 'unplaced';

const ISSUES = 'https://github.com/sitek94/mega-s01e03-what-it-shows/issues';

export const PROBLEMS: Record<Problem, { title: string; issue: number | null }> = {
  parser: { title: 'Shared date parser reads day-first dates month first', issue: 1 },
  hint: { title: 'booking-v3 form: date hint says MM/DD but the field reads day first', issue: 2 },
  'one-day': { title: 'Invite date moves by one day (not a day/month swap)', issue: 3 },
  unplaced: { title: 'Tenant not on file or not day-first: no cause yet', issue: null },
};

export const issueUrl = (n: number) => `${ISSUES}/${n}`;

export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem {
  if (oneDayMove.includes(r.id)) return 'one-day';
  return causeOf(r, t) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: number;
  channels: Record<string, number>;
  taggedAs: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

const tally = (rs: Report[], key: (r: Report) => string) =>
  rs.reduce<Record<string, number>>((n, r) => ({ ...n, [key(r)]: (n[key(r)] ?? 0) + 1 }), {});

// Unique reports merged into the ticket, one group per problem, largest first.
export function splitTicket(
  reports: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): { merged: Report[]; groups: ProblemGroup[] } {
  const merged = uniqueById(reports).filter((r) => r.mergedInto === ticket);
  const byProblem = new Map<Problem, Report[]>();
  for (const r of merged) {
    const p = problemOf(r, tenantOf(r), oneDayMove);
    byProblem.set(p, [...(byProblem.get(p) ?? []), r]);
  }
  const groups = [...byProblem.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        tenants: new Set(rs.map((r) => r.tenant)).size,
        channels: tally(rs, (r) => r.channel),
        taggedAs: tally(rs, (r) => r.meta.intakeTag),
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
  return { merged, groups };
}
