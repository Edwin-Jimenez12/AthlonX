'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Profile = {
  full_name: string
  phone: string | null
  email_verified: boolean
  last_seen_at: string | null
}
type AffiliationLabel = { role: string; role_label: string | null; organization_name: string | null; team_name: string | null }

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [affiliations, setAffiliations] = useState<AffiliationLabel[]>([])
  const [accountType, setAccountType] = useState<'persona' | 'organizacion'>('persona')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      if (!supabase) {
        setLoading(false)
        return
      }

      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        setLoading(false)
        return
      }

      const [{ data: profileData }, { data: roleData }, { data: affiliationData }] = await Promise.all([
        supabase.from('profiles').select('full_name, phone, email_verified, last_seen_at').eq('id', data.user.id).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', data.user.id),
        supabase.from('profile_affiliation_labels').select('role, role_label, organization_name, team_name').eq('user_id', data.user.id),
      ])

      setEmail(data.user.email ?? '')
      setProfile(profileData)
      setRoles(roleData?.map(({ role }) => role) ?? [])
      setAffiliations(affiliationData ?? [])
      setAccountType(data.user.user_metadata?.account_type === 'organizacion' ? 'organizacion' : 'persona')
      if (!profileData?.full_name && data.user.user_metadata?.account_type === 'organizacion' && data.user.user_metadata?.organization_name) {
        setProfile({ full_name: data.user.user_metadata.organization_name, phone: null, email_verified: data.user.email_confirmed_at != null, last_seen_at: null })
      }
      setLoading(false)
    }

    void loadProfile()
  }, [])

  const initials = (profile?.full_name || email || 'AX')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
  const displayName = profile?.full_name || (accountType === 'organizacion' ? 'Organización pendiente' : 'Persona pendiente')

  return (
    <main className="min-h-screen bg-[#f3f6f8] px-5 py-8 lg:ml-64 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl bg-[#081522] p-8 text-white shadow-sm">
          <p className="font-heading text-sm uppercase tracking-[.28em] text-[#b4ff45]">Mi perfil</p>
          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#b4ff45] font-heading text-3xl font-black text-[#081522]">{initials}</div>
            <div>
              <h1 className="font-heading text-4xl font-black uppercase">{loading ? 'Cargando...' : displayName}</h1>
              <p className="mt-2 text-slate-300">{email || 'Correo se mostrará cuando reclames tu perfil'}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-heading text-2xl font-black uppercase text-[#081522]">Información personal</h2>
            <dl className="mt-5 space-y-4 text-slate-600">
              <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">{accountType === 'organizacion' ? 'Organización' : 'Nombre'}</dt><dd className="mt-1 font-semibold text-[#17212b]">{displayName}</dd></div>
              <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Teléfono</dt><dd className="mt-1 font-semibold text-[#17212b]">{profile?.phone || 'Sin registrar'}</dd></div>
              <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Correo verificado</dt><dd className="mt-1 font-semibold text-[#17212b]">{profile?.email_verified ? 'Sí' : 'Pendiente'}</dd></div>
            </dl>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-heading text-2xl font-black uppercase text-[#081522]">Participación</h2>
            <p className="mt-2 text-slate-500">Roles asignados por una organización.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {roles.length ? roles.map((role) => <span key={role} className="rounded-full bg-[#e9fbd0] px-4 py-2 text-sm font-bold capitalize text-[#4c8500]">{role}</span>) : <span className="text-slate-500">Sin roles asignados</span>}
            </div>
            {affiliations.length > 0 && <div className="mt-6 border-t border-slate-100 pt-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Etiquetas visibles</p><div className="mt-3 space-y-2">{affiliations.map((affiliation, index) => <div key={`${affiliation.role}-${affiliation.organization_name || affiliation.team_name}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2"><span className="font-semibold text-[#17212b]">{affiliation.role_label || affiliation.role}</span><span className="text-xs text-slate-500">{affiliation.team_name || affiliation.organization_name}</span></div>)}</div></div>}
          </article>
        </section>
      </div>
    </main>
  )
}
