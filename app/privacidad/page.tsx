import type { Metadata } from 'next'
import Link from 'next/link'
import { LEGAL_ENTITY, LegalPage, List, Strong, type LegalSection } from '../../Components/legal/legal-page'

export const metadata: Metadata = {
  title: 'Política de privacidad · AthlonX',
  description: 'Cómo AthlonX recopila, usa, protege y conserva tus datos personales, de acuerdo con la Ley 81 de 2019 de la República de Panamá.',
}

const UPDATED = '7 de noviembre de 2026'

const sections: LegalSection[] = [
  {
    id: 'responsable',
    title: 'Quién es el responsable',
    content: (
      <>
        <p>
          AthlonX ({LEGAL_ENTITY.site}) es una plataforma de gestión deportiva operada por <Strong>{LEGAL_ENTITY.name}</Strong>, RUC {LEGAL_ENTITY.ruc}, con domicilio en {LEGAL_ENTITY.address} (en adelante, &quot;AthlonX&quot;, &quot;nosotros&quot;).
        </p>
        <p>
          AthlonX es el responsable del tratamiento de los datos personales que se registran en la plataforma. Para cualquier asunto relacionado con tus datos puedes escribirnos a <a className="font-semibold text-[#B4FF45] underline-offset-4 hover:underline" href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>.
        </p>
      </>
    ),
  },
  {
    id: 'marco-legal',
    title: 'Marco legal',
    content: (
      <>
        <p>
          Esta política se rige por las leyes de la República de Panamá, en particular la <Strong>Ley 81 de 26 de marzo de 2019, sobre Protección de Datos Personales</Strong>, y su reglamento, el <Strong>Decreto Ejecutivo 285 de 28 de mayo de 2021</Strong>. La autoridad de control en materia de protección de datos es la Autoridad Nacional de Transparencia y Acceso a la Información (ANTAI).
        </p>
        <p>Por ahora AthlonX presta su servicio en Panamá. Si en el futuro se ofrece en otros países, esta política se actualizará para incluir las normas que correspondan.</p>
      </>
    ),
  },
  {
    id: 'nuestro-compromiso',
    title: 'Nuestro compromiso con tus datos',
    content: (
      <>
        <p>Los datos personales que ingresas en AthlonX se usan únicamente para prestarte el servicio que elegiste. En concreto:</p>
        <List items={[
          <><Strong>No vendemos, alquilamos ni cedemos</Strong> tus datos personales a terceros.</>,
          <><Strong>No los usamos con fines publicitarios</Strong> ni para crear perfiles comerciales, y no mostramos anuncios basados en tu información.</>,
          <><Strong>No los manipulamos ni los usamos para fines distintos</Strong> a los descritos en esta política.</>,
          <>Solo los entregaremos cuando lo exija la ley o lo solicite formalmente una autoridad competente, como se explica en la sección &quot;Cuándo compartimos tus datos&quot;.</>,
        ]} />
      </>
    ),
  },
  {
    id: 'datos',
    title: 'Qué datos recopilamos',
    content: (
      <>
        <p><Strong>Datos de tu cuenta.</Strong> Nombre, apellido, correo electrónico, nombre de usuario, contraseña (que guardamos cifrada; nadie en AthlonX puede verla) y tu código AthlonX.</p>
        <p><Strong>Datos de perfil que decides agregar.</Strong> Foto, teléfono, fecha de nacimiento, país y tipo de sangre. Son opcionales y puedes cambiarlos o borrarlos desde Mi perfil.</p>
        <p><Strong>Actividad deportiva.</Strong> Tus roles (atleta, entrenador, staff o directivo), los equipos, divisiones y organizaciones a las que perteneces, tu dorsal y posición, convocatorias, asistencia, estadísticas, eventos de partidos y torneos, y las actividades de tu calendario.</p>
        <p><Strong>Cuentas de equipo y de organización.</Strong> Nombre, disciplina, ubicación, logotipo y miembros. Si el equipo usa Finanzas, también los registros que el propio equipo ingresa (cuotas, movimientos y presupuestos).</p>
        <p><Strong>Si entras con Google.</Strong> Recibimos tu nombre, tu correo y tu foto de perfil de Google. No recibimos ni guardamos tu contraseña de Google.</p>
        <p><Strong>Si conectas Google Calendar</Strong> (función disponible próximamente y solo si tú lo autorizas). Usamos el permiso que otorgas para crear y actualizar tus eventos de AthlonX en un calendario llamado &quot;AthlonX&quot; dentro de tu cuenta de Google, y para leer los cambios que hagas en ese calendario. No leemos ni modificamos tus otros calendarios. Puedes retirar el permiso cuando quieras.</p>
        <p><Strong>Datos técnicos.</Strong> Fecha de tu último acceso, datos de sesión y preferencias que tu navegador guarda para que la plataforma funcione (por ejemplo, el tema claro u oscuro y el menú). No usamos cookies publicitarias ni herramientas de rastreo de terceros.</p>
        <p>
          <Strong>Datos sensibles.</Strong> El tipo de sangre y cualquier dato de salud o de carga deportiva se consideran datos sensibles. Solo se registran si tú, o tu equipo con tu autorización, los ingresan; se muestran únicamente a ti y a tu equipo, y puedes eliminarlos cuando quieras.
        </p>
      </>
    ),
  },
  {
    id: 'finalidades',
    title: 'Para qué usamos tus datos',
    content: (
      <List items={[
        'Crear y administrar tu cuenta y permitirte iniciar sesión.',
        'Mostrar tu perfil a otras personas según la privacidad que configures.',
        'Gestionar equipos, plantillas, torneos, partidos, estadísticas, convocatorias, entrenamientos y calendarios.',
        'Enviarte avisos dentro de la app y, si así lo eliges en Mi perfil → Conexiones, también por correo.',
        'Administrar tu plan, sus límites y, cuando corresponda, los pagos.',
        'Mantener la seguridad de la plataforma, prevenir fraudes y usos indebidos.',
        'Responder tus consultas y solicitudes sobre tus datos.',
        'Cumplir las obligaciones que nos imponga la ley.',
      ]} />
    ),
  },
  {
    id: 'base-legal',
    title: 'Por qué podemos tratar tus datos',
    content: (
      <>
        <p>Tratamos tus datos con base en:</p>
        <List items={[
          <><Strong>Tu consentimiento</Strong>, que otorgas al crear tu cuenta y aceptar esta política, y al completar datos opcionales o conectar servicios como Google.</>,
          <><Strong>La prestación del servicio</Strong> que solicitaste, de acuerdo con los Términos y condiciones.</>,
          <><Strong>El cumplimiento de obligaciones legales.</Strong></>,
        ]} />
        <p>Puedes retirar tu consentimiento en cualquier momento. Retirarlo no afecta lo realizado antes, pero puede impedir que sigamos prestándote algunas funciones.</p>
      </>
    ),
  },
  {
    id: 'compartir',
    title: 'Cuándo compartimos tus datos',
    content: (
      <>
        <p><Strong>Con otros usuarios.</Strong> Tu nombre, apellido y código AthlonX son públicos para que te puedan encontrar. El resto (correo, teléfono, edad) se muestra según tu configuración de privacidad. Tu fecha de nacimiento es siempre privada.</p>
        <p><Strong>Con tus equipos y organizaciones.</Strong> Las personas que administran tus equipos ven la información necesaria para gestionarlos: convocatorias, asistencia, estadísticas y, si corresponde, cuotas.</p>
        <p><Strong>Con proveedores que nos ayudan a operar.</Strong> Solo procesan datos por nuestra cuenta, según nuestras instrucciones y con obligaciones de confidencialidad y seguridad:</p>
        <List items={[
          <><Strong>Supabase</Strong>: base de datos y autenticación.</>,
          <><Strong>Cloudflare</Strong>: alojamiento y entrega del sitio web.</>,
          <><Strong>Google</Strong>: inicio de sesión con Google y, si lo autorizas, Google Calendar.</>,
          <><Strong>Proveedor de correo electrónico</Strong>: envío de códigos de verificación y avisos por correo.</>,
        ]} />
        <p>
          <Strong>Con autoridades.</Strong> Solo entregaremos datos personales cuando una ley lo exija o cuando una autoridad competente de la República de Panamá (por ejemplo, el Ministerio Público, el Órgano Judicial o la Policía Nacional) lo solicite formalmente en el ejercicio de sus funciones. En esos casos entregaremos únicamente la información requerida y, cuando la ley lo permita, te lo informaremos.
        </p>
      </>
    ),
  },
  {
    id: 'transferencias',
    title: 'Dónde se guardan tus datos',
    content: (
      <>
        <p>Los servidores de nuestra base de datos están en los Estados Unidos de América. Esto supone una transferencia internacional de datos, que realizamos con proveedores que aplican estándares reconocidos de seguridad y confidencialidad.</p>
        <p>Al usar AthlonX y aceptar esta política, consientes esta transferencia, conforme a lo previsto en la Ley 81 de 2019 y su reglamento.</p>
      </>
    ),
  },
  {
    id: 'conservacion',
    title: 'Cuánto tiempo los conservamos',
    content: (
      <>
        <p>Conservamos tus datos mientras tu cuenta esté activa.</p>
        <p>
          Si eliminas tu cuenta, tienes <Strong>15 días calendario</Strong> para recuperarla iniciando sesión. Pasado ese plazo, eliminamos tus datos personales.
        </p>
        <p>
          Algunos registros que forman parte de actividades compartidas con otras personas (por ejemplo, resultados de partidos, estadísticas de torneos ya jugados o movimientos financieros de un equipo) pueden conservarse para no alterar la información de los demás. En ese caso se conservan sin datos que te identifiquen. También conservaremos los datos que una ley nos obligue a guardar, durante el tiempo que esa ley indique.
        </p>
      </>
    ),
  },
  {
    id: 'derechos',
    title: 'Tus derechos',
    content: (
      <>
        <p>De acuerdo con la Ley 81 de 2019, tienes derecho a:</p>
        <List items={[
          <><Strong>Acceso</Strong>: saber qué datos tuyos tenemos y cómo los usamos.</>,
          <><Strong>Rectificación</Strong>: corregir datos inexactos o incompletos.</>,
          <><Strong>Cancelación</Strong>: pedir que eliminemos tus datos.</>,
          <><Strong>Oposición</Strong>: oponerte a un tratamiento determinado por motivos fundados.</>,
          <><Strong>Portabilidad</Strong>: recibir tus datos en un formato estructurado y de uso común.</>,
        ]} />
        <p>
          Puedes ejercer muchos de estos derechos directamente desde <Strong>Mi perfil</Strong>: editar tus datos, configurar tu privacidad y eliminar tu cuenta. Para el resto, escríbenos a <a className="font-semibold text-[#B4FF45] underline-offset-4 hover:underline" href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a> desde el correo de tu cuenta. Responderemos dentro de los plazos que establecen la ley y su reglamento.
        </p>
        <p>Si consideras que no atendimos tu solicitud correctamente, puedes presentar una queja ante la Autoridad Nacional de Transparencia y Acceso a la Información (ANTAI).</p>
      </>
    ),
  },
  {
    id: 'menores',
    title: 'Menores de edad',
    content: (
      <>
        <p>Las personas menores de 18 años solo pueden usar AthlonX con el consentimiento y la supervisión de su madre, padre o tutor legal, quien es responsable del uso que el menor haga de la plataforma.</p>
        <p>Los equipos y organizaciones que registren a menores en sus plantillas o torneos deben contar con la autorización de sus representantes legales. Si un representante nos pide eliminar los datos de un menor registrado sin su consentimiento, los eliminaremos.</p>
      </>
    ),
  },
  {
    id: 'datos-de-terceros',
    title: 'Datos que ingresan equipos y organizaciones',
    content: (
      <p>
        Cuando un equipo u organización registra a otras personas (por ejemplo, jugadores de un torneo rápido que aún no tienen cuenta), ese equipo u organización es responsable de contar con su autorización para hacerlo. AthlonX trata esos datos solo para prestar el servicio y los eliminará si la persona titular lo solicita.
      </p>
    ),
  },
  {
    id: 'seguridad',
    title: 'Cómo protegemos tus datos',
    content: (
      <>
        <List items={[
          'Toda la comunicación con AthlonX viaja cifrada (HTTPS).',
          'Las contraseñas se guardan cifradas y no se pueden leer.',
          'Cada persona solo puede ver y modificar lo que sus permisos le permiten, con reglas de acceso aplicadas en la base de datos.',
          'El acceso interno a los datos está limitado al personal que lo necesita para operar la plataforma.',
        ]} />
        <p>Ningún sistema es completamente infalible. Si ocurre un incidente de seguridad que afecte tus datos, te lo informaremos y lo notificaremos a la autoridad en los términos que establece la ley.</p>
      </>
    ),
  },
  {
    id: 'cambios',
    title: 'Cambios a esta política',
    content: (
      <p>Podemos actualizar esta política. Si los cambios son importantes, te avisaremos dentro de la plataforma o por correo antes de que entren en vigor. La fecha de la última actualización aparece al inicio de esta página.</p>
    ),
  },
  {
    id: 'contacto',
    title: 'Contacto',
    content: (
      <p>
        Para consultas sobre esta política o sobre tus datos escribe a <a className="font-semibold text-[#B4FF45] underline-offset-4 hover:underline" href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>. También puedes revisar nuestros <Link className="font-semibold text-[#B4FF45] underline-offset-4 hover:underline" href="/terminos">Términos y condiciones</Link>.
      </p>
    ),
  },
]

export default function PrivacidadPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Política de privacidad"
      intro="Esta política explica qué datos personales recopila AthlonX, para qué los usa, con quién los comparte, cuánto tiempo los conserva y cómo puedes ejercer tus derechos."
      updated={UPDATED}
      summary={[
        'Usamos tus datos solo para prestarte el servicio de AthlonX.',
        'No vendemos, alquilamos ni usamos tus datos con fines publicitarios.',
        'Solo los entregamos si lo exige la ley o lo pide formalmente una autoridad competente.',
        'Tú decides qué se ve en tu perfil y puedes corregir o eliminar tus datos cuando quieras.',
        'Si eliminas tu cuenta, tienes 15 días para recuperarla; después se borran tus datos personales.',
      ]}
      sections={sections}
      related={{ href: '/terminos', label: 'Ver términos y condiciones' }}
    />
  )
}
