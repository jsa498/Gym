export type User = 'Mottu' | 'Babli';

export type Day = 'Monday' | 'Wednesday' | 'Thursday' | 'Saturday';

export interface ExerciseSet {
  warmup: string;
  weight: string;
  reps: string;
  goal: string;
}

export interface Exercise {
  name: string;
  sets: ExerciseSet[];
}

export type ExercisesByDay = {
  [key in Day]: string[];
};

export const exercises: ExercisesByDay = {
  Monday: ['Chest Press', 'Incline Dumbbell Press', 'Lateral Raises', 'Bicep Curls'],
  Wednesday: [
    'Hip Adductor Curls',
    'Hip Inductor Curls',
    'Seated Hamstring Curls',
    'RDLs (Romanian Deadlifts)',
    'Leg Extensions',
    'Squats'
  ],
  Thursday: [
    'Lat Pullovers',
    'Lat Pulldowns',
    'Rows',
    'Tricep Pushdowns',
    'Dips',
    'Rear Delt Flies'
  ],
  Saturday: [
    'Glute Extensions',
    'Hip Thrusts',
    'Calf Raises'
  ]
}; 