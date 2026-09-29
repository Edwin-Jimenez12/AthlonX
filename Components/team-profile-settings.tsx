'use client'

import { Save, Settings2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { StyledSelect } from './styled-select'

type Discipline = {
  id: string
  name: string
  code: string
}

type TeamForm = {
  name: string
  description: string
  logo_url: string
  country: string
  city: string
  contact_email: string
  contact_phone: string
  website_url: string
  handle: string
  athlonx_code: string
  discipline_id: string
  is_public: boolean
}

const emptyForm: TeamForm = {
  name: '',
  description: '',
  logo_url: '',
  country: 'Panamá',
  city: '',
  contact_email: '',
  contact_phone: '',
  website_url: '',
  handle: '',
  athlonx_code: '',
  discipline_id: '',
  is_public: true,
}

export function TeamProfileSettings({ teamId }: { teamId?: string }) {
  const [form, setForm] = useState<TeamForm>(emptyForm)
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadProfile() {
      if (!supabase || !teamId) {
        setLoading(false)
        return
      }

      const [{ data: team, error: teamError }, { data: disciplineRows }] = await Promise.all([
        supabase
          .from('teams')
          .select(
            'name, description, logo_url, country, city, contact_email, contact_phone, website_url, handle, athlonx_code, discipline_id, is_public',
          )
          .eq('id', teamId)
          .maybeSingle(),
        supabase
          .from('disciplines')
          .select('id, name, code')
          .eq('is_active', true)
          .order('name'),
      ])

      setLoading(false)

      if (teamError) {
        setMessage(teamError.message)
        return
      }

      if (!team) {
        setMessage('No se encontró el perfil del equipo.')
        return
      }

      setForm({
        name: team.name || '',
        description: team.description || '',
        logo_url: team.logo_url || '',
        country: team.country || '',
        city: team.city || '',
        contact_email: team.contact_email || '',
        contact_phone: team.contact_phone || '',
        website_url: team.website_url || '',
        handle: team.handle || '',
        athlonx_code: team.athlonx_code || '',
        discipline_id: team.discipline_id || '',
        is_public: team.is_public ?? true,
      })
      setDisciplines((disciplineRows ?? []) as Discipline[])
    }

    void loadProfile()
  }, [teamId])

  function updateField<K extends keyof TeamForm>(field: K, value: TeamForm[K]) {
    setForm((current) => ({ ...current, [field]: value }))
    setMessage('')
  }

  async function saveProfile() {
    if (!supabase || !teamId) {
      setMessage('No se encontró un equipo activo para guardar los cambios.')
      return
    }

    if (!form.name.trim()) {
      setMessage('El nombre del equipo es obligatorio.')
      return
    }

    setSaving(true)
    setMessage('')

    const { error } = await supabase.rpc('update_team_profile', {
      p_team_id: teamId,
      p_name: form.name.trim(),
      p_description: form.description.trim() || null,
      p_logo_url: form.logo_url.trim() || null,
      p_country: form.country.trim() || null,
      p_city: form.city.trim() || null,
      p_contact_email: form.contact_email.trim() || null,
      p_contact_phone: form.contact_phone.trim() || null,
      p_website_url: form.website_url.trim() || null,
      p_handle: form.handle.trim() || null,
      p_discipline_id: form.discipline_id || null,
      p_is_public: form.is_public,
    })

    setSaving(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('La información del equipo se guardó correctamente.')
    window.dispatchEvent(
      new CustomEvent('athlonx-team-profile-updated', {
        detail: { teamId, name: form.name.trim(), city: form.city.trim() },
      }),
    )
  }

  return (
    <section className="rounded-3xl border border-[#1f4057] bg-[#0b1d2c] p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#1f4057] pb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">
            Cuenta de equipo
          </p>
          <h2 className="mt-2 font-display text-3xl uppercase">Información personal</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Edita la información que aparece en el perfil público del equipo.
          </p>
        </div>
        <Settings2 className="text-[#b4ff45]" size={26} />
      </div>

      {loading ? (
        <p className="mt-7 rounded-2xl border border-dashed border-[#31556b] p-5 text-sm text-slate-400">
          Cargando información del equipo...
        </p>
      ) : (
        <div className="mt-7 space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Nombre del equipo" value={form.name} onChange={(value) => updateField('name', value)} required />
            <Field label="Logo del equipo" value={form.logo_url} onChange={(value) => updateField('logo_url', value)} placeholder="URL de imagen" />
          </div>

          <label className="block text-sm font-semibold text-slate-200">
            Descripción
            <textarea
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              rows={4}
              placeholder="Describe la identidad, historia o propósito del equipo."
              className="mt-2 w-full resize-y rounded-xl border border-[#31556b] bg-[#07131e] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-[#b4ff45]"
            />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="País" value={form.country} onChange={(value) => updateField('country', value)} />
            <Field label="Ciudad" value={form.city} onChange={(value) => updateField('city', value)} />
            <Field label="Correo de contacto" value={form.contact_email} onChange={(value) => updateField('contact_email', value)} type="email" />
            <Field label="Teléfono de contacto" value={form.contact_phone} onChange={(value) => updateField('contact_phone', value)} />
            <Field label="Página web" value={form.website_url} onChange={(value) => updateField('website_url', value)} placeholder="https://..." type="url" />
            <Field label="Usuario público" value={form.handle} onChange={(value) => updateField('handle', value)} placeholder="sin espacios" />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <StyledSelect label="Disciplina" value={form.discipline_id} onChange={(value) => updateField('discipline_id', value)} options={[{ value: '', label: 'Seleccionar disciplina' }, ...disciplines.map((discipline) => ({ value: discipline.id, label: discipline.name }))]} />
            <div>
              <p className="text-sm font-semibold text-slate-200">Código AthlonX</p>
              <p className="mt-2 rounded-xl border border-[#29485d] bg-[#07131e] px-4 py-3 font-mono text-sm text-[#b4ff45]">
                {form.athlonx_code || 'Pendiente'}
              </p>
              <p className="mt-2 text-xs text-slate-500">El código se asigna automáticamente y no se edita.</p>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#29485d] bg-[#07131e] p-4 text-sm">
            <input
              type="checkbox"
              checked={form.is_public}
              onChange={(event) => updateField('is_public', event.target.checked)}
              className="mt-1 h-4 w-4 cursor-pointer accent-[#b4ff45]"
            />
            <span>
              <span className="block font-bold text-white">Mostrar equipo en la búsqueda pública</span>
              <span className="mt-1 block leading-5 text-slate-400">
                Si lo desactivas, el equipo no aparecerá en el directorio público.
              </span>
            </span>
          </label>

          <div className="flex flex-col gap-4 border-t border-[#1f4057] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">Los cambios se aplicarán al perfil del equipo.</p>
            <button
              type="button"
              onClick={() => void saveProfile()}
              disabled={loading || saving || !teamId}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#b4ff45] px-5 py-3 font-bold text-[#07131e] transition hover:bg-[#d5ff9b] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={17} />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}

      {message && (
        <p role="status" className="mt-5 rounded-xl bg-[#07131e] px-4 py-3 text-sm font-semibold text-slate-300">
          {message}
        </p>
      )}
    </section>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-slate-200">
      {label}
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-[#31556b] bg-[#07131e] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-[#b4ff45]"
      />
    </label>
  )
}
