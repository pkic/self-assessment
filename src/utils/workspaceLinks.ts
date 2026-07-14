export interface WorkspaceLinkSummaryInput {
  pocId?: string;
  artifactIds?: string[];
  interviewDate?: string;
}

export interface WorkspaceLinkOptions {
  pocs: { id: string; name: string; role?: string }[];
  artifacts: { id: string; title: string }[];
}

export function summarizeWorkspaceLinks(
  progress: WorkspaceLinkSummaryInput | undefined,
  options: WorkspaceLinkOptions,
): string {
  const parts: string[] = [];

  const poc = progress?.pocId
    ? options.pocs.find((p) => p.id === progress.pocId)
    : undefined;
  if (poc) parts.push(poc.name);

  const uniqueIds = Array.from(new Set(progress?.artifactIds ?? []));
  const resolved = uniqueIds
    .map((id) => options.artifacts.find((a) => a.id === id))
    .filter((a): a is { id: string; title: string } => Boolean(a));
  if (resolved.length === 1) parts.push(resolved[0].title);
  else if (resolved.length > 1) parts.push(`${resolved.length} artifacts`);

  if (progress?.interviewDate) {
    parts.push(`interview ${progress.interviewDate}`);
  }

  return parts.length > 0 ? parts.join(" · ") : "none yet";
}
