'use client'

import Link from 'next/link'
import { Info } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Button, ButtonLink, Card, CardHeader, FieldLabel, Notice, PageHeader, Segment, inputClass } from '../mi-equipo/ui'
import { Chip, LimitMeter, LockedFeature, downloadCsv, printReport } from '../organizacion/plan-ui'
import { BASE_CATEGORIES, accountBalances, money, monthName, monthStart, nextMonth, openFile, shortDate, totals, uploadFile, type Division, type FinanceAccount, type Movement } from './finance-shared'
import { teamFlag, type ActiveTeam } from './team-plan'

export type FinanceTab = 'resumen' | 'movimientos' | 'cuotas' | 'presupuesto' | 'estadisticas'
const TABS: Array<[FinanceTab, string]> = [['resumen', 'Resumen'], ['movimientos', 'Movimientos'], ['cuotas', 'Cuotas'], ['presupuesto', 'Presupuesto'], ['estadisticas', 'Estadísticas']]
type Msg = { tone: 'success' | 'danger'; text: string } | null

function Tabs({ active }: { active: FinanceTab }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TABS.map(([id, label]) => (
        <Link key={id} href={`/finanzas?tab=${id}`} aria-current={active === id ? 'page' : undefined}
          className={`inline-flex h-[34px] items-center rounded-full px-3.5 text-[13px] font-medium ${active === id ? 'bg-[var(--ax-accent)] text-[var(--ax-on-accent)]' : 'border border-[var(--ax-line-strong)] text-[var(--ax-text)]'}`}>{label}</Link>
      ))}
    </div>
  )
}

function Kpis({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-[20px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-[var(--ax-muted)]">{label}</p>
          <p className="mt-1.5 font-display text-[36px] uppercase leading-none text-[var(--ax-text)]">{value}</p>
        </div>
      ))}
    </div>
  )
}

