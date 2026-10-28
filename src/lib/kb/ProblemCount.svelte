<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { splitTicket, type Problem } from '#lib/kb/problems';

  // Inline count for prose: <ProblemCount ticket={4471} problem="hint" />; no problem → the whole ticket.
  let { ticket, problem }: { ticket: number; problem?: Problem } = $props();

  const split = $derived(splitTicket(reports as Report[], ticket, tenantOf, notes.oneDayMove));
  const n = $derived(
    problem ? (split.groups.find((g) => g.problem === problem)?.reports.length ?? 0) : split.merged.length,
  );
</script>

<strong>{n}</strong>
