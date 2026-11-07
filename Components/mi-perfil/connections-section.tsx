'use client'

import { useEffect, useState } from 'react'
import { BellRing, Mail, Smartphone } from 'lucide-react'
import { FcGoogle } from 'react-icons/fc'
import { PiMicrosoftOutlookLogo } from 'react-icons/pi'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { loadAccountPlan, planFlag } from '../../lib/account-plans'
import { Badge, Button } from '../mi-equipo/ui'
import { Card, CardRow, Hint, RowList, SaveStatus, Segmented, SettingRow, useSaveStatus } from './ui'

type Channel = 'app' | 'app_email'

const channelOptions: Array<{ value: Channel; label: string; icon: typeof Smartphone }> = [
  { value: 'app', label: 'Solo en la app', icon: Smartphone },
  { value: 'app_email', label: 'App y correo', icon: Mail },
]

const providers = [
  { id: 'google', name: 'Google Calendar', description: 'Tus actividades y eventos de equipo en tu calendario de Google.', Icon: FcGoogle },
  { id: 'outlook', name: 'Outlook', description: 'Tus actividades y eventos de equipo en tu calendario de Outlook.', Icon: PiMicrosoftOutlookLogo },
]

// Mi perfil · Conexiones: calendarios externos (Google y Outlook) y cómo le llegan los avisos a la persona.
export function ConnectionsSection() {
  const [channel, setChannel] = useState<Channel>('app')
  const [syncAllowed, setSyncAllowed] = useState<boolean | null>(null)
  const status = useSaveStatus()

  useEffect(() => {
    let active = true
    async function load() {
      if (!supabase) return
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      const [{ data: prefs }, plan] = await Promise.all([
        supabase.from('account_preferences').select('notification_channel').eq('user_id', data.user.id).maybeSingle(),
        loadAccountPlan('persona', data.user.id).catch(() => null),
      ])
      if (!active) return
      if (prefs?.notification_channel === 'app_email') setChannel('app_email')
      setSyncAllowed(planFlag(plan, 'calendario_pro'))
    }
    void load()
    return () => { active = false }
  }, [])

  async function changeChannel(next: Channel) {
    const previous = channel
    setChannel(next)
    const failure = await status.run(async () => {
      if (!supabase) return 'Supabase no está configurado.'
      const { data } = await supabase.auth.getUser()
      if (!data.user) return 'Inicia sesión para guardar tus preferencias.'
      const { error } = await supabase.from('account_preferences').upsert({ user_id: data.user.id, notification_channel: next, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      return error?.message ?? ''
    })
    if (failure) setChannel(previous)
  }

  return (
    <CardRow>
      <Card title="Calendarios" description="Conecta tu calendario para ver tus actividades de AthlonX junto a las tuyas.">
        <RowList>
          {providers.map(({ id, name, description, Icon }) => (
            <div key={id} className="flex flex-wrap items-center gap-3.5 py-3.5">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] text-[22px] text-[#0a64d8]"><Icon /></span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--ax-text)]">{name}<Badge>No conectado</Badge></p>
                <p className="mt-0.5 text-[13px] leading-[18px] text-[var(--ax-muted)]">{description}</p>
              </div>
              {syncAllowed === false
                ? <Link href="/planes#personas" className="text-[13px] font-semibold text-[var(--ax-accent-text)] underline-offset-4 hover:underline">Disponible en Pro</Link>
                : <Button variant="secondary" disabled>{id === 'google' ? 'Conectar' : 'Próximamente'}</Button>}
            </div>
          ))}
        </RowList>
        <Hint>La conexión con Google se habilita cuando la aplicación quede verificada por Google. Outlook llegará después.</Hint>
      </Card>

      <Card title="Avisos" description="Elige por dónde te llegan los avisos de tus calendarios, convocatorias y equipos." action={<SaveStatus state={status.state} />}>
        <RowList>
          <SettingRow
            title="Recibir avisos"
            description={channel === 'app' ? 'Solo dentro de AthlonX (campana de notificaciones).' : 'Dentro de AthlonX y una copia a tu correo.'}
            right={<Segmented<Channel> label="Canal de avisos" options={channelOptions} value={channel} onChange={(value) => void changeChannel(value)} />}
          />
        </RowList>
        <Hint icon={BellRing}>Los avisos dentro de la app siempre están activos. El correo se envía a tu correo de acceso, no depende de conectar Google.</Hint>
      </Card>
    </CardRow>
  )
}
