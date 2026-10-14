import Link from "next/link";
import { FaInstagram, FaWhatsapp } from "react-icons/fa6";
import { SiGmail } from "react-icons/si";

// Enlaces oficiales de AthlonX. WhatsApp usa el formato internacional de Panamá (+507).
export const ATHLONX_WHATSAPP_NUMBER = "50765591976";
export const ATHLONX_CONTACT_EMAIL = "contacto@nexdigitaldev.com";
export const ATHLONX_INSTAGRAM_URL = "https://www.instagram.com/athlonx.pan";

const navLinks = [
  { label: "Inicio", href: "/" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Novedades", href: "/novedades" },
  { label: "Contáctanos", href: "/contactanos" },
];

// Botones de contacto: solo icono, uno al lado del otro, con su nombre accesible.
const socialLinks = [
  {
    label: "Instagram de AthlonX",
    href: ATHLONX_INSTAGRAM_URL,
    Icon: FaInstagram,
  },
  {
    label: "WhatsApp de AthlonX",
    href: `https://wa.me/${ATHLONX_WHATSAPP_NUMBER}`,
    Icon: FaWhatsapp,
  },
  {
    label: "Correo de AthlonX",
    href: `mailto:${ATHLONX_CONTACT_EMAIL}`,
    Icon: SiGmail,
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/15 bg-[#03090f]/75 px-6 pb-10 pt-16 backdrop-blur-sm md:px-14 lg:px-24">
      <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-3">
        <div>
          <img
            className="w-48"
            src="/Logo/Horizontal-claro.png"
            alt="AthlonX"
          />
          <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">
            El deporte se juega en la cancha. La organización empieza antes.
          </p>
        </div>

        <nav aria-label="Navegación del pie de página">
          <p className="font-heading text-sm font-bold uppercase tracking-[.25em] text-[#B4FF45]">
            Navegación
          </p>
          <ul className="mt-4 space-y-3">
            {navLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-slate-200 transition hover:text-[#B4FF45]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="font-heading text-sm font-bold uppercase tracking-[.25em] text-[#B4FF45]">
            Síguenos y escríbenos
          </p>
          <div className="mt-4 flex items-center gap-3">
            {socialLinks.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith("mailto:") ? undefined : "_blank"}
                rel={
                  href.startsWith("mailto:") ? undefined : "noopener noreferrer"
                }
                aria-label={label}
                title={label}
                className="inline-flex h-12 w-12 items-center justify-center rounded-[5px] border border-white/15 bg-white/5 text-slate-200 transition hover:border-[#B4FF45] hover:text-[#B4FF45] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4FF45]"
              >
                <Icon size={22} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-7xl flex-col gap-3 border-t border-white/10 pt-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <p>© 2026 AthlonX · Panamá</p>
        <div className="flex items-center gap-3">
          <span>Desarrollado por</span>
          <span className="text-white/25" aria-hidden="true">
            |
          </span>
          <img
            className="h-10 w-auto"
            src="/nexdigital.svg"
            alt="Nex Digital"
          />
        </div>
      </div>
    </footer>
  );
}
