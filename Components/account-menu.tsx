'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Briefcase, Building2, Check, ChevronDown, ClipboardList, Copy, ExternalLink, LogOut, Moon, Shield, SlidersHorizontal, Sun, Trophy, UserRound, Wrench } from 'lucide-react'
import type { ThemeMode } from '../lib/theme'
import { AccountContext, contextDetail, contextTitle } from '../lib/account-contexts'
import { supabase } from '../lib/supabase'
import { Badge, cx } from './mi-equipo/ui'

// Menú de cuenta de la barra superior (frames "Menú de cuenta" en Figma, página "Claude", y≈31 000).

export type AccountIdentity = {
  name: string
  kind: 'Persona' | 'Equipo' | 'Organización'
  code: string
  email: string
  round: boolean
  publicHref: string | null
  imageUrl?: string | null
}

export function initialsFor(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AX'
}

function AccountAvatar({ identity, size }: { identity: AccountIdentity; size: 36 | 44 }) {
  return <span aria-hidden="true" className={cx(
    'flex shrink-0 items-center justify-center text-[var(--ax-on-accent)]',
    !identity.imageUrl && 'bg-[var(--ax-accent)]',
    size === 44 ? 'h-11 w-11 font-display text-xl' : 'h-9 w-9 text-[13px] font-bold',
    identity.round ? 'rounded-full' : size === 44 ? 'rounded-xl' : 'rounded-[10px]',
    'overflow-hidden',
  )}>{identity.imageUrl ? <img src={identity.imageUrl} alt="" className="h-full w-full object-cover" /> : initialsFor(identity.name)}</span>
}

