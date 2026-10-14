"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu as MenuIcon, X, ArrowUpRight } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Rutas públicas del sitio. El activo se calcula con la ruta actual.
const links = [
  { label: "Inicio", href: "/" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Novedades", href: "/novedades" },
  { label: "Contáctanos", href: "/contactanos" },
];

export default function Menu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const activeHref = links.find((link) => link.href === pathname)?.href ?? null;
  const activeLabel = links.find((link) => link.href === pathname)?.label ?? "";

  // La barrita verde se mueve desde el enlace anterior hasta el activo.
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0, visible: false });

  useLayoutEffect(() => {
    function measure() {
      const el = activeHref ? linkRefs.current[activeHref] : null;
      if (!el) {
        setIndicator((current) => (current.visible ? { ...current, visible: false } : current));
        return;
      }
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth, visible: true });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeHref]);

  // Con el menú móvil abierto: se bloquea el scroll, se cierra con Escape y al pasar a escritorio.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function handleResize() {
      if (window.matchMedia("(min-width: 768px)").matches) setOpen(false);
    }

    window.addEventListener("keydown", handleKey);
    window.addEventListener("resize", handleResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  // El acceso se abre sobre la página actual, sin cambiar de ruta.
  function openAuth(mode: "login" | "register") {
    closeMenu();
    window.dispatchEvent(new CustomEvent("athlonx-auth", { detail: mode }));
  }

  return (
    <>
      <header className="relative z-50 px-4 pt-4 md:px-8 md:pt-8">
        <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/15 bg-[#07111d]/70 px-5  shadow-2xl backdrop-blur-xl md:px-7">
          <Link
            href="/"
            aria-label="AthlonX, inicio"
            className="shrink-0 transition hover:opacity-80"
          >
            <img
              className="w-40 md:w-48"
              src="/Logo/Horizontal-claro.png"
              alt="AthlonX"
            />
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <div className="relative flex items-center gap-8">
              {links.map((link) => (
                <Link
                  key={link.label}
                  ref={(el) => {
                    linkRefs.current[link.href] = el;
                  }}
                  href={link.href}
                  className={`font-heading group relative py-2 text-sm font-semibold transition-colors ${activeLabel === link.label ? "text-white" : "text-slate-300 hover:text-white"}`}
                >
                  <span>{link.label}</span>
                </Link>
              ))}
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute -bottom-0.5 h-0.5 rounded-full bg-[#B4FF45] shadow-[0_0_10px_#B4FF45] transition-[left,width,opacity] duration-500 ease-out ${indicator.visible ? "opacity-100" : "opacity-0"}`}
                style={{ left: indicator.left, width: indicator.width }}
              />
            </div>
            <button
              type="button"
              onClick={() => openAuth("login")}
              className="inline-flex items-center gap-2 rounded-full border border-[#B4FF45] px-5 py-3 text-sm font-bold text-[#d9ffb1] transition hover:bg-[#B4FF45] hover:text-[#10151b]"
            >
              <span>Iniciar sesión</span>
              <ArrowUpRight size={16} />
            </button>
          </div>

          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((current) => !current)}
            className="relative h-11 w-11 rounded-xl border border-white/15 text-white transition hover:border-[#B4FF45] hover:text-[#B4FF45] active:scale-95 md:hidden"
          >
            <MenuIcon
              size={23}
              aria-hidden="true"
              className={`absolute inset-0 m-auto transition-all duration-300 ease-out ${open ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
            />
            <X
              size={23}
              aria-hidden="true"
              className={`absolute inset-0 m-auto transition-all duration-300 ease-out ${open ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`}
            />
          </button>
        </nav>

        <div
          id="mobile-menu"
          className={`absolute left-4 right-4 top-[calc(100%+0.5rem)] origin-top overflow-hidden rounded-2xl border border-white/15 bg-[#0b1724]/95 shadow-2xl backdrop-blur-xl transition-all duration-300 ease-out md:hidden ${open ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-3 scale-95 opacity-0"}`}
        >
          <div className="p-3">
            {links.map((link, index) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={closeMenu}
                style={{ transitionDelay: open ? `${90 + index * 60}ms` : "0ms" }}
                className={`font-heading flex items-center justify-between rounded-xl px-4 py-4 text-lg font-semibold text-slate-200 transition-all duration-300 ease-out hover:bg-white/10 hover:text-[#B4FF45] active:scale-[0.98] ${open ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-0"}`}
              >
                <span>{link.label}</span>
                <ArrowUpRight size={18} />
              </Link>
            ))}
            <button
              type="button"
              onClick={() => openAuth("login")}
              style={{ transitionDelay: open ? "330ms" : "0ms" }}
              className={`mt-2 block w-full rounded-xl bg-[#B4FF45] px-4 py-4 text-center font-bold text-[#10151b] transition-all duration-300 ease-out hover:bg-[#c8ff7a] active:scale-[0.98] ${open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => openAuth("register")}
              style={{ transitionDelay: open ? "390ms" : "0ms" }}
              className={`mt-2 block w-full rounded-xl border border-white/20 px-4 py-4 text-center font-bold text-white transition-all duration-300 ease-out hover:bg-white/10 active:scale-[0.98] ${open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
            >
              Registrarse
            </button>
          </div>
        </div>
      </header>

      {/* Fondo oscuro detrás del menú móvil. Va fuera del encabezado para quedar debajo de la barra. */}
      <div
        aria-hidden="true"
        onClick={closeMenu}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-out md:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
    </>
  );
}
