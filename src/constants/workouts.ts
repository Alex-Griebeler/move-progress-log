export const WORKOUT_TYPES = [
  { value: 'back-to-basics', label: 'Back to Basics' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'mind', label: 'Mind' },
] as const;

export const FABRIK_ROOMS = [
  { value: 'sala-1', label: 'Sala 1' },
  { value: 'sala-2', label: 'Sala 2' },
  { value: 'sala-3', label: 'Sala 3' },
] as const;

export type WorkoutType = typeof WORKOUT_TYPES[number]['value'];
export type FabrikRoom = typeof FABRIK_ROOMS[number]['value'];