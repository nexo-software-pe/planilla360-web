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
  },
});
