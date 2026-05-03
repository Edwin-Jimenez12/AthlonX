# **PLATAFORMA INTEGRAL DE GESTIÓN Y RENDIMIENTO**
## **AthlonX**

**BY ELAHISTERS**

---

# **DESCRIPCIÓN**

**AthlonX** es una plataforma digital orientada a la gestión integral, análisis del rendimiento y fortalecimiento del compromiso deportivo en equipos de diferentes disciplinas, diseñada para cualquier entorno y con proyección a nivel institucional y multidisciplinario.

Surgió ante la necesidad de centralizar la información deportiva de equipos, permitiendo una conexión efectiva entre jugadores, entrenadores (**coaches**) y directivos, mediante el acceso a datos relevantes sobre asistencia, rendimiento, estadísticas, comunicación interna y evaluación deportiva.

AthlonX está concebida como un sistema escalable y adaptable, capaz de soportar distintos formatos de juego y modalidades deportivas.

La plataforma presenta:

- **Interfaz inicial de bienvenida**
- **Inicio de sesión**
- **Registro de usuarios**
- **Autenticación segura mediante ID o correo + contraseña**
- **Control de acceso por roles**

Durante el registro, el usuario podrá seleccionar su rol principal:

- **Jugador**
- **Coach**
- **Directivo**

Cada rol define permisos, funcionalidades y vistas específicas.

Una vez autenticado, el usuario accede a un **dashboard personalizado** con acceso a los distintos módulos.

Finalmente, AthlonX incluye un módulo de **mejora continua**, donde los usuarios pueden enviar:

- sugerencias
- observaciones
- propuestas de mejora

---

# **ACTORES DEL SISTEMA**

## **Jugador**
- Consultar agenda de entrenamientos y actividades
- Visualizar asistencia y rendimiento personal
- Acceder a estadísticas individuales
- Recibir comunicaciones del equipo
- Enviar sugerencias de mejora
- Contactar con coach

## **Entrenador (Coach)**
- Gestionar entrenamientos y partidos
- Registrar asistencia
- Evaluar rendimiento de jugadores
- Registrar estadísticas deportivas
- Definir formaciones y posiciones
- Comunicar convocatorias y anuncios
- Enviar comentarios a jugadores

## **Directivo**
- Supervisar funcionamiento del equipo
- Consultar reportes generales
- Gestionar usuarios y equipos
- Gestionar actividades, comunicados y convocatorias

## **Administrador del sistema**
- Gestionar roles y permisos
- Mantener seguridad del sistema
- Administrar plataforma a nivel técnico
- Gestionar incidencias
- Gestionar sugerencias y mejoras

---

# **CASOS DE USO**

---

## **JUGADOR**

### **Autenticación y acceso**
- Iniciar sesión
- Recuperar contraseña
- Cerrar sesión

### **Perfil**
- Visualizar información personal
- Ver foto de perfil
- Consultar posición habitual
- Consultar rol dentro del equipo
- Editar información básica

### **Asistencia y compromiso**
- Consultar calendario
- Ver historial de asistencia
- Visualizar porcentaje de asistencia
- Indicadores de compromiso deportivo
- Ver sanciones o advertencias

### **Estadísticas individuales**
- Estadísticas generales
- Estadísticas por sesión o partido
- Comparación por periodos

#### **Ejemplo estadísticas rugby**
- Pases realizados
- Velocidad máxima
- Aceleración
- Distancia recorrida
- Tackles realizados
- Tackles efectivos
- Errores defensivos
- Rucks ganados
- Participación en jugadas
- Minutos jugados
- Condición física general

### **Comunicación**
- Ver anuncios
- Recibir convocatorias
- Notificaciones del coach/directivos

### **Mapeo de cancha**
- Visualizar cancha
- Identificar posición asignada
- Ver formación del equipo

### **Mejora continua**
- Enviar sugerencias
- Enviar observaciones
- Consultar estado

---

## **COACH**

### **Gestión de entrenamientos**
- Crear entrenamientos
- Editar entrenamientos
- Eliminar entrenamientos
- Definir tipo de sesión
- Asignar horarios y fechas

### **Control de asistencia**
- Registrar asistencia
- Marcar ausencias justificadas/injustificadas
- Visualizar reportes
- Generar indicadores de compromiso

### **Evaluación y estadísticas**
- Registrar estadísticas por jugador
- Registrar estadísticas por equipo
- Editar evaluaciones
- Consultar evolución del rendimiento

#### **Estadísticas registrables**
- Pases
- Tackles
- Velocidad
- Aceleración
- Resistencia
- Disciplina
- Cumplimiento táctico
- Condición física
- Participación colectiva

### **Mapeo de cancha**
- Visualizar cancha
- Asignar posiciones
- Modificar formaciones
- Asociar jugadores

### **Comunicación**
- Enviar anuncios
- Convocatorias
- Indicaciones técnicas
- Notificaciones grupales e individuales

