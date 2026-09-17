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
      setMessage('Selecciona la organización que recibirá la relación.')
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
    setMessage('Relación enviada. La organización receptora debe aceptarla.')
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="font-heading text-sm uppercase tracking-[.2em] text-[#70b719]">Jerarquía institucional</p><h2 className="mt-1 font-heading text-2xl font-black uppercase text-[#081522]">Relacionar organización</h2><p className="mt-2 text-sm text-slate-600">El vínculo queda pendiente hasta que la organización inferior lo acepte.</p></div><Link2 className="shrink-0 text-[#70b719]" size={22} /></div><div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"><label className="block text-sm font-bold text-[#17212b]">Organización receptora<select value={targetOrganizationId} onChange={(event) => setTargetOrganizationId(event.target.value)} className="mt-2 w-full cursor-pointer rounded-xl border border-slate-300 px-4 py-3"><option value="">Seleccionar organización</option>{organizations.filter((organization) => organization.id !== sourceOrganizationId).map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label><label className="block text-sm font-bold text-[#17212b]">Relación<select value={relationshipType} onChange={(event) => setRelationshipType(event.target.value as keyof typeof relationshipLabels)} className="mt-2 w-full cursor-pointer rounded-xl border border-slate-300 px-4 py-3">{Object.entries(relationshipLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="button" onClick={() => void sendRelationship()} disabled={loading} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#b4ff45] px-5 py-3 font-bold text-[#081522] disabled:cursor-wait disabled:opacity-60"><Building2 size={17} />{loading ? 'Enviando...' : 'Enviar'}</button></div>{message && <p role="status" className="mt-4 rounded-xl bg-[#081522] px-4 py-3 text-sm font-semibold text-white">{message}</p>}</section>
}
