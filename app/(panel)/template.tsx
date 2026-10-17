// Next.js vuelve a montar template.tsx en cada cambio de sección del panel,
// así que el contenido de cada sección entra con una transición suave.
export default function PanelTemplate({ children }: { children: React.ReactNode }) {
  return <div className="ax-panel-enter">{children}</div>
}