// Botón que abre el menú: avatar, nombre de la cuenta activa y su tipo.
export function AccountTrigger({ identity, open, onClick }: { identity: AccountIdentity; open: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-haspopup="menu" aria-expanded={open} aria-label={`Abrir menú de cuenta de ${identity.name}`} className={cx(
    'flex cursor-pointer items-center gap-2.5 rounded-xl border p-1 transition-[background-color,border-color] duration-150 sm:pr-2.5',
    open ? 'border-[var(--ax-line-strong)] bg-[var(--ax-surface-raised)]' : 'border-transparent hover:border-[var(--ax-line)] hover:bg-[var(--ax-hover)]',
  )}>
    <AccountAvatar identity={identity} size={36} />
    <span className="hidden min-w-0 text-left sm:block">
      <span className="block max-w-44 truncate text-sm font-semibold leading-5 text-[var(--ax-text)]">{identity.name}</span>
      <span className="block text-xs leading-4 text-[var(--ax-muted)]">{identity.kind}</span>
    </span>
    <ChevronDown size={16} aria-hidden="true" className={cx('hidden text-[var(--ax-muted)] transition-transform duration-150 sm:block', open && 'rotate-180')} />
  </button>
}

const themeOptions: { mode: ThemeMode; label: string; icon: LucideIcon }[] = [
  { mode: 'dark', label: 'Oscuro', icon: Moon },
  { mode: 'light', label: 'Claro', icon: Sun },
]

const itemBase = 'flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 text-left text-sm font-medium transition-colors duration-100 focus-visible:outline-none'
const itemClass = cx(itemBase, 'text-[var(--ax-text)] hover:bg-[var(--ax-hover)] focus-visible:bg-[var(--ax-hover)]')
const dangerItemClass = cx(itemBase, 'text-[var(--ax-danger-text)] hover:bg-[var(--ax-danger-soft)] focus-visible:bg-[var(--ax-danger-soft)]')

function ItemIcon({ icon: Icon, danger = false }: { icon: LucideIcon; danger?: boolean }) {
  return <span aria-hidden="true" className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', danger ? 'bg-[var(--ax-danger-soft)] text-[var(--ax-danger-text)]' : 'bg-[var(--ax-surface-raised)] text-[var(--ax-text)]')}><Icon size={15} /></span>
}

// Icono de cada rol: atleta, entrenador, staff y directivo en la cuenta personal; equipo y organización por tipo.
const personalRoleIcons: Record<string, LucideIcon> = { atleta: Trophy, entrenador: ClipboardList, staff: Wrench, directivo: Briefcase }

function contextIcon(context: AccountContext): LucideIcon {
  if (context.contextType === 'organization') return Building2
  if (context.contextType === 'team') return Shield
  return personalRoleIcons[context.role] ?? UserRound
}

// Equipos y organizaciones muestran su tipo debajo del nombre; los roles personales solo su nombre.
function contextSubtitle(context: AccountContext) {
  if (context.contextType === 'personal') return null
  return contextDetail(context) ?? (context.contextType === 'team' ? 'Equipo' : 'Organización')
}

// Sección Roles: al abrirla lista los roles de la cuenta; elegir uno cambia de vista.
function RolesSection({ contexts, activeContextId, onSelect }: { contexts: AccountContext[]; activeContextId: string; onSelect: (context: AccountContext) => void }) {
  const [expanded, setExpanded] = useState(false)
  const active = contexts.find((context) => context.id === activeContextId) ?? contexts[0]
  if (!contexts.length) return null
  return <div>
    <button type="button" role="menuitem" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className={cx(itemClass, 'justify-between')}>
      <span className="flex min-w-0 items-center gap-2.5">
        <ItemIcon icon={Shield} />
        <span className="flex min-w-0 flex-col items-start leading-tight">
          <span>Roles</span>
          {active && <span className="max-w-full truncate text-xs font-normal text-[var(--ax-muted)]">Actual: {contextTitle(active)}</span>}
        </span>
      </span>
      <ChevronDown size={16} aria-hidden="true" className={cx('shrink-0 text-[var(--ax-muted)] transition-transform duration-150', expanded && 'rotate-180')} />
    </button>
    {expanded && <div role="menu" aria-label="Roles" className="ax-drop-in mb-1 mt-0.5 space-y-0.5 pl-2">
      {contexts.map((context) => {
        const isActive = context.id === activeContextId
        const Icon = contextIcon(context)
        return <button key={context.id} type="button" role="menuitemradio" aria-checked={isActive} onClick={() => onSelect(context)} className={cx(
          'flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] border px-2.5 py-2 text-left transition-colors duration-100 focus-visible:outline-none',
          isActive ? 'border-[var(--ax-accent-line)] bg-[var(--ax-accent-soft)]' : 'border-transparent hover:bg-[var(--ax-hover)] focus-visible:bg-[var(--ax-hover)]',
        )}>
          <span aria-hidden="true" className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', isActive ? 'bg-[var(--ax-accent)] text-[var(--ax-on-accent)]' : 'bg-[var(--ax-surface-sunken)] text-[var(--ax-accent-text)]')}><Icon size={15} /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[var(--ax-text)]">{contextTitle(context)}</span>
            {contextSubtitle(context) && <span className="block truncate text-xs text-[var(--ax-muted)]">{contextSubtitle(context)}</span>}
          </span>
          {isActive && <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--ax-accent)] text-[var(--ax-on-accent)]" aria-label="Vista actual"><Check size={12} aria-hidden="true" /></span>}
        </button>
      })}
    </div>}
  </div>
}

