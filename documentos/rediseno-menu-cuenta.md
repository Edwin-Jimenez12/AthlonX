# Rediseño del menú de cuenta

Figma: archivo `AthlonX`, página **Claude** (`954:56`), desde y≈31 000:
https://www.figma.com/design/YBGPZrYsYNb5259mmBgoF1/AthlonX?node-id=954-56

Código actual: `Components/account-menu.tsx` (menú), `Components/dashboard-header.tsx` (botón que lo abre) y `Components/logout-confirmation.tsx` (ventana de cerrar sesión).

## Frames

| Frame | Contenido |
|---|---|
| `Componentes · Menú de cuenta` | `Menú cuenta/Ítem`, `Ítem hover`, `Ítem peligro`, `Cuenta/Disparador` y `Disparador abierto` |
| `Menú de cuenta · Persona · Escritorio · Oscuro / Claro` | Menú abierto con "Mi perfil" en hover |
| `Menú de cuenta · Equipo · Escritorio · Oscuro` | Avatar cuadrado, nombre del equipo y su código |
| `Menú de cuenta · Persona · Escritorio · Oscuro / Claro · Cerrar sesión` | Confirmación de salida dentro del menú |
| `Menú de cuenta · Persona · Móvil · Oscuro` | Menú a todo el ancho bajo la barra superior |

## Cambios

- **Botón que abre el menú:**
  - Muestra el avatar, el nombre de la cuenta activa y su tipo (Persona, Equipo u Organización), con una flecha.
  - Hoy, en las cuentas de equipo aparece el nombre del perfil (por ejemplo "equipo") en vez del nombre del equipo.
  - El avatar es redondo para Persona y cuadrado para Equipo y Organización.
- **Cabecera del menú:**
  - Avatar de 44 px y el nombre.
  - La insignia del tipo de cuenta y el código AthlonX con botón de copiar.
  - El correo de acceso.
- **Accesos:**
  - Mi perfil.
  - Ver perfil público.
  - Configuración (abre `/mi-perfil?seccion=configuracion`).
  - Cada uno con su icono en un recuadro de 28 px.
- **Tema:** una fila "Tema" con el selector Oscuro/Claro (`Segmentado/Tema`) alineado a la derecha.
- **Cerrar sesión:**
  - Va al final, en rojo y separado por una línea.
  - La confirmación aparece dentro del mismo menú ("¿Cerrar sesión en este dispositivo?", con Cancelar y Cerrar sesión), en vez de la ventana aparte de `logout-confirmation.tsx`.
- **Medidas:** 288 px de ancho, radio de 14 px, borde `line-strong`, fondo `surface` y sombra. En móvil ocupa todo el ancho con 16 px de margen.

## En código (2026-10-23)

- **`Components/account-menu.tsx`:** exporta `AccountTrigger`, `AccountMenu` y `AccountIdentity`.
  - El copiar del código muestra "Copiado".
  - Cerrar sesión se confirma dentro del menú y llama a `supabase.auth.signOut()`.
- **`Components/dashboard-header.tsx`:**
  - `loadIdentity` arma la identidad de la cuenta activa desde Supabase:
    - Persona: `profiles.full_name` y `athlonx_code`; perfil público `/perfil/{id}`.
    - Equipo: el equipo activo en `teams`; `/equipos/{id}`.
    - Organización: su organización en `organizations` (creada por la persona o donde es directivo); `/organizaciones/{id}`.
  - La identidad se recalcula al cambiar de contexto.
  - El botón y el menú van dentro de `.ax-v2`.
  - El menú se cierra con Escape, al tocar fuera o al abrir otro menú (`useDismissableMenu`).
- **"Ver perfil público"** se quitó de la cabecera de Mi perfil (`Hero`), como pidió Edwin: ahora está solo en este menú.
- **`/configuracion`** (la página antigua) ahora redirige a `/mi-perfil?seccion=configuracion`.