function Row({ title, sub, chip, right }: { title: string; sub?: string; chip?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t border-[var(--ax-line)] pt-3 first:border-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[var(--ax-text)]">{title}</p>
        {sub && <p className="text-xs text-[var(--ax-muted)]">{sub}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">{chip}{right}</div>
    </div>
  )
}

// Finanzas del equipo (diseño de Figma: Equipo · Free/Pro/Élite · Finanzas). Propietario, directivos y tesoreros.
export function TeamFinanceView({ ctx, tab }: { ctx: ActiveTeam; tab: FinanceTab }) {
  const team = ctx.team!
  const usage = ctx.usage
  const [access, setAccess] = useState<boolean | null>(null)
  const [accounts, setAccounts] = useState<FinanceAccount[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [divisions, setDivisions] = useState<Division[]>([])
  const [customCats, setCustomCats] = useState<Array<{ name: string; kind: string }>>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState<Msg>(null)

  const season = usage?.season
  const historyMonths = usage?.limits?.historial_meses ?? null

  async function load() {
    if (!supabase) return
    const { data: ok } = await supabase.rpc('team_finance_access', { p_team: team.id })
    setAccess(ok === true)
    if (ok !== true) return
    const [acc, mov, div, cats] = await Promise.all([
      supabase.from('team_finance_accounts').select('id, name').eq('team_id', team.id).order('created_at'),
      supabase.from('team_finance_movements').select('*').eq('team_id', team.id).order('occurred_on', { ascending: false }).order('created_at', { ascending: false }).limit(2000),
      supabase.from('team_division_catalog').select('id, name').eq('team_id', team.id).order('created_at'),
      supabase.from('team_finance_categories').select('name, kind').eq('team_id', team.id).order('name'),
    ])
    setAccounts((acc.data ?? []) as FinanceAccount[])
    const list = ((mov.data ?? []) as Movement[]).map((m) => ({ ...m, amount: Number(m.amount) }))
    setMovements(list)
    setDivisions((div.data ?? []) as Division[])
    setCustomCats((cats.data ?? []) as Array<{ name: string; kind: string }>)
    const ids = Array.from(new Set(list.map((m) => m.created_by).filter(Boolean))) as string[]
    if (ids.length) { const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', ids); setNames(Object.fromEntries(((profs ?? []) as Array<{ id: string; full_name: string | null }>).map((p) => [p.id, p.full_name ?? 'Persona']))) }
  }
  useEffect(() => { void load() }, [team.id])

  async function refresh() { await load(); await ctx.reload() }

  const thisMonth = monthStart()
  const monthMovs = movements.filter((m) => m.occurred_on >= thisMonth && m.occurred_on < nextMonth(thisMonth))
  const seasonMovs = season ? movements.filter((m) => m.occurred_on >= season.starts_on && m.occurred_on <= season.ends_on) : movements
  const categories = useMemo(() => Array.from(new Set([...BASE_CATEGORIES, ...customCats.map((c) => c.name)])), [customCats])

  const freeNotice = usage && usage.limits?.movimientos_mes != null && (
    <Notice tone={(usage.usage?.movimientos_mes ?? 0) >= (usage.limits.movimientos_mes ?? 0) ? 'warning' : 'neutral'} icon={Info} action={<ButtonLink href="/mi-perfil?seccion=cuenta&mejorar=1" variant="secondary" size="sm">Mejorar plan</ButtonLink>}>
      Plan {usage.plan}: {usage.usage?.movimientos_mes ?? 0} de {usage.limits.movimientos_mes} movimientos este mes.{historyMonths ? ` Historial de los últimos ${historyMonths} meses.` : ''}
    </Notice>
  )

  return (
    <main className="ax-v2 min-h-screen bg-transparent text-[var(--ax-text)] lg:ml-64">
      <div className="mx-auto max-w-[1184px] space-y-5 px-4 pb-16 pt-5 sm:space-y-6 sm:px-8 sm:pt-8 lg:px-10">
        <PageHeader title="Finanzas" actions={access && <Button variant="primary" aria-expanded={creating} onClick={() => setCreating((v) => !v)}>+ Nuevo movimiento</Button>} />
        {access === false && <Notice tone="neutral" icon={Info}>Las finanzas del equipo las ven el propietario, los directivos y las personas con permiso de tesorero.</Notice>}
        {access && (
          <>
            <Tabs active={tab} />
            {message && <Notice tone={message.tone} icon={Info}>{message.text}</Notice>}
            {(tab === 'resumen' || tab === 'movimientos') && freeNotice}
            {creating && <MovementForm teamId={team.id} usage={usage} accounts={accounts} divisions={divisions} categories={categories} onCancel={() => setCreating(false)} onSaved={async (text) => { setCreating(false); setMessage({ tone: 'success', text }); await refresh() }} onCategory={refresh} />}
            {tab === 'resumen' && <Resumen teamId={team.id} teamName={team.name} usage={usage} accounts={accounts} monthMovs={monthMovs} seasonMovs={seasonMovs} names={names} onChange={refresh} setMessage={setMessage} />}
            {tab === 'movimientos' && <Movimientos teamId={team.id} usage={usage} movements={movements} divisions={divisions} categories={categories} names={names} onChange={refresh} setMessage={setMessage} />}
            {tab === 'cuotas' && <Cuotas teamId={team.id} usage={usage} divisions={divisions} onChange={refresh} setMessage={setMessage} />}
            {tab === 'presupuesto' && <Presupuesto teamId={team.id} usage={usage} movements={movements} categories={categories} onChange={refresh} setMessage={setMessage} />}
            {tab === 'estadisticas' && <Estadisticas teamId={team.id} usage={usage} />}
          </>
        )}
      </div>
    </main>
  )
}

type Usage = ActiveTeam['usage']

function MovementForm({ teamId, usage, accounts, divisions, categories, onCancel, onSaved, onCategory }: { teamId: string; usage: Usage; accounts: FinanceAccount[]; divisions: Division[]; categories: string[]; onCancel: () => void; onSaved: (text: string) => void; onCategory: () => Promise<void> }) {
  const [kind, setKind] = useState<'ingreso' | 'gasto'>('ingreso')
  const [amount, setAmount] = useState('')
  const [day, setDay] = useState(new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState('Cuotas')
  const [concept, setConcept] = useState('')
  const [note, setNote] = useState('')
  const [division, setDivision] = useState('')
  const [account, setAccount] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [newCat, setNewCat] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const receipts = teamFlag(usage, 'comprobantes')
  const ownCats = teamFlag(usage, 'categorias_propias')

  async function save() {
    if (!supabase) return
    const value = Number(amount)
    if (!(value > 0)) return setError('Escribe un monto mayor que cero.')
    if (!concept.trim()) return setError('Escribe el concepto.')
    setSaving(true); setError('')
    try {
      const receipt_path = file ? await uploadFile(teamId, 'comprobantes', file) : null
      const { error: insertError } = await supabase.from('team_finance_movements').insert({ team_id: teamId, kind, amount: value, occurred_on: day, category, concept: concept.trim(), note: note.trim() || null, division_id: division || null, account_id: account || null, receipt_path })
      if (insertError) throw new Error(insertError.message)
      onSaved(kind === 'ingreso' ? 'Ingreso registrado.' : 'Gasto registrado.')
    } catch (err) { setError((err as Error).message) } finally { setSaving(false) }
  }
  async function addCategory() {
    if (!supabase || !newCat.trim()) return
    const { error: e } = await supabase.from('team_finance_categories').insert({ team_id: teamId, name: newCat.trim(), kind })
    if (e) return setError(e.message)
    setCategory(newCat.trim()); setNewCat(''); await onCategory()
  }

  return (
    <Card>
      <CardHeader id="nuevo-movimiento" title="Nuevo movimiento" actions={<Button variant="secondary" onClick={onCancel}>Cancelar</Button>} />
      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <div className="md:col-span-3"><FieldLabel>Tipo</FieldLabel><div className="flex gap-2"><Segment active={kind === 'ingreso'} label="Ingreso" onClick={() => setKind('ingreso')} /><Segment active={kind === 'gasto'} label="Gasto" onClick={() => setKind('gasto')} /></div></div>
        <label className="block"><FieldLabel>Monto</FieldLabel><input className={inputClass} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="40.00" /></label>
        <label className="block"><FieldLabel>Fecha</FieldLabel><input className={inputClass} type="date" value={day} onChange={(e) => setDay(e.target.value)} /></label>
        <label className="block"><FieldLabel>División</FieldLabel><select className={inputClass} value={division} onChange={(e) => setDivision(e.target.value)}><option value="">Todo el equipo</option>{divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <div className="md:col-span-3">
          <FieldLabel>Categoría</FieldLabel>
          <div className="flex flex-wrap gap-2">{categories.map((c) => <Segment key={c} active={category === c} label={c} onClick={() => setCategory(c)} />)}</div>
          {ownCats ? (
            <div className="mt-3 flex max-w-md gap-2"><input className={inputClass} value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Nueva categoría" /><Button variant="secondary" onClick={() => void addCategory()}>+ Crear</Button></div>
          ) : <p className="mt-2 text-xs text-[var(--ax-muted)]">Plan {usage?.plan}: categorías base. Las categorías propias son del plan Pro.</p>}
        </div>
        <label className="block md:col-span-2"><FieldLabel>Concepto</FieldLabel><input className={inputClass} value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Cuota de noviembre · Camila Vega" /></label>
        <label className="block"><FieldLabel>Caja</FieldLabel><select className={inputClass} value={account} onChange={(e) => setAccount(e.target.value)}><option value="">Sin caja</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label className="block md:col-span-3"><FieldLabel>Nota</FieldLabel><input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <div className="md:col-span-3">
          <FieldLabel>Comprobante</FieldLabel>
          {receipts ? <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm text-[var(--ax-text)]" /> : <LockedFeature label="Adjuntar comprobante (foto o PDF)" />}
        </div>
        {error && <div className="md:col-span-3"><Notice tone="danger" icon={Info}>{error}</Notice></div>}
        <div className="flex justify-end gap-2.5 md:col-span-3"><Button variant="primary" disabled={saving} onClick={() => void save()}>{saving ? 'Guardando…' : 'Guardar movimiento'}</Button></div>
      </div>
    </Card>
  )
}

function Resumen({ teamId, teamName, usage, accounts, monthMovs, seasonMovs, names, onChange, setMessage }: { teamId: string; teamName: string; usage: Usage; accounts: FinanceAccount[]; monthMovs: Movement[]; seasonMovs: Movement[]; names: Record<string, string>; onChange: () => Promise<void>; setMessage: (m: Msg) => void }) {
  const month = totals(monthMovs)
  const season = totals(seasonMovs)
  const balances = accountBalances(accounts, seasonMovs)
  const [fees, setFees] = useState<{ paid: number; total: number }>({ paid: 0, total: 0 })
  const [newAccount, setNewAccount] = useState('')
  const [transfer, setTransfer] = useState<{ from: string; to: string; amount: string } | null>(null)
  const [sponsors, setSponsors] = useState<Array<{ id: string; name: string; amount: number; period: string; ends_on: string | null; contract_path: string | null }>>([])
  const [sponsorForm, setSponsorForm] = useState<{ name: string; amount: string; period: string; ends: string; file: File | null } | null>(null)
  const reportsOn = teamFlag(usage, 'reportes')
  const sponsorsOn = teamFlag(usage, 'patrocinios')

  useEffect(() => {
    if (!supabase) return
    supabase.rpc('team_fee_board', { p_team: teamId, p_month: monthStart() }).then(({ data }) => {
      const rows = (data ?? []) as Array<{ status: string }>
      setFees({ paid: rows.filter((r) => r.status === 'pagado').length, total: rows.filter((r) => r.status !== 'exento').length })
    })
    if (sponsorsOn) supabase.from('team_finance_sponsors').select('*').eq('team_id', teamId).order('created_at').then(({ data }) => setSponsors((data ?? []) as typeof sponsors))
  }, [teamId, sponsorsOn])

  async function addAccount() {
    if (!supabase || !newAccount.trim()) return
    const { error } = await supabase.from('team_finance_accounts').insert({ team_id: teamId, name: newAccount.trim() })
    if (error) return setMessage({ tone: 'danger', text: error.message })
    setNewAccount(''); await onChange()
  }
  async function doTransfer() {
    if (!supabase || !transfer) return
    const value = Number(transfer.amount)
    const from = accounts.find((a) => a.id === transfer.from)?.name, to = accounts.find((a) => a.id === transfer.to)?.name
    const { error } = await supabase.from('team_finance_movements').insert({ team_id: teamId, kind: 'transferencia', amount: value, account_id: transfer.from, to_account_id: transfer.to, concept: `Transferencia de ${from} a ${to}` })
    if (error) return setMessage({ tone: 'danger', text: error.message })
    setTransfer(null); setMessage({ tone: 'success', text: 'Transferencia registrada.' }); await onChange()
  }
  async function saveSponsor() {
    if (!supabase || !sponsorForm) return
    try {
      const contract_path = sponsorForm.file ? await uploadFile(teamId, 'contratos', sponsorForm.file) : null
      const { error } = await supabase.from('team_finance_sponsors').insert({ team_id: teamId, name: sponsorForm.name.trim(), amount: Number(sponsorForm.amount) || 0, period: sponsorForm.period, ends_on: sponsorForm.ends || null, contract_path })
      if (error) throw new Error(error.message)
      setSponsorForm(null)
      const { data } = await supabase.from('team_finance_sponsors').select('*').eq('team_id', teamId).order('created_at'); setSponsors((data ?? []) as typeof sponsors)
    } catch (err) { setMessage({ tone: 'danger', text: (err as Error).message }) }
  }
  function report(pdf: boolean) {
    const byCat = new Map<string, { ing: number; gas: number }>()
    for (const m of seasonMovs) { if (m.kind === 'transferencia') continue; const k = m.category ?? 'Otros'; const v = byCat.get(k) ?? { ing: 0, gas: 0 }; if (m.kind === 'ingreso') v.ing += m.amount; else v.gas += m.amount; byCat.set(k, v) }
    const header = ['Categoría', 'Ingresos', 'Gastos', 'Neto']
    const rows = [...byCat.entries()].map(([k, v]) => [k, money(v.ing), money(v.gas), money(v.ing - v.gas)])
    rows.push(['Total', money(season.ingresos), money(season.gastos), money(season.saldo)])
    if (pdf) printReport(`Estado de resultados · ${teamName}`, header, rows); else downloadCsv('estado-de-resultados.csv', header, rows)
  }
  const daysLeft = (d: string | null) => d ? Math.ceil((new Date(`${d}T12:00:00`).getTime() - Date.now()) / 86400000) : null

  return (
    <>
      <Kpis items={[[`Ingresos de ${monthName(monthStart()).toLowerCase()}`, money(month.ingresos)], [`Gastos de ${monthName(monthStart()).toLowerCase()}`, money(month.gastos)], ['Saldo del mes', money(month.saldo)], ['Cuotas cobradas', `${fees.paid} de ${fees.total}`]]} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="flex flex-col gap-3">
            <CardHeader id="saldo" title="Saldo del año" />
            <p className="font-display text-[56px] leading-none text-[var(--ax-text)]">{money(season.saldo)}</p>
            {usage?.season && <p className="text-[13px] text-[var(--ax-muted)]">Del {shortDate(usage.season.starts_on)} al {shortDate(usage.season.ends_on)}</p>}
          </Card>
          <Card className="flex flex-col gap-3">
            <CardHeader id="ultimos" title="Últimos movimientos" />
            {seasonMovs.length === 0 && <p className="text-sm text-[var(--ax-muted)]">Todavía no hay movimientos.</p>}
            {seasonMovs.slice(0, 5).map((m) => (
              <Row key={m.id} title={m.concept} sub={`${shortDate(m.occurred_on)} · ${m.category ?? 'Transferencia'} · Registró ${names[m.created_by ?? ''] ?? '—'}`}
                chip={<Chip tone={m.kind === 'ingreso' ? 'accent' : m.kind === 'gasto' ? 'orange' : 'blue'}>{m.kind === 'ingreso' ? 'Ingreso' : m.kind === 'gasto' ? 'Gasto' : 'Transferencia'}</Chip>}
                right={<><span className="text-[13px] font-semibold tabular-nums text-[var(--ax-text)]">{m.kind === 'gasto' ? '−' : m.kind === 'ingreso' ? '+' : ''}{money(m.amount)}</span>{m.receipt_path && <Button size="sm" variant="secondary" onClick={() => void openFile(m.receipt_path!)}>Comprobante</Button>}</>} />
            ))}
            <div><ButtonLink href="/finanzas?tab=movimientos" variant="secondary">Ver todos los movimientos</ButtonLink></div>
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3">
            <CardHeader id="cajas" title="Cajas" />
            {accounts.length === 0 && <p className="text-sm text-[var(--ax-muted)]">Crea cajas como caja chica, banco o efectivo.</p>}
            {accounts.map((a) => <div key={a.id} className="flex justify-between text-sm"><span className="text-[var(--ax-text)]">{a.name}</span><span className="font-semibold tabular-nums text-[var(--ax-text)]">{money(balances.get(a.id))}</span></div>)}
            <div className="flex gap-2"><input className={inputClass} value={newAccount} onChange={(e) => setNewAccount(e.target.value)} placeholder="Nueva caja" /><Button variant="secondary" onClick={() => void addAccount()}>Crear</Button></div>
            {accounts.length >= 2 && !transfer && <div><Button variant="secondary" onClick={() => setTransfer({ from: accounts[0].id, to: accounts[1].id, amount: '' })}>Transferir entre cajas</Button></div>}
            {transfer && (
              <div className="flex flex-col gap-2.5 rounded-[14px] border border-[var(--ax-line)] p-3">
                <select className={inputClass} value={transfer.from} onChange={(e) => setTransfer({ ...transfer, from: e.target.value })}>{accounts.map((a) => <option key={a.id} value={a.id}>Desde {a.name}</option>)}</select>
                <select className={inputClass} value={transfer.to} onChange={(e) => setTransfer({ ...transfer, to: e.target.value })}>{accounts.map((a) => <option key={a.id} value={a.id}>Hacia {a.name}</option>)}</select>
                <input className={inputClass} inputMode="decimal" value={transfer.amount} onChange={(e) => setTransfer({ ...transfer, amount: e.target.value })} placeholder="Monto" />
                <div className="flex gap-2"><Button variant="secondary" onClick={() => setTransfer(null)}>Cancelar</Button><Button variant="primary" onClick={() => void doTransfer()}>Transferir</Button></div>
              </div>
            )}
          </Card>
          <Card className="flex flex-col gap-3">
            <CardHeader id="tesoreros" title="Tesoreros" />
            {usage && <LimitMeter label="Personas con acceso" used={usage.usage?.tesoreros ?? 0} limit={usage.limits?.tesoreros ?? null} />}
            <p className="text-[13px] text-[var(--ax-muted)]">Acceden el propietario, los directivos y las personas con permiso de tesorero. Se asignan en <Link className="font-semibold text-[var(--ax-accent-text)]" href="/mi-perfil?seccion=roles">Mi perfil › Roles</Link>.</p>
          </Card>
          <Card className="flex flex-col gap-3">
            <CardHeader id="reportes" title="Reportes" />
            {!reportsOn ? <LockedFeature label="Estado de resultados en PDF y CSV" /> : (
              <>
                <p className="text-[13px] text-[var(--ax-muted)]">Estado de resultados del año, con el logotipo del equipo.</p>
                <div className="flex flex-wrap gap-2.5"><Button variant="secondary" onClick={() => report(true)}>Descargar PDF</Button><Button variant="secondary" onClick={() => report(false)}>Descargar CSV</Button></div>
              </>
            )}
          </Card>
          <Card className="flex flex-col gap-3">
            <CardHeader id="patrocinios" title="Patrocinios" />
            {!sponsorsOn ? <LockedFeature label="Patrocinios como ingresos" /> : (
              <>
                {sponsors.map((s) => { const left = daysLeft(s.ends_on); return (
                  <Row key={s.id} title={s.name} sub={`${money(s.amount)} ${s.period === 'mensual' ? 'al mes' : s.period === 'anual' ? 'al año' : 'único'}${s.ends_on ? ` · vence el ${shortDate(s.ends_on)}` : ''}`}
                    chip={left !== null && left <= 30 ? <Chip tone="orange">{left < 0 ? 'Vencido' : `Vence en ${left} días`}</Chip> : <Chip tone="accent">Vigente</Chip>}
                    right={s.contract_path && <Button size="sm" variant="secondary" onClick={() => void openFile(s.contract_path!)}>Contrato</Button>} />
                ) })}
                {sponsorForm ? (
                  <div className="flex flex-col gap-2.5 rounded-[14px] border border-[var(--ax-line)] p-3">
                    <input className={inputClass} placeholder="Nombre" value={sponsorForm.name} onChange={(e) => setSponsorForm({ ...sponsorForm, name: e.target.value })} />
                    <input className={inputClass} placeholder="Monto" inputMode="decimal" value={sponsorForm.amount} onChange={(e) => setSponsorForm({ ...sponsorForm, amount: e.target.value })} />
                    <select className={inputClass} value={sponsorForm.period} onChange={(e) => setSponsorForm({ ...sponsorForm, period: e.target.value })}><option value="mensual">Mensual</option><option value="anual">Anual</option><option value="unico">Pago único</option></select>
                    <label className="block"><FieldLabel>Vence</FieldLabel><input type="date" className={inputClass} value={sponsorForm.ends} onChange={(e) => setSponsorForm({ ...sponsorForm, ends: e.target.value })} /></label>
                    <label className="block"><FieldLabel>Contrato (opcional)</FieldLabel><input type="file" accept="application/pdf,image/*" onChange={(e) => setSponsorForm({ ...sponsorForm, file: e.target.files?.[0] ?? null })} className="text-sm" /></label>
                    <div className="flex gap-2"><Button variant="secondary" onClick={() => setSponsorForm(null)}>Cancelar</Button><Button variant="primary" disabled={!sponsorForm.name.trim()} onClick={() => void saveSponsor()}>Guardar</Button></div>
                  </div>
                ) : <div><Button variant="secondary" onClick={() => setSponsorForm({ name: '', amount: '', period: 'mensual', ends: '', file: null })}>Agregar patrocinador</Button></div>}
              </>
            )}
          </Card>
          <Card className="flex flex-col gap-3">
            <CardHeader id="cobro" title="Cobro en línea" />
            <p className="text-[13px] text-[var(--ax-muted)]">Cobro de cuotas con tarjeta o transferencia.</p>
            <div><Chip tone="violet">Próximamente</Chip></div>
          </Card>
        </div>
      </div>
    </>
  )
}

function Movimientos({ teamId, usage, movements, divisions, categories, names, onChange, setMessage }: { teamId: string; usage: Usage; movements: Movement[]; divisions: Division[]; categories: string[]; names: Record<string, string>; onChange: () => Promise<void>; setMessage: (m: Msg) => void }) {
  const [kind, setKind] = useState<'todos' | 'ingreso' | 'gasto'>('todos')
  const [month, setMonth] = useState(monthStart().slice(0, 7))
  const [category, setCategory] = useState('')
  const [division, setDivision] = useState('')
  const [confirm, setConfirm] = useState<string | null>(null)
  const [audit, setAudit] = useState<Array<{ id: number; action: string; actor: string | null; details: Record<string, unknown>; created_at: string }>>([])
  const fullFilters = teamFlag(usage, 'comprobantes')
  const auditOn = teamFlag(usage, 'auditoria')

  useEffect(() => {
    if (!supabase || !auditOn) return
    supabase.from('team_finance_audit').select('id, action, actor, details, created_at').eq('team_id', teamId).order('created_at', { ascending: false }).limit(30).then(({ data }) => setAudit((data ?? []) as typeof audit))
  }, [teamId, auditOn, movements.length])

  const list = movements.filter((m) => m.occurred_on.startsWith(month) && (kind === 'todos' || m.kind === kind) && (!category || m.category === category) && (!division || m.division_id === division))
  const divName = (id: string | null) => divisions.find((d) => d.id === id)?.name ?? '—'

  async function remove(id: string) {
    if (!supabase) return
    const { error } = await supabase.from('team_finance_movements').delete().eq('id', id)
    if (error) return setMessage({ tone: 'danger', text: error.message })
    setConfirm(null); setMessage({ tone: 'success', text: 'Movimiento eliminado.' }); await onChange()
  }

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-2">{([['todos', 'Todos'], ['ingreso', 'Ingresos'], ['gasto', 'Gastos']] as const).map(([id, label]) => <Segment key={id} active={kind === id} label={label} onClick={() => setKind(id)} />)}</div>
        <input type="month" className={`${inputClass} w-auto`} value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Mes" />
        {fullFilters && <select className={`${inputClass} w-auto`} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoría"><option value="">Categoría: todas</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>}
        {fullFilters && <select className={`${inputClass} w-auto`} value={division} onChange={(e) => setDivision(e.target.value)} aria-label="División"><option value="">División: todas</option>{divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>}
      </div>
      <Card>
        <CardHeader id="lista" title={`Movimientos de ${monthName(`${month}-01`).toLowerCase()}`} />
        {list.length === 0 ? <p className="mt-4 text-sm text-[var(--ax-muted)]">No hay movimientos con estos filtros.</p> : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead><tr className="border-b border-[var(--ax-line)] text-[11px] uppercase tracking-[.12em] text-[var(--ax-muted)]">{['Fecha', 'Concepto', 'Categoría', 'División', 'Monto', 'Registró', 'Comprobante', ''].map((h) => <th key={h} className="py-3 pr-3 font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id} className="border-b border-[var(--ax-line)] last:border-0">
                    <td className="py-3 pr-3 font-semibold">{shortDate(m.occurred_on)}</td>
                    <td className="py-3 pr-3">{m.concept}</td>
                    <td className="py-3 pr-3 text-[var(--ax-text-secondary)]">{m.category ?? 'Transferencia'}</td>
                    <td className="py-3 pr-3 text-[var(--ax-text-secondary)]">{divName(m.division_id)}</td>
                    <td className="py-3 pr-3 font-semibold tabular-nums">{m.kind === 'gasto' ? '−' : m.kind === 'ingreso' ? '+' : ''}{money(m.amount)}</td>
                    <td className="py-3 pr-3 text-[var(--ax-text-secondary)]">{names[m.created_by ?? ''] ?? '—'}</td>
                    <td className="py-3 pr-3">{m.receipt_path ? <button type="button" className="font-semibold text-[var(--ax-accent-text)]" onClick={() => void openFile(m.receipt_path!)}>Ver</button> : '—'}</td>
                    <td className="py-3 text-right">{confirm === m.id
                      ? <span className="inline-flex gap-2"><Button size="sm" variant="secondary" onClick={() => setConfirm(null)}>No</Button><Button size="sm" variant="danger" onClick={() => void remove(m.id)}>Eliminar</Button></span>
                      : <Button size="sm" variant="ghost" onClick={() => setConfirm(m.id)}>Eliminar</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card className="flex flex-col gap-3">
        <CardHeader id="auditoria" title="Registro de cambios" />
        {!auditOn ? <LockedFeature label="Quién creó, editó o eliminó cada movimiento" plan="Élite" /> : audit.length === 0 ? <p className="text-sm text-[var(--ax-muted)]">Sin cambios registrados.</p> : audit.map((a) => (
          <Row key={a.id} title={`${names[a.actor ?? ''] ?? 'Alguien'} ${a.action === 'creado' ? 'creó' : a.action === 'editado' ? 'editó' : 'eliminó'} «${String(a.details?.concept ?? '')}»`}
            sub={`${new Date(a.created_at).toLocaleString('es-PA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · Monto: ${money(a.details?.amount as number)}`}
            chip={<Chip tone={a.action === 'creado' ? 'accent' : a.action === 'editado' ? 'blue' : 'orange'}>{a.action === 'creado' ? 'Creado' : a.action === 'editado' ? 'Editado' : 'Eliminado'}</Chip>} />
        ))}
      </Card>
    </>
  )
}

type FeeRow = { user_id: string; player_name: string; division_id: string | null; division_name: string | null; fee: number; status: 'pagado' | 'pendiente' | 'exento'; pending_months: number }

function Cuotas({ teamId, usage, divisions, onChange, setMessage }: { teamId: string; usage: Usage; divisions: Division[]; onChange: () => Promise<void>; setMessage: (m: Msg) => void }) {
  const [month, setMonth] = useState(monthStart().slice(0, 7))
  const [rows, setRows] = useState<FeeRow[]>([])
  const [general, setGeneral] = useState('')
  const [perDivision, setPerDivision] = useState<Record<string, string>>({})
  const [reminders, setReminders] = useState(true)
  const byDivision = teamFlag(usage, 'cuota_por_division')
  const monthDate = `${month}-01`

  async function load() {
    if (!supabase) return
    const { data } = await supabase.rpc('team_fee_board', { p_team: teamId, p_month: monthDate })
    setRows(((data ?? []) as FeeRow[]).map((r) => ({ ...r, fee: Number(r.fee) })))
    const { data: settings } = await supabase.from('team_fee_settings').select('division_id, amount').eq('team_id', teamId)
    const s = (settings ?? []) as Array<{ division_id: string | null; amount: number }>
    setGeneral(String(s.find((x) => !x.division_id)?.amount ?? ''))
    setPerDivision(Object.fromEntries(s.filter((x) => x.division_id).map((x) => [x.division_id!, String(x.amount)])))
    const { data: t } = await supabase.from('teams').select('fee_reminders_enabled').eq('id', teamId).maybeSingle()
    setReminders((t as { fee_reminders_enabled?: boolean } | null)?.fee_reminders_enabled ?? true)
  }
  useEffect(() => { void load() }, [teamId, month])

  async function setStatus(row: FeeRow, status: FeeRow['status']) {
    if (!supabase) return
    const { error } = await supabase.from('team_fee_payments').upsert({ team_id: teamId, user_id: row.user_id, month: monthDate, status, amount: row.fee }, { onConflict: 'team_id,user_id,month' })
    if (error) return setMessage({ tone: 'danger', text: error.message })
    if (status === 'pagado' && row.fee > 0) {
      const { error: movError } = await supabase.from('team_finance_movements').insert({ team_id: teamId, kind: 'ingreso', amount: row.fee, category: 'Cuotas', concept: `Cuota de ${monthName(monthDate).toLowerCase()} · ${row.player_name}`, division_id: row.division_id, occurred_on: new Date().toISOString().slice(0, 10) })
      if (movError) setMessage({ tone: 'danger', text: `Cuota marcada, pero el ingreso no se registró: ${movError.message}` })
      else setMessage({ tone: 'success', text: 'Cuota marcada como pagada y registrada como ingreso.' })
    }
    await load(); await onChange()
  }
  async function saveFee(divisionId: string | null, value: string) {
    if (!supabase) return
    const { error } = await supabase.from('team_fee_settings').upsert({ team_id: teamId, division_id: divisionId, amount: Number(value) || 0 }, { onConflict: 'team_id,division_id' })
    if (error) return setMessage({ tone: 'danger', text: error.message })
    setMessage({ tone: 'success', text: 'Cuota guardada.' }); await load()
  }
  async function toggleReminders(value: boolean) {
    if (!supabase) return
    setReminders(value)
    const { error } = await supabase.from('teams').update({ fee_reminders_enabled: value }).eq('id', teamId)
    if (error) { setReminders(!value); setMessage({ tone: 'danger', text: error.message }) }
  }

  const counted = rows.filter((r) => r.status !== 'exento')
  const paid = rows.filter((r) => r.status === 'pagado')
  const limit = usage?.limits?.jugadores_cuota ?? null

  return (
    <>
      <div className="flex items-end gap-3"><label className="block"><FieldLabel>Mes</FieldLabel><input type="month" className={`${inputClass} w-auto`} value={month} onChange={(e) => setMonth(e.target.value)} /></label></div>
      <Kpis items={[['Cuotas al día', `${paid.length} de ${counted.length}`], ['Pendientes', String(rows.filter((r) => r.status === 'pendiente').length)], [`Cobrado en ${monthName(monthDate).toLowerCase()}`, money(paid.reduce((s, r) => s + r.fee, 0))], ['Exentos', String(rows.filter((r) => r.status === 'exento').length)]]} />
      <Card className="flex flex-col gap-4">
        <CardHeader id="cuotas" title={`Cuotas de ${monthName(monthDate).toLowerCase()}`} />
        {limit !== null && usage && <LimitMeter label="Jugadores con cuota" used={Math.min(rows.length, usage.usage?.jugadores_cuota ?? 0)} limit={limit} />}
        {rows.length === 0 ? <p className="text-sm text-[var(--ax-muted)]">Los jugadores del equipo con cuenta en AthlonX aparecen aquí.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead><tr className="border-b border-[var(--ax-line)] text-[11px] uppercase tracking-[.12em] text-[var(--ax-muted)]">{['Jugador', 'División', 'Cuota', 'Estado', 'Meses pendientes'].map((h) => <th key={h} className="py-3 pr-3 font-semibold">{h}</th>)}</tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.user_id} className="border-b border-[var(--ax-line)] last:border-0">
                  <td className="py-3 pr-3 font-semibold">{r.player_name}</td>
                  <td className="py-3 pr-3 text-[var(--ax-text-secondary)]">{r.division_name ?? '—'}</td>
                  <td className="py-3 pr-3 tabular-nums">{money(r.fee)}</td>
                  <td className="py-3 pr-3"><div className="flex gap-1.5">{(['pagado', 'pendiente', 'exento'] as const).map((s) => <Segment key={s} active={r.status === s} label={s === 'pagado' ? 'Pagado' : s === 'pendiente' ? 'Pendiente' : 'Exento'} onClick={() => r.status !== s && void setStatus(r, s)} />)}</div></td>
                  <td className="py-3 pr-3 tabular-nums">{r.status === 'exento' ? '—' : r.pending_months}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <CardHeader id="monto" title="Cuota del equipo" />
          <div className="flex gap-2"><input className={inputClass} inputMode="decimal" value={general} onChange={(e) => setGeneral(e.target.value)} placeholder="Monto mensual" /><Button variant="secondary" onClick={() => void saveFee(null, general)}>Guardar</Button></div>
          <CardHeader id="por-division" title="Cuota por división" />
          {!byDivision ? <LockedFeature label="Monto distinto por división" /> : divisions.length === 0 ? <p className="text-sm text-[var(--ax-muted)]">El equipo no tiene divisiones.</p> : divisions.map((d) => (
            <div key={d.id} className="flex items-center gap-2"><span className="w-32 shrink-0 text-sm text-[var(--ax-text)]">{d.name}</span><input className={inputClass} inputMode="decimal" value={perDivision[d.id] ?? ''} onChange={(e) => setPerDivision({ ...perDivision, [d.id]: e.target.value })} placeholder="Usa la cuota del equipo" /><Button variant="secondary" onClick={() => void saveFee(d.id, perDivision[d.id] ?? '')}>Guardar</Button></div>
          ))}
        </Card>
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3">
            <CardHeader id="recordatorio" title="Recordatorio de cuota pendiente" />
            <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-[var(--ax-text)]">
              <input type="checkbox" className="peer sr-only" checked={reminders} onChange={(e) => void toggleReminders(e.target.checked)} />
              <span className="relative h-6 w-11 rounded-full bg-[var(--ax-line-strong)] transition-colors after:absolute after:left-[3px] after:top-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-[var(--ax-text)] after:transition-transform peer-checked:bg-[var(--ax-accent)] peer-checked:after:translate-x-5 peer-checked:after:bg-[var(--ax-on-accent)]" aria-hidden="true" />
              {reminders ? 'Activado' : 'Desactivado'}
            </label>
            <p className="text-[13px] text-[var(--ax-muted)]">Se envía desde el día 5 de cada mes a quienes tienen la cuota pendiente. Cada jugador ve solo el estado de su cuota.</p>
          </Card>
          <Card className="flex flex-col gap-3">
            <CardHeader id="cobro-linea" title="Cobro en línea" />
            <p className="text-[13px] text-[var(--ax-muted)]">Cobro de cuotas con tarjeta o transferencia.</p>
            <div><Chip tone="violet">Próximamente</Chip></div>
          </Card>
        </div>
      </div>
    </>
  )
}

type Budget = { id: string; name: string; starts_on: string; ends_on: string; is_active: boolean; team_budget_lines: Array<{ category: string; amount: number }> }

function Presupuesto({ teamId, usage, movements, categories, onChange, setMessage }: { teamId: string; usage: Usage; movements: Movement[]; categories: string[]; onChange: () => Promise<void>; setMessage: (m: Msg) => void }) {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [form, setForm] = useState<{ name: string; start: string; end: string; lines: Array<{ category: string; amount: string }> } | null>(null)
  const alertsOn = teamFlag(usage, 'alertas_presupuesto')
  const limit = usage?.limits?.presupuestos ?? null

  async function load() {
    if (!supabase) return
    const { data } = await supabase.from('team_budgets').select('id, name, starts_on, ends_on, is_active, team_budget_lines(category, amount)').eq('team_id', teamId).eq('is_active', true).order('starts_on')
    setBudgets((data ?? []) as Budget[])
  }
  useEffect(() => { void load() }, [teamId])

  const spent = (b: Budget, category: string) => movements.filter((m) => m.kind === 'gasto' && m.category === category && m.occurred_on >= b.starts_on && m.occurred_on <= b.ends_on).reduce((s, m) => s + m.amount, 0)

  async function save() {
    if (!supabase || !form) return
    const { data, error } = await supabase.from('team_budgets').insert({ team_id: teamId, name: form.name.trim(), starts_on: form.start, ends_on: form.end }).select('id').single()
    if (error) return setMessage({ tone: 'danger', text: error.message })
    const lines = form.lines.filter((l) => l.category && Number(l.amount) > 0).map((l) => ({ budget_id: (data as { id: string }).id, category: l.category, amount: Number(l.amount) }))
    if (lines.length) { const { error: lineError } = await supabase.from('team_budget_lines').insert(lines); if (lineError) setMessage({ tone: 'danger', text: lineError.message }) }
    setForm(null); await load(); await onChange()
  }
  async function archive(id: string) {
    if (!supabase) return
    const { error } = await supabase.from('team_budgets').update({ is_active: false }).eq('id', id)
    if (error) return setMessage({ tone: 'danger', text: error.message })
    await load(); await onChange()
  }

  const full = limit !== null && budgets.length >= limit
  const alerts = budgets.flatMap((b) => b.team_budget_lines.map((l) => ({ b, l, s: spent(b, l.category) })).filter((x) => Number(x.l.amount) > 0 && x.s >= Number(x.l.amount) * 0.9))

  return (
    <>
      <Notice tone="neutral" icon={Info} action={!form && !full ? <Button size="sm" variant="secondary" onClick={() => setForm({ name: '', start: usage?.season?.starts_on ?? '', end: usage?.season?.ends_on ?? '', lines: [{ category: 'Arbitraje', amount: '' }] })}>+ Nuevo presupuesto</Button> : undefined}>
        {limit === null ? 'Presupuestos sin límite.' : `Plan ${usage?.plan}: ${budgets.length} de ${limit} presupuesto${limit === 1 ? '' : 's'} activo${limit === 1 ? '' : 's'}.`}
      </Notice>
      {form && (
        <Card className="flex flex-col gap-4">
          <CardHeader id="nuevo-presupuesto" title="Nuevo presupuesto" actions={<Button variant="secondary" onClick={() => setForm(null)}>Cancelar</Button>} />
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block"><FieldLabel>Nombre</FieldLabel><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Temporada 2026" /></label>
            <label className="block"><FieldLabel>Inicio</FieldLabel><input type="date" className={inputClass} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></label>
            <label className="block"><FieldLabel>Fin</FieldLabel><input type="date" className={inputClass} value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></label>
          </div>
          {form.lines.map((l, i) => (
            <div key={i} className="flex gap-2">
              <select className={inputClass} value={l.category} onChange={(e) => setForm({ ...form, lines: form.lines.map((x, j) => j === i ? { ...x, category: e.target.value } : x) })}>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <input className={inputClass} inputMode="decimal" placeholder="Monto" value={l.amount} onChange={(e) => setForm({ ...form, lines: form.lines.map((x, j) => j === i ? { ...x, amount: e.target.value } : x) })} />
            </div>
          ))}
          <div className="flex gap-2"><Button variant="secondary" onClick={() => setForm({ ...form, lines: [...form.lines, { category: categories[0], amount: '' }] })}>+ Categoría</Button><Button variant="primary" disabled={!form.name.trim() || !form.start || !form.end} onClick={() => void save()}>Guardar presupuesto</Button></div>
        </Card>
      )}
      {budgets.length === 0 && !form && <Card><p className="text-sm text-[var(--ax-muted)]">Todavía no hay presupuestos activos.</p></Card>}
      {budgets.map((b) => {
        const planned = b.team_budget_lines.reduce((s, l) => s + Number(l.amount), 0)
        const used = b.team_budget_lines.reduce((s, l) => s + spent(b, l.category), 0)
        return (
          <Card key={b.id} className="flex flex-col gap-3.5">
            <CardHeader id={`b-${b.id}`} title={b.name} actions={<Button size="sm" variant="ghost" onClick={() => void archive(b.id)}>Archivar</Button>} />
            <p className="text-[13px] text-[var(--ax-muted)]">Presupuestado {money(planned)} · Gastado {money(used)} · Disponible {money(planned - used)}</p>
            {b.team_budget_lines.map((l) => { const s = spent(b, l.category); return <LimitMeter key={l.category} label={l.category} used={Math.round(s)} limit={Math.round(Number(l.amount))} /> })}
          </Card>
        )
      })}
      <Card className="flex flex-col gap-3">
        <CardHeader id="alertas" title="Alertas de presupuesto" />
        {!alertsOn ? <LockedFeature label="Aviso cuando un gasto supera lo presupuestado" plan="Élite" /> : alerts.length === 0 ? <p className="text-sm text-[var(--ax-muted)]">Ninguna categoría pasa del 90 % de su presupuesto.</p> : alerts.map(({ b, l, s }) => (
          <Row key={`${b.id}-${l.category}`} title={`${l.category} llegó al ${Math.round((100 * s) / Number(l.amount))} % del presupuesto`} sub={b.name} chip={<Chip tone="orange">Alerta</Chip>} />
        ))}
      </Card>
    </>
  )
}

type Stats = {
  monthly: Array<{ mes: string; ingresos: number; gastos: number }>
  gastos_categoria: Array<{ categoria: string; total: number }>
  ingresos_fuente: Array<{ categoria: string; total: number }>
  cuotas: { pagadas: number; total: number }
  morosos: Array<{ nombre: string; meses: number; monto: number }>
  proyeccion: number
  saldo_temporada: number
  temporada: { desde: string; hasta: string }
  costo_jugador_mes?: number | null
  costo_partido?: number | null
  temporadas?: Array<{ anio: number; ingresos: number; gastos: number }>
}

function Estadisticas({ teamId, usage }: { teamId: string; usage: Usage }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const on = teamFlag(usage, 'estadisticas_finanzas')
  useEffect(() => {
    if (!supabase || !on) return
    supabase.rpc('team_finance_stats', { p_team: teamId }).then(({ data }) => setStats(data as Stats))
  }, [teamId, on])

  if (!on) return (
    <>
      {[['Ingresos contra gastos', 'Gráfico de ingresos contra gastos por mes'], ['Gasto por categoría e ingreso por fuente', 'Gasto por categoría e ingreso por fuente'], ['Cuotas al día y morosidad', 'Cuotas al día, morosidad y proyección del saldo']].map(([t, l]) => (
        <Card key={t} className="flex flex-col gap-3"><CardHeader id={t} title={t} /><LockedFeature label={l} /></Card>
      ))}
    </>
  )
  if (!stats) return <Card><p className="text-sm text-[var(--ax-muted)]">Cargando estadísticas…</p></Card>
  const max = Math.max(1, ...stats.monthly.flatMap((m) => [Number(m.ingresos), Number(m.gastos)]))
  const sumG = stats.gastos_categoria.reduce((s, x) => s + Number(x.total), 0) || 1
  const sumI = stats.ingresos_fuente.reduce((s, x) => s + Number(x.total), 0) || 1
  const pct = (v: number, t: number) => Math.round((100 * v) / t)

  return (
    <>
      <Card className="flex flex-col gap-4">
        <CardHeader id="grafico" title="Ingresos contra gastos" />
        <div className="flex gap-2"><Chip tone="accent">Ingresos</Chip><Chip tone="blue">Gastos</Chip></div>
        <div className="flex h-[220px] items-end justify-between gap-1 overflow-x-auto" role="img" aria-label="Ingresos y gastos de los últimos 12 meses">
          {stats.monthly.map((m) => (
            <div key={m.mes} className="flex min-w-[36px] flex-1 flex-col items-center gap-2">
              <div className="flex h-[180px] items-end gap-1">
                <span className="w-3.5 rounded-t-[4px] bg-[var(--ax-accent)]" style={{ height: `${(180 * Number(m.ingresos)) / max}px` }} title={`Ingresos ${money(m.ingresos)}`} />
                <span className="w-3.5 rounded-t-[4px] bg-[var(--ax-info-text)]" style={{ height: `${(180 * Number(m.gastos)) / max}px` }} title={`Gastos ${money(m.gastos)}`} />
              </div>
              <span className="text-xs text-[var(--ax-muted)]">{monthName(`${m.mes}-01`).slice(0, 3)}</span>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-3.5"><CardHeader id="gc" title="Gasto por categoría" />{stats.gastos_categoria.length === 0 ? <p className="text-sm text-[var(--ax-muted)]">Sin gastos en la temporada.</p> : stats.gastos_categoria.map((g) => <BarRow key={g.categoria} label={g.categoria} value={`${money(g.total)} · ${pct(Number(g.total), sumG)}%`} pct={pct(Number(g.total), sumG)} />)}</Card>
        <Card className="flex flex-col gap-3.5"><CardHeader id="if" title="Ingreso por fuente" />{stats.ingresos_fuente.length === 0 ? <p className="text-sm text-[var(--ax-muted)]">Sin ingresos en la temporada.</p> : stats.ingresos_fuente.map((g) => <BarRow key={g.categoria} label={g.categoria} value={`${money(g.total)} · ${pct(Number(g.total), sumI)}%`} pct={pct(Number(g.total), sumI)} />)}</Card>
        <Card className="flex flex-col gap-3.5">
          <CardHeader id="mor" title="Cuotas al día y morosidad" />
          <BarRow label="Cuotas al día" value={stats.cuotas.total ? `${pct(stats.cuotas.pagadas, stats.cuotas.total)}%` : '—'} pct={stats.cuotas.total ? pct(stats.cuotas.pagadas, stats.cuotas.total) : 0} />
          {stats.morosos.map((m) => <Row key={m.nombre} title={m.nombre} sub={`${money(m.monto)} pendientes`} chip={<Chip tone="orange">{m.meses} {Number(m.meses) === 1 ? 'mes' : 'meses'}</Chip>} />)}
        </Card>
        <Card className="flex flex-col gap-3">
          <CardHeader id="proy" title="Proyección del saldo" />
          <p className="font-display text-[56px] leading-none text-[var(--ax-text)]">{money(stats.proyeccion)}</p>
          <p className="text-[13px] text-[var(--ax-muted)]">Saldo estimado al {shortDate(stats.temporada.hasta)}, según el promedio de los últimos 3 meses.</p>
        </Card>
        <Card className="flex flex-col gap-3">
          <CardHeader id="costo" title="Costo por jugador y por partido" />
          {!teamFlag(usage, 'costo_jugador') ? <LockedFeature label="Costo por jugador y por partido" plan="Élite" /> : (
            <div className="grid grid-cols-2 gap-4">
              <div><p className="font-display text-[44px] leading-none">{stats.costo_jugador_mes != null ? money(stats.costo_jugador_mes) : '—'}</p><p className="text-[13px] text-[var(--ax-muted)]">Costo por jugador al mes</p></div>
              <div><p className="font-display text-[44px] leading-none">{stats.costo_partido != null ? money(stats.costo_partido) : '—'}</p><p className="text-[13px] text-[var(--ax-muted)]">Costo por partido</p></div>
            </div>
          )}
        </Card>
        <Card className="flex flex-col gap-3.5">
          <CardHeader id="comp" title="Comparativa entre temporadas" />
          {!teamFlag(usage, 'comparativa_finanzas') ? <LockedFeature label="Comparativa financiera entre temporadas" plan="Élite" /> : (stats.temporadas ?? []).map((t) => (
            <Row key={t.anio} title={`Temporada ${t.anio}`} sub={`Ingresos ${money(t.ingresos)} · Gastos ${money(t.gastos)}`} right={<span className="text-sm font-semibold tabular-nums">{money(Number(t.ingresos) - Number(t.gastos))}</span>} />
          ))}
        </Card>
      </div>
    </>
  )
}

function BarRow({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between gap-4 text-sm"><span>{label}</span><span className="font-semibold tabular-nums">{value}</span></div>
      <div className="h-2 rounded-full bg-[var(--ax-line)]"><div className="h-2 rounded-full bg-[var(--ax-accent)]" style={{ width: `${Math.min(100, pct)}%` }} /></div>
    </div>
  )
}
