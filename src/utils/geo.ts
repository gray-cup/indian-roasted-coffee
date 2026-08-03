import statesCitiesRaw from '../data/states-cities.json';

export interface StateEntry {
  rank: number;
  state: string;
  top_cities: string[];
}

export const STATES_CITIES: StateEntry[] = statesCitiesRaw as StateEntry[];

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, '-')   // "(NCT)" → "-"
    .replace(/[&]/g, '')               // "&" → ""
    .replace(/[^a-z0-9]+/g, '-')      // any non-alnum → "-"
    .replace(/^-+|-+$/g, '')          // trim leading/trailing "-"
    .replace(/-{2,}/g, '-');           // collapse double "--"
}

export function fromSlug(slug: string): string | undefined {
  return STATES_CITIES.find(s => toSlug(s.state) === slug)?.state;
}

export function stateFromSlug(slug: string): StateEntry | undefined {
  return STATES_CITIES.find(s => toSlug(s.state) === slug);
}

export function cityFromSlug(stateSlug: string, citySlug: string): string | undefined {
  const entry = stateFromSlug(stateSlug);
  return entry?.top_cities.find(c => toSlug(c) === citySlug);
}
