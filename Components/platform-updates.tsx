"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type PlatformUpdate = {
  id: string;
  title: string;
  summary: string;
  content: string | null;
  category: string;
  version: string | null;
  published_at: string | null;
};

// Categorías de los filtros, en el orden del diseño de Figma.
const categories = ["Nueva función", "Mejora", "Corrección", "Aviso"];

const fallbackUpdates: PlatformUpdate[] = [
  {
    id: "fallback-1",
    title: "Nuevo centro de eventos",
    summary:
      "Las organizaciones y equipos ya pueden preparar sus próximos torneos desde un mismo espacio.",
    content: null,
    category: "Nueva función",
    version: "0.8",
    published_at: "2026-09-17",
  },
  {
    id: "fallback-2",
    title: "Perfiles conectados",
    summary:
      "Las invitaciones permiten vincular atletas, entrenadores, staff y directivos con sus equipos.",
    content: null,
    category: "Mejora",
    version: "0.7",
    published_at: "2026-09-10",
  },
  {
    id: "fallback-3",
    title: "Marcadores y tanda de penales",
    summary:
      "Se ajustó el cálculo del marcador por disciplina y el registro de tiros de la tanda de penales.",
    content: null,
    category: "Corrección",
    version: "0.6",
    published_at: "2026-09-03",
  },
];

// Muestra la fecha tal como se publicó, en formato AAAA-MM-DD.
function formatDate(value: string | null) {
  if (!value) return "Próximamente";
  return value.slice(0, 10);
}

export function PlatformUpdates() {
  const [updates, setUpdates] = useState<PlatformUpdate[]>(fallbackUpdates);
  const [filter, setFilter] = useState<string>("Todas");

  useEffect(() => {
    async function loadUpdates() {
      if (!supabase) return;
      const { data } = await supabase
        .from("platform_updates")
        .select("id, title, summary, content, category, version, published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(20);
      if (data?.length) setUpdates(data);
    }
    void loadUpdates();
  }, []);

  const visible =
    filter === "Todas" ? updates : updates.filter((update) => update.category === filter);

  return (
    <section className="px-6 pb-24 md:px-14 lg:px-24">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap gap-3 pb-10" role="group" aria-label="Filtrar novedades">
          {["Todas", ...categories].map((category) => {
            const active = filter === category;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(category)}
                className={`font-metric rounded-[5px] border px-4 py-2.5 text-base font-semibold tracking-wide transition ${
                  active
                    ? "border-[#B4FF45] bg-[#B4FF45] text-[#07131E]"
                    : "border-[#29485d] bg-[#07111d]/60 text-slate-300 hover:border-[#B4FF45] hover:text-white"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-5">
          {visible.map((update) => (
            <article
              key={update.id}
              className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c]/85 px-6 py-7 backdrop-blur-sm md:px-9"
            >
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-metric rounded-[5px] border border-[#B4FF45] px-3 py-1 text-[13px] font-semibold uppercase tracking-[.12em] text-[#dfffba]">
                  {update.category}
                </span>
                <span className="text-sm text-[#91a8ba]">{formatDate(update.published_at)}</span>
              </div>
              <h3 className="font-display mt-4 text-[44px] uppercase leading-none text-[#e8eef3]">
                {update.title}
              </h3>
              <p className="mt-3 text-[17px] leading-[1.5] text-[#b9c8d4]">{update.summary}</p>
            </article>
          ))}
          {visible.length === 0 && (
            <p className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c]/85 px-6 py-7 text-slate-400">
              No hay novedades en esta categoría todavía.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
