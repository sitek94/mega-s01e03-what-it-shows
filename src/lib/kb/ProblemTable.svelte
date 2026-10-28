<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { issueUrl, PROBLEMS, splitTicket } from '#lib/kb/problems';

  let { ticket }: { ticket: number } = $props();

  const split = $derived(splitTicket(reports as Report[], ticket, tenantOf, notes.oneDayMove));
  const rows = (reports as Report[]).length;
  const problems = $derived(split.groups.filter((g) => g.problem !== 'unplaced').length);
  const list = (n: Record<string, number>) =>
    Object.entries(n)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ×${v}`)
      .join(' · ');
</script>

<p class="sum">
  <strong>{split.merged.length}</strong> reports merged into #{ticket}
  ({rows - split.merged.length} export rows were repeats or belong elsewhere) ·
  <strong>{problems}</strong>
  {problems === 1 ? 'problem' : 'problems'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tenants</th><th>channels</th><th>intake tagged as</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each split.groups as g (g.problem)}
      {@const p = PROBLEMS[g.problem]}
      <tr class:open={p.issue === null}>
        <td>{p.title}</td>
        <td>{g.reports.length}{#if g.alsoIn.length}<span class="small"> · also in {g.alsoIn.join(', ')}</span>{/if}</td>
        <td>{g.tenants}</td>
        <td class="small">{list(g.channels)}</td>
        <td class="small">{list(g.taggedAs)}</td>
        <td class="small">{g.firstSeen} → {g.lastSeen}</td>
        <td>{#if p.issue}<a href={issueUrl(p.issue)}>#{p.issue}</a>{:else}needs triage{/if}</td>
      </tr>
    {/each}
  </tbody>
</table>

{#each split.groups.filter((g) => g.alsoIn.length) as g (g.problem)}
  <p class="small">
    The {g.reports.length} {g.problem} reports are counted twice: in their own row, and under
    <code>{g.alsoIn.join(', ')}</code>, where the desk files them by tenant, as its own view
    (CauseTable on #{ticket}) counts them.
  </p>
{/each}

<style>
  .sum { font-size: 1.1rem; }
  .small { color: var(--muted); font-size: 0.85em; }
  .open td { background: var(--warn-bg); }
</style>
