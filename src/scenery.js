import { SCENES, TOTAL_STEPS } from './config.js';

export function sceneForStep(step) {
  let scene = SCENES[0];
  for (const s of SCENES) if (s.from <= step) scene = s;
  return { id: scene.id, label: scene.label };
}

export function stepsToSpace(step) {
  return Math.max(0, TOTAL_STEPS - step);
}
