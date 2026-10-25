// Documentos de la tabla de posiciones: PDF oficial (una hoja por división),
// PDF compacto (todas las divisiones seguidas) e imagen para compartir (1080 × 1350).
// Replica los diseños de Figma (página "Claude", fila "PDF · Tabla de posiciones").

export type ResultLetter = 'G' | 'E' | 'P'

export type PrintStandingRow = {
  name: string
  logoUrl: string | null
  played: number
  wins: number
  draws: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  points: number
  adjustment: number
  recent: ResultLetter[]
}

export type PrintDivision = {
  name: string
  rows: PrintStandingRow[]
  zone: number
  zoneLabel: string
  cutLabel: string
  progressLabel: string
  started: boolean
  adjustments: { team: string; amount: number; reason: string }[]
  projectionTitle: string
  projection: [string, string][]
  nextDateLabel: string
  nextMatches: { local: string; visitor: string; detail: string }[]
}

export type PrintOptions = { recent: boolean; notes: boolean; zone: boolean; next: boolean }

export type PrintDocument = {
  tournamentName: string
  organizationName: string
  subtitle: string
  crestUrl: string | null
  monogram: string
  isFootball: boolean
  scoring: [string, string][]
  tiebreakLabel: string
  updatedLabel: string
  printedLabel: string
  divisions: PrintDivision[]
  options: PrintOptions
}

// Paleta de los PDF: los valores del tema claro (--ax-*) y la franja en tema oscuro.
const paper = {
  surface: '#ffffff', raised: '#f5f8fb', line: '#d3dde6', text: '#0b1d2c', secondary: '#26394a', muted: '#5b7185',
  accent: '#b4ff45', accentText: '#3f7d00', accentSoft: 'rgba(63,125,0,.10)',
  warningSoft: 'rgba(255,170,0,.14)', warningText: '#8a5a00', dangerText: '#b4232f', dangerSoft: 'rgba(180,35,47,.08)',
  band: '#0b1d2c', bandText: '#e8eef3', bandMuted: '#91a8ba',
}

// Paleta oscura de la imagen para compartir.
const night = {
  bg: '#061019', surface: '#0b1d2c', raised: '#102536', line: '#1f4057', lineStrong: '#31556b', text: '#e8eef3',
  secondary: '#c9d6e0', muted: '#91a8ba', accent: '#b4ff45', accentLine: 'rgba(180,255,69,.35)', onAccent: '#07131e', danger: '#ff9ca5',
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character] || character))
}

export function initialsOf(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AX'
}

export function signed(value: number) {
  return value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : '0'
}

