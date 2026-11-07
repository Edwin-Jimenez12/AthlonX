import type { Metadata } from 'next'
import Link from 'next/link'
import { LEGAL_ENTITY, LegalPage, List, Strong, operatorText, type LegalSection } from '../../Components/legal/legal-page'

export const metadata: Metadata = {
  title: 'Términos y condiciones · AthlonX',
  description: 'Condiciones de uso de la plataforma AthlonX, regidas por las leyes de la República de Panamá.',
}

const UPDATED = '7 de noviembre de 2026'
const link = 'font-semibold text-[#B4FF45] underline-offset-4 hover:underline'

const sections: LegalSection[] = [
  {
    id: 'aceptacion',
    title: 'Aceptación de los términos',
    content: (
      <>
        <p>
          Estos Términos y condiciones regulan el uso de AthlonX ({LEGAL_ENTITY.site}), plataforma operada por <Strong>{LEGAL_ENTITY.name}</Strong>{operatorText()}.
        </p>
        <p>Al crear una cuenta o usar AthlonX aceptas estos términos y nuestra <Link className={link} href="/privacidad">Política de privacidad</Link>. Si no estás de acuerdo, no uses la plataforma.</p>
      </>
    ),
  },
  {
    id: 'servicio',
    title: 'Qué es AthlonX',
    content: (
      <p>
        AthlonX es una plataforma de gestión deportiva para personas, equipos y organizaciones. Permite administrar perfiles, plantillas, torneos, partidos, marcadores, estadísticas, convocatorias, entrenamientos, calendarios y, para los equipos, sus finanzas. Algunas funciones dependen del plan contratado.
      </p>
    ),
  },
  {
    id: 'cuentas',
    title: 'Cuentas',
    content: (
      <>
        <p>Existen tres tipos de cuenta:</p>
        <List items={[
          <><Strong>Persona</Strong>: atletas, entrenadores, staff y directivos. Una misma cuenta puede tener varios roles.</>,
          <><Strong>Equipo</Strong>: para administrar un equipo, su plantilla y su actividad.</>,
          <><Strong>Organización</Strong>: para instituciones, ligas o federaciones que organizan torneos.</>,
        ]} />
        <p>Al registrarte te comprometes a:</p>
        <List items={[
          'Dar información verdadera y mantenerla actualizada.',
          'Usar una sola cuenta de persona.',
          'Mantener tu contraseña en secreto. Eres responsable de lo que se haga con tu cuenta.',
          'Avisarnos de inmediato si sospechas un uso no autorizado.',
        ]} />
        <p>Puedes registrarte con tu correo o con tu cuenta de Google. Si usas Google, también se aplican las condiciones de Google para ese servicio.</p>
        <p>
          <Strong>Menores de edad.</Strong> Las personas menores de 18 años solo pueden usar AthlonX con el consentimiento y la supervisión de su madre, padre o tutor legal, quien acepta estos términos en su nombre y responde por su uso.
        </p>
      </>
    ),
  },
  {
    id: 'equipos-organizaciones',
    title: 'Equipos y organizaciones',
    content: (
      <>
        <p>Las cuentas de equipo y de organización, y las personas a quienes estas den permisos (directivos, cuerpo técnico, tesoreros, staff), son responsables de:</p>
        <List items={[
          'Contar con la autorización de las personas que registran, en especial de los representantes legales de menores de edad.',
          'La veracidad de los datos que ingresan: plantillas, resultados, estadísticas, convocatorias y registros financieros.',
          'Los permisos que otorgan a otras personas dentro de su cuenta.',
          'El cumplimiento de sus propios reglamentos deportivos y de las normas que les apliquen.',
        ]} />
        <p>AthlonX es una herramienta de gestión: no organiza los torneos ni decide sus resultados, y no es parte de las relaciones entre los equipos, las organizaciones y sus miembros.</p>
      </>
    ),
  },
  {
    id: 'planes-pagos',
    title: 'Planes y pagos',
    content: (
      <>
        <p>AthlonX ofrece un plan gratuito y planes de pago para cada tipo de cuenta. Las funciones y límites de cada plan se publican en la página de <Link className={link} href="/planes">Planes</Link>.</p>
        <List items={[
          'Los precios están expresados en dólares de los Estados Unidos de América (moneda de curso legal en Panamá) y pueden incluir o sumar los impuestos que correspondan, como el ITBMS.',
          'Los planes mensuales o anuales se renuevan por el mismo periodo, salvo que los canceles antes de la fecha de renovación.',
          'Si cancelas, conservas las funciones de tu plan hasta el final del periodo pagado; después la cuenta pasa al plan gratuito sin perder tus datos.',
          'Podemos cambiar los precios o las funciones de los planes. Te avisaremos con anticipación y el cambio aplicará desde la siguiente renovación.',
          'Los códigos promocionales tienen las condiciones y vigencia indicadas al entregarlos y no son canjeables por dinero.',
        ]} />
        <p>Las solicitudes de reembolso se atienden conforme a la Ley 45 de 31 de octubre de 2007, de protección al consumidor, y demás normas aplicables.</p>
      </>
    ),
  },
  {
    id: 'uso-aceptable',
    title: 'Uso aceptable',
    content: (
      <>
        <p>No está permitido:</p>
        <List items={[
          'Suplantar a otra persona, equipo u organización, o crear cuentas con datos falsos.',
          'Acosar, amenazar, discriminar o publicar contenido ofensivo, violento o ilegal.',
          'Registrar datos de otras personas sin su autorización.',
          'Alterar resultados, estadísticas o registros de forma fraudulenta.',
          'Intentar acceder a cuentas, datos o partes de la plataforma sin permiso, o afectar su funcionamiento.',
          'Extraer información de forma automatizada o usar la plataforma para enviar publicidad no solicitada.',
          'Subir contenido sobre el que no tengas derechos, como imágenes o logotipos de terceros.',
        ]} />
      </>
    ),
  },
  {
    id: 'contenido',
    title: 'Tu contenido',
    content: (
      <>
        <p>El contenido que subes (fotos, logotipos, textos y datos) sigue siendo tuyo o de quien tenga sus derechos.</p>
        <p>Para que la plataforma funcione, nos autorizas a guardarlo, procesarlo y mostrarlo dentro de AthlonX según tu configuración de privacidad, solo mientras sea necesario para prestar el servicio.</p>
        <p>Podemos retirar contenido que incumpla estos términos o la ley.</p>
      </>
    ),
  },
  {
    id: 'propiedad-intelectual',
    title: 'Propiedad intelectual de AthlonX',
    content: (
      <p>La marca AthlonX, su logotipo, su diseño, su software y sus contenidos propios están protegidos por las normas de propiedad intelectual. No puedes copiarlos, modificarlos ni usarlos fuera de la plataforma sin nuestra autorización por escrito.</p>
    ),
  },
  {
    id: 'terceros',
    title: 'Servicios de terceros',
    content: (
      <p>AthlonX se integra con servicios de terceros, como Google (inicio de sesión y Google Calendar). El uso de esos servicios también se rige por sus propias condiciones y políticas. No somos responsables de su funcionamiento ni de sus cambios.</p>
    ),
  },
  {
    id: 'disponibilidad',
    title: 'Disponibilidad del servicio',
    content: (
      <p>Trabajamos para que AthlonX esté disponible y funcione bien, pero puede haber interrupciones por mantenimiento, mejoras o causas fuera de nuestro control. Podemos agregar, cambiar o retirar funciones. Cuando un cambio afecte de forma importante a tu plan, te lo avisaremos.</p>
    ),
  },
  {
    id: 'suspension',
    title: 'Suspensión y eliminación de cuentas',
    content: (
      <>
        <p>Podemos suspender o cerrar una cuenta que incumpla estos términos o la ley, o que ponga en riesgo a otras personas o a la plataforma. Cuando sea posible, te avisaremos antes.</p>
        <p>Puedes eliminar tu cuenta desde Mi perfil → Cuenta. Tendrás 15 días calendario para recuperarla iniciando sesión; después se eliminan tus datos personales, como se explica en la <Link className={link} href="/privacidad">Política de privacidad</Link>.</p>
      </>
    ),
  },
  {
    id: 'responsabilidad',
    title: 'Limitación de responsabilidad',
    content: (
      <>
        <p>En la medida en que lo permitan las leyes de la República de Panamá, AthlonX no es responsable de:</p>
        <List items={[
          'Las lesiones, accidentes o daños ocurridos durante actividades deportivas organizadas o registradas en la plataforma.',
          'Las decisiones de equipos, organizaciones, árbitros u organizadores, ni los datos que ellos ingresen.',
          'Pérdidas causadas por el uso indebido de tu cuenta o por no mantener segura tu contraseña.',
          'Interrupciones o fallas causadas por terceros, por fuerza mayor o por caso fortuito.',
        ]} />
        <p>Nada de lo anterior limita los derechos que te reconoce la Ley 45 de 2007 como consumidor.</p>
      </>
    ),
  },
  {
    id: 'indemnidad',
    title: 'Indemnidad',
    content: (
      <p>Te comprometes a responder frente a AthlonX por los reclamos de terceros que resulten del incumplimiento de estos términos o de la ley por tu parte, o del contenido que subas.</p>
    ),
  },
  {
    id: 'comunicaciones',
    title: 'Comunicaciones electrónicas',
    content: (
      <p>Aceptas recibir comunicaciones sobre tu cuenta dentro de la plataforma y por correo electrónico. Los avisos, aceptaciones y registros electrónicos de AthlonX tienen validez conforme a la Ley 51 de 22 de julio de 2008, sobre documentos y firmas electrónicas, y sus modificaciones. Puedes elegir cómo recibir los avisos de actividad en Mi perfil → Conexiones.</p>
    ),
  },
  {
    id: 'cambios',
    title: 'Cambios a estos términos',
    content: (
      <p>Podemos actualizar estos términos. Si los cambios son importantes, te avisaremos dentro de la plataforma o por correo antes de que entren en vigor. Si sigues usando AthlonX después de esa fecha, aceptas los nuevos términos.</p>
    ),
  },
  {
    id: 'ley-aplicable',
    title: 'Ley aplicable y jurisdicción',
    content: (
      <>
        <p>Estos términos se rigen por las leyes de la República de Panamá. Cualquier controversia se someterá a los tribunales competentes de la ciudad de Panamá, sin perjuicio de los derechos que tengas como consumidor.</p>
        <p>Antes de iniciar un reclamo, te invitamos a escribirnos para intentar resolverlo directamente. Como consumidor, también puedes acudir a la Autoridad de Protección al Consumidor y Defensa de la Competencia (ACODECO).</p>
      </>
    ),
  },
  {
    id: 'contacto',
    title: 'Contacto',
    content: (
      <p>Para consultas sobre estos términos escribe a <a className={link} href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>.</p>
    ),
  },
]

export default function TerminosPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Términos y condiciones"
      intro="Estas son las reglas para usar AthlonX: qué ofrecemos, qué esperamos de quienes usan la plataforma y cómo resolvemos cualquier diferencia."
      updated={UPDATED}
      summary={[
        'AthlonX es una herramienta de gestión deportiva para personas, equipos y organizaciones.',
        'Tu información debe ser verdadera y tu cuenta es personal.',
        'Los equipos y organizaciones responden por los datos que registran y deben tener la autorización de esas personas.',
        'Puedes cancelar tu plan o eliminar tu cuenta cuando quieras.',
        'Estos términos se rigen por las leyes de la República de Panamá.',
      ]}
      sections={sections}
      related={{ href: '/privacidad', label: 'Ver política de privacidad' }}
    />
  )
}
