# Actualización ExpensIQ — Abril 2026

Hola equipo. Este documento resume los cambios que se han hecho esta semana en el proyecto y lo que necesitáis hacer para tener la versión actualizada funcionando en vuestras máquinas.

---

## ¿Qué ha cambiado? (versión sencilla)

### 1. Ya solo existe un sitio para trabajar: `localhost:3000`

Antes había cierta confusión porque el sistema levantaba en dos puertos distintos (`localhost:3000` y `localhost:8000`) y según a cuál entrabas tenías permisos distintos. Eso está resuelto. **Todo el trabajo se hace desde `localhost:3000`**. El otro puerto sigue existiendo internamente pero no hay que tocarlo.

---

### 2. Nuevo sistema de inicio de sesión

La pantalla de inicio ha cambiado por completo. Antes había un desplegable para elegir un usuario de prueba. Ahora funciona así:

- Al abrir `localhost:3000` te aparece una **pantalla de login** con un campo de email
- Introduces el email de cualquier usuario que esté dado de alta en la base de datos y pulsas **Entrar**
- Si el email existe, entras directamente con los permisos de ese usuario (empleado, manager o admin)
- Si el email no existe, te aparece un mensaje de error

**No hay contraseña.** Solo el email. Esto es suficiente para la demo.

Para **cambiar de usuario**: en la parte inferior izquierda de la barra lateral hay un botón de cierre de sesión (una flecha apuntando hacia fuera). Al pulsarlo vuelves a la pantalla de login y puedes entrar con otro email.

---

### 3. Usuarios disponibles para la demo

Estos son todos los usuarios que podéis usar para entrar:

| Email | Nombre | Rol |
|---|---|---|
| `admin@lezama.es` | Admin | Administrador — ve todo |
| `miguel@empresa.com` | Miguel Fernandez Diaz | Administrador — ve todo |
| `carlos@empresa.com` | Carlos Ruiz Martin | Manager |
| `javier@empresa.com` | Javier Ortega Blanco | Manager |
| `ana@empresa.com` | Ana Garcia Lopez | Empleada |
| `elena@empresa.com` | Elena Torres Vega | Empleada |
| `lucia@empresa.com` | Lucia Moreno Sanz | Empleada |
| `maria@empresa.com` | Maria Jimenez Castro | Empleada |
| `pablo@empresa.com` | Pablo Navarro Ruiz | Empleado |

---

### 4. Los datos demo ya están cargados

La base de datos tiene datos de prueba reales: 8 empleados con historial de gastos, recibos, transacciones bancarias y alertas. No hay que hacer nada para cargarlos, ya están ahí.

---

## ¿Qué tenéis que hacer vosotros para tener esta versión?

Seguid estos pasos en orden. No son muchos.

### Paso 1 — Descargar los cambios

Abrid una terminal en la carpeta del proyecto y ejecutad:

```
git pull origin main
```

### Paso 2 — Actualizar vuestro archivo `.env`

El archivo `.env` es el que tiene la configuración local de cada máquina. Hay que añadirle dos líneas nuevas que antes no existían. Abrid el archivo `.env` (está en la raíz del proyecto) y añadid esto al final:

```
NEXT_PUBLIC_DEV_MODE=true
```

> Si no tenéis archivo `.env`, copiad el `.env.example` que ya viene actualizado:
> `cp .env.example .env`

### Paso 3 — Reconstruir y arrancar

Como hemos cambiado código del frontend y del backend, hay que reconstruir los contenedores. Ejecutad:

```
docker compose up --build
```

Esto tarda unos 2-3 minutos la primera vez. Cuando termine, abrid `localhost:3000`.

### Paso 4 — Cargar los datos demo (solo si vuestra base de datos está vacía)

Si al entrar no veis ningún dato en el dashboard, ejecutad estos dos comandos:

```
python demo_data_loader.py
```

Y luego:

```
curl -X POST http://localhost:8000/api/v1/demo/seed
```

Después recargad la página y deberían aparecer todos los datos.

---

## Resumen rápido

| Qué hacer | Comando |
|---|---|
| Descargar cambios | `git pull origin main` |
| Añadir línea al `.env` | `NEXT_PUBLIC_DEV_MODE=true` |
| Arrancar con cambios | `docker compose up --build` |
| Cargar datos (si vacío) | `python demo_data_loader.py` + seed |

---

Cualquier duda, avisad.