// Fuentes del panel (Inter y Bebas Neue locales) para usarlas en la ventana de impresión.
export function pageFonts() {
  const style = getComputedStyle(document.body)
  const body = style.getPropertyValue('--font-inter').trim() || 'Arial'
  const display = style.getPropertyValue('--font-bebas-neue').trim() || 'Arial Narrow'
  const faces: string[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList
    try { rules = sheet.cssRules } catch { continue }
    for (const rule of Array.from(rules)) {
      // Las URL de las fuentes son relativas a la hoja de estilos: se vuelven absolutas.
      if (rule instanceof CSSFontFaceRule) faces.push(rule.cssText.replace(/url\((["']?)([^"')]+)\1\)/g, (_, quote: string, url: string) => `url(${quote}${new URL(url, sheet.href || window.location.href).href}${quote})`))
    }
  }
  return { body, display, faces: faces.join('\n') }
}

function crestMarkup(doc: PrintDocument, size: 'lg' | 'sm') {
  return doc.crestUrl
    ? `<img class="crest ${size}" src="${escapeHtml(doc.crestUrl)}" alt="" />`
    : `<span class="monogram ${size}">${escapeHtml(doc.monogram)}</span>`
}

function resultPills(recent: ResultLetter[]) {
  if (!recent.length) return '<span class="dash">—</span>'
  return recent.map((letter) => `<span class="pill ${letter}">${letter}</span>`).join('')
}

function tableMarkup(doc: PrintDocument, division: PrintDivision, compact: boolean) {
  const showRecent = doc.options.recent && !compact
  const zone = doc.options.zone && division.started ? division.zone : 0
  const showAdjustment = division.rows.some((row) => row.adjustment)
  const columns = (showRecent ? 11 : 10) + (showAdjustment ? 1 : 0)
  const rows = division.rows.map((row, index) => {
    const qualified = index < zone
    const diff = row.pointsFor - row.pointsAgainst
    const cut = zone && index === zone ? `<tr class="cut"><td colspan="${columns}"><b>${escapeHtml(division.zoneLabel)}</b></td></tr>` : ''
    return `${cut}<tr class="${qualified ? 'in' : ''}">
      <td class="pos"><i></i>${index + 1}</td>
      <td class="team">${compact ? '' : `<span class="badge">${row.logoUrl ? `<img src="${escapeHtml(row.logoUrl)}" alt="" />` : escapeHtml(initialsOf(row.name))}</span>`}${escapeHtml(row.name)}</td>
      <td>${row.played}</td><td>${row.wins}</td><td>${row.draws}</td><td>${row.losses}</td>
      <td class="soft">${row.pointsFor}</td><td class="soft">${row.pointsAgainst}</td>
      <td class="diff ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}">${signed(diff)}</td>
      ${showAdjustment ? `<td class="adj ${row.adjustment > 0 ? 'up' : row.adjustment < 0 ? 'down' : ''}">${row.adjustment ? signed(row.adjustment) : '—'}</td>` : ''}
      <td class="pts">${row.points < 0 ? `−${Math.abs(row.points)}` : row.points}</td>
      ${showRecent ? `<td class="recent">${resultPills(row.recent)}</td>` : ''}
    </tr>`
  }).join('')
  const scored = doc.isFootball ? ['GF', 'GC'] : ['PF', 'PC']
  return `<table class="${compact ? 'compact' : ''}">
    <colgroup><col class="c-pos" /><col /><col class="c-n" /><col class="c-n" /><col class="c-n" /><col class="c-n" /><col class="c-w" /><col class="c-w" /><col class="c-d" />${showAdjustment ? '<col class="c-a" />' : ''}<col class="c-p" />${showRecent ? '<col class="c-r" />' : ''}</colgroup>
    <thead><tr><th>#</th><th class="team">Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>${scored[0]}</th><th>${scored[1]}</th><th>Dif</th>${showAdjustment ? '<th>Ajuste</th>' : ''}<th class="pts">Pts</th>${showRecent ? '<th>Últimos</th>' : ''}</tr></thead>
    <tbody>${rows || `<tr><td colspan="${columns}" class="empty">Todavía no hay equipos en esta división.</td></tr>`}</tbody>
  </table>`
}

function footerMarkup(doc: PrintDocument, page: string) {
  return `<footer><span><i></i>Generado con AthlonX · athlonx.world</span><span>${escapeHtml(doc.printedLabel)}${page}</span></footer>`
}

function headerMarkup(doc: PrintDocument) {
  return `<header class="head">
    ${crestMarkup(doc, 'lg')}
    <div class="league">
      <p class="eyebrow">${escapeHtml(doc.organizationName)}</p>
      <h1>${escapeHtml(doc.tournamentName)}</h1>
      <p class="sub">${escapeHtml(doc.subtitle)}</p>
    </div>
    <div class="brand"><img src="${window.location.origin}/MarcaAthlonX/MarcaHorizontalClara.svg" alt="AthlonX" /><span>Documento oficial</span></div>
  </header><div class="rule"></div>`
}

function notesMarkup(doc: PrintDocument, division: PrintDivision) {
  const boxes: string[] = []
  if (doc.options.notes) {
    const lines = [
      ...division.adjustments.map((item) => `<p class="${item.amount < 0 ? 'danger' : 'plus'}">Ajuste a ${escapeHtml(item.team)}: ${escapeHtml(signed(item.amount))} ${Math.abs(item.amount) === 1 ? 'punto' : 'puntos'}${item.reason ? ` · ${escapeHtml(item.reason)}` : ''}.</p>`),
      `<p>Desempate: ${escapeHtml(doc.tiebreakLabel)}.</p>`,
      `<p>${doc.isFootball ? 'GF: goles a favor · GC: goles en contra' : 'PF: puntos a favor · PC: puntos en contra'} · Dif: diferencia.</p>`,
    ]
    boxes.push(`<div class="box"><h3>Notas y ajustes</h3>${lines.join('')}</div>`)
  }
  if (doc.options.zone && division.projection.length && division.started) {
    boxes.push(`<div class="box"><h3>${escapeHtml(division.projectionTitle)}</h3><p>Si la liga terminara hoy:</p>${division.projection.map(([left, right]) => `<p class="strong">${escapeHtml(left)} <span>vs</span> ${escapeHtml(right)}</p>`).join('')}</div>`)
  }
  if (doc.options.next && division.nextMatches.length) {
    boxes.push(`<div class="box"><h3>${escapeHtml(division.nextDateLabel)}</h3>${division.nextMatches.map((match) => `<p class="strong">${escapeHtml(match.local)} <span>vs</span> ${escapeHtml(match.visitor)}${match.detail ? ` <em>${escapeHtml(match.detail)}</em>` : ''}</p>`).join('')}</div>`)
  }
  return boxes.length ? `<div class="boxes">${boxes.join('')}</div>` : ''
}

function baseCss(fonts: ReturnType<typeof pageFonts>) {
  const c = paper
  return `${fonts.faces}
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; background: ${c.surface}; color: ${c.text}; font-family: ${fonts.body}, Arial, sans-serif; }
  .page { width: 210mm; min-height: 297mm; padding: 11.5mm 12.7mm 8.5mm; display: flex; flex-direction: column; gap: 5.3mm; break-after: page; }
  .page:last-child { break-after: auto; }
  .head { display: flex; align-items: center; gap: 4.2mm; }
  .crest { object-fit: contain; flex-shrink: 0; }
  .crest.lg { width: 27mm; height: 15mm; }
  .crest.sm { width: 21mm; height: 11.5mm; }
  .monogram { display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 10px; background: ${c.accent}; color: #07131e; font: 400 22px ${fonts.display}, sans-serif; }
  .monogram.lg { width: 15mm; height: 15mm; }
  .monogram.sm { width: 11.5mm; height: 11.5mm; font-size: 17px; }
  .league { flex: 1; min-width: 0; }
  .eyebrow { margin: 0; font-size: 9px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: ${c.muted}; }
  h1 { margin: 2px 0; font: 400 24px/1 ${fonts.display}, sans-serif; letter-spacing: .02em; text-transform: uppercase; }
  .sub { margin: 0; font-size: 10px; color: ${c.muted}; }
  .brand { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
  .brand img { width: 33mm; height: auto; }
  .brand span { font-size: 9px; font-weight: 600; letter-spacing: .06em; color: ${c.muted}; }
  .rule { height: 3px; background: ${c.accent}; }
  .band { display: flex; align-items: center; gap: 4mm; padding: 4.8mm 5.8mm; border-radius: 14px; background: ${c.band}; color: ${c.bandText}; }
  .band > div:first-child { flex: 1; }
  .band .eyebrow { color: ${c.accent}; font-size: 10px; letter-spacing: .16em; }
  .band h2 { margin: 2px 0 0; font: 400 36px/1 ${fonts.display}, sans-serif; letter-spacing: .02em; }
  .metas { display: flex; gap: 5.8mm; }
  .metas p { margin: 0; font-size: 8px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: ${c.bandMuted}; }
  .metas b { display: block; margin-top: 3px; font-size: 12px; font-weight: 600; color: ${c.bandText}; }
  .rules { display: flex; align-items: center; gap: 6px; font-size: 9.5px; }
  .rules .label { font-size: 8.5px; font-weight: 700; letter-spacing: .12em; color: ${c.muted}; }
  .chip { padding: 3px 8px; border-radius: 6px; background: ${c.raised}; color: ${c.secondary}; font-weight: 600; }
  .legend { margin-left: auto; display: flex; align-items: center; gap: 6px; color: ${c.muted}; }
  .legend i, footer i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; background: ${c.accent}; }
  .notice { padding: 10px 14px; border-radius: 10px; background: ${c.warningSoft}; color: ${c.warningText}; font-size: 10px; font-weight: 500; line-height: 15px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; }
  col.c-pos { width: 30px; } col.c-n { width: 29px; } col.c-w { width: 36px; } col.c-d { width: 40px; } col.c-p { width: 44px; } col.c-a { width: 44px; } col.c-r { width: 72px; }
  thead th { padding: 8px 0; background: ${c.raised}; color: ${c.muted}; font-size: 8.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; text-align: center; }
  thead th:first-child { border-radius: 8px 0 0 8px; } thead th:last-child { border-radius: 0 8px 8px 0; }
  thead th.team { text-align: left; } thead th.pts { color: ${c.accentText}; }
  tbody td { height: 38px; padding: 0; border-top: 1px solid ${c.line}; text-align: center; color: ${c.secondary}; }
  tbody tr:first-child td, tbody tr.cut + tr td { border-top: 0; }
  td.pos { position: relative; text-align: left; padding-left: 11px; font-weight: 700; color: ${c.muted}; }
  td.pos i { position: absolute; left: 0; top: 50%; width: 3px; height: 18px; margin-top: -9px; border-radius: 2px; }
  tr.in td.pos { color: ${c.accentText}; } tr.in td.pos i { background: ${c.accent}; }
  td.team { text-align: left; font-weight: 600; font-size: 11.5px; color: ${c.text}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .badge { display: inline-flex; width: 24px; height: 24px; margin-right: 8px; vertical-align: middle; align-items: center; justify-content: center; overflow: hidden; border: 1px solid ${c.line}; border-radius: 7px; background: ${c.raised}; font-size: 8.5px; font-weight: 700; }
  .badge img { width: 100%; height: 100%; object-fit: cover; }
  td.soft { color: ${c.muted}; }
  td.adj { font-weight: 600; color: ${c.muted}; } td.adj.up { color: ${c.accentText}; } td.adj.down { color: ${c.dangerText}; }
  td.diff { font-weight: 600; } td.diff.up { color: ${c.accentText}; } td.diff.down { color: ${c.dangerText}; }
  td.pts { background: ${c.accentSoft}; color: ${c.text}; font-size: 13px; font-weight: 700; }
  td.recent { font-size: 0; } .dash { font-size: 11px; color: ${c.muted}; }
  .pill { display: inline-flex; width: 16px; height: 16px; margin: 0 1.5px; align-items: center; justify-content: center; border-radius: 4px; font-size: 8px; font-weight: 700; }
  .pill.G { background: ${c.accentSoft}; color: ${c.accentText}; } .pill.E { background: ${c.warningSoft}; color: ${c.warningText}; } .pill.P { background: ${c.dangerSoft}; color: ${c.dangerText}; }
  tr.cut td { height: 22px; border-top: 0; text-align: right; background: repeating-linear-gradient(90deg, ${c.accentText} 0 3px, transparent 3px 6px) left center / 100% 1px no-repeat; }
  tr.cut b { padding-left: 8px; background: ${c.surface}; color: ${c.accentText}; font-size: 8.5px; letter-spacing: .04em; }
  td.empty { padding: 14px; color: ${c.muted}; text-align: left; }
  .boxes { display: flex; gap: 14px; }
  .box { flex: 1; padding: 14px 16px; border-radius: 12px; background: ${c.raised}; }
  .box h3 { margin: 0 0 7px; font-size: 8.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: ${c.muted}; }
  .box p { margin: 0 0 6px; font-size: 10px; line-height: 15px; color: ${c.secondary}; }
  .box p.strong { color: ${c.text}; font-weight: 600; } .box p span { padding: 0 4px; color: ${c.muted}; font-weight: 400; } .box p em { color: ${c.muted}; font-style: normal; font-weight: 400; }
  .box p.danger { color: ${c.dangerText}; } .box p.plus { color: ${c.accentText}; }
  footer { margin-top: auto; padding-top: 12px; display: flex; justify-content: space-between; gap: 12px; border-top: 1px solid ${c.line}; font-size: 9px; color: ${c.muted}; }
  footer span:first-child { display: flex; align-items: center; gap: 6px; } footer i { width: 6px; height: 6px; }`
}

function wrap(title: string, css: string, body: string) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title><style>${css}</style></head><body>${body}
  <script>window.addEventListener('load', function () { (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () { setTimeout(function () { window.print() }, 150) }) }); window.addEventListener('afterprint', function () { window.close() });</script>
  </body></html>`
}

// PDF oficial: una hoja A4 por división con cabecera completa.
export function officialHtml(doc: PrintDocument, fonts = pageFonts()) {
  const pages = doc.divisions.map((division, index) => `<section class="page">
    ${headerMarkup(doc)}
    <div class="band">
      <div><p class="eyebrow">${escapeHtml(division.name)}</p><h2>TABLA DE POSICIONES</h2></div>
      <div class="metas">
        <p>Corte<b>${escapeHtml(division.cutLabel)}</b></p>
        <p>Partidos<b>${escapeHtml(division.progressLabel)}</b></p>
        <p>Actualizado<b>${escapeHtml(doc.updatedLabel)}</b></p>
      </div>
    </div>
    ${division.started
      ? `<div class="rules"><span class="label">PUNTUACIÓN</span>${doc.scoring.map(([label, value]) => `<span class="chip">${escapeHtml(label)} ${escapeHtml(value)}</span>`).join('')}${doc.options.zone && division.zone ? `<span class="legend"><i></i>${escapeHtml(division.zoneLabel)}</span>` : ''}</div>`
      : '<div class="notice">Tabla inicial: todavía no hay partidos jugados. Los equipos aparecen en orden alfabético y la zona de clasificación se marca desde la primera fecha.</div>'}
    ${tableMarkup(doc, division, false)}
    ${notesMarkup(doc, division)}
    ${footerMarkup(doc, ` · Página ${index + 1} de ${doc.divisions.length}`)}
  </section>`).join('')
  return wrap(`${doc.tournamentName} · Tabla de posiciones`, baseCss(fonts), pages)
}

// PDF compacto: todas las divisiones seguidas, con la cabecera reducida.
export function compactHtml(doc: PrintDocument, fonts = pageFonts()) {
  const css = `${baseCss(fonts)}
  .page { gap: 4.2mm; }
  .head.small h1 { font-size: 22px; }
  .division { display: flex; flex-direction: column; gap: 6px; break-inside: avoid; }
  .division-title { display: flex; align-items: center; gap: 10px; }
  .division-title i { width: 4px; height: 16px; border-radius: 2px; background: ${paper.accent}; }
  .division-title h2 { margin: 0; flex: 1; font: 400 19px/1 ${fonts.display}, sans-serif; letter-spacing: .02em; text-transform: uppercase; }
  .division-title span { font-size: 9.5px; color: ${paper.muted}; }
  table.compact tbody td { height: 26px; font-size: 10px; }
  table.compact td.team { font-size: 10.5px; } table.compact td.pts { font-size: 11.5px; }
  table.compact thead th { padding: 6px 0; font-size: 8px; }
  .strip { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 16px; padding: 10px 14px; border-radius: 10px; background: ${paper.raised}; font-size: 9px; color: ${paper.muted}; }
  .strip i { display: inline-block; width: 8px; height: 8px; margin-right: 6px; border-radius: 2px; background: ${paper.accent}; }
  .strip .danger { color: ${paper.dangerText}; } .strip .plus { color: ${paper.accentText}; }`
  const blocks = doc.divisions.map((division) => `<div class="division">
    <div class="division-title"><i></i><h2>${escapeHtml(division.name)}</h2><span>${division.rows.length} equipos${division.zone && doc.options.zone ? ` · ${escapeHtml(division.zoneLabel.toLowerCase())}: ${division.zone}` : ''} · ${escapeHtml(division.cutLabel.toLowerCase())}</span></div>
    ${tableMarkup(doc, division, true)}
  </div>`).join('')
  const adjustments = doc.options.notes ? doc.divisions.flatMap((division) => division.adjustments).map((item) => `<span class="${item.amount < 0 ? 'danger' : 'plus'}">Ajuste a ${escapeHtml(item.team)}: ${escapeHtml(signed(item.amount))}${item.reason ? ` · ${escapeHtml(item.reason)}` : ''}</span>`).join('') : ''
  const body = `<section class="page">
    <header class="head small">
      ${crestMarkup(doc, 'sm')}
      <div class="league"><h1>${escapeHtml(doc.tournamentName)}</h1><p class="sub">Tabla de posiciones · Todas las divisiones · ${escapeHtml(doc.updatedLabel)}</p></div>
      <div class="brand"><img src="${window.location.origin}/MarcaAthlonX/MarcaHorizontalClara.svg" alt="AthlonX" /></div>
    </header><div class="rule"></div>
    ${blocks}
    <div class="strip">${doc.options.zone ? '<span><i></i>Zona de clasificación</span>' : ''}<span>${doc.scoring.map(([label, value]) => `${escapeHtml(label)} ${escapeHtml(value)}`).join(' · ')}</span>${adjustments}</div>
    ${footerMarkup(doc, '')}
  </section>`
  return wrap(`${doc.tournamentName} · Tabla de posiciones`, css, body)
}

export function openPrintWindow(html: string) {
  const printWindow = window.open('', '_blank', 'width=900,height=1100')
  if (!printWindow) return false
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  return true
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = src
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let value = text
  while (value.length > 1 && ctx.measureText(`${value}…`).width > maxWidth) value = value.slice(0, -1)
  return `${value}…`
}

function drawContained(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number, align: 'left' | 'right' = 'left') {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight)
  const drawWidth = image.naturalWidth * scale
  const drawHeight = image.naturalHeight * scale
  ctx.drawImage(image, align === 'right' ? x + width - drawWidth : x, y + (height - drawHeight) / 2, drawWidth, drawHeight)
}

// Imagen para compartir (1080 × 1350, tema oscuro): solo PJ, DIF y PTS.
export async function shareImage(doc: PrintDocument, division: PrintDivision) {
  const { body, display } = pageFonts()
  await Promise.all([
    document.fonts.load(`600 30px ${body}`),
    document.fonts.load(`700 16px ${body}`),
    document.fonts.load(`400 40px ${display}`),
  ]).catch(() => undefined)
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const c = night
  const spacing = (value: string) => { if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = value }
  ctx.fillStyle = c.bg
  ctx.fillRect(0, 0, 1080, 1350)
  // Líneas de cancha decorativas.
  for (const [x, alpha] of [[760, 0.1], [860, 0.06], [980, 0.12]]) {
    ctx.globalAlpha = alpha
    ctx.fillStyle = c.accent
    ctx.fillRect(x, 0, 3, 1350)
  }
  ctx.globalAlpha = 1

  const [crest, brand] = await Promise.all([
    doc.crestUrl ? loadImage(doc.crestUrl) : Promise.resolve(null),
    loadImage(`${window.location.origin}/MarcaAthlonX/MarcaHorizontal.svg`),
  ])
  let left = 72
  if (crest) {
    drawContained(ctx, crest, 72, 72, 158, 88)
    left = 72 + 158 + 24
  } else {
    ctx.fillStyle = c.accent
    roundRect(ctx, 72, 72, 88, 88, 20)
    ctx.fill()
    ctx.fillStyle = c.onAccent
    ctx.font = `400 44px ${display}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(doc.monogram, 116, 118)
    left = 72 + 88 + 24
  }
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = c.muted
  ctx.font = `700 16px ${body}`
  spacing('2px')
  ctx.fillText(fitText(ctx, doc.organizationName.toUpperCase(), 520), left, 108)
  ctx.fillStyle = c.text
  ctx.font = `400 40px ${display}`
  spacing('1px')
  ctx.fillText(fitText(ctx, doc.tournamentName.toUpperCase(), 520), left, 148)
  if (brand) drawContained(ctx, brand, 768, 96, 240, 40, 'right')

  ctx.fillStyle = c.accent
  ctx.font = `700 22px ${body}`
  spacing('3px')
  ctx.fillText(`${division.name} · ${division.cutLabel}`.toUpperCase(), 72, 222)
  ctx.fillStyle = c.text
  ctx.font = `400 124px ${display}`
  spacing('1px')
  ctx.fillText('TABLA DE POSICIONES', 72, 336)
  spacing('0px')

  // Tabla.
  const top = 376
  const footerTop = 1350 - 64 - 24
  const headerHeight = 56
  const rowHeight = Math.max(64, Math.min(116, Math.floor((footerTop - 40 - top - headerHeight - 16) / Math.max(1, division.rows.length))))
  const tableHeight = headerHeight + rowHeight * division.rows.length + 16
  ctx.fillStyle = c.surface
  roundRect(ctx, 72, top, 936, tableHeight, 24)
  ctx.fill()
  ctx.strokeStyle = c.line
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.save()
  roundRect(ctx, 72, top, 936, tableHeight, 24)
  ctx.clip()
  const col = { pos: 72, team: 156, pj: 698, dif: 778, pts: 878, end: 1008 }
  ctx.fillStyle = c.muted
  ctx.font = `700 16px ${body}`
  spacing('2px')
  ctx.textBaseline = 'middle'
  const headY = top + 8 + headerHeight / 2
  ctx.textAlign = 'center'
  ctx.fillText('#', col.pos + 42, headY)
  ctx.textAlign = 'left'
  ctx.fillText('EQUIPO', col.team, headY)
  ctx.textAlign = 'center'
  ctx.fillText('PJ', col.pj + 40, headY)
  ctx.fillText('DIF', col.dif + 50, headY)
  ctx.fillStyle = c.accent
  ctx.fillText('PTS', col.pts + 65, headY)
  spacing('0px')
  const zone = doc.options.zone && division.started ? division.zone : 0
  division.rows.forEach((row, index) => {
    const y = top + 8 + headerHeight + index * rowHeight
    const middle = y + rowHeight / 2
    const qualified = index < zone
    ctx.strokeStyle = zone && index === zone ? c.accentLine : c.line
    ctx.setLineDash(zone && index === zone ? [8, 8] : [])
    ctx.beginPath()
    ctx.moveTo(72, y)
    ctx.lineTo(1008, y)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = qualified ? c.accent : c.raised
    ctx.fillRect(col.pts, y, col.end - col.pts, rowHeight)
    if (qualified) {
      ctx.fillStyle = c.accent
      roundRect(ctx, col.pos + 20, middle - 22, 6, 44, 3)
      ctx.fill()
    }
    ctx.fillStyle = qualified ? c.accent : c.muted
    ctx.font = `400 40px ${display}`
    ctx.textAlign = 'center'
    ctx.fillText(String(index + 1), col.pos + 52, middle + 2)
    ctx.fillStyle = c.raised
    roundRect(ctx, col.team, middle - 28, 56, 56, 14)
    ctx.fill()
    ctx.strokeStyle = c.lineStrong
    ctx.stroke()
    ctx.fillStyle = c.text
    ctx.font = `700 18px ${body}`
    ctx.fillText(initialsOf(row.name), col.team + 28, middle + 1)
    ctx.textAlign = 'left'
    ctx.font = `600 30px ${body}`
    ctx.fillText(fitText(ctx, `${row.name}${row.adjustment ? ' *' : ''}`, col.pj - col.team - 96), col.team + 76, middle + 1)
    ctx.textAlign = 'center'
    ctx.fillStyle = c.secondary
    ctx.font = `400 28px ${body}`
    ctx.fillText(String(row.played), col.pj + 40, middle + 1)
    const diff = row.pointsFor - row.pointsAgainst
    ctx.fillStyle = diff > 0 ? c.accent : diff < 0 ? c.danger : c.muted
    ctx.font = `600 28px ${body}`
    ctx.fillText(signed(diff), col.dif + 50, middle + 1)
    ctx.fillStyle = qualified ? c.onAccent : c.text
    ctx.font = `400 52px ${display}`
    ctx.fillText(row.points < 0 ? `−${Math.abs(row.points)}` : String(row.points), col.pts + 65, middle + 3)
  })
  ctx.restore()

  // Pie.
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  const footY = 1350 - 64 - 12
  let x = 72
  if (zone) {
    ctx.fillStyle = c.accent
    roundRect(ctx, x, footY - 8, 16, 16, 4)
    ctx.fill()
    ctx.fillStyle = c.muted
    ctx.font = `500 20px ${body}`
    ctx.fillText(division.zoneLabel, x + 26, footY)
    x += 26 + ctx.measureText(division.zoneLabel).width + 28
  }
  const adjustment = division.adjustments[0]
  if (adjustment && doc.options.notes) {
    ctx.fillStyle = c.muted
    ctx.font = `500 20px ${body}`
    ctx.fillText(fitText(ctx, `* ${adjustment.team} ${signed(adjustment.amount)}${adjustment.reason ? ` por ${adjustment.reason.toLowerCase()}` : ''}`, 820 - x), x, footY)
  }
  ctx.textAlign = 'right'
  ctx.fillStyle = c.accent
  ctx.font = `700 20px ${body}`
  ctx.fillText('athlonx.world', 1008, footY)

  return new Promise<Blob | null>((resolve) => {
    try { canvas.toBlob((blob) => resolve(blob), 'image/png') } catch { resolve(null) }
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
