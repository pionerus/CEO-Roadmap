import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Generate the next task identifier for a project.
 * Format: "{PREFIX}-{seq}" e.g. "PRODUCT-479"
 * Finds the max existing sequence number and increments.
 */
export async function generateIdentifier(
  supabase: SupabaseClient,
  projectId: string,
  prefix: string
): Promise<string> {
  // Fetch ALL identifiers for this project to find the true max
  const { data } = await supabase
    .from('tasks')
    .select('identifier')
    .eq('project_id', projectId);

  let maxSeq = 0;

  if (data) {
    for (const row of data) {
      const match = row.identifier.match(/-(\d+)$/);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  }

  return `${prefix}-${maxSeq + 1}`;
}