export function AccountMenu({ identity, theme, onTheme, onClose, contexts = [], activeContextId = '', onSelectContext }: { identity: AccountIdentity; theme: ThemeMode; onTheme: (mode: ThemeMode) => void; onClose: () => void; contexts?: AccountContext[]; activeContextId?: string; onSelectContext?: (context: AccountContext) => void }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copyCode() {
    if (!identity.code) return
    try {
      await navigator.clipboard.writeText(identity.code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  async function signOut() {
    setLeaving(true)
    await supabase?.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return <div role="menu" aria-label="Menú de cuenta" className="ax-drop-in absolute right-0 top-[calc(100%+8px)] z-50 w-[calc(100vw-2rem)] max-w-[288px] rounded-[14px] border border-[var(--ax-line-strong)] bg-[var(--ax-surface)] p-1.5 text-[var(--ax-text)] shadow-[var(--ax-shadow-pop)]">
    <div className="flex items-center gap-3 px-2.5 pb-3 pt-2.5">
      <AccountAvatar identity={identity} size={44} />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-[15px] font-semibold">{identity.name}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge>{identity.kind}</Badge>
          {identity.code && <button type="button" onClick={() => void copyCode()} aria-label={copied ? 'Código copiado' : 'Copiar código AthlonX'} title={copied ? 'Copiado' : 'Copiar código AthlonX'} className="inline-flex h-6 cursor-pointer items-center gap-1 rounded-md px-1 text-xs font-medium text-[var(--ax-text-secondary)] hover:bg-[var(--ax-hover)]">
            {identity.code}
            {copied ? <Check size={12} aria-hidden="true" className="text-[var(--ax-accent-text)]" /> : <Copy size={12} aria-hidden="true" className="text-[var(--ax-muted)]" />}
          </button>}
        </div>
        {identity.email && <p className="truncate text-xs text-[var(--ax-muted)]">{identity.email}</p>}
      </div>
    </div>

    <div className="my-1.5 h-px bg-[var(--ax-line)]" />
    <Link role="menuitem" href="/mi-perfil" onClick={onClose} className={itemClass}><ItemIcon icon={UserRound} />Mi perfil</Link>
    {onSelectContext && <RolesSection contexts={contexts} activeContextId={activeContextId} onSelect={(context) => { onClose(); onSelectContext(context) }} />}
    {identity.publicHref && <Link role="menuitem" href={identity.publicHref} onClick={onClose} className={itemClass}><ItemIcon icon={ExternalLink} />Ver perfil público</Link>}
    <Link role="menuitem" href="/mi-perfil?seccion=configuracion" onClick={onClose} className={itemClass}><ItemIcon icon={SlidersHorizontal} />Configuración</Link>
    <div className="flex items-center justify-between gap-3 py-1.5 pl-3 pr-2.5">
      <span className="text-sm font-medium">Tema</span>
      <div role="radiogroup" aria-label="Tema de la plataforma" className="inline-flex gap-0.5 rounded-[10px] border border-[var(--ax-line-strong)] bg-[var(--ax-surface-sunken)] p-[3px]">
        {themeOptions.map(({ mode, label, icon: Icon }) => {
          const active = theme === mode
          return <button key={mode} type="button" role="radio" aria-checked={active} onClick={() => onTheme(mode)} className={cx('inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-colors duration-150', active ? 'bg-[var(--ax-accent)] text-[var(--ax-on-accent)]' : 'text-[var(--ax-text-secondary)] hover:text-[var(--ax-text)]')}><Icon size={14} aria-hidden="true" />{label}</button>
        })}
      </div>
    </div>

    <div className="my-1.5 h-px bg-[var(--ax-line)]" />
    {confirming
      ? <div role="group" aria-label="Confirmar cierre de sesión" className="ax-drop-in space-y-2.5 rounded-[10px] border border-[var(--ax-danger-line)] bg-[var(--ax-danger-soft)] p-3">
        <p className="text-sm font-semibold">¿Cerrar sesión en este dispositivo?</p>
        <p className="text-[13px] leading-[18px] text-[var(--ax-text-secondary)]">Podrás volver a entrar con tu correo y contraseña.</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setConfirming(false)} disabled={leaving} className="h-[34px] cursor-pointer rounded-[10px] px-3 text-[13px] font-semibold text-[var(--ax-text-secondary)] hover:bg-[var(--ax-hover)] disabled:opacity-50">Cancelar</button>
          <button type="button" onClick={() => void signOut()} disabled={leaving} autoFocus className="inline-flex h-[34px] cursor-pointer items-center gap-1.5 rounded-[10px] bg-[var(--ax-danger-text)] px-3 text-[13px] font-semibold text-[var(--ax-surface)] hover:brightness-110 disabled:cursor-wait disabled:opacity-70"><LogOut size={14} aria-hidden="true" />{leaving ? 'Cerrando…' : 'Cerrar sesión'}</button>
        </div>
      </div>
      : <button type="button" role="menuitem" onClick={() => setConfirming(true)} className={dangerItemClass}><ItemIcon icon={LogOut} danger />Cerrar sesión</button>}
  </div>
}
