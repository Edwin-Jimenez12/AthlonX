"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  Plus,
  Minus,
  Check,
  Trash2,
  Heart,
  Brain,
  ArrowRightLeft,
  Square,
  FileDown,
  Pencil,
  UserPlus,
} from "lucide-react";
import { supabase } from "../../../../lib/supabase";

type Team = { id?: string; divisionId?: string; name: string; division: string; logo?: string | null };
type FixtureMatch = {
  id?: string;
  fixtureId?: string;
  date: number;
  calendarDate?: string | null;
  fixtureLocked?: boolean;
  division: string;
  local: string;
  visitor: string;
  time?: string;
  localScore?: number;
  visitorScore?: number;
  status?: string;
  period?: "first_half" | "second_half";
  isPaused?: boolean;
  startedAt?: string | null;
  elapsedSeconds?: number;
  localTeamId?: string;
  visitorTeamId?: string;
};
type FixtureDate = {
  id: string;
  date: number;
  calendarDate?: string | null;
  isLocked: boolean;
};
type MatchPlayer = {
  id: string;
  teamId: string;
  name: string;
  number?: number | null;
  isSubstitute: boolean;
};
type FixtureRosterPlayer = {
  id: string;
  playerId: string;
  teamId: string;
  name: string;
  number: number;
  isSubstitute: boolean;
};
type IndicatorType = "yellow_card" | "red_card" | "injured" | "concussion";
type ScoreAction = "try" | "conversion" | "penalty";
type MatchEventRecord = {
  id: string;
  teamId: string;
  playerId?: string | null;
  eventType: ScoreAction | IndicatorType;
  points: number;
  reason?: string | null;
  matchSecond?: number | null;
};
type SubstitutionRecord = {
  id: string;
  teamId: string;
  playerOutId?: string | null;
  playerInId?: string | null;
  status: string;
};
type EventStatValues = Record<ScoreAction | IndicatorType, number>;
type EventStats = {
  home: EventStatValues;
  away: EventStatValues;
};
type Tournament = {
  id?: string;
  name: string;
  status: string;
  season: string;
  cover: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  teams: Team[];
  fixture: FixtureMatch[];
  fixtureDates: FixtureDate[];
  players: MatchPlayer[];
  createdBy?: string;
};

const emptyEventStats = (): EventStats => {
  const values: EventStatValues = {
    try: 0,
    conversion: 0,
    penalty: 0,
    yellow_card: 0,
    red_card: 0,
    injured: 0,
    concussion: 0,
  };

  return {
    home: { ...values },
    away: { ...values },
  };
};

const isIndicatorType = (
  eventType: ScoreAction | IndicatorType,
): eventType is IndicatorType =>
  eventType === "yellow_card" ||
  eventType === "red_card" ||
  eventType === "injured" ||
  eventType === "concussion";

const buildEventStats = (
  rows: MatchEventRecord[],
  homeTeamId?: string,
  awayTeamId?: string,
): EventStats => {
  const stats = emptyEventStats();

  rows.forEach((row) => {
    const side =
      row.teamId === homeTeamId
        ? "home"
        : row.teamId === awayTeamId
          ? "away"
          : null;

    if (side) {
      stats[side][row.eventType] += 1;
    }
  });

  return stats;
};

const secondsFromMatch = (match: {
  status?: string;
  is_paused?: boolean;
  started_at?: string | null;
  elapsed_seconds?: number | null;
}) => {
  const elapsedSeconds = match.elapsed_seconds ?? 0;

  if (match.status !== "live" || match.is_paused || !match.started_at) {
    return elapsedSeconds;
  }

  return Math.max(
    0,
    elapsedSeconds +
      Math.floor((Date.now() - new Date(match.started_at).getTime()) / 1000),
  );
};

const secondsForMatch = (match?: FixtureMatch) => {
  const elapsedSeconds = match?.elapsedSeconds ?? 0;

  if (match?.status !== "live" || match.isPaused || !match.startedAt) {
    return elapsedSeconds;
  }

  return Math.max(
    0,
    elapsedSeconds +
      Math.floor((Date.now() - new Date(match.startedAt).getTime()) / 1000),
  );
};
const formatDateRange = (start?: string, end?: string) =>
  start && end
    ? `${new Date(`${start}T00:00:00`).toLocaleDateString("es-PA", { day: "numeric", month: "short" })} - ${new Date(`${end}T00:00:00`).toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric" })}`
    : "Fechas por definir";
const logoFor = (name: string) =>
  name === "Titanes"
    ? "/equipos/Titanes.png"
    : name === "Cuervos"
      ? "/equipos/cuervos.png"
      : "";
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
const timeLabel = (time?: string) => {
  if (!time) return "Por definir";
  const [hour, minute] = time.split(":").map(Number);
  return Number.isFinite(hour)
    ? `${hour > 12 ? hour - 12 : hour || 12}:${String(minute || 0).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`
    : time;
};

export default function TournamentPage() {
  const params = useParams<{ torneo: string }>();
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [section, setSection] = useState("Resumen");
  const [role, setRole] = useState("espectador");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setCurrentUserId(userData.user?.id ?? null);
      const { data } = await supabase
        .from("tournaments")
        .select("id,name,status,season,start_date,end_date,cover_url,location,created_by")
        .eq("slug", params.torneo)
        .maybeSingle();
      if (!data) return;
      const { data: links } = await supabase
        .from("tournament_teams")
        .select(
          "team_id,division_id,teams(name,logo_url),tournament_divisions(name)",
        )
        .eq("tournament_id", data.id);
      const teams = (links ?? [])
        .map((link: any) => ({
          name: link.teams?.name ?? "",
          id: link.team_id,
          divisionId: link.division_id,
          logo: link.teams?.logo_url ?? null,
          division: link.tournament_divisions?.name ?? "Sin división",
        }))
        .filter((team: Team) => team.name);
      const teamIds = teams
        .map((team) => team.id)
        .filter((teamId): teamId is string => Boolean(teamId));
      const { data: playerRows } = teamIds.length
        ? await supabase
            .from("team_players")
            .select("team_id,player_id,is_substitute,players(id,full_name,shirt_number)")
            .in("team_id", teamIds)
        : { data: [] };
      const players = (playerRows ?? [])
        .map((row: any) => ({
          id: row.player_id,
          teamId: row.team_id,
          name: row.players?.full_name ?? "",
          number: row.players?.shirt_number ?? null,
          isSubstitute: row.is_substitute ?? false,
        }))
        .filter((player: MatchPlayer) => player.id && player.name);
      const { data: fixtureRows } = await supabase
        .from("fixtures")
        .select("id,date_number,calendar_date,is_locked")
        .eq("tournament_id", data.id)
        .order("date_number");
      const fixtureIds = (fixtureRows ?? []).map((fixture) => fixture.id);
      const { data: matchRows } = fixtureIds.length
        ? await supabase
            .from("matches")
            .select("id,fixture_id,scheduled_time,local_score,visitor_score,status,period,is_paused,started_at,elapsed_seconds,local_team_id,visitor_team_id,teams!matches_local_team_id_fkey(name,logo_url),visitor:teams!matches_visitor_team_id_fkey(name,logo_url),tournament_divisions(name)")
            .in("fixture_id", fixtureIds)
        : { data: [] };
      const fixture = (matchRows ?? []).map((match: any) => ({
        id: match.id,
        fixtureId: match.fixture_id,
        localTeamId: match.local_team_id,
        visitorTeamId: match.visitor_team_id,
        calendarDate: fixtureRows?.find((item) => item.id === match.fixture_id)?.calendar_date ?? null,
        fixtureLocked: fixtureRows?.find((item) => item.id === match.fixture_id)?.is_locked ?? false,
        date: fixtureRows?.find((item) => item.id === match.fixture_id)?.date_number ?? 0,
        division: match.tournament_divisions?.name ?? "Sin división",
        local: match.teams?.name ?? "",
        visitor: match.visitor?.name ?? "",
        time: match.scheduled_time ?? undefined,
        localScore: match.local_score ?? 0,
        visitorScore: match.visitor_score ?? 0,
        status: match.status ?? "scheduled",
        period: match.period ?? "first_half",
        isPaused: match.is_paused ?? false,
        startedAt: match.started_at ?? null,
        elapsedSeconds: match.elapsed_seconds ?? 0,
      })).filter((match: FixtureMatch) => match.local && match.visitor);
      setTournament({
        id: data.id,
        name: data.name,
        status: data.status,
        season: String(data.season ?? ""),
        cover: data.cover_url ?? "",
        location: data.location ?? "",
        startDate: data.start_date ?? undefined,
        endDate: data.end_date ?? undefined,
        teams,
        fixture,
        fixtureDates: (fixtureRows ?? []).map((fixture) => ({
          id: fixture.id,
          date: fixture.date_number,
          calendarDate: fixture.calendar_date ?? null,
          isLocked: fixture.is_locked ?? false,
        })),
        players,
        createdBy: data.created_by,
      });
    };
    void load();
    const storedRole = window.localStorage.getItem("athlonx-active-role");
    if (storedRole) setRole(storedRole);
    const syncRole = (event: Event) =>
      setRole((event as CustomEvent<string>).detail);
    window.addEventListener("athlonx-role-change", syncRole);
    return () => window.removeEventListener("athlonx-role-change", syncRole);
  }, [params.torneo]);
  const divisions = useMemo(
    () =>
      Array.from(new Set(tournament?.teams.map((team) => team.division) ?? [])),
    [tournament],
  );
  if (!tournament)
    return (
      <main className="min-h-screen bg-[#f4f6f8] p-10">Cargando torneo...</main>
    );
  const teamNames = new Set(tournament.teams.map((team) => team.name));
  const matches = tournament.fixture.filter((match) => teamNames.has(match.local) && teamNames.has(match.visitor));
  const visibleTournament = { ...tournament, fixture: matches };
  const canManageTournament = tournament.createdBy === currentUserId;
  const stats = [
    ["Equipos", tournament.teams.length],
    ["Divisiones", divisions.length],
  ];
  return (
    <main className="min-h-screen bg-[#f4f6f8] px-5 py-8 text-[#17212b] lg:pl-72 lg:pr-10">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => router.push("/dashboard/torneos")}
          className="mb-5 inline-flex items-center gap-2 font-semibold text-[#4c8500]"
        >
          <ArrowLeft size={18} /> Volver a torneos
        </button>
        <header className="rounded-2xl bg-[#081522] p-6 text-white shadow-sm md:p-10">
          <p className="font-heading text-sm uppercase tracking-[.2em] text-[#B4FF45]">
            Vista pública del torneo
          </p>
          <h1 className="mt-2 font-display text-4xl uppercase md:text-6xl">
            {tournament.name}
          </h1>
          <p className="mt-4 text-slate-300">
            Temporada {tournament.season} ·{" "}
            {tournament.status === "finished" ? "Finalizado" : "Publicado"}
          </p>
          <nav className="mt-6 flex flex-wrap gap-2">
            {[
              "Resumen",
              "Equipos",
              "Jugadores",
              "Partidos",
              "Puntajes",
              "Fixtures",
            ].map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSection(item)}
                  className={`rounded-full border px-4 py-2 font-bold ${section === item ? "border-[#B4FF45] bg-[#B4FF45] text-[#081522]" : "border-white/20"}`}
                >
                  {item}
                </button>
              ),
            )}
          </nav>
        </header>
        {section === "Resumen" && <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(([title, value]) => (
            <div
              key={String(title)}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-slate-500">{title}</p>
              <p className="mt-2 text-3xl font-black">{value}</p>
            </div>
          ))}
        </div>}
        {section === "Resumen" && (
          <Summary tournament={visibleTournament} divisions={divisions} />
        )}
        {section === "Equipos" && (
          <Teams teams={tournament.teams} location={tournament.location} />
        )}
        {section === "Jugadores" && (
          <Players
            teams={tournament.teams}
            fixtureDates={tournament.fixtureDates}
            initialPlayers={tournament.players}
            canManage={canManageTournament}
          />
        )}
        {section === "Partidos" && (
          <Matches
            matches={matches}
            players={tournament.players}
            canManage={canManageTournament}
          />
        )}
        {section === "Puntajes" && (
          <Scores teams={tournament.teams} divisions={divisions} />
        )}
        {section === "Fixtures" && (
          <Fixtures
            tournamentId={tournament.id}
            startDate={tournament.startDate}
            teams={tournament.teams}
            divisions={divisions}
            matches={matches}
            fixtureDates={tournament.fixtureDates}
            canManage={canManageTournament}
          />
        )}
      </div>
    </main>
  );
}

