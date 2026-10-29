'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

interface Match {
  id: string
  local_team_id: string | null
  visitor_team_id: string | null
  local_score: number
  visitor_score: number
  status: string
  is_paused?: boolean
  match_phase?: string
  overtime_minutes?: number
  overtime_started_at?: string | null
  elapsed_seconds?: number
}

interface Team {
  id: string
  name: string
}

interface OvertimePanelProps {
  match: Match
  localTeam: Team | null
  visitorTeam: Team | null
  onOvertimeFinished?: () => Promise<void>
  pending?: boolean
}

export function RugbyOvertimePanel({
  match,
  localTeam,
  visitorTeam,
  onOvertimeFinished,
  pending = false,
}: OvertimePanelProps) {
  const [step, setStep] = useState<'check' | 'input' | 'overtime' | 'finished'>('check')
  const [overtimeMinutes, setOvertimeMinutes] = useState(5)
  const [now, setNow] = useState(Date.now())
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Detect if match is tied
  const isTied = match.local_score === match.visitor_score
  const isInOvertime = match.match_phase === 'overtime'
  const isOvertimeFinished = match.match_phase === 'overtime_finished'

  // Calculate elapsed time in overtime
  let overtimeElapsed = 0
  if (isInOvertime && match.overtime_started_at) {
    const startTime = new Date(match.overtime_started_at).getTime()
    overtimeElapsed = Math.floor((now - startTime) / 1000)
  }

  // Initialize step based on match state
  useEffect(() => {
    if (isOvertimeFinished) {
      setStep('finished')
    } else if (isInOvertime) {
      setStep('overtime')
    } else if (isTied && match.status === 'finished') {
      setStep('check')
    }
  }, [isTied, isInOvertime, isOvertimeFinished, match.status])

  // Clock update
  useEffect(() => {
    if (isInOvertime && !isOvertimeFinished) {
      clockRef.current = window.setInterval(() => setNow(Date.now()), 1000) as unknown as ReturnType<typeof setInterval>
      return () => {
        if (clockRef.current) window.clearInterval(clockRef.current as unknown as number)
      }
    }
  }, [isInOvertime, isOvertimeFinished])

  // Auto-detect score change during overtime (muerte subida)
  useEffect(() => {
    if (isInOvertime && !isOvertimeFinished) {
      if (match.local_score > match.visitor_score) {
        setMessage('¡Gol detectado en prórroga! Local gana por muerte subida.')
        setStep('finished')
      } else if (match.visitor_score > match.local_score) {
        setMessage('¡Gol detectado en prórroga! Visitante gana por muerte subida.')
        setStep('finished')
      }
    }
  }, [match.local_score, match.visitor_score, isInOvertime, isOvertimeFinished])

  async function handleStartOvertime() {
    if (overtimeMinutes < 1 || overtimeMinutes > 60) {
      setMessage('La prórroga debe ser entre 1 y 60 minutos.')
      return
    }
    setIsLoading(true)
    setMessage('')
    try {
      const { data, error } = await supabase.rpc('start_rugby_overtime', {
        p_match_id: match.id,
        p_overtime_minutes: overtimeMinutes,
      })
      if (error) throw error
      setStep('overtime')
    } catch (e) {
      setMessage((e as Error).message || 'No se pudo iniciar la prórroga.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleConfirmWinner(winnerId: string) {
    setIsLoading(true)
    setMessage('')
    try {
      const { data, error } = await supabase.rpc('finish_rugby_overtime', {
        p_match_id: match.id,
        p_winner_team_id: winnerId,
      })
      if (error) throw error
      setStep('finished')
      if (onOvertimeFinished) {
        await onOvertimeFinished()
      }
    } catch (e) {
      setMessage((e as Error).message || 'No se pudo confirmar el ganador.')
    } finally {
      setIsLoading(false)
    }
  }

  const minutes = Math.floor(overtimeElapsed / 60)
  const seconds = overtimeElapsed % 60

  // Styling
  const panel = 'mt-4 rounded-lg border border-[#31556b] bg-[#07131e] p-4'
  const input = 'mt-1 w-full rounded-lg border border-[#31556b] bg-[#0b1d2c] px-3 py-2 text-sm text-white outline-none focus:border-[#b4ff45]'
  const button = 'cursor-pointer rounded-lg bg-[#b4ff45] px-4 py-2 text-sm font-bold text-[#07131e] disabled:cursor-not-allowed disabled:opacity-40'
  const secondary = 'cursor-pointer rounded-lg border border-[#31556b] px-4 py-2 text-sm font-bold text-slate-200 disabled:cursor-not-allowed disabled:opacity-40'

  if (step === 'check' && isTied) {
    return (
      <div className={panel}>
        <h3 className="font-bold text-[#b4ff45]">Empate en semifinal/final</h3>
        <p className="mt-2 text-sm text-slate-300">
          {localTeam?.name} {match.local_score} - {match.visitor_score} {visitorTeam?.name}
        </p>
        <p className="mt-3 text-sm text-slate-400">
          Se requiere prórroga con regla de muerte subida: el primer equipo que anote gana automáticamente.
        </p>
        <button
          onClick={() => setStep('input')}
          disabled={pending || isLoading}
          className={`${button} mt-4`}
        >
          Configurar prórroga
        </button>
        {message && <p className="mt-2 text-sm text-red-200">{message}</p>}
      </div>
    )
  }

  if (step === 'input') {
    return (
      <div className={panel}>
        <h3 className="font-bold text-[#b4ff45]">Configurar prórroga</h3>
        <label className="mt-3 block text-sm font-semibold text-slate-300">
          Duración de la prórroga (minutos)
          <input
            type="number"
            min="1"
            max="60"
            value={overtimeMinutes}
            onChange={(e) => setOvertimeMinutes(Number(e.target.value))}
            className={input}
          />
        </label>
        <p className="mt-2 text-xs text-slate-400">
          Durante la prórroga, el primer equipo que anote gana automáticamente (muerte subida).
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleStartOvertime}
            disabled={pending || isLoading || overtimeMinutes < 1 || overtimeMinutes > 60}
            className={button}
          >
            Iniciar prórroga
          </button>
          <button
            onClick={() => {
              setStep('check')
              setMessage('')
            }}
            disabled={pending || isLoading}
            className={secondary}
          >
            Cancelar
          </button>
        </div>
        {message && <p className="mt-2 text-sm text-red-200">{message}</p>}
      </div>
    )
  }

  if (step === 'overtime') {
    const scoreChanged =
      match.local_score > match.visitor_score ||
      match.visitor_score > match.local_score

    return (
      <div className={panel}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[#b4ff45]">Prórroga en curso</h3>
            <p className="mt-1 text-xs text-slate-400">Muerte subida activada</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-3xl text-[#b4ff45]">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </p>
            <p className="text-xs text-slate-400">Duración: {match.overtime_minutes} min</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded border border-[#31556b] bg-[#0b1d2c] p-3 text-center">
            <p className="text-sm text-slate-300">{localTeam?.name}</p>
            <p className="mt-2 text-4xl font-bold text-[#b4ff45]">
              {match.local_score}
            </p>
          </div>
          <div className="rounded border border-[#31556b] bg-[#0b1d2c] p-3 text-center">
            <p className="text-sm text-slate-300">{visitorTeam?.name}</p>
            <p className="mt-2 text-4xl font-bold text-[#b4ff45]">
              {match.visitor_score}
            </p>
          </div>
        </div>

        {scoreChanged && (
          <div className="mt-4 rounded-lg border border-orange-500 bg-orange-500/10 p-3">
            <p className="text-sm font-bold text-orange-200">
              ¡Gol en prórroga detectado!
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {match.local_score > match.visitor_score
                ? `${localTeam?.name} gana por muerte subida`
                : `${visitorTeam?.name} gana por muerte subida`}
            </p>
          </div>
        )}

        {scoreChanged && (
          <button
            onClick={() =>
              handleConfirmWinner(
                match.local_score > match.visitor_score
                  ? match.local_team_id!
                  : match.visitor_team_id!
              )
            }
            disabled={pending || isLoading}
            className={`${button} mt-4 w-full`}
          >
            Confirmar ganador y avanzar
          </button>
        )}

        {message && <p className="mt-2 text-sm text-red-200">{message}</p>}
      </div>
    )
  }

  if (step === 'finished') {
    const localWins = match.local_score > match.visitor_score
    const winner = localWins ? localTeam : visitorTeam

    return (
      <div className={panel}>
        <h3 className="font-bold text-[#b4ff45]">Prórroga finalizada</h3>
        <p className="mt-2 text-sm text-slate-300">
          Ganador: <span className="font-bold">{winner?.name}</span>
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded border border-[#31556b] bg-[#0b1d2c] p-3 text-center">
            <p className="text-sm text-slate-300">{localTeam?.name}</p>
            <p className={`mt-2 text-3xl font-bold ${localWins ? 'text-[#b4ff45]' : 'text-slate-400'}`}>
              {match.local_score}
            </p>
          </div>
          <div className="rounded border border-[#31556b] bg-[#0b1d2c] p-3 text-center">
            <p className="text-sm text-slate-300">{visitorTeam?.name}</p>
            <p className={`mt-2 text-3xl font-bold ${!localWins ? 'text-[#b4ff45]' : 'text-slate-400'}`}>
              {match.visitor_score}
            </p>
          </div>
        </div>
        {message && <p className="mt-2 text-sm text-red-200">{message}</p>}
      </div>
    )
  }

  return null
}
