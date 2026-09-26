'use client'

import { Building2, Link2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

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

  return <section className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5"><div><p className="font-heading text-sm uppercase tracking-[.2em] text-[#b4ff45]">Jerarquía institucional</p><h2 className="mt-2 font-heading text-3xl font-black uppercase">Agregar organización subordinada</h2><p className="mt-2 text-sm text-slate-400">La invitación se envía a la organización receptora. Cuando la acepte, quedará debajo de esta organización y toda su jerarquía será heredada.</p></div><Link2 className="shrink-0 text-[#b4ff45]" size={25} /></div><div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"><label className="block text-sm font-bold text-white">Organización subordinada<select value={targetOrganizationId} onChange={(event) => setTargetOrganizationId(event.target.value)} className="mt-2 w-full cursor-pointer rounded-[5px] border border-[#31556b] bg-[#07131e] px-4 py-3 text-white"><option value="">Seleccionar organización</option>{organizations.filter((organization) => organization.id !== sourceOrganizationId).map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label><label className="block text-sm font-bold text-white">Tipo de relación<select value={relationshipType} onChange={(event) => setRelationshipType(event.target.value as keyof typeof relationshipLabels)} className="mt-2 w-full cursor-pointer rounded-[5px] border border-[#31556b] bg-[#07131e] px-4 py-3 text-white">{Object.entries(relationshipLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="button" onClick={() => void sendRelationship()} disabled={loading} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[5px] bg-[#b4ff45] px-5 py-3 font-bold text-[#07131e] disabled:cursor-wait disabled:opacity-60"><Building2 size={17} />{loading ? 'Enviando...' : 'Enviar invitación'}</button></div>{message && <p role="status" className="mt-4 rounded-[5px] bg-[#07131e] px-4 py-3 text-sm font-semibold text-slate-200">{message}</p>}</section>
}
