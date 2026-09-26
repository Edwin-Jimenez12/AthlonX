import { supabase } from './supabase'

export async function loadOrganizationScope(rootOrganizationId: string) {
  if (!supabase || !rootOrganizationId) return { ids: rootOrganizationId ? [rootOrganizationId] : [], error: null }
  const { data, error } = await supabase.rpc('get_organization_hierarchy', { p_root_organization_id: rootOrganizationId })
  if (error) return { ids: [rootOrganizationId], error }
  const ids = Array.from(new Set(((data ?? []) as { organization_id: string }[]).map((node) => node.organization_id)))
  return { ids: ids.length ? ids : [rootOrganizationId], error: null }
}
