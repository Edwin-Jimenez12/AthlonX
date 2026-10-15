"use client";

import { BarChart3, TrendingUp, Trophy, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Summary = { points: number; tries: number; matches: number; athletes: number };
type TournamentStats = { id: string; name: string; matches: number; finished: number; tries: number };

const emptySummary: Summary = { points: 0, tries: 0, matches: 0, athletes: 0 };

export default function StatisticsPage() {
  const [summary, setSummary] = useState(emptySummary);
  const [tournaments, setTournaments] = useState<TournamentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadStatistics = async () => {
      if (!supabase) {
        setError("Supabase no está configurado.");
        setLoading(false);
        return;
      }

      const [{ data: tournamentRows, error: tournamentError }, { count: athleteCount }, { data: matchRows }] = await Promise.all([
        supabase.from("tournaments").select("id,name").order("created_at", { ascending: false }),
        supabase.from("team_players").select("player_id", { count: "exact", head: true }),
        supabase.from("matches").select("id,local_score,visitor_score,status,fixture_id,fixtures(tournament_id)"),
      ]);

      if (tournamentError) {
        setError(tournamentError.message);
        setLoading(false);
        return;
      }

      const rows = matchRows ?? [];
      const matchIds = rows.map((match: any) => match.id).filter(Boolean);
      const { data: eventRows, error: eventError } = matchIds.length
        ? await supabase.from("match_events").select("match_id,event_type,points").in("match_id", matchIds)
        : { data: [], error: null };

      if (eventError) setError(eventError.message);
      const tries = (eventRows ?? []).filter((event: any) => event.event_type === "try").length;
      const points = rows.reduce((total: number, match: any) => total + (match.local_score ?? 0) + (match.visitor_score ?? 0), 0);
      const stats = (tournamentRows ?? []).map((tournament) => ({
        id: tournament.id,
        name: tournament.name,
        matches: rows.filter((match: any) => match.fixtures?.[0]?.tournament_id === tournament.id).length,
        finished: rows.filter((match: any) => match.fixtures?.[0]?.tournament_id === tournament.id && match.status === "finished").length,
        tries: (eventRows ?? []).filter((event: any) => event.event_type === "try" && rows.find((match: any) => match.id === event.match_id)?.fixtures?.[0]?.tournament_id === tournament.id).length,
      }));

      setSummary({ points, tries, matches: rows.length, athletes: athleteCount ?? 0 });
      setTournaments(stats);
      setLoading(false);
    };

    void loadStatistics();
  }, []);

  const cards = [
    ["Puntos anotados", summary.points, Trophy],
    ["Tries registrados", summary.tries, TrendingUp],
    ["Partidos registrados", summary.matches, BarChart3],
    ["Atletas registrados", summary.athletes, Users],
  ] as const;

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#17212b] lg:pl-64">
      <header className="border-b border-slate-200 bg-white px-6 py-5 md:px-10"><p className="text-sm font-semibold text-slate-500">AthlonX · Rendimiento deportivo</p><h1 className="text-3xl font-bold">Estadísticas</h1></header>
      <section className="mx-auto max-w-7xl p-6 md:p-10">
        {error && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-4 font-semibold text-red-700">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, Icon]) => <article key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="text-[#70b719]" /><p className="mt-5 text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold">{loading ? "..." : value}</p></article>)}</div>
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-2xl font-bold">Rendimiento por torneo</h2>{!loading && !tournaments.length && <p className="mt-4 text-slate-500">No hay torneos registrados en Supabase.</p>}<div className="mt-5 space-y-4">{tournaments.map((tournament) => <article key={tournament.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{tournament.name}</span><span className="text-sm text-slate-500">{tournament.finished} finalizados de {tournament.matches}</span></div><div className="mt-3 h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-[#8ade25]" style={{ width: `${tournament.matches ? Math.min((tournament.finished / tournament.matches) * 100, 100) : 0}%` }} /></div><p className="mt-2 text-sm text-slate-500">{tournament.tries} tries registrados</p></article>)}</div></section>
      </section>
    </main>
  );
}
