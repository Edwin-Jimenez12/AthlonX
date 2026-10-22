# Bitácora AthlonX

Registro de trabajo, en nube y en local. La entrada más reciente va arriba.
Formato: fecha · rama · entorno → qué se hizo · archivos · verificación · pendiente.

---

## 2026-10-22 · `claude/great-ritchie-2n8uq9` · nube

**Qué se hizo**
- Se instalaron las skills de diseño en `.claude/skills/`:
  - Emil Kowalski ([emilkowalski/skills](https://github.com/emilkowalski/skills)): las 11 skills web. Se omitieron las de Swift, Expo, móvil nativo y Sonner.
  - Impeccable ([pbakaus/impeccable](https://github.com/pbakaus/impeccable)): la skill y 4 subagentes en `.claude/agents/`.
  - Taste ([Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)): `design-taste-frontend`.
- Se activaron los hooks de Impeccable en `.claude/settings.json`: SessionStart, PostToolUse en Edit/Write y Stop.
- Se agregó el MCP de Playwright en `.mcp.json` (`@playwright/mcp@0.0.83`, headless, con el Chromium de `/opt/pw-browsers`).
- Se crearon `CLAUDE.md` y esta bitácora.
- Se verificó el acceso a Figma: lectura y escritura en el archivo `AthlonX` (fileKey `YBGPZrYsYNb5259mmBgoF1`). La página `Claude` (`954:56`) está vacía.

**Verificación**
- El hook de Impeccable se ejecutó sobre `app/(panel)/layout.tsx` y no reportó problemas automáticos.
- Chromium headless generó una captura. Las herramientas del MCP de Playwright se cargan en la sesión.
- En Figma se creó un rectángulo de prueba en la página `Claude` y se eliminó en la misma llamada.

**Pendiente**
- En local hay que configurar el override de Playwright (ver `CLAUDE.md` → "Playwright en local").
