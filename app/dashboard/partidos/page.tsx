"use client";

import Link from "next/link";
import { ChevronRight, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Match = { id: string; tournamentName: string; slug: string; date: number; local: string; visitor: string; time: string | null; status: string; localScore: number; visitorScore: number };

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadMatches = async () => {
      if (!supabase) {
        setError("Supabase no está configurado.");
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("matches")
        .select("id,scheduled_time,status,local_score,visitor_score,fixtures(date_number,tournaments(name,slug)),local:teams!matches_local_team_id_fkey(name),visitor:teams!matches_visitor_team_id_fkey(name)")
        .order("scheduled_time", { ascending: true });

      if (queryError) setError(queryError.message);
      setMatches((data ?? []).map((match: any) => ({
        id: match.id,
        tournamentName: match.fixtures?.[0]?.tournaments?.[0]?.name ?? "Torneo",
        slug: match.fixtures?.[0]?.tournaments?.[0]?.slug ?? "",
        date: match.fixtures?.[0]?.date_number ?? 0,
        local: match.local?.name ?? "Equipo local",
        visitor: match.visitor?.name ?? "Equipo visitante",
        time: match.scheduled_time,
        status: match.status,
        localScore: match.local_score ?? 0,
        visitorScore: match.visitor_score ?? 0,
      })));
      setLoading(false);
    };

    void loadMatches();
  }, []);

  return <main className="min-h-screen bg-[#f4f6f8] px-5 py-8 text-[#17212b] lg:ml-64 md:px-10"><div className="mx-auto max-w-7xl"><header><p className="text-sm font-semibold uppercase tracking-[.2em] text-[#70b719]">Competencia</p><h1 className="mt-2 text-4xl font-black">Partidos</h1><p className="mt-2 text-slate-500">Partidos registrados directamente en Supabase.</p></header>{error && <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 font-semibold text-red-700">{error}</p>}{!loading && !matches.length && <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">No hay partidos registrados.</div>}<div className="mt-8 grid gap-4 lg:grid-cols-2">{matches.map((match) => <article key={match.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="font-semibold text-[#4c8500]">{match.tournamentName}</span><span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${match.status === "live" ? "bg-[#e9fbd0] text-[#365e00]" : "bg-slate-100 text-slate-600"}`}>{match.status === "live" && <Radio size={13} />}{match.status === "live" ? "EN VIVO" : match.status === "finished" ? "FINALIZADO" : `Fecha ${match.date}`}</span></div><div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center"><div><p className="font-bold">{match.local}</p><p className="mt-2 text-3xl font-black text-[#4c8500]">{match.status === "scheduled" ? "-" : match.localScore}</p></div><div><p className="text-sm text-slate-500">{match.time ?? "Horario por definir"}</p><p className="mt-1 font-bold">VS</p></div><div><p className="font-bold">{match.visitor}</p><p className="mt-2 text-3xl font-black text-[#4c8500]">{match.status === "scheduled" ? "-" : match.visitorScore}</p></div></div>{match.slug && <Link href={`/dashboard/torneos/${match.slug}`} className="mt-6 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-3 font-semibold hover:border-[#70b719]">Administrar partido <ChevronRight size={17} /></Link>}</article>)}</div>{loading && <p className="mt-8 text-center text-slate-500">Cargando partidos...</p>}</div></main>;
}
