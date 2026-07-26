# Lista de entrega para Cubethon 2026 Q3

## Producto

- [ ] La aplicación está desplegada y funcionando en CubePath.
- [ ] La página pública `/status` puede abrirse sin autenticación.
- [ ] El inicio de sesión administrativo funciona.
- [ ] El acceso de demostración funciona sin contraseña y muestra un UUID.
- [ ] La cuenta demo puede consultar datos, pero recibe `403` al intentar modificarlos.
- [ ] Se probó al menos un servicio HTTP o HTTPS real.
- [ ] Los incidentes, registros y diagnósticos muestran datos reales.
- [ ] El volumen `devdash_data` conserva la base de datos tras reiniciar.

## Presentación

- [ ] La mención «Alojado en CubePath» es visible en el producto.
- [ ] Las capturas muestran el panel, la página pública y los incidentes.
- [ ] El video o demostración sigue `DEMO_SCRIPT.md`.
- [ ] La descripción explica el problema, la utilidad y la originalidad.
- [ ] El repositorio incluye instrucciones de despliegue reproducibles.

## Operación

- [ ] `backend/.env` contiene secretos seguros y valores de producción.
- [ ] HTTPS está habilitado en el dominio público.
- [ ] Se ejecutó y verificó `backup-sqlite.sh`.
- [ ] Los contenedores reinician correctamente con el VPS.
- [ ] La aplicación sigue disponible en el momento de la evaluación.