### **Reportes**
- Reportes individuales
- Reportes grupales
- Comparativas de jugadores
- Exportación futura

---

## **DIRECTIVO**

### **Gestión de usuarios**
- Visualizar usuarios
- Aprobar/rechazar registros
- Asignar roles
- Dar de baja usuarios

### **Gestión de equipos**
- Crear equipos
- Editar equipos
- Asignar coaches
- Supervisar plantillas

### **Supervisión deportiva**
- Consultar reportes generales
- Estadísticas globales
- Analizar compromiso
- Evaluar rendimiento del equipo

### **Comunicación institucional**
- Comunicados oficiales
- Anuncios institucionales
- Notificaciones generales

### **Mejora continua**
- Visualizar sugerencias
- Analizar propuestas
- Priorizar mejoras

---

# **MODELO ENTIDAD-RELACIÓN**

## **USUARIO**
```sql
id_usuario (PK)
nombre
segundo_nombre
apellido
segundo_apellido
nombre_mostrado
correo
contraseña
rol
fecha_registro
estado
tipo_sangre
posicion
```

## **EQUIPO**
```sql
id_equipo (PK)
nombre_equipo
disciplina
modalidad
rama
descripcion
estado
```

## **USUARIO_EQUIPO**
```sql
id_usuario (FK)
id_equipo (FK)
rol_en_equipo
fecha_ingreso
```

## **ENTRENAMIENTO**
```sql
id_entrenamiento (PK)
id_equipo (FK)
fecha
hora
tipo_sesion
descripcion
```

## **ASISTENCIA**
```sql
id_asistencia (PK)
id_usuario (FK)
id_entrenamiento (FK)
estado
```

## **ESTADISTICA**
```sql
id_estadistica (PK)
id_usuario (FK)
id_entrenamiento (FK)
pases
tackles
velocidad
aceleracion
distancia
minutos_jugados
condicion_fisica
observaciones
```

## **MAPEO_CANCHA**
```sql
id_mapeo (PK)
id_equipo (FK)
formacion
fecha
descripcion
```

## **POSICION_JUGADOR**
```sql
id_posicion (PK)
id_mapeo (FK)
id_usuario (FK)
posicion_asignada
```

## **COMUNICADO**
```sql
id_comunicado (PK)
id_equipo (FK)
id_emisor (FK)
titulo
mensaje
fecha
```

## **SUGERENCIA**
```sql
id_sugerencia (PK)
id_usuario (FK)
descripcion
estado
fecha
```

---

# **RELACIONES**

- **USUARIO ↔ EQUIPO** → Muchos a muchos
- **EQUIPO → ENTRENAMIENTO** → Uno a muchos
- **ENTRENAMIENTO → ASISTENCIA** → Uno a muchos
- **USUARIO → ASISTENCIA** → Uno a muchos
- **ENTRENAMIENTO → ESTADISTICA** → Uno a muchos
- **USUARIO → ESTADISTICA** → Uno a muchos
- **EQUIPO → MAPEO_CANCHA** → Uno a muchos
- **MAPEO_CANCHA → POSICION_JUGADOR** → Uno a muchos
- **USUARIO → POSICION_JUGADOR** → Uno a muchos
- **EQUIPO → COMUNICADO** → Uno a muchos
- **USUARIO → COMUNICADO** → Uno a muchos
- **USUARIO → SUGERENCIA** → Uno a muchos

---

# **TECNOLOGÍAS (PROPUESTAS)**
- **Next.js**
- **React**
- **TypeScript**
- **Tailwind CSS**
- **App Router**
- **PostgreSQL / MySQL**
- **Prisma ORM**

---

---

# **DICCIONARIO DE DATOS**

---

## **Tabla: USUARIO**

| **Campo** | **Descripción** | **Tipo de dato** | **Obligatorio** |
|---|---|---|---|
| **id_usuario** | Identificador único del usuario | Entero | Sí |
| **nombre** | Primer nombre del usuario | Texto | Sí |
| **segundo_nombre** | Segundo nombre del usuario | Texto | No |
| **apellido** | Primer apellido del usuario | Texto | Sí |
| **segundo_apellido** | Segundo apellido del usuario | Texto | No |
| **nombre_mostrado** | Nombre visible dentro de la plataforma | Texto | Sí |
| **correo** | Correo electrónico del usuario | Texto | Sí |
| **contraseña** | Contraseña cifrada del usuario | Texto | Sí |
| **rol** | Rol del usuario (Jugador, Coach, Directivo) | Enum | Sí |
| **fecha_registro** | Fecha de creación de cuenta | Fecha | Sí |
| **estado** | Estado de cuenta | Enum | Sí |
| **tipo_sangre** | Tipo de sangre del jugador | Texto | No |
| **posicion** | Posición deportiva o ninguna | Texto | No |

---

## **Tabla: EQUIPO**

