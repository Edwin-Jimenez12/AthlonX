export const resumenDashboard = {
  torneosActivos: 1,
  equiposRegistrados: 14,
  partidosJugados: 18,
  jugadores: 112,
}

export const torneoActivo = {
  nombre: 'Liga Panameña de Rugby - 2da temporada 2026',
  estado: 'En curso',
  temporada: '2026',
  ubicacion: 'Ciudad de Panamá',
  jornadas: 'Jornada 4 de 7',
  progreso: 57,
}

export const partidoActual = {
  enVivo: true,
  categoria: '1ra División',
  jornada: 'Jornada 4',
  estado: 'EN VIVO',
  periodo: '2do tiempo',
  tiempo: '04:21',
  local: 'Titanes',
  localLogo: '/equipos/Titanes.png',
  localPuntos: 14,
  visitante: 'Cuervos',
  visitanteLogo: '/equipos/cuervos.png',
  visitantePuntos: 12,
}

export const jugadoresPartido = {
  Titanes: [{ numero: 7, nombre: 'Edwin Jimenez' }, { numero: 10, nombre: 'Carlos Martinez' }, { numero: 12, nombre: 'Luis Rodriguez' }, { numero: 15, nombre: 'Miguel Herrera' }],
  Cuervos: [{ numero: 3, nombre: 'Daniel Smith' }, { numero: 8, nombre: 'Andres Brown' }, { numero: 11, nombre: 'Marco Williams' }, { numero: 14, nombre: 'Javier Davis' }],
}

export const categorias = [
  {
    id: 'mayor',
    nombre: '1ra División',
    descripcion: 'Equipos principales de la competencia',
    equipos: 6,
    partidos: 9,
    tabla: [
      { equipo: 'Titanes', pj: 4, ganados: 4, empatados: 0, perdidos: 0, aFavor: 162, enContra: 58, puntos: 12 },
      { equipo: 'Cuervos', pj: 4, ganados: 3, empatados: 0, perdidos: 1, aFavor: 128, enContra: 72, puntos: 10 },
      { equipo: 'Centauros', pj: 4, ganados: 2, empatados: 1, perdidos: 1, aFavor: 109, enContra: 94, puntos: 7 },
    ],
  },
  {
    id: 'desarrollo',
    nombre: '2da División',
    descripcion: 'Jugadores y equipos en crecimiento',
    equipos: 5,
    partidos: 6,
    tabla: [
      { equipo: 'Guerreros', pj: 3, ganados: 3, empatados: 0, perdidos: 0, aFavor: 108, enContra: 42, puntos: 9 },
      { equipo: 'Power Clan', pj: 3, ganados: 2, empatados: 1, perdidos: 0, aFavor: 91, enContra: 61, puntos: 7 },
      { equipo: 'Vikingos', pj: 3, ganados: 1, empatados: 0, perdidos: 2, aFavor: 67, enContra: 80, puntos: 5 },
      { equipo: 'Titanes', pj: 3, ganados: 0, empatados: 0, perdidos: 3, aFavor: 39, enContra: 122, puntos: 3 },
    ],
  },
  {
    id: 'femenina',
    nombre: 'Liga Femenina',
    descripcion: 'Competencia femenina de rugby sevens',
    equipos: 3,
    partidos: 3,
    tabla: [
      { equipo: 'Lycans', pj: 2, ganados: 2, empatados: 0, perdidos: 0, aFavor: 74, enContra: 28, puntos: 6 },
      { equipo: 'Targarens', pj: 2, ganados: 1, empatados: 1, perdidos: 0, aFavor: 53, enContra: 41, puntos: 4 },
      { equipo: 'Titanes', pj: 2, ganados: 0, empatados: 1, perdidos: 1, aFavor: 32, enContra: 90, puntos: 2 },
    ],
  },
]

export const proximosPartidos = [
  { categoria: '1ra División', fecha: 'Sáb, 14 Mar', hora: '10:00', local: 'Titanes', localDetail: '1ra División', localLogo: '/equipos/Titanes.png', visitante: 'Cuervos', visitanteDetail: '1ra División', visitanteLogo: '/equipos/cuervos.png' },
  { categoria: '2da División', fecha: 'Sáb, 14 Mar', hora: '11:20', local: 'Guerreros', localDetail: '2da División', localLogo: '', visitante: 'Power Clan', visitanteDetail: '2da División', visitanteLogo: '' },
  { categoria: 'Femenina', fecha: 'Sáb, 14 Mar', hora: '13:00', local: 'Lycans', localDetail: 'Femenina', localLogo: '', visitante: 'Targarens', visitanteDetail: 'Femenina', visitanteLogo: '' },
]
