# infrastructure/import

Adaptadores de importación de datos (CSV con papaparse, Excel con xlsx, pegado
manual). Convierten archivos externos al modelo de `src/core/data`.

## Pegado manual: lo que hay que saber

`importPastedText` delega el troceo en `parsePastedText` (`core/data`) y añade
los avisos que la pantalla de datos muestra bajo la vista previa:

- **Lista en una sola línea.** Pegar `4, 7, 2, 9, 5` produce **una** variable
  (`Datos`) con 5 filas, no 5 variables con una fila. Es el caso principal del
  brief. Se avisa con el código `lista-transpuesta` por si la persona sí quería
  una fila de varias variables.
- **Coma decimal ambigua.** En `1,5, 2,3, 4, 4, 7` unas comas van pegadas a
  dígitos y otras llevan espacio: no se puede saber cuáles separan datos. Se
  avisa con `decimal-ambiguo` y el mensaje remite al selector "Formato de los
  decimales" del paso 1. Si la persona elige "Coma decimal", solo separan las
  comas seguidas de espacio y la lista pasa a tener 5 datos.
- El selector de decimales vuelve a importar el texto al cambiar
  (`setImportOption` en el store del asistente), así que el efecto es inmediato.

Los casos están cubiertos en `paste-list.test.ts`.
