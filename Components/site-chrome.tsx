"use client";

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import Menu from "./menu";
import SiteBackground from "./site-background";
import AuthPanel from "./auth-panel";
import { supabase } from "../lib/supabase";
import "./site-transitions.css";

// Páginas públicas con menú y fondo compartidos. El orden define hacia qué lado se desplaza el contenido.
const PUBLIC_ORDER = ["/", "/nosotros", "/novedades", "/contactanos"];
const EXIT_MS = 380;
const ENTER_MS = 520;
const GLASS = "blur(14px) saturate(120%)";
// Marca que queda guardada mientras el usuario no ha terminado de restablecer su contraseña.
const RECOVERY_KEY = "athlonx-recovery-pending";

type AuthMode = "login" | "register" | "reset";

function basePath(href: string) {
  return href.split(/[?#]/)[0] || "/";
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function setRecoveryPending(value: boolean) {
  try {
    if (value) window.localStorage.setItem(RECOVERY_KEY, "1");
    else window.localStorage.removeItem(RECOVERY_KEY);
  } catch {
    // Si el navegador bloquea el almacenamiento, el restablecimiento sigue funcionando en la misma pestaña.
  }
}

function isRecoveryPending() {
  try {
    return window.localStorage.getItem(RECOVERY_KEY) === "1";
  } catch {
    return false;
  }
}

// Vive en el layout raíz: el menú, el fondo y el acceso no se desmontan al cambiar de página.
// Solo el contenido (.site-page) se desliza: sale por un lado y entra por el otro.
export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const arrived = useRef<(() => void) | null>(null);
  const closeTimer = useRef<number | null>(null);
  const isPublic = PUBLIC_ORDER.includes(basePath(pathname));

  // Acceso: el modal aparece sobre la página actual con un efecto glass progresivo.
  const [auth, setAuth] = useState<{ mode: AuthMode | null; shown: boolean }>({ mode: null, shown: false });

  function openAuth(mode: AuthMode) {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setAuth({ mode, shown: false });
    window.setTimeout(() => setAuth((current) => (current.mode === mode ? { ...current, shown: true } : current)), 30);
  }

  // Solo la X (o Escape en inicio de sesión y registro) cierra el acceso. Tocar fuera no lo cierra.
  function closeAuth() {
    // Si cierra a mitad del restablecimiento, se cierra la sesión temporal del enlace.
    if (auth.mode === "reset") {
      setRecoveryPending(false);
      if (supabase) void supabase.auth.signOut();
    }
    setAuth((current) => ({ ...current, shown: false }));
    closeTimer.current = window.setTimeout(() => setAuth({ mode: null, shown: false }), 450);
  }

  // Cuando la nueva página ya está montada en el DOM, avisa a la animación para que la despliegue.
  useLayoutEffect(() => {
    arrived.current?.();
    arrived.current = null;
  }, [pathname]);

  async function slideTo(href: string) {
    const page = pageRef.current;
    const from = PUBLIC_ORDER.indexOf(basePath(pathname));
    const to = PUBLIC_ORDER.indexOf(basePath(href));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!page || busy.current || from === -1 || to === -1 || from === to || reduceMotion) {
      router.push(href);
      return;
    }

    busy.current = true;
    // Avanzar (inicio → nosotros): el contenido sale a la izquierda y entra desde la derecha. Retroceder: al revés.
    const forward = to > from;
    const exitX = forward ? "-100%" : "100%";
    const enterX = forward ? "100%" : "-100%";

    const arrival = new Promise<void>((resolve) => {
      arrived.current = resolve;
    });

    // 1. El contenido actual sale.
    page.style.transition = `transform ${EXIT_MS}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${EXIT_MS}ms ease`;
    page.style.transform = `translateX(${exitX})`;
    page.style.opacity = "0";

    // 2. La página nueva se monta mientras el anterior ya salió.
    router.push(href);
    await Promise.all([wait(EXIT_MS), Promise.race([arrival, wait(2500)])]);

    // 3. Se coloca fuera de pantalla, sin animación, y entra por el lado contrario.
    page.style.transition = "none";
    page.style.transform = `translateX(${enterX})`;
    page.style.opacity = "1";
    void page.offsetWidth;
    page.style.transition = `transform ${ENTER_MS}ms cubic-bezier(0.22, 0.8, 0.2, 1), opacity ${ENTER_MS}ms ease`;
    page.style.transform = "translateX(0)";
    await wait(ENTER_MS);

    // 4. Se quita la transformación: así los elementos fixed vuelven a centrarse en pantalla.
    page.style.transition = "";
    page.style.transform = "";
    page.style.opacity = "";
    busy.current = false;
  }

  // Los enlaces internos de páginas públicas usan el mismo desplazamiento.
  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!isPublic || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as HTMLElement).closest("a");
    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
    const href = anchor.getAttribute("href");
    if (!href || !href.startsWith("/") || href.startsWith("//")) return;
    event.preventDefault();
    void slideTo(href);
  }

  // El menú pide navegar a otra página del sitio.
  useEffect(() => {
    function handleNavigate(event: Event) {
      void slideTo((event as CustomEvent<string>).detail);
    }
    window.addEventListener("athlonx-navigate", handleNavigate);
    return () => window.removeEventListener("athlonx-navigate", handleNavigate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, router]);

  // Cualquier botón del sitio puede abrir el acceso con este evento.
  useEffect(() => {
    function handleAuthEvent(event: Event) {
      const mode = (event as CustomEvent<AuthMode>).detail;
      if (mode === "login" || mode === "register") openAuth(mode);
    }
    window.addEventListener("athlonx-auth", handleAuthEvent);
    return () => window.removeEventListener("athlonx-auth", handleAuthEvent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Las páginas públicas siempre usan el tema oscuro original. El tema del panel no debe quedarse en el sitio.
  useEffect(() => {
    if (!isPublic) return
    document.documentElement.removeAttribute("data-theme")
  }, [isPublic, pathname])

  // Al iniciar sesión o crear la cuenta, el modal se cierra. La sesión se conserva.
  useEffect(() => {
    function handleAuthDone() {
      if (closeTimer.current) window.clearTimeout(closeTimer.current)
      setAuth({ mode: null, shown: false })
    }
    window.addEventListener("athlonx-auth-done", handleAuthDone)
    return () => window.removeEventListener("athlonx-auth-done", handleAuthDone)
  }, [])

  // Enlaces de restablecimiento: Supabase abre el sitio con la sesión temporal de recuperación.
  // La marca se guarda para que el formulario siga disponible si la página se recarga o se cambia de pestaña.
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    if (window.location.hash.includes("type=recovery")) setRecoveryPending(true);
    if (isRecoveryPending()) {
      void client.auth.getSession().then(({ data }) => {
        if (data.session) openAuth("reset");
        else setRecoveryPending(false);
      });
    }
    const { data } = client.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryPending(true);
        openAuth("reset");
      }
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Con el acceso abierto: la página no se mueve, pero la barra de desplazamiento se mantiene visible.
  useEffect(() => {
    if (!auth.mode) return;
    const scrollY = window.scrollY;
    const html = document.documentElement;
    const body = document.body;
    const previous = {
      htmlOverflow: html.style.overflowY,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
    };
    html.style.overflowY = "scroll";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" && auth.mode !== "reset") closeAuth();
    }
    window.addEventListener("keydown", handleKey);

    return () => {
      html.style.overflowY = previous.htmlOverflow;
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.width = previous.bodyWidth;
      window.scrollTo(0, scrollY);
      window.removeEventListener("keydown", handleKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.mode]);

  return (
    <>
      <div onClickCapture={handleClickCapture}>
        {isPublic && <SiteBackground />}
        {isPublic && <Menu />}
        <div ref={pageRef} className="site-page">
          {children}
        </div>
      </div>

      {auth.mode && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto px-4 py-4 sm:px-6 sm:py-6"
          style={{
            backgroundColor: auth.shown ? "rgba(3, 10, 16, 0.6)" : "rgba(3, 10, 16, 0)",
            backdropFilter: auth.shown ? GLASS : "blur(0px)",
            WebkitBackdropFilter: auth.shown ? GLASS : "blur(0px)",
            transition: "background-color 600ms ease, backdrop-filter 600ms ease, -webkit-backdrop-filter 600ms ease",
          }}
        >
          <div
            className={`relative flex max-h-[calc(100dvh-2rem)] min-h-0 w-full max-w-2xl flex-col transition-all duration-500 ease-out ${auth.shown ? "translate-y-0 scale-100 opacity-100" : "translate-y-6 scale-[.97] opacity-0"}`}
            style={{ transitionDelay: auth.shown ? "180ms" : "0ms" }}
          >
            <button
              type="button"
              aria-label="Cerrar formulario"
              onClick={closeAuth}
              className="absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-[5px] border border-white/15 bg-[#0b141e]/90 text-slate-300 shadow-lg transition hover:border-[#B4FF45] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4FF45]"
            >
              <X size={18} />
            </button>
            <AuthPanel initialMode={auth.mode} />
          </div>
        </div>
      )}
    </>
  );
}
