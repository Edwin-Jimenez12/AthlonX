"use client";

import { CalendarDays, ChevronRight, Plus, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type DashboardMatch = { id: string; tournamentId: string; tournamentName: string; slug: string; local: string; visitor: string; date: number; time: string | null; status: string; localScore: number; visitorScore: number };
type DashboardStats = { tournaments: number; teams: number; matches: number; athletes: number };
const emptyStats: DashboardStats = { tournaments: 0, teams: 0, matches: 0, athletes: 0 };

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(emptyStats);
  const [nextMatch, setNextMatch] = useState<DashboardMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      if (!supabase) {
        setError("Supabase no está configurado.");
        setLoading(false);
        return;
      }

      const [{ data: tournaments, error: tournamentError }, { count: teams }, { count: athletes }, { data: matches }] = await Promise.all([
        supabase.from("tournaments").select("id,name,slug"),
        supabase.from("teams").select("id", { count: "exact", head: true }),
        supabase.from("team_players").select("player_id", { count: "exact", head: true }),
        supabase.from("matches").select("id,fixture_id,scheduled_time,status,local_score,visitor_score,local_team_id,visitor_team_id,fixtures(date_number,tournament_id,tournaments(name,slug)),local:teams!matches_local_team_id_fkey(name),visitor:teams!matches_visitor_team_id_fkey(name)").order("scheduled_time", { ascending: true }),
      ]);

      if (tournamentError) setError(tournamentError.message);
      const rows = (matches ?? []).map((match: any) => ({
        id: match.id,
        tournamentId: match.fixtures?.[0]?.tournament_id ?? "",
        tournamentName: match.fixtures?.[0]?.tournaments?.[0]?.name ?? "Torneo",
        slug: match.fixtures?.[0]?.tournaments?.[0]?.slug ?? "",
        local: match.local?.name ?? "Equipo local",
        visitor: match.visitor?.name ?? "Equipo visitante",
        date: match.fixtures?.[0]?.date_number ?? 0,
        time: match.scheduled_time,
        status: match.status,
        localScore: match.local_score ?? 0,
        visitorScore: match.visitor_score ?? 0,
      }));

      setStats({ tournaments: tournaments?.length ?? 0, teams: teams ?? 0, matches: rows.length, athletes: athletes ?? 0 });
      setNextMatch(rows.find((match) => match.status === "live") ?? rows.find((match) => match.status === "scheduled") ?? null);
      setLoading(false);
    };

    void loadDashboard();
  }, []);

  const cards = [["Torneos", stats.tournaments], ["Equipos", stats.teams], ["Partidos", stats.matches], ["Atletas", stats.athletes]];

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#17212b] lg:ml-64">
      <section className="mx-auto max-w-7xl px-5 py-8 md:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[.2em] text-[#70b719]">Panel deportivo</p><h1 className="mt-2 text-4xl font-black">Resumen</h1><p className="mt-2 text-slate-500">Información actualizada desde Supabase.</p></div><button type="button" onClick={() => router.push("/dashboard/eventos")} className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#B4FF45] px-4 py-3 font-bold text-[#081522]"><Plus size={18} /> Gestionar eventos</button></header>
        {error && <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 font-semibold text-red-700">{error}</p>}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value]) => <article key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{loading ? "..." : value}</p></article>)}</div>
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[.2em] text-[#70b719]">Agenda</p><h2 className="mt-1 text-2xl font-bold">Partido destacado</h2></div><CalendarDays className="text-[#70b719]" /></div>{nextMatch ? <div className="mt-6 rounded-xl bg-[#081522] p-5 text-white"><div className="flex flex-wrap justify-between gap-2 text-sm text-slate-300"><span>{nextMatch.tournamentName}</span><span>{nextMatch.status === "live" ? "EN VIVO" : `Fecha ${nextMatch.date}`}</span></div><div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center"><div><p className="text-lg font-bold">{nextMatch.local}</p><p className="mt-2 text-4xl font-black text-[#B4FF45]">{nextMatch.status === "scheduled" ? "-" : nextMatch.localScore}</p></div><div><p className="text-sm text-slate-400">{nextMatch.time ?? "Horario por definir"}</p><p className="mt-1 font-bold">VS</p></div><div><p className="text-lg font-bold">{nextMatch.visitor}</p><p className="mt-2 text-4xl font-black text-[#B4FF45]">{nextMatch.status === "scheduled" ? "-" : nextMatch.visitorScore}</p></div></div><button type="button" onClick={() => nextMatch.slug && router.push(`/dashboard/torneos/${nextMatch.slug}`)} className="mt-6 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#B4FF45] px-4 py-3 font-bold text-[#B4FF45]">Abrir torneo <ChevronRight size={18} /></button></div> : <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500"><Trophy className="mx-auto text-[#70b719]" /><p className="mt-3">No hay partidos registrados en Supabase.</p></div>}</section>
      </section>
    </main>
  );
}
