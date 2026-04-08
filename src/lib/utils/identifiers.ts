import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Generate the next task identifier for a project.
 * Format: "{PREFIX}-{seq}" e.g. "PRODUCT-479"
 */
export async function generateIdentifier(
  supabase: SupabaseClient,
  projectId: string,
  prefix: string
): Promise<string> {
  // Find the highest existing sequence number for this project
  const { data } = await supabase
    .from('tasks')
    .select('identifier')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1);

  let nextSeq = 1;

  if (data && data.length > 0) {
    const lastIdentifier = data[0].identifier;
    const parts = lastIdentifier.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `${prefix}-${nextSeq}`;
}
