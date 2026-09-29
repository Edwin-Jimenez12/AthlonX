'use client'

import { Building2, Link2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { StyledSelect } from './styled-select'

type Organization = { id: string; name: string; type: string }

const relationshipLabels = {
  supervisa: 'Supervisa',
  reconoce: 'Reconoce',
  afiliada_a: 'Afiliada a',
  avala: 'Avala',
  coordina: 'Coordina',
}

export function OrganizationRelationshipPanel({ sourceOrganizationId }: { sourceOrganizationId?: string }) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [targetOrganizationId, setTargetOrganizationId] = useState('')
  const [relationshipType, setRelationshipType] = useState<keyof typeof relationshipLabels>('supervisa')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadOrganizations() {
      if (!supabase) return
      const { data } = await supabase.from('organizations').select('id, name, type').order('name')
      setOrganizations(data ?? [])
    }
    void loadOrganizations()
  }, [])

  async function sendRelationship() {
    if (!supabase || !sourceOrganizationId || !targetOrganizationId) {
      setMessage('Selecciona la organización que quedará debajo de esta organización.')
      return
    }
    setLoading(true)
    setMessage('')
    const { error } = await supabase.rpc('create_affiliation_request', {
      p_source_organization_id: sourceOrganizationId,
      p_target_organization_id: targetOrganizationId,
      p_relationship_type: relationshipType,
    })
    setLoading(false)
    if (error) return setMessage(error.message)
    setTargetOrganizationId('')
    setMessage('Invitación enviada. La organización subordinada debe aceptarla para activar toda la jerarquía heredada.')
  }

  return <section className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5"><div><p className="font-heading text-sm uppercase tracking-[.2em] text-[#b4ff45]">Jerarquía institucional</p><h2 className="mt-2 font-heading text-3xl font-black uppercase">Agregar organización subordinada</h2><p className="mt-2 text-sm text-slate-400">La invitación se envía a la organización receptora. Cuando la acepte, quedará debajo de esta organización y toda su jerarquía será heredada.</p></div><Link2 className="shrink-0 text-[#b4ff45]" size={25} /></div><div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"><StyledSelect label="Organización subordinada" value={targetOrganizationId} onChange={setTargetOrganizationId} options={[{ value: '', label: 'Seleccionar organización' }, ...organizations.filter((organization) => organization.id !== sourceOrganizationId).map((organization) => ({ value: organization.id, label: organization.name }))]} /><StyledSelect label="Tipo de relación" value={relationshipType} onChange={(value) => setRelationshipType(value as keyof typeof relationshipLabels)} options={Object.entries(relationshipLabels).map(([value, label]) => ({ value, label }))} /><button type="button" onClick={() => void sendRelationship()} disabled={loading} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[5px] bg-[#b4ff45] px-5 py-3 font-bold text-[#07131e] disabled:cursor-wait disabled:opacity-60"><Building2 size={17} />{loading ? 'Enviando...' : 'Enviar invitación'}</button></div>{message && <p role="status" className="mt-4 rounded-[5px] bg-[#07131e] px-4 py-3 text-sm font-semibold text-slate-200">{message}</p>}</section>
}
