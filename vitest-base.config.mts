import { defineConfig } from 'vitest/config';

// Red de seguridad para máquinas ocupadas (Windows con el API compilando al lado):
// con el límite por defecto (5 s) y un worker por núcleo, los renders de Angular
// Material superan el tiempo aunque las aserciones sean correctas.
export default defineConfig({
  test: {
    testTimeout: 20000,
    hookTimeout: 30000,
    // Menos workers que núcleos: deja CPU al resto de procesos y evita la saturación.
    maxWorkers: 4,
    // Marca como lentos (en el reporte) los tests que pasan de 2 s, para seguir viéndolos
    // aunque el timeout holgado ya no los haga fallar.
    slowTestThreshold: 2000,
  },
});
