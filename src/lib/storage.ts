import { ExerciseSet, User } from './types';

const getStorageKey = (user: User, exerciseName: string) => `${user}-${exerciseName}`;

export const getSets = (user: User, exerciseName: string): ExerciseSet[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const key = getStorageKey(user, exerciseName);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting sets from localStorage:', error);
    return [];
  }
};

export const saveSet = (user: User, exerciseName: string, set: ExerciseSet): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const key = getStorageKey(user, exerciseName);
    const sets = getSets(user, exerciseName);
    const updatedSets = [...sets, set];
    localStorage.setItem(key, JSON.stringify(updatedSets));
  } catch (error) {
    console.error('Error saving set to localStorage:', error);
  }
};

export const deleteSet = (user: User, exerciseName: string, index: number): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const key = getStorageKey(user, exerciseName);
    const sets = getSets(user, exerciseName);
    const updatedSets = sets.filter((_, i) => i !== index);
    localStorage.setItem(key, JSON.stringify(updatedSets));
  } catch (error) {
    console.error('Error deleting set from localStorage:', error);
  }
};

export const getLastSet = (user: User, exerciseName: string): ExerciseSet | null => {
  const sets = getSets(user, exerciseName);
  return sets.length > 0 ? sets[sets.length - 1] : null;
}; 