| **Campo** | **Descripción** | **Tipo de dato** | **Obligatorio** |
|---|---|---|---|
| **id_equipo** | Identificador único del equipo | Entero | Sí |
| **nombre_equipo** | Nombre del equipo | Texto | Sí |
| **disciplina** | Deporte del equipo | Texto | Sí |
| **modalidad** | Modalidad de juego | Texto | Sí |
| **rama** | Rama del equipo | Texto | Sí |
| **descripcion** | Descripción general | Texto | No |
| **estado** | Estado del equipo | Texto | Sí |

---

## **Tabla: USUARIO_EQUIPO**

| **Campo** | **Descripción** | **Tipo de dato** | **Obligatorio** |
|---|---|---|---|
| **id_usuario** | Identificador del usuario | Entero (FK) | Sí |
| **id_equipo** | Identificador del equipo | Entero (FK) | Sí |
| **rol_en_equipo** | Rol dentro del equipo | Texto | Sí |
| **fecha_ingreso** | Fecha de ingreso | Fecha | Sí |

---

## **Tabla: ENTRENAMIENTO**

| **Campo** | **Descripción** | **Tipo de dato** | **Obligatorio** |
|---|---|---|---|
| **id_entrenamiento** | Identificador del entrenamiento | Entero | Sí |
| **id_equipo** | Equipo asociado | Entero (FK) | Sí |
| **fecha** | Fecha del entrenamiento | Fecha | Sí |
| **hora** | Hora del entrenamiento | Hora | Sí |
| **tipo_sesion** | Tipo de sesión | Texto | Sí |
| **descripcion** | Detalle del entrenamiento | Texto | No |

---

## **Tabla: ASISTENCIA**

| **Campo** | **Descripción** | **Tipo de dato** | **Obligatorio** |
|---|---|---|---|
| **id_asistencia** | Identificador de asistencia | Entero | Sí |
| **id_usuario** | Usuario evaluado | Entero (FK) | Sí |
| **id_entrenamiento** | Entrenamiento asociado | Entero (FK) | Sí |
| **estado** | Estado de asistencia | Enum | Sí |

---

## **Tabla: ESTADISTICA**

| **Campo** | **Descripción** | **Tipo de dato** | **Obligatorio** |
|---|---|---|---|
| **id_estadistica** | Identificador de estadística | Entero | Sí |
| **id_usuario** | Jugador evaluado | Entero (FK) | Sí |
| **id_entrenamiento** | Entrenamiento asociado | Entero (FK) | Sí |
| **pases** | Número de pases | Entero | No |
| **tackles** | Número de tackles | Entero | No |
| **velocidad** | Velocidad máxima | Decimal | No |
| **aceleracion** | Nivel de aceleración | Decimal | No |
| **distancia** | Distancia recorrida | Decimal | No |
| **minutos_jugados** | Minutos jugados | Entero | No |
| **condicion_fisica** | Evaluación física | Texto | No |
| **observaciones** | Observaciones del coach | Texto | No |

---

## **Tabla: MAPEO_CANCHA**

| **Campo** | **Descripción** | **Tipo de dato** | **Obligatorio** |
|---|---|---|---|
| **id_mapeo** | Identificador del mapeo | Entero | Sí |
| **id_equipo** | Equipo asociado | Entero (FK) | Sí |
| **formacion** | Formación utilizada | Texto | Sí |
| **fecha** | Fecha del mapeo | Fecha | Sí |
| **descripcion** | Descripción del planteamiento | Texto | No |

---

## **Tabla: POSICION_JUGADOR**

| **Campo** | **Descripción** | **Tipo de dato** | **Obligatorio** |
|---|---|---|---|
| **id_posicion** | Identificador de asignación | Entero | Sí |
| **id_mapeo** | Mapeo asociado | Entero (FK) | Sí |
| **id_usuario** | Jugador asignado | Entero (FK) | Sí |
| **posicion_asignada** | Posición asignada | Texto | Sí |

---

## **Tabla: COMUNICADO**

| **Campo** | **Descripción** | **Tipo de dato** | **Obligatorio** |
|---|---|---|---|
| **id_comunicado** | Identificador del comunicado | Entero | Sí |
| **id_equipo** | Equipo asociado | Entero (FK) | Sí |
| **id_emisor** | Usuario emisor | Entero (FK) | Sí |
| **titulo** | Título del comunicado | Texto | Sí |
| **mensaje** | Contenido | Texto | Sí |
| **fecha** | Fecha de publicación | Fecha | Sí |

---

## **Tabla: SUGERENCIA**

| **Campo** | **Descripción** | **Tipo de dato** | **Obligatorio** |
|---|---|---|---|
| **id_sugerencia** | Identificador de sugerencia | Entero | Sí |
| **id_usuario** | Usuario emisor | Entero (FK) | Sí |
| **descripcion** | Contenido de sugerencia | Texto | Sí |
| **estado** | Estado de revisión | Enum | Sí |
| **fecha** | Fecha de envío | Fecha | Sí |

---