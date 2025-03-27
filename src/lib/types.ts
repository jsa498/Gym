export type User = string;

export type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

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

export type SubscriptionPlan = 'free' | 'plus' | 'pro';

export interface SubscriptionLimits {
  maxWorkoutDays: number;
}

export const subscriptionLimits: Record<SubscriptionPlan, SubscriptionLimits> = {
  free: { maxWorkoutDays: 3 },
  plus: { maxWorkoutDays: 999 }, // Effectively unlimited
  pro: { maxWorkoutDays: 999 }   // Effectively unlimited
};

export const exercises: ExercisesByDay = {
  Monday: ['Chest Press', 'Incline Dumbbell Press', 'Lateral Raises', 'Bicep Curls'],
  Tuesday: [],
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
  Friday: [],
  Saturday: [
    'Glute Extensions',
    'Hip Thrusts',
    'Calf Raises'
  ],
  Sunday: []
}; 