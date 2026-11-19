const WRITE_COMMANDS =
  /\b(?:collect|mcollect|outputcsv|outputlookup|outputtelemetry|delete|drop|sendemail|sendalert|script|run|summaryindex|dump|export|savedsearch|modifysearchjob)\b/i;

export function normalizeSpl(spl) {
  const query = spl.trim();
  return /^(?:\||search\b)/i.test(query) ? query : `search ${query}`;
}

export function assertReadOnly(spl) {
  const match = spl.match(WRITE_COMMANDS);
  if (match) throw new Error(`Read-only mode rejects the SPL command or keyword "${match[0]}".`);
}