function TeamLogo({ name, logo }: { name: string; logo?: string | null }) {
  const src = logo || logoFor(name);
  return src ? (
    <img
      src={src}
      alt={`Logo de ${name}`}
      className="mx-auto h-24 w-24 object-contain"
    />
  ) : (
    <span className="mx-auto flex h-24 w-24 items-center justify-center text-2xl font-bold text-[#70b719]">
      {initials(name)}
    </span>
  );
}
function MatchCard({ match }: { match: FixtureMatch }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 text-center">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div className="min-w-0 text-center">
          <TeamLogo name={match.local} />
          <p className="mt-2 truncate font-semibold">{match.local}</p>
          <p className="text-xs text-slate-500">{match.division}</p>
        </div>
        <div>
          <p className="font-heading text-2xl font-black italic">VS</p>
          <span className="mt-1 inline-block whitespace-nowrap rounded bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600">
            {timeLabel(match.time)}
          </span>
        </div>
        <div className="min-w-0 text-center">
          <TeamLogo name={match.visitor} />
          <p className="mt-2 truncate font-semibold">{match.visitor}</p>
          <p className="text-xs text-slate-500">{match.division}</p>
        </div>
      </div>
    </div>
  );
}
function Summary({
  tournament,
  divisions,
}: {
  tournament: Tournament;
  divisions: string[];
}) {
  return (
    <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,.9fr)]">
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-heading text-3xl font-black uppercase">
          Cronograma de partidos
        </h2>
        <p className="mt-1 text-slate-500">
          Próximos encuentros de la jornada.
        </p>
        <div className="mt-5 space-y-3">
          {tournament.fixture.slice(0, 6).map((match, index) => (
            <MatchCard key={`${match.local}-${index}`} match={match} />
          ))}
          {!tournament.fixture.length && <Empty text="El fixture aún no ha sido generado" />}
        </div>
      </article>
      <Standings teams={tournament.teams} divisions={divisions} />
    </section>
  );
}
function Teams({ teams, location }: { teams: Team[]; location?: string }) {
  const [notice, setNotice] = useState("");
  return (
    <>
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-heading text-3xl font-black uppercase">
          Equipos del torneo
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <article
              key={`${team.division}-${team.name}`}
              className="rounded-xl border border-slate-200 p-5"
            >
              <div className="flex items-center gap-5">
                <TeamLogo name={team.name} logo={team.logo} />
                <div>
                  <h3 className="text-2xl font-bold">{team.name}</h3>
                  <p className="text-sm text-[#70b719]">{team.division}</p>
                </div>
              </div>
              <div className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-500">
                <p>
                  <MapPin className="mr-2 inline" size={16} />
                  {location || "Sin ubicación registrada"}
                </p>
                <p className="mt-2">
                  <Users className="mr-2 inline" size={17} />0 miembros
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setNotice(
                    `La vista de ${team.name} estará disponible en próximas actualizaciones.`,
                  )
                }
                className="mt-5 w-full rounded-lg border border-[#70b719] px-4 py-2 font-semibold text-[#4c8500] hover:bg-[#e9fbd0]"
              >
                Visitar equipo
              </button>
            </article>
          ))}
          {!teams.length && <Empty text="0 equipos registrados" />}
        </div>
      </section>
      {notice && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-[#081522] px-5 py-4 text-center text-sm font-semibold text-white shadow-2xl"
        >
          <div className="flex items-center justify-between gap-4">
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="text-[#B4FF45]"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Players({
  teams,
  fixtureDates,
  initialPlayers,
  canManage,
}: {
  teams: Team[];
  fixtureDates: FixtureDate[];
  initialPlayers: MatchPlayer[];
  canManage: boolean;
}) {
  const [selectedFixtureId, setSelectedFixtureId] = useState(
    fixtureDates[0]?.id ?? "",
  );
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id ?? "");
  const [roster, setRoster] = useState<FixtureRosterPlayer[]>([]);
  const [editingPlayerIds, setEditingPlayerIds] = useState<Set<string>>(
    new Set(),
  );
  const [availablePlayers, setAvailablePlayers] = useState(initialPlayers);
  const [existingPlayerId, setExistingPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [shirtNumber, setShirtNumber] = useState("");
  const [isSubstitute, setIsSubstitute] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedDate = fixtureDates.find(
    (fixtureDate) => fixtureDate.id === selectedFixtureId,
  );
  const selectedTeam = teams.find((team) => team.id === selectedTeamId);
  const teamPlayers = availablePlayers.filter(
    (player) => player.teamId === selectedTeamId,
  );

  useEffect(() => {
    if (!fixtureDates.some((fixtureDate) => fixtureDate.id === selectedFixtureId)) {
      setSelectedFixtureId(fixtureDates[0]?.id ?? "");
    }
  }, [fixtureDates, selectedFixtureId]);

  useEffect(() => {
    if (!teams.some((team) => team.id === selectedTeamId)) {
      setSelectedTeamId(teams[0]?.id ?? "");
    }
  }, [teams, selectedTeamId]);

  const loadRoster = async () => {
    if (!supabase || !selectedFixtureId || !selectedTeamId) {
      setRoster([]);
      setEditingPlayerIds(new Set());
      return;
    }

    setLoading(true);
    const { data, error: rosterError } = await supabase
      .from("fixture_players")
      .select("id,team_id,player_id,shirt_number,is_substitute,players(full_name)")
      .eq("fixture_id", selectedFixtureId)
      .eq("team_id", selectedTeamId)
      .order("shirt_number");

    if (rosterError) {
      setError(rosterError.message);
      setRoster([]);
      setEditingPlayerIds(new Set());
    } else {
      setError("");
      setRoster(
        (data ?? [])
          .map((row: any) => ({
            id: row.id,
            playerId: row.player_id,
            teamId: row.team_id,
            name: row.players?.full_name ?? "Jugador sin nombre",
            number: row.shirt_number,
            isSubstitute: row.is_substitute,
          }))
          .filter((player) => player.name),
      );
      setEditingPlayerIds(new Set());
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadRoster();
  }, [selectedFixtureId, selectedTeamId]);

  const addPlayer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase || !selectedFixtureId || !selectedTeamId) return;

    const parsedNumber = Number(shirtNumber);
    if (!Number.isInteger(parsedNumber) || parsedNumber < 0 || parsedNumber > 99) {
      setError("El número debe ser un entero entre 0 y 99.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setError("Debes iniciar sesión para agregar jugadores.");
      setBusy(false);
      return;
    }

    let playerId = existingPlayerId;

    if (!playerId) {
      const trimmedName = playerName.trim();
      if (!trimmedName) {
        setError("Escribe el nombre del jugador o selecciona uno existente.");
        setBusy(false);
        return;
      }

      const { data: createdPlayer, error: playerError } = await supabase
        .from("players")
        .insert({
          full_name: trimmedName,
          shirt_number: parsedNumber,
          created_by: userData.user.id,
        })
        .select("id,full_name,shirt_number")
        .single();

      if (playerError || !createdPlayer) {
        setError(playerError?.message ?? "No se pudo crear el jugador.");
        setBusy(false);
        return;
      }

      playerId = createdPlayer.id;
      setAvailablePlayers((current) => [
        ...current,
        {
          id: createdPlayer.id,
          teamId: selectedTeamId,
          name: createdPlayer.full_name,
          number: createdPlayer.shirt_number,
          isSubstitute,
        },
      ]);
    }

    const { error: teamPlayerError } = await supabase
      .from("team_players")
      .upsert(
        {
          team_id: selectedTeamId,
          player_id: playerId,
          is_substitute: isSubstitute,
        },
        { onConflict: "team_id,player_id", ignoreDuplicates: true },
      );

    if (teamPlayerError) {
      setError(teamPlayerError.message);
      setBusy(false);
      return;
    }

    const { error: fixturePlayerError } = await supabase
      .from("fixture_players")
      .upsert(
        {
          fixture_id: selectedFixtureId,
          team_id: selectedTeamId,
          player_id: playerId,
          shirt_number: parsedNumber,
          is_substitute: isSubstitute,
        },
        { onConflict: "fixture_id,player_id" },
      );

    if (fixturePlayerError) {
      setError(fixturePlayerError.message);
    } else {
      setMessage(`${playerName || "Jugador"} agregado a la fecha seleccionada.`);
      setExistingPlayerId("");
      setPlayerName("");
      setShirtNumber("");
      setIsSubstitute(false);
      await loadRoster();
    }

    setBusy(false);
  };

  const savePlayer = async (player: FixtureRosterPlayer) => {
    if (!supabase || !canManage || !editingPlayerIds.has(player.id)) return;

    setBusy(true);
    setError("");
    const { error: saveError } = await supabase
      .from("fixture_players")
      .update({
        shirt_number: player.number,
        is_substitute: player.isSubstitute,
      })
      .eq("id", player.id);

    if (saveError) {
      setError(saveError.message);
    } else {
      setEditingPlayerIds((current) => {
        const next = new Set(current);
        next.delete(player.id);
        return next;
      });
      setMessage(`${player.name} actualizado.`);
    }

    setBusy(false);
  };

  const removePlayer = async (player: FixtureRosterPlayer) => {
    if (!supabase || !canManage) return;

    setBusy(true);
    setError("");
    const { data, error: removeError } = await supabase
      .from("fixture_players")
      .delete()
      .eq("id", player.id)
      .select("id");

    if (removeError) {
      setError(removeError.message);
    } else if (!data?.length) {
      setError("Supabase no eliminó al jugador de esta fecha.");
    } else {
      setRoster((current) => current.filter((item) => item.id !== player.id));
      setEditingPlayerIds((current) => {
        const next = new Set(current);
        next.delete(player.id);
        return next;
      });
      setMessage(`${player.name} eliminado de la fecha seleccionada.`);
    }

    setBusy(false);
  };

  if (!fixtureDates.length) {
    return (
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-heading text-3xl font-black uppercase">Jugadores</h2>
        <Empty text="Primero genera al menos un fixture para registrar jugadores por fecha." />
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-heading text-sm uppercase tracking-[.2em] text-[#70b719]">
            Plantillas por jornada
          </p>
          <h2 className="mt-1 font-heading text-3xl font-black uppercase">
            Jugadores
          </h2>
          <p className="mt-1 text-slate-500">
            Registra una nómina diferente para cada equipo y fecha.
          </p>
        </div>
        <UserPlus className="text-[#70b719]" size={28} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="font-semibold">
          Fecha del fixture
          <select
            value={selectedFixtureId}
            onChange={(event) => setSelectedFixtureId(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 font-normal"
          >
            {fixtureDates.map((fixtureDate) => (
              <option key={fixtureDate.id} value={fixtureDate.id}>
                Fecha {fixtureDate.date}
                {fixtureDate.calendarDate ? ` · ${fixtureDate.calendarDate}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="font-semibold">
          Equipo
          <select
            value={selectedTeamId}
            onChange={(event) => setSelectedTeamId(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 font-normal"
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} · {team.division}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-2xl font-black uppercase">
              {selectedTeam?.name ?? "Equipo"}
            </h3>
            <p className="text-sm text-slate-500">
              Fecha {selectedDate?.date ?? ""} · {roster.length} jugadores registrados
            </p>
          </div>
          {!canManage && (
            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600">
              Solo lectura
            </span>
          )}
        </div>

        {loading ? (
          <p className="mt-5 text-slate-500">Cargando plantilla...</p>
        ) : (
          <div className="mt-4 space-y-3">
            {roster.map((player) => (
              (() => {
                const isEditing = editingPlayerIds.has(player.id);

                return (
                  <div
                    key={player.id}
                    className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_120px_150px_auto_auto] md:items-center"
                  >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e9fbd0] font-bold text-[#4c8500]">
                    {initials(player.name)}
                  </span>
                  <div>
                    <p className="font-bold">{player.name}</p>
                    <p className="text-xs uppercase text-slate-500">
                      {player.isSubstitute ? "Suplente" : "En cancha"}
                    </p>
                  </div>
                </div>
                <label className="text-sm font-semibold">
                  Número
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={player.number}
                    disabled={!canManage || !isEditing}
                    onChange={(event) => {
                      const number = Number(event.target.value);
                      setRoster((current) =>
                        current.map((item) =>
                          item.id === player.id ? { ...item, number } : item,
                        ),
                      );
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={player.isSubstitute}
                    disabled={!canManage || !isEditing}
                    onChange={(event) => {
                      const substitute = event.target.checked;
                      setRoster((current) =>
                        current.map((item) =>
                          item.id === player.id
                            ? { ...item, isSubstitute: substitute }
                            : item,
                        ),
                      );
                    }}
                  />
                  Suplente
                </label>
                {canManage && isEditing && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void savePlayer(player)}
                    className="rounded-lg border border-[#70b719] px-3 py-2 text-sm font-bold text-[#4c8500] disabled:opacity-40"
                  >
                    Guardar
                  </button>
                )}
                {canManage && !isEditing && (
                  <button
                    type="button"
                    disabled
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-400"
                  >
                    Guardado
                  </button>
                )}
                {canManage && !isEditing && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setEditingPlayerIds((current) => {
                        const next = new Set(current);
                        next.add(player.id);
                        return next;
                      })
                    }
                    className="rounded-lg border border-[#70b719] px-3 py-2 text-sm font-bold text-[#4c8500] disabled:opacity-40"
                  >
                    Editar
                  </button>
                )}
                {canManage && isEditing && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void removePlayer(player)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600 disabled:opacity-40"
                  >
                    Eliminar
                  </button>
                )}
                {canManage && !isEditing && (
                  <button
                    type="button"
                    disabled
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-400"
                  >
                    Eliminar
                  </button>
                )}
                  </div>
                );
              })()
            ))}
            {!roster.length && (
              <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-slate-500">
                No hay jugadores registrados para este equipo en esta fecha.
              </p>
            )}
          </div>
        )}
      </div>

      {canManage && (
        <form
          onSubmit={addPlayer}
          className="mt-6 rounded-xl border border-slate-200 p-4"
        >
          <h3 className="font-heading text-2xl font-black uppercase">
            Agregar jugador
          </h3>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr_140px_auto] lg:items-end">
            <label className="font-semibold">
              Jugador existente
              <select
                value={existingPlayerId}
                onChange={(event) => setExistingPlayerId(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 font-normal"
              >
                <option value="">Crear jugador nuevo</option>
                {teamPlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="font-semibold">
              Nombre nuevo
              <input
                value={playerName}
                disabled={Boolean(existingPlayerId)}
                onChange={(event) => setPlayerName(event.target.value)}
                placeholder="Nombre completo"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 font-normal disabled:bg-slate-100"
              />
            </label>
            <label className="font-semibold">
              Número
              <input
                type="number"
                min="0"
                max="99"
                value={shirtNumber}
                onChange={(event) => setShirtNumber(event.target.value)}
                placeholder="10"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 font-normal"
              />
            </label>
            <label className="flex items-center gap-2 pb-3 font-semibold">
              <input
                type="checkbox"
                checked={isSubstitute}
                onChange={(event) => setIsSubstitute(event.target.checked)}
              />
              Suplente
            </label>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#B4FF45] px-4 py-3 font-bold text-[#081522] disabled:opacity-40"
          >
            <UserPlus size={18} />
            Agregar a esta fecha
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-4 rounded-lg bg-[#e9fbd0] p-3 text-sm font-semibold text-[#365e00]">
          {message}
        </p>
      )}
    </section>
  );
}

function Matches({
  matches,
  players,
  canManage,
}: {
  matches: FixtureMatch[];
  players: MatchPlayer[];
  canManage: boolean;
}) {
  const [selectedMatchId, setSelectedMatchId] = useState(matches[0]?.id ?? "");
  const [scores, setScores] = useState({ home: 0, away: 0 });
  const [events, setEvents] = useState<EventStats>(emptyEventStats());
  const [eventRows, setEventRows] = useState<MatchEventRecord[]>([]);
  const [substitutions, setSubstitutions] = useState<SubstitutionRecord[]>([]);
  const [matchPlayers, setMatchPlayers] = useState<MatchPlayer[]>(players);
  const [seconds, setSeconds] = useState(0);
  const secondsRef = useRef(0);
  const [running, setRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [period, setPeriod] = useState<"first_half" | "second_half">(
    "first_half",
  );
  const [syncError, setSyncError] = useState("");
  const [confirmation, setConfirmation] = useState<"start" | "finish" | null>(null);
  const [finishConfirmation, setFinishConfirmation] = useState("");
  const [pendingScore, setPendingScore] = useState<{
    side: "home" | "away";
    action: ScoreAction;
  } | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [indicatorType, setIndicatorType] = useState<IndicatorType | "change" | null>(null);
  const [indicatorReason, setIndicatorReason] = useState("");
  const [changeInId, setChangeInId] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedMatch = matches.find((item) => item.id === selectedMatchId) ?? matches[0];
  const matchId = selectedMatch?.id;
  const home = selectedMatch?.local ?? "Equipo local";
  const away = selectedMatch?.visitor ?? "Equipo visitante";
  const homeTeamId = selectedMatch?.localTeamId;
  const awayTeamId = selectedMatch?.visitorTeamId;
  const rosterPlayers = matchPlayers.length ? matchPlayers : players;
  const selectedPlayer = rosterPlayers.find(
    (player) => player.id === selectedPlayerId,
  );
  const changedInIds = new Set(
    substitutions
      .map((substitution) => substitution.playerInId)
      .filter((playerId): playerId is string => Boolean(playerId)),
  );
  const changedOutIds = new Set(
    substitutions
      .map((substitution) => substitution.playerOutId)
      .filter((playerId): playerId is string => Boolean(playerId)),
  );

  useEffect(() => {
    if (!matches.some((item) => item.id === selectedMatchId)) {
      setSelectedMatchId(matches[0]?.id ?? "");
    }
  }, [matches, selectedMatchId]);

  const refreshMatchDetails = async (currentMatchId: string) => {
    if (!supabase) return;

    const [eventResult, substitutionResult] = await Promise.all([
      supabase
        .from("match_events")
        .select("id,team_id,player_id,event_type,points,reason,match_second")
        .eq("match_id", currentMatchId)
        .order("created_at"),
      supabase
        .from("substitution_requests")
        .select("id,team_id,player_out_id,player_in_id,status")
        .eq("match_id", currentMatchId)
        .order("completed_at"),
    ]);

    if (eventResult.error) {
      setSyncError(eventResult.error.message);
    } else {
      const nextEvents = (eventResult.data ?? []).map((row: any) => ({
        id: row.id,
        teamId: row.team_id,
        playerId: row.player_id ?? null,
        eventType: row.event_type as ScoreAction | IndicatorType,
        points: row.points ?? 0,
        reason: row.reason ?? null,
        matchSecond: row.match_second ?? null,
      }));
      setEventRows(nextEvents);
      setEvents(buildEventStats(nextEvents, homeTeamId, awayTeamId));
    }

    if (substitutionResult.error) {
      setSyncError(substitutionResult.error.message);
    } else {
      setSubstitutions(
        (substitutionResult.data ?? []).map((row: any) => ({
          id: row.id,
          teamId: row.team_id,
          playerOutId: row.player_out_id ?? null,
          playerInId: row.player_in_id ?? null,
          status: row.status,
        })),
      );
    }
  };

  useEffect(() => {
    if (!matchId || !selectedMatch) {
      setScores({ home: 0, away: 0 });
      setEvents(emptyEventStats());
      setEventRows([]);
      setSubstitutions([]);
      setMatchPlayers([]);
      setSeconds(0);
      setRunning(false);
      setIsPaused(false);
      setPeriod("first_half");
      return;
    }

    const initialSeconds = secondsForMatch(selectedMatch);
    setScores({
      home: selectedMatch.localScore ?? 0,
      away: selectedMatch.visitorScore ?? 0,
    });
    setSeconds(initialSeconds);
    secondsRef.current = initialSeconds;
    setIsPaused(Boolean(selectedMatch.isPaused));
    setPeriod(selectedMatch.period ?? "first_half");
    setRunning(selectedMatch.status === "live" && !selectedMatch.isPaused);
    setConfirmation(null);
    setSelectedPlayerId(null);
    setIndicatorType(null);
    setChangeInId("");

    const refresh = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("matches")
        .select("local_score,visitor_score,status,period,is_paused,started_at,elapsed_seconds")
        .eq("id", matchId)
        .maybeSingle();

      if (error) {
        setSyncError(error.message);
      } else if (data) {
        setSyncError("");
        setScores({
          home: data.local_score ?? 0,
          away: data.visitor_score ?? 0,
        });
        setIsPaused(Boolean(data.is_paused));
        setPeriod(data.period ?? "first_half");
        setRunning(data.status === "live" && !data.is_paused);
        setSeconds(secondsFromMatch(data));
      }

      if (selectedMatch.fixtureId) {
        const { data: rosterRows, error: rosterError } = await supabase
          .from("fixture_players")
          .select("team_id,player_id,shirt_number,is_substitute,players(full_name)")
          .eq("fixture_id", selectedMatch.fixtureId)
          .in("team_id", [homeTeamId, awayTeamId].filter(Boolean));

        if (!rosterError && rosterRows?.length) {
          setMatchPlayers(
            rosterRows.map((row: any) => ({
              id: row.player_id,
              teamId: row.team_id,
              name: row.players?.full_name ?? "Jugador sin nombre",
              number: row.shirt_number,
              isSubstitute: row.is_substitute,
            })),
          );
        } else {
          setMatchPlayers(
            players.filter(
              (player) =>
                player.teamId === homeTeamId || player.teamId === awayTeamId,
            ),
          );
        }
      }

      await refreshMatchDetails(matchId);
    };

    void refresh();
    const polling = window.setInterval(() => {
      void refresh();
    }, 2000);

    const channel = supabase
      ?.channel(`match-details-${matchId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, (payload) => {
        const updated = payload.new as {
          local_score?: number;
          visitor_score?: number;
          status?: string;
          period?: "first_half" | "second_half";
          is_paused?: boolean;
          started_at?: string | null;
          elapsed_seconds?: number;
        };
        setScores({
          home: updated.local_score ?? 0,
          away: updated.visitor_score ?? 0,
        });
        setIsPaused(Boolean(updated.is_paused));
        setPeriod(updated.period ?? "first_half");
        setRunning(updated.status === "live" && !updated.is_paused);
        setSeconds(secondsFromMatch(updated));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "match_events", filter: `match_id=eq.${matchId}` }, () => {
        void refreshMatchDetails(matchId);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "substitution_requests", filter: `match_id=eq.${matchId}` }, () => {
        void refreshMatchDetails(matchId);
      })
      .subscribe();

    return () => {
      window.clearInterval(polling);
      if (channel) void supabase?.removeChannel(channel);
    };
  }, [matchId]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  useEffect(() => {
    if (!canManage || !supabase || !matchId || !running) return;
    const heartbeat = window.setInterval(async () => {
      const { error } = await supabase
        .from("matches")
        .update({
          status: "live",
          is_paused: false,
          elapsed_seconds: secondsRef.current,
        })
        .eq("id", matchId);
      if (error) setSyncError(error.message);
    }, 5000);
    return () => window.clearInterval(heartbeat);
  }, [canManage, matchId, running]);

  const startMatch = async () => {
    if (!supabase || !matchId) return;
    setBusy(true);
    const startedAt = new Date().toISOString();
    const { error } = await supabase
      .from("matches")
      .update({
        status: "live",
        is_paused: false,
        started_at: startedAt,
        elapsed_seconds: secondsRef.current,
      })
      .eq("id", matchId);

    if (error) {
      setSyncError(error.message);
    } else {
      setRunning(true);
      setIsPaused(false);
      setConfirmation(null);
    }
    setBusy(false);
  };

  const pauseMatch = async () => {
    if (!supabase || !matchId || !running) return;

    setBusy(true);
    const { error } = await supabase
      .from("matches")
      .update({
        is_paused: true,
        elapsed_seconds: secondsRef.current,
      })
      .eq("id", matchId);

    if (error) {
      setSyncError(error.message);
    } else {
      setRunning(false);
      setIsPaused(true);
    }

    setBusy(false);
  };

  const changePeriod = async (
    nextPeriod: "first_half" | "second_half",
  ) => {
    if (!supabase || !matchId || !canManage || isFinished) return;

    setPeriod(nextPeriod);
    setBusy(true);
    const { error } = await supabase
      .from("matches")
      .update({ period: nextPeriod })
      .eq("id", matchId);

    if (error) {
      setSyncError(error.message);
    }

    setBusy(false);
  };

  const finishMatch = async () => {
    if (!supabase || !matchId || finishConfirmation !== "Confirmar") return;
    setBusy(true);
    const { error } = await supabase
      .from("matches")
      .update({
        status: "finished",
        is_paused: false,
        finished_at: new Date().toISOString(),
        elapsed_seconds: secondsRef.current,
      })
      .eq("id", matchId);

    if (error) {
      setSyncError(error.message);
    } else {
      setRunning(false);
      setIsPaused(false);
      setConfirmation(null);
      setFinishConfirmation("");
    }
    setBusy(false);
  };

  const registerScore = async () => {
    if (!pendingScore || !supabase || !matchId || !selectedMatch || !running) return;
    const points = pendingScore.action === "try"
      ? 5
      : pendingScore.action === "conversion"
        ? 2
        : 3;
    const nextScores = {
      home: pendingScore.side === "home" ? scores.home + points : scores.home,
      away: pendingScore.side === "away" ? scores.away + points : scores.away,
    };
    const teamId = pendingScore.side === "home" ? homeTeamId : awayTeamId;
    const { data: userData } = await supabase.auth.getUser();

    setBusy(true);
    const { error: scoreError } = await supabase
      .from("matches")
      .update({
        local_score: nextScores.home,
        visitor_score: nextScores.away,
      })
      .eq("id", matchId);

    if (scoreError) {
      setSyncError(scoreError.message);
      setBusy(false);
      return;
    }

    if (teamId && userData.user) {
      const { error: eventError } = await supabase
        .from("match_events")
        .insert({
          match_id: matchId,
          team_id: teamId,
          event_type: pendingScore.action,
          points,
          match_second: secondsRef.current,
          created_by: userData.user.id,
        });
      if (eventError) setSyncError(eventError.message);
    }

    setScores(nextScores);
    setPendingScore(null);
    await refreshMatchDetails(matchId);
    setBusy(false);
  };

  const saveIndicator = async () => {
    if (!indicatorType || indicatorType === "change" || !indicatorReason.trim() || !selectedPlayer || !supabase || !matchId) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    setBusy(true);
    const { error } = await supabase
      .from("match_events")
      .insert({
        match_id: matchId,
        team_id: selectedPlayer.teamId,
        player_id: selectedPlayer.id,
        event_type: indicatorType,
        points: 0,
        reason: indicatorReason.trim(),
        match_second: secondsRef.current,
        created_by: userData.user.id,
      });

    if (error) {
      setSyncError(error.message);
    } else {
      setIndicatorType(null);
      setIndicatorReason("");
      await refreshMatchDetails(matchId);
    }
    setBusy(false);
  };

  const performSubstitution = async () => {
    if (
      !selectedPlayer ||
      !changeInId ||
      !supabase ||
      !matchId ||
      !selectedMatch.fixtureId
    ) {
      return;
    }

    const substitute = rosterPlayers.find((player) => player.id === changeInId);
    if (!substitute) return;

    setBusy(true);
    const { error } = await supabase.rpc("complete_fixture_substitution", {
      p_match_id: matchId,
      p_fixture_id: selectedMatch.fixtureId,
      p_team_id: selectedPlayer.teamId,
      p_player_out_id: selectedPlayer.id,
      p_player_in_id: substitute.id,
    });

    if (error) {
      setSyncError(error.message);
    } else {
      setMatchPlayers((current) =>
        current.map((player) => {
          if (player.id === selectedPlayer.id) {
            return { ...player, isSubstitute: true };
          }

          if (player.id === substitute.id) {
            return { ...player, isSubstitute: false };
          }

          return player;
        }),
      );
      setSelectedPlayerId(null);
      setIndicatorType(null);
      setChangeInId("");
      await refreshMatchDetails(matchId);
    }
    setBusy(false);
  };

  const actionButton = (
    side: "home" | "away",
    action: ScoreAction,
    label: string,
  ) => canManage && running ? (
    <button
      type="button"
      onClick={() => setPendingScore({ side, action })}
      className="rounded-lg border border-[#70b719] px-3 py-2 text-xs font-bold text-[#4c8500] hover:bg-[#e9fbd0]"
    >
      + {label}
    </button>
  ) : null;

  const renderIndicatorIcon = (type: IndicatorType | "change") => {
    if (type === "yellow_card") return <Square size={14} fill="#facc15" className="text-yellow-400" />;
    if (type === "red_card") return <Square size={14} fill="#ef4444" className="text-red-500" />;
    if (type === "injured") return <Heart size={15} className="text-red-500" />;
    if (type === "concussion") return <Brain size={15} className="text-orange-400" />;
    return <ArrowRightLeft size={15} className="text-white" />;
  };

  const indicatorLabel = (type: IndicatorType | "change") => ({
    yellow_card: "Tarjeta amarilla",
    red_card: "Tarjeta roja",
    injured: "Jugador lesionado",
    concussion: "Conmoción cerebral",
    change: "Solicitud de cambio",
  }[type]);

  const playerIndicators = (playerId: string) =>
    eventRows.filter(
      (
        event,
      ): event is MatchEventRecord & { eventType: IndicatorType } =>
        event.playerId === playerId && isIndicatorType(event.eventType),
    );

  const renderPlayer = (player: MatchPlayer, isSubstitute: boolean) => {
    const indicators = playerIndicators(player.id);
    const isSelected = selectedPlayerId === player.id;
    const hasChange = changedOutIds.has(player.id);
    return (
      <div key={player.id}>
        <button
          type="button"
          disabled={!canManage}
          onClick={() => {
            setSelectedPlayerId(isSelected ? null : player.id);
            setIndicatorType(null);
            setIndicatorReason("");
            setChangeInId("");
          }}
          className="flex w-full items-center gap-2 rounded-lg bg-[#0b1b29] px-3 py-2 text-left text-sm hover:bg-[#173247] disabled:cursor-default"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e9fbd0] text-xs font-bold text-[#4c8500]">
            {player.number ?? "-"}
          </span>
          <span className="min-w-0 flex-1 truncate">{player.name}</span>
          {isSubstitute && hasChange && <ArrowRightLeft size={15} className="text-white" aria-label="Cambio realizado" />}
          <span className="flex items-center gap-1">
            {indicators.map((indicator) => (
              <span key={indicator.id} aria-label={indicatorLabel(indicator.eventType)}>
                {renderIndicatorIcon(indicator.eventType)}
              </span>
            ))}
          </span>
        </button>
        {isSelected && canManage && (
          <div className="rounded-b-lg border border-t-0 border-white/10 bg-[#10283a] p-3">
            <p className="text-[11px] font-bold uppercase tracking-[.2em] text-slate-400">Acciones para {player.name}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(["yellow_card", "red_card", "injured", "concussion"] as IndicatorType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setIndicatorType(type)}
                  className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-left text-xs hover:bg-[#173247]"
                >
                  {renderIndicatorIcon(type)}
                  {indicatorLabel(type)}
                </button>
              ))}
              {!isSubstitute && (
                <button
                  type="button"
                  onClick={() => setIndicatorType("change")}
                  className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-left text-xs hover:bg-[#173247]"
                >
                  {renderIndicatorIcon("change")}
                Solicitud de cambio
                </button>
              )}
            </div>

            {indicators.length > 0 && (
              <div className="mt-3 rounded-lg border border-white/10 bg-[#0b1b29] p-3">
                <p className="text-xs font-bold uppercase tracking-[.15em] text-slate-400">
                  Motivos registrados
                </p>
                <div className="mt-2 space-y-2">
                  {indicators.map((indicator) => (
                    <p key={indicator.id} className="text-sm text-slate-200">
                      <span className="inline-flex items-center gap-2 font-semibold">
                        {renderIndicatorIcon(indicator.eventType)}:
                      </span>{" "}
                      {indicator.reason?.trim() || "Sin motivo registrado."}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {indicatorType && indicatorType !== "change" && (
              <div className="mt-3 rounded-lg border border-white/10 bg-[#0b1b29] p-3">
                <p className="text-sm font-semibold">Confirma {indicatorLabel(indicatorType).toLowerCase()}</p>
                <textarea
                  value={indicatorReason}
                  onChange={(event) => setIndicatorReason(event.target.value)}
                  placeholder="Indica el motivo"
                  rows={3}
                  className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-[#142332] px-3 py-2 text-sm text-white placeholder:text-slate-500"
                />
                <button
                  type="button"
                  disabled={busy || !indicatorReason.trim()}
                  onClick={saveIndicator}
                  className="mt-2 rounded-lg bg-[#B4FF45] px-3 py-2 text-xs font-bold text-[#081522] disabled:opacity-40"
                >
                  Confirmar indicador
                </button>
              </div>
            )}

            {indicatorType === "change" && (
              <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-[#0b1b29] p-3">
                <p className="text-sm font-semibold">Selecciona el cambio</p>
                <select value={player.id} disabled className="w-full rounded-lg border border-white/10 bg-[#142332] px-3 py-2 text-sm text-white disabled:opacity-80">
                  <option value={player.id}>{player.name} sale</option>
                </select>
                <select value={changeInId} onChange={(event) => setChangeInId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-[#142332] px-3 py-2 text-sm text-white">
                  <option value="">Seleccionar suplente que entra</option>
                  {rosterPlayers
                    .filter((item) => item.teamId === player.teamId && item.isSubstitute && !changedInIds.has(item.id))
                    .map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <button
                  type="button"
                  disabled={busy || !changeInId}
                  onClick={performSubstitution}
                  className="flex items-center gap-2 rounded-lg bg-[#B4FF45] px-3 py-2 text-xs font-bold text-[#081522] disabled:opacity-40"
                >
                  <ArrowRightLeft size={14} /> Realizar cambio
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderTeamPlayers = (teamId: string | undefined, teamName: string) => {
    const teamPlayers = rosterPlayers.filter((player) => player.teamId === teamId);
    const fieldPlayers = teamPlayers.filter(
      (player) =>
        (!player.isSubstitute && !changedOutIds.has(player.id)) ||
        changedInIds.has(player.id),
    );
    const substitutes = teamPlayers.filter(
      (player) =>
        (player.isSubstitute && !changedInIds.has(player.id)) ||
        changedOutIds.has(player.id),
    );
    return (
      <div className="rounded-xl border border-white/10 bg-[#142332] p-4">
        <p className="font-heading text-sm font-bold uppercase tracking-wider">{teamName}</p>
        <p className="mt-3 text-xs uppercase text-slate-400">En cancha</p>
        <div className="mt-2 space-y-2">
          {fieldPlayers.map((player) => renderPlayer(player, false))}
          {!fieldPlayers.length && <p className="rounded-lg bg-[#0b1b29] px-3 py-2 text-sm text-slate-500">No hay jugadores registrados.</p>}
        </div>
        <p className="mt-3 text-xs uppercase text-slate-400">Suplentes</p>
        <div className="mt-2 space-y-2">
          {substitutes.map((player) => renderPlayer(player, true))}
          {!substitutes.length && <p className="rounded-lg bg-[#0b1b29] px-3 py-2 text-sm text-slate-500">No hay suplentes registrados.</p>}
        </div>
      </div>
    );
  };

  if (!matches.length) {
    return (
      <section className="mt-6 rounded-2xl bg-[#081522] p-4 text-white shadow-sm sm:p-6">
        <Empty text="No hay partidos registrados en Supabase" />
      </section>
    );
  }

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const isFinished = selectedMatch?.status === "finished" && !running;
  const statusLabel = running
    ? "EN VIVO"
    : isPaused
      ? "PAUSADO"
      : isFinished
        ? "FINALIZADO"
        : "PROGRAMADO";
  const statusClass = running
    ? "border-[#B4FF45] text-[#B4FF45]"
    : isPaused
      ? "border-yellow-300 text-yellow-200"
      : isFinished
        ? "border-slate-500 text-slate-300"
        : "border-white/20 text-slate-300";

  return (
    <>
      <section className="mt-6 rounded-2xl bg-[#081522] p-4 text-white shadow-sm sm:p-6">
        {syncError && <p role="alert" className="mb-4 rounded-lg border border-red-300/40 bg-red-950/40 px-3 py-2 text-xs text-red-200">No se pudo sincronizar el partido: {syncError}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <p className="font-heading text-xs uppercase tracking-[.25em] text-slate-400">Torneo sevens</p>
            <h2 className="font-display text-3xl uppercase">Partidos</h2>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass}`}>{statusLabel}</span>
        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-[#10283a] p-3">
          <label className="block text-xs font-bold uppercase tracking-[.2em] text-slate-400" htmlFor="match-selector">Seleccionar partido</label>
          <select
            id="match-selector"
            value={selectedMatchId}
            onChange={(event) => setSelectedMatchId(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/10 bg-[#142332] px-3 py-3 text-sm text-white"
          >
            {matches.map((item, index) => (
              <option key={item.id ?? index} value={item.id}>{`Fecha ${item.date}: ${item.local} vs. ${item.visitor} · ${timeLabel(item.time)}`}</option>
            ))}
          </select>
        </div>

        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
          <div>
            <TeamLogo name={home} />
            <p className="mt-2 font-heading text-lg font-bold">{home}</p>
            <p className="font-display text-5xl text-[#B4FF45]">{scores.home}</p>
            <div className="mt-3 grid grid-cols-3 gap-1">
              {actionButton("home", "try", "Try")}
              {actionButton("home", "conversion", "Conversión")}
              {actionButton("home", "penalty", "Penal")}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-[.15em] text-slate-400">
              Período
              <select
                value={period}
                disabled={!canManage || isFinished || busy}
                onChange={(event) =>
                  void changePeriod(
                    event.target.value as "first_half" | "second_half",
                  )
                }
                className="mt-2 block rounded-lg border border-white/10 bg-[#142332] px-3 py-2 text-sm text-white disabled:opacity-60"
              >
                <option value="first_half">Primer tiempo</option>
                <option value="second_half">Segundo tiempo</option>
              </select>
            </label>
            <p className="font-display text-5xl">{clock}</p>
            {canManage && running && (
              <div className="mt-3 flex flex-wrap justify-center gap-1">
                <button type="button" onClick={() => setSeconds((value) => Math.max(0, value - 10))} className="rounded border border-white/20 px-2 py-1 text-xs"><Minus size={12} className="inline" /> 10s</button>
                <button type="button" onClick={() => setSeconds((value) => value + 10)} className="rounded border border-white/20 px-2 py-1 text-xs"><Plus size={12} className="inline" /> 10s</button>
                <button type="button" disabled={busy} onClick={() => void pauseMatch()} className="rounded border border-yellow-300 px-2 py-1 text-xs text-yellow-200 disabled:opacity-40">Pausar</button>
              </div>
            )}
            {canManage && !running && !isFinished && (
              <button type="button" onClick={() => setConfirmation("start")} className="mt-3 rounded-lg border border-[#B4FF45] px-4 py-2 text-sm font-bold text-[#B4FF45]">
                {isPaused ? "Reanudar partido" : "Iniciar partido"}
              </button>
            )}
            {canManage && (running || isPaused) && (
              <button type="button" onClick={() => setConfirmation("finish")} className="mt-3 rounded-lg border border-red-300 px-4 py-2 text-sm font-bold text-red-300">Finalizar partido</button>
            )}
          </div>
          <div>
            <TeamLogo name={away} />
            <p className="mt-2 font-heading text-lg font-bold">{away}</p>
            <p className="font-display text-5xl text-[#B4FF45]">{scores.away}</p>
            <div className="mt-3 grid grid-cols-3 gap-1">
              {actionButton("away", "try", "Try")}
              {actionButton("away", "conversion", "Conversión")}
              {actionButton("away", "penalty", "Penal")}
            </div>
          </div>
        </div>

        {confirmation === "start" && (
          <div className="mt-4 rounded-xl border border-[#B4FF45] bg-[#e9fbd0] p-4 text-[#365e00]">
            <p className="font-bold">
              ¿Confirmas {isPaused ? "reanudar" : "iniciar"} el partido?
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={busy} onClick={startMatch} className="rounded-lg bg-[#081522] px-3 py-2 text-sm font-bold text-white disabled:opacity-40">Confirmar inicio</button>
              <button type="button" onClick={() => setConfirmation(null)} className="rounded-lg border border-[#365e00] px-3 py-2 text-sm font-bold">Cancelar</button>
            </div>
          </div>
        )}

        {confirmation === "finish" && (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-950/30 p-4">
            <p className="font-bold text-red-200">¿Confirmas finalizar el partido?</p>
            <p className="mt-1 text-sm text-red-200/80">Escribe exactamente Confirmar para habilitar la finalización.</p>
            <input value={finishConfirmation} onChange={(event) => setFinishConfirmation(event.target.value)} placeholder="Confirmar" className="mt-3 w-full rounded-lg border border-red-300/50 bg-[#142332] px-3 py-2 text-sm text-white placeholder:text-slate-500" />
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={busy || finishConfirmation !== "Confirmar"} onClick={finishMatch} className="rounded-lg bg-red-500 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">Confirmar finalización</button>
              <button type="button" onClick={() => { setConfirmation(null); setFinishConfirmation(""); }} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-bold text-red-200">Cancelar</button>
            </div>
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-xl border border-white/10">
          <div className="bg-[#10283a] p-3 text-center font-heading uppercase tracking-[.25em] text-slate-300">Estadísticas</div>
          <div className="grid grid-cols-[1fr_1.5fr_1fr] bg-[#142332] px-4 py-3 text-center text-sm font-bold"><span>{home}</span><span></span><span>{away}</span></div>
          {([
            ["try", "Tries"],
            ["conversion", "Conversiones"],
            ["penalty", "Penales"],
            ["yellow_card", "Tarjetas amarillas"],
            ["red_card", "Tarjetas rojas"],
            ["injured", "Lesiones"],
            ["concussion", "Conmociones"],
          ] as const).map(([key, label]) => (
            <div key={key} className="grid grid-cols-[1fr_1.5fr_1fr] border-t border-white/10 px-4 py-3 text-center">
              <span>{events.home[key]}</span>
              <span className="text-slate-400">{label}</span>
              <span>{events.away[key]}</span>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_1.5fr_1fr] border-t border-white/10 px-4 py-3 text-center"><span>{substitutions.filter((item) => item.teamId === homeTeamId).length}</span><span className="text-slate-400">Cambios</span><span>{substitutions.filter((item) => item.teamId === awayTeamId).length}</span></div>
        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-[#142332] p-4">
          <p className="font-heading text-xs uppercase tracking-[.25em] text-slate-400">Indicadores de jugadores</p>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
            <span className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2"><Square size={14} fill="#facc15" className="text-yellow-400" /> Tarjeta amarilla</span>
            <span className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2"><Square size={14} fill="#ef4444" className="text-red-500" /> Tarjeta roja</span>
            <span className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2"><Heart size={15} className="text-red-500" /> Jugador lesionado</span>
            <span className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2"><Brain size={15} className="text-orange-400" /> Conmoción cerebral</span>
            <span className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2"><ArrowRightLeft size={15} className="text-white" /> Cambio realizado</span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {renderTeamPlayers(homeTeamId, home)}
          {renderTeamPlayers(awayTeamId, away)}
        </div>

        {pendingScore && (
          <div className="mt-4 rounded-xl border border-[#B4FF45] bg-[#e9fbd0] p-3 text-sm text-[#365e00]">
            <p>Confirmar {pendingScore.action} para {pendingScore.side === "home" ? home : away}.</p>
            <div className="mt-2 flex gap-2">
              <button type="button" disabled={busy} onClick={registerScore} className="rounded-lg bg-[#081522] px-3 py-2 font-bold text-white disabled:opacity-40"><Check size={14} className="mr-1 inline" /> Aplicar</button>
              <button type="button" onClick={() => setPendingScore(null)} className="rounded-lg border border-[#365e00] px-3 py-2 font-bold">Cancelar</button>
            </div>
          </div>
        )}
      </section>
      <UpcomingMatches matches={matches} />
    </>
  );
}

function UpcomingMatches({ matches }: { matches: FixtureMatch[] }) {
  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-3xl uppercase">Próximos partidos</h2>
          <p className="text-slate-500">Agenda de la siguiente jornada.</p>
        </div>
        <CalendarDays className="text-[#70b719]" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {matches.slice(0, 3).map((match, index) => (
          <article
            key={`${match.local}-${match.visitor}-${index}`}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              PROGRAMADO
            </span>
            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="min-w-0 text-center">
                <TeamLogo name={match.local} />
                <p className="mt-2 truncate text-sm font-bold">{match.local}</p>
              </div>
              <div className="text-center">
                <p className="font-bold">{timeLabel(match.time)}</p>
                <p className="text-xs text-slate-500">{match.division}</p>
              </div>
              <div className="min-w-0 text-center">
                <TeamLogo name={match.visitor} />
                <p className="mt-2 truncate text-sm font-bold">{match.visitor}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
              <span>
                <MapPin className="mr-1 inline" size={15} />
                Cancha principal
              </span>
              <span>Fecha {match.date}</span>
            </div>
            <button
              type="button"
              className="mt-4 w-full rounded-lg border border-[#70b719] px-4 py-2 font-semibold text-[#4c8500] hover:bg-[#e9fbd0]"
            >
              Ver en el cronograma · Próximamente
            </button>
          </article>
        ))}
      </div>
      {!matches.length && <Empty text="El fixture aún no ha sido generado" />}
    </section>
  );
}
function Standings({
  teams,
  divisions,
}: {
  teams: Team[];
  divisions: string[];
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-heading text-3xl font-black uppercase">
        Tabla de posiciones
      </h2>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {divisions.map((division, index) => (
          <span
            key={division}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold ${index === 0 ? "bg-[#081522] text-white" : "bg-slate-100 text-slate-500"}`}
          >
            {division}
          </span>
        ))}
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              {[
                "Pos.",
                "Equipo",
                "PTS",
                "PJ",
                "G",
                "E",
                "P",
                "+PT",
                "-PT",
                "DIF",
              ].map((heading, index) => (
                <th
                  key={heading}
                  className={`px-3 py-3 ${index > 1 ? "text-center" : "text-left"} ${heading === "PTS" ? "bg-[#e9fbd0]" : ""}`}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((team, index) => (
              <tr
                key={`${team.division}-${team.name}`}
                className="border-b border-slate-100"
              >
                <td className="px-3 py-4 font-bold text-[#70b719]">
                  {index + 1}
                </td>
                <td className="px-3 py-4 font-semibold">{team.name}</td>
                {["0", "0", "0", "0", "0", "0", "0"].map((value, cell) => (
                  <td
                    key={cell}
                    className={`px-3 py-4 text-center ${cell === 0 ? "bg-[#f0f8e8] text-lg font-black text-[#4c8500]" : "text-slate-500"}`}
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!teams.length && <Empty text="0 equipos registrados" />}
      </div>
    </article>
  );
}

function Scores({ teams, divisions }: { teams: Team[]; divisions: string[] }) {
  return (
    <div className="mt-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="font-heading text-sm uppercase tracking-[.2em] text-[#70b719]">Seguimiento de la competencia</p>
        <h1 className="font-display text-4xl uppercase sm:text-5xl">Puntajes</h1>
        <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <p className="text-slate-500">Consulta la clasificación, resultados recientes y líderes de la liga.</p>
          <select className="rounded-xl border border-[#70b719] bg-white px-4 py-3 text-sm font-semibold text-[#243650] shadow-sm">
            <option>Todas las fechas</option>
            {Array.from(new Set(teams.map((team) => team.division))).map((division) => <option key={division}>{division}</option>)}
          </select>
        </div>
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,.8fr)]">
        <Standings teams={teams} divisions={divisions} />
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-display text-3xl uppercase">Líderes</h2>
          <p className="mt-1 text-slate-500">Destacados del torneo.</p>
          <div className="mt-5 space-y-3">
            {[["Máximo anotador", teams[0]?.name || "Sin resultados", "0 puntos", "bg-[#e9fbd0]"], ["Más tries", "Sin resultados", "0 tries", "bg-[#eef3ff]"], ["Mejor defensa", teams[1]?.name || "Sin resultados", "0 puntos recibidos", "bg-[#fff3d9]"]].map(([title, name, value, color]) => <div key={title} className={`rounded-xl p-4 ${color}`}><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p><p className="mt-1 text-lg font-bold">{name}</p><p className="text-sm text-slate-600">{value}</p></div>)}
          </div>
        </article>
      </section>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-display text-3xl uppercase">Resultados recientes</h2>
        <p className="mt-1 text-slate-500">Partidos finalizados por fecha.</p>
        <Empty text="No hay resultados registrados" />
      </section>
    </div>
  )
}
type PlannedMatch = {
  date: number;
  division: string;
  local: Team;
  visitor: Team;
};

type RoundRobinPair = {
  round: number;
  division: string;
  local: Team;
  visitor: Team;
};

function Fixtures({
  tournamentId,
  startDate,
  teams,
  divisions,
  matches,
  fixtureDates: initialFixtureDates,
  canManage,
}: {
  tournamentId?: string;
  startDate?: string;
  teams: Team[];
  divisions: string[];
  matches: FixtureMatch[];
  fixtureDates: FixtureDate[];
  canManage: boolean;
}) {
  const [fixtureMatches, setFixtureMatches] = useState(matches);
  const [fixtureRecords, setFixtureRecords] = useState(initialFixtureDates);
  const [mode, setMode] = useState<"automatic" | "manual">("automatic");
  const [totalDates, setTotalDates] = useState("3");
  const [matchesPerDate, setMatchesPerDate] = useState("6");
  const [selectedDivision, setSelectedDivision] = useState(divisions[0] ?? "");
  const [manualDate, setManualDate] = useState("1");
  const [manualLocal, setManualLocal] = useState("");
  const [manualVisitor, setManualVisitor] = useState("");
  const [manualTime, setManualTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [printDate, setPrintDate] = useState<number | null>(null);

  useEffect(() => {
    setFixtureMatches(matches);
    setFixtureRecords(initialFixtureDates);
  }, [matches, initialFixtureDates]);

  const divisionTeams = teams.filter((team) => team.division === selectedDivision);
  const fixtureDateMap = new Map<number, FixtureDate>();
  fixtureRecords.forEach((fixture) => fixtureDateMap.set(fixture.date, fixture));
  fixtureMatches.forEach((match) => {
    if (!fixtureDateMap.has(match.date) && match.fixtureId) {
      fixtureDateMap.set(match.date, {
        id: match.fixtureId,
        date: match.date,
        calendarDate: match.calendarDate,
        isLocked: match.fixtureLocked ?? false,
      });
    }
  });
  const fixtureDates = Array.from(fixtureDateMap.values()).sort(
    (first, second) => first.date - second.date,
  );
  const lockedDates = new Set(
    fixtureDates
      .filter((fixture) => fixture.isLocked)
      .map((fixture) => fixture.date),
  );
  const printableMatches = fixtureMatches.filter(
    (match) => match.date === printDate,
  );

  const generateAutomatic = async () => {
    if (!supabase || !tournamentId) {
      setError("El torneo no tiene un identificador válido de Supabase.");
      return;
    }
    if (fixtureMatches.length) {
      setError("Este torneo ya tiene partidos. No se puede regenerar encima del fixture existente.");
      return;
    }

    const requestedDates = Number(totalDates);
    const requestedMatchesPerDate = Number(matchesPerDate);
    if (!Number.isInteger(requestedDates) || requestedDates < 1) {
      setError("Indica una cantidad válida de fechas.");
      return;
    }
    if (!Number.isInteger(requestedMatchesPerDate) || requestedMatchesPerDate < 1) {
      setError("Indica una cantidad válida de partidos por fecha.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const plan = buildAutomaticFixturePlan(
        teams,
        requestedDates,
        requestedMatchesPerDate,
      );

      if (!plan.length) {
        throw new Error("Agrega al menos dos equipos a una misma división.");
      }

      const createdMatches: FixtureMatch[] = [];
      const createdFixtures: FixtureDate[] = [];
      const planDates = Array.from(new Set(plan.map((match) => match.date)));

      for (const dateNumber of planDates) {
        const existingFixture = fixtureRecords.find(
          (fixture) => fixture.date === dateNumber,
        );
        let fixtureId = existingFixture?.id;

        if (existingFixture?.isLocked) {
          throw new Error(`La Fecha ${dateNumber} ya está guardada. Presiona Editar fixture antes de regenerarla.`);
        }

        if (!fixtureId) {
          const { data: fixtureRow, error: fixtureError } = await supabase
            .from("fixtures")
            .insert({
              tournament_id: tournamentId,
              date_number: dateNumber,
              calendar_date: calendarDateForFixture(startDate, dateNumber),
              generated_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (fixtureError || !fixtureRow) {
            throw new Error(fixtureError?.message ?? `No se pudo crear la fecha ${dateNumber}.`);
          }

          fixtureId = fixtureRow.id;
        }

        const calendarDate = existingFixture?.calendarDate ?? calendarDateForFixture(startDate, dateNumber);
        createdFixtures.push({
          id: fixtureId,
          date: dateNumber,
          calendarDate,
          isLocked: false,
        });

        for (const plannedMatch of plan.filter((match) => match.date === dateNumber)) {
          if (!plannedMatch.local.id || !plannedMatch.visitor.id) {
            throw new Error("Todos los equipos deben tener un ID de Supabase.");
          }

          const { data: matchRow, error: matchError } = await supabase
            .from("matches")
            .insert({
              fixture_id: fixtureId,
              division_id: teams.find((team) => team.id === plannedMatch.local.id)?.divisionId ?? null,
              local_team_id: plannedMatch.local.id,
              visitor_team_id: plannedMatch.visitor.id,
              status: "scheduled",
              local_score: 0,
              visitor_score: 0,
              elapsed_seconds: 0,
            })
            .select("id")
            .single();

          if (matchError || !matchRow) {
            throw new Error(matchError?.message ?? "No se pudo crear un partido.");
          }

          createdMatches.push({
            id: matchRow.id,
            fixtureId,
            date: dateNumber,
            calendarDate: calendarDateForFixture(startDate, dateNumber),
            fixtureLocked: false,
            division: plannedMatch.division,
            local: plannedMatch.local.name,
            visitor: plannedMatch.visitor.name,
            localTeamId: plannedMatch.local.id,
            visitorTeamId: plannedMatch.visitor.id,
            time: undefined,
            localScore: 0,
            visitorScore: 0,
            status: "scheduled",
            startedAt: null,
            elapsedSeconds: 0,
          });
        }
      }

      setFixtureRecords((current) => {
        const records = new Map(current.map((fixture) => [fixture.id, fixture]));
        createdFixtures.forEach((fixture) => records.set(fixture.id, fixture));
        return Array.from(records.values());
      });
      setFixtureMatches(createdMatches);
      setMessage(`Fixture generado: ${createdMatches.length} partidos en ${new Set(createdMatches.map((match) => match.date)).size} fechas.`);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "No se pudo generar el fixture.");
    } finally {
      setBusy(false);
    }
  };

  const addManualMatch = async () => {
    if (!supabase || !tournamentId) {
      setError("El torneo no tiene un identificador válido de Supabase.");
      return;
    }

    const localTeam = divisionTeams.find((team) => team.id === manualLocal);
    const visitorTeam = divisionTeams.find((team) => team.id === manualVisitor);
    const dateNumber = Number(manualDate);

    if (!localTeam || !visitorTeam || localTeam.id === visitorTeam.id) {
      setError("Selecciona dos equipos diferentes de la misma división.");
      return;
    }
    if (!Number.isInteger(dateNumber) || dateNumber < 1) {
      setError("Indica una fecha válida.");
      return;
    }
    if (lockedDates.has(dateNumber)) {
      setError("Esta fecha está guardada. Presiona Editar fixture para agregar un partido.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");
    try {
      let fixtureId = fixtureMatches.find((match) => match.date === dateNumber)?.fixtureId;
      if (!fixtureId) {
        const { data: existingFixture, error: fixtureLookupError } = await supabase
          .from("fixtures")
          .select("id")
          .eq("tournament_id", tournamentId)
          .eq("date_number", dateNumber)
          .maybeSingle();

        if (fixtureLookupError) throw new Error(fixtureLookupError.message);
        fixtureId = existingFixture?.id;
      }
      if (!fixtureId) {
        const { data: fixtureRow, error: fixtureError } = await supabase
          .from("fixtures")
          .insert({
            tournament_id: tournamentId,
            date_number: dateNumber,
            calendar_date: calendarDateForFixture(startDate, dateNumber),
          })
          .select("id")
          .single();
        if (fixtureError || !fixtureRow) throw new Error(fixtureError?.message ?? "No se pudo crear la fecha.");
        fixtureId = fixtureRow.id;
      }

      const { data: matchRow, error: matchError } = await supabase
        .from("matches")
        .insert({
          fixture_id: fixtureId,
          division_id: localTeam.divisionId ?? null,
          local_team_id: localTeam.id,
          visitor_team_id: visitorTeam.id,
          scheduled_time: manualTime || null,
          status: "scheduled",
          local_score: 0,
          visitor_score: 0,
          elapsed_seconds: 0,
        })
        .select("id")
        .single();
      if (matchError || !matchRow) throw new Error(matchError?.message ?? "No se pudo crear el partido.");

      setFixtureMatches((current) => [
        ...current,
        {
          id: matchRow.id,
          fixtureId,
          date: dateNumber,
          calendarDate: calendarDateForFixture(startDate, dateNumber),
          fixtureLocked: false,
          division: selectedDivision,
          local: localTeam.name,
          visitor: visitorTeam.name,
          localTeamId: localTeam.id,
          visitorTeamId: visitorTeam.id,
          time: manualTime || undefined,
          localScore: 0,
          visitorScore: 0,
          status: "scheduled",
          startedAt: null,
          elapsedSeconds: 0,
        },
      ]);
      setMessage("Partido manual agregado al fixture.");
    } catch (manualError) {
      setError(manualError instanceof Error ? manualError.message : "No se pudo agregar el partido.");
    } finally {
      setBusy(false);
    }
  };

  const updateMatchTime = async (match: FixtureMatch, time: string) => {
    if (!supabase || !match.id) return;
    if (lockedDates.has(match.date)) {
      setError("Esta fecha está guardada. Presiona Editar fixture para modificarla.");
      return;
    }

    setFixtureMatches((current) =>
      current.map((item) =>
        item.id === match.id ? { ...item, time: time || undefined } : item,
      ),
    );

    const { error: updateError } = await supabase
      .from("matches")
      .update({ scheduled_time: time || null })
      .eq("id", match.id);

    if (updateError) {
      setError(updateError.message);
    }
  };

  const deleteMatch = async (match: FixtureMatch) => {
    if (!supabase) {
      setError("Supabase no está disponible. No se eliminó el partido.");
      return;
    }
    if (!match.id) {
      setError("El partido no tiene un ID de Supabase. No se puede eliminar.");
      return;
    }
    if (lockedDates.has(match.date)) {
      setError("Esta fecha está guardada. Presiona Editar fixture para modificarla.");
      return;
    }
    if (!window.confirm(`¿Eliminar el partido ${match.local} vs. ${match.visitor}?`)) return;

    setBusy(true);
    setError("");
    try {
      const { data: deletedMatches, error: deleteError } = await supabase
        .from("matches")
        .delete()
        .eq("id", match.id)
        .select("id");

      if (deleteError) throw new Error(deleteError.message);
      if (!deletedMatches?.length) {
        throw new Error("Supabase no eliminó el partido. Verifica los permisos de eliminación.");
      }

      let removedFixture = false;
      if (match.fixtureId) {
        const { count: remainingMatches, error: countError } = await supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .eq("fixture_id", match.fixtureId);

        if (countError) throw new Error(countError.message);

        if (remainingMatches === 0) {
          const { data: deletedFixtures, error: fixtureError } = await supabase
            .from("fixtures")
            .delete()
            .eq("id", match.fixtureId)
            .select("id");

          if (fixtureError) throw new Error(fixtureError.message);
          if (!deletedFixtures?.length) {
            throw new Error("Supabase no eliminó la fecha vacía del fixture.");
          }
          removedFixture = true;
        }
      }

      setFixtureMatches((current) => current.filter((item) => item.id !== match.id));
      if (removedFixture) {
        setFixtureRecords((current) => current.filter((fixture) => fixture.id !== match.fixtureId));
      }
      setMessage(removedFixture ? "Partido y fecha vacía eliminados del fixture." : "Partido eliminado del fixture.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el partido.");
    } finally {
      setBusy(false);
    }
  };

  const deleteFixture = async (dateNumber: number) => {
    if (!supabase) {
      setError("Supabase no está disponible. No se eliminó el fixture.");
      return;
    }
    if (!tournamentId) {
      setError("El torneo no tiene un ID de Supabase. No se puede eliminar el fixture.");
      return;
    }
    if (lockedDates.has(dateNumber)) {
      setError("Esta fecha está guardada. Presiona Editar fixture para modificarla.");
      return;
    }
    if (!window.confirm(`¿Eliminar toda la Fecha ${dateNumber} y sus partidos?`)) return;

    setBusy(true);
    setError("");
    try {
      const fixtureIds = Array.from(
        new Set([
          fixtureRecords.find((fixture) => fixture.date === dateNumber)?.id,
          ...fixtureMatches
            .filter((match) => match.date === dateNumber)
            .map((match) => match.fixtureId),
        ].filter((fixtureId): fixtureId is string => Boolean(fixtureId))),
      );

      if (!fixtureIds.length) {
        setFixtureMatches((current) => current.filter((match) => match.date !== dateNumber));
        setFixtureRecords((current) => current.filter((fixture) => fixture.date !== dateNumber));
        setMessage(`Fecha ${dateNumber} eliminada.`);
        return;
      }

      const { error: matchesError } = await supabase
        .from("matches")
        .delete()
        .in("fixture_id", fixtureIds);
      if (matchesError) throw new Error(matchesError.message);

      const { data: deletedFixtures, error: fixtureError } = await supabase
        .from("fixtures")
        .delete()
        .in("id", fixtureIds)
        .select("id");
      if (fixtureError) throw new Error(fixtureError.message);
      if (deletedFixtures?.length !== fixtureIds.length) {
        throw new Error("Supabase no eliminó todas las fechas seleccionadas. Verifica los permisos de eliminación.");
      }

      setFixtureMatches((current) => current.filter((match) => match.date !== dateNumber));
      setFixtureRecords((current) => current.filter((fixture) => fixture.date !== dateNumber));
      setMessage(`Fecha ${dateNumber} eliminada con sus partidos.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar la fecha.");
    } finally {
      setBusy(false);
    }
  };

  const setFixtureSaved = async (dateNumber: number, saved: boolean) => {
    if (!supabase || !tournamentId) return;

    const fixtureIds = Array.from(
      new Set([
        fixtureRecords.find((fixture) => fixture.date === dateNumber)?.id,
        ...fixtureMatches
          .filter((match) => match.date === dateNumber)
          .map((match) => match.fixtureId),
      ].filter((fixtureId): fixtureId is string => Boolean(fixtureId))),
    );

    if (!fixtureIds.length) {
      setError("No se encontró el fixture para guardar.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const { error: updateError } = await supabase
        .from("fixtures")
        .update({ is_locked: saved })
        .in("id", fixtureIds);

      if (updateError) throw new Error(updateError.message);

      setFixtureMatches((current) =>
        current.map((match) =>
          match.date === dateNumber
            ? { ...match, fixtureLocked: saved }
            : match,
        ),
      );
      setFixtureRecords((current) =>
        current.map((fixture) =>
          fixture.date === dateNumber
            ? { ...fixture, isLocked: saved }
            : fixture,
        ),
      );
      setMessage(saved ? `Fecha ${dateNumber} guardada.` : `Fecha ${dateNumber} habilitada para edición.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No se pudo actualizar el fixture.");
    } finally {
      setBusy(false);
    }
  };

  const updateFixtureDate = async (
    fixture: FixtureDate,
    calendarDate: string,
  ) => {
    if (!supabase || !fixture.id || fixture.isLocked || !calendarDate) return;

    setBusy(true);
    setError("");
    try {
      const { error: updateError } = await supabase
        .from("fixtures")
        .update({ calendar_date: calendarDate })
        .eq("id", fixture.id);

      if (updateError) throw new Error(updateError.message);

      setFixtureRecords((current) =>
        current.map((item) =>
          item.id === fixture.id
            ? { ...item, calendarDate }
            : item,
        ),
      );
      setFixtureMatches((current) =>
        current.map((match) =>
          match.fixtureId === fixture.id
            ? { ...match, calendarDate }
            : match,
        ),
      );
      setMessage(`Fecha ${fixture.date} actualizada.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No se pudo actualizar la fecha.");
    } finally {
      setBusy(false);
    }
  };

  const openManualMatch = (dateNumber: number) => {
    if (lockedDates.has(dateNumber)) return;
    setMode("manual");
    setManualDate(String(dateNumber));
    window.setTimeout(() => {
      document.getElementById("manual-fixture-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  };

  const printFixture = (dateNumber: number) => {
    setPrintDate(dateNumber);
    window.setTimeout(() => window.print(), 0);
  };

  return (
    <>
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-3xl font-black uppercase">Fixtures</h2>
            <p className="mt-1 text-slate-500">Configura el calendario y crea los partidos oficiales.</p>
          </div>
          {fixtureDates.length > 0 && (
            <span className="rounded-full bg-[#e9fbd0] px-3 py-1 text-sm font-bold text-[#4c8500]">
              {fixtureMatches.length} partidos registrados
            </span>
          )}
        </div>

        {!canManage && !fixtureDates.length && <div className="mt-5"><Empty text="El fixture aún no ha sido generado" /></div>}

        {canManage && (
          <>
            <div className="mt-6 flex gap-2 rounded-xl bg-slate-100 p-1">
              <button type="button" onClick={() => setMode("automatic")} className={`flex-1 rounded-lg px-4 py-3 font-bold ${mode === "automatic" ? "bg-[#081522] text-white" : "text-slate-500"}`}>
                Generación automática
              </button>
              <button type="button" onClick={() => setMode("manual")} className={`flex-1 rounded-lg px-4 py-3 font-bold ${mode === "manual" ? "bg-[#081522] text-white" : "text-slate-500"}`}>
                Configuración manual
              </button>
            </div>

            {mode === "automatic" ? (
              <div className="mt-5 rounded-xl border border-slate-200 p-4">
                <h3 className="font-bold">Todos contra todos</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Los equipos se enfrentan dentro de su división. El sistema prioriza un partido de descanso entre apariciones y repite cruces únicamente cuando es necesario para completar la cantidad exacta indicada.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="mb-1 block text-sm font-semibold">Cantidad de fechas</span>
                    <input type="number" min="1" value={totalDates} onChange={(event) => setTotalDates(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-3" />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-semibold">Partidos por fecha</span>
                    <input type="number" min="1" value={matchesPerDate} onChange={(event) => setMatchesPerDate(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-3" />
                  </label>
                </div>
                <button type="button" disabled={busy || fixtureMatches.length > 0} onClick={generateAutomatic} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#B4FF45] px-4 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-50">
                  Generar fixture automático
                </button>
              </div>
            ) : (
              <div id="manual-fixture-form" className="mt-5 rounded-xl border border-slate-200 p-4">
                <h3 className="font-bold">Nuevo partido manual</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <label>
                    <span className="mb-1 block text-sm font-semibold">Fecha</span>
                    <input type="number" min="1" value={manualDate} onChange={(event) => setManualDate(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-3" />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-semibold">División</span>
                    <select value={selectedDivision} onChange={(event) => setSelectedDivision(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-3">
                      {divisions.map((division) => <option key={division}>{division}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-semibold">Equipo local</span>
                    <select value={manualLocal} onChange={(event) => setManualLocal(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-3">
                      <option value="">Seleccionar</option>
                      {divisionTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-semibold">Equipo visitante</span>
                    <select value={manualVisitor} onChange={(event) => setManualVisitor(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-3">
                      <option value="">Seleccionar</option>
                      {divisionTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-semibold">Horario</span>
                    <input type="time" value={manualTime} onChange={(event) => setManualTime(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-3" />
                  </label>
                </div>
                <button type="button" disabled={busy || lockedDates.has(Number(manualDate))} onClick={addManualMatch} className="mt-4 rounded-lg bg-[#B4FF45] px-4 py-3 font-bold disabled:opacity-50">
                  Agregar partido
                </button>
              </div>
            )}
          </>
        )}

        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        {message && <p role="status" className="mt-4 rounded-lg bg-[#e9fbd0] p-3 text-sm font-semibold text-[#365e00]">{message}</p>}

        {fixtureDates.length > 0 && (
          <div className="mt-6 space-y-4">
            {fixtureDates.map((fixture) => {
              const dateNumber = fixture.date;
              const dateMatches = fixtureMatches.filter((match) => match.date === dateNumber);
              const isSaved = lockedDates.has(dateNumber);
              const fixtureDate = fixture.calendarDate ?? dateMatches[0]?.calendarDate ?? calendarDateForFixture(startDate, dateNumber);
              return (
                <article key={dateNumber} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold">Fecha {dateNumber}</h3>
                      {canManage && !isSaved ? (
                        <input
                          type="date"
                          value={fixtureDate ?? ""}
                          disabled={busy}
                          onChange={(event) => updateFixtureDate(fixture, event.target.value)}
                          className="mt-1 rounded-lg border border-slate-300 px-2 py-1 text-sm font-semibold text-[#4c8500] disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-[#4c8500]">{calendarDateLabel(fixtureDate)}</p>
                      )}
                      <p className="text-sm text-slate-500">{dateMatches.length} partidos programados</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {canManage && (
                        <>
                          {!isSaved && <button type="button" disabled={busy} onClick={() => openManualMatch(dateNumber)} className="inline-flex items-center gap-2 rounded-lg border border-[#70b719] px-3 py-2 text-sm font-bold text-[#4c8500] hover:bg-[#e9fbd0] disabled:cursor-not-allowed disabled:opacity-50">
                            <Plus size={16} /> Agregar match
                          </button>}
                          <button type="button" disabled={busy} onClick={() => setFixtureSaved(dateNumber, !isSaved)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold hover:border-[#70b719] disabled:opacity-50">
                            {isSaved ? "Editar fixture" : "Guardar fixture"}
                          </button>
                        </>
                      )}
                      <button type="button" onClick={() => printFixture(dateNumber)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold hover:border-[#70b719]">
                        <FileDown size={16} /> Generar PDF
                      </button>
                      {canManage && !isSaved && (
                        <button type="button" disabled={busy} onClick={() => deleteFixture(dateNumber)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600 hover:border-red-400 disabled:cursor-not-allowed disabled:opacity-50">
                          <Trash2 size={16} /> Eliminar fixture
                        </button>
                      )}
                    </div>
                  </div>
                  {isSaved && <p className="mt-3 rounded-lg bg-[#e9fbd0] px-3 py-2 text-sm font-semibold text-[#365e00]">Fixture guardado. Presiona Editar fixture para habilitar los cambios.</p>}
                  <div className="mt-4 divide-y divide-slate-100">
                    {dateMatches.length ? dateMatches.map((match) => (
                      <div key={match.id ?? `${match.local}-${match.visitor}`} className="grid gap-2 py-3 sm:grid-cols-[120px_1fr_auto_auto] sm:items-center">
                        <span className="text-sm font-semibold text-slate-500">{match.division}</span>
                        <span className="font-semibold">{match.local} <span className="px-2 text-slate-400">vs.</span> {match.visitor}</span>
                        {canManage && !isSaved ? (
                          <input
                            type="time"
                            value={match.time ?? ""}
                            disabled={isSaved}
                            onChange={(event) => {
                              const nextTime = event.target.value || undefined;
                              setFixtureMatches((current) =>
                                current.map((item) =>
                                  item.id === match.id
                                    ? { ...item, time: nextTime }
                                    : item,
                                ),
                              );
                            }}
                            onBlur={(event) => updateMatchTime(match, event.target.value)}
                            className="rounded-lg border border-slate-300 px-2 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
                          />
                        ) : (
                          <span className="text-sm text-slate-500">{timeLabel(match.time)}</span>
                        )}
                        {canManage && !isSaved && (
                          <button type="button" disabled={busy} onClick={() => deleteMatch(match)} className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 px-2 py-2 text-sm font-bold text-red-600 hover:border-red-400 disabled:cursor-not-allowed disabled:opacity-50">
                            <Trash2 size={15} /> Eliminar
                          </button>
                        )}
                      </div>
                    )) : (
                      <p className="py-4 text-sm text-slate-500">No hay partidos programados en esta fecha.</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {printDate !== null && (
        <section className="hidden min-h-screen bg-white p-10 text-black print:block">
          <div className="flex items-start justify-between">
            <img src="/MarcaAthlonX/MarcaNegro.svg" alt="AthlonX" className="h-16 w-48 object-contain object-left" />
            <img src="/upr.png" alt="Organización" className="h-20 w-36 object-contain object-right" />
          </div>
          <h1 className="mt-8 text-center font-display text-3xl uppercase">Fixture del torneo</h1>
          <p className="mt-2 text-center text-lg">Fecha {printDate}</p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {divisions.map((division) => (
              <div key={division} className="text-center">
                <h2 className="text-sm font-black uppercase">{division}</h2>
                <div className="mt-2 border border-slate-300">
                  {teams.filter((team) => team.division === division).map((team) => <p key={team.id ?? team.name} className="border-b border-slate-300 p-2 last:border-b-0">{team.name}</p>)}
                </div>
              </div>
            ))}
          </div>
          <h2 className="mt-10 border-b-2 border-black pb-2 text-center font-display text-xl uppercase">Cronograma de partidos</h2>
          <table className="mt-5 w-full border-collapse text-sm">
            <thead><tr><th className="border-b border-slate-400 p-2 text-left">Partido</th><th className="border-b border-slate-400 p-2 text-left">Horario</th><th className="border-b border-slate-400 p-2 text-left">División</th><th className="border-b border-slate-400 p-2 text-left">Enfrentamiento</th></tr></thead>
            <tbody>{printableMatches.map((match, index) => <tr key={match.id ?? index}><td className="border-b border-slate-300 p-2">Partido {index + 1}</td><td className="border-b border-slate-300 p-2">{timeLabel(match.time)}</td><td className="border-b border-slate-300 p-2">{match.division}</td><td className="border-b border-slate-300 p-2 font-bold">{match.local} vs. {match.visitor}</td></tr>)}</tbody>
          </table>
        </section>
      )}
    </>
  );
}

function buildAutomaticFixturePlan(
  teams: Team[],
  totalDates: number,
  matchesPerDate: number,
): PlannedMatch[] {
  const pairs: RoundRobinPair[] = [];
  const divisions = Array.from(new Set(teams.map((team) => team.division)));

  for (const division of divisions) {
    const divisionTeams = seededShuffle(
      teams.filter((team) => team.division === division && team.id),
      division,
    );
    if (divisionTeams.length < 2) continue;

    const rotation: (Team | null)[] = [...divisionTeams];
    if (rotation.length % 2 !== 0) rotation.push(null);
    const rounds = rotation.length - 1;

    for (let round = 0; round < rounds; round += 1) {
      for (let index = 0; index < rotation.length / 2; index += 1) {
        const local = rotation[index];
        const visitor = rotation[rotation.length - 1 - index];
        if (local && visitor) {
          pairs.push({ round, division, local, visitor });
        }
      }

      const fixed = rotation[0];
      const moving = rotation.slice(1);
      moving.unshift(moving.pop() ?? null);
      rotation.splice(0, rotation.length, fixed, ...moving);
    }
  }

  if (!pairs.length) return [];

  const plan: PlannedMatch[] = [];
  let pairIndex = 0;

  for (let date = 1; date <= totalDates; date += 1) {
    const usedTeams = new Set<string>();
    const usedPairs = new Set<string>();
    let previousPair: RoundRobinPair | null = null;

    for (let matchNumber = 0; matchNumber < matchesPerDate; matchNumber += 1) {
      const availablePairs = pairs.filter((pair) => {
        const pairKey = `${pair.local.id}-${pair.visitor.id}`;
        const usesTeam = usedTeams.has(pair.local.id ?? "") || usedTeams.has(pair.visitor.id ?? "");
        return !usedPairs.has(pairKey) && !usesTeam;
      });

      const restedPairs = availablePairs.filter((pair) => {
        if (!previousPair) return true;
        return pair.local.id !== previousPair.local.id &&
          pair.local.id !== previousPair.visitor.id &&
          pair.visitor.id !== previousPair.local.id &&
          pair.visitor.id !== previousPair.visitor.id;
      });

      const candidates = restedPairs.length ? restedPairs : availablePairs;
      const selected = candidates.length
        ? seededShuffle(candidates, `${date}-${matchNumber}`)[0]
        : pairs[pairIndex % pairs.length];

      const shouldSwapSides = date % 2 === 0;
      plan.push({
        date,
        division: selected.division,
        local: shouldSwapSides ? selected.visitor : selected.local,
        visitor: shouldSwapSides ? selected.local : selected.visitor,
      });

      const pairKey = `${selected.local.id}-${selected.visitor.id}`;
      usedPairs.add(pairKey);
      usedTeams.add(selected.local.id ?? "");
      usedTeams.add(selected.visitor.id ?? "");
      previousPair = selected;
      pairIndex += 1;
    }
  }

  return plan;
}

function seededShuffle<T>(items: T[], seed: string): T[] {
  const result = [...items];
  let value = Array.from(seed).reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0);
  for (let index = result.length - 1; index > 0; index -= 1) {
    value = (value * 1664525 + 1013904223) | 0;
    const target = Math.abs(value) % (index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function calendarDateForFixture(startDate: string | undefined, dateNumber: number) {
  if (!startDate) return null;
  const date = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + dateNumber - 1);
  return date.toISOString().slice(0, 10);
}

function calendarDateLabel(calendarDate?: string | null) {
  if (!calendarDate) return "Fecha por definir";

  const date = new Date(`${calendarDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Fecha por definir";

  return date.toLocaleDateString("es-PA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
      {text}
    </div>
  );
}
