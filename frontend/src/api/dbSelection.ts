const STORAGE_KEY = 'selectedDatabase';

let activeDatabase = localStorage.getItem(STORAGE_KEY) || '';

export function getActiveDatabase(): string {
  return activeDatabase;
}

export function setActiveDatabase(name: string) {
  activeDatabase = name;
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch {
    // storage unavailable (private mode etc.)
  }
}