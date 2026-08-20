import { create } from 'zustand';
import { SEED_DECLARATIONS } from '../data/customs';
import { stampLabel } from '../lib/crewChange';
import { isDeclaration, nextDeclarationRef, nextDeclarationStage } from '../lib/customs';
import type { Declaration, DeclarationForm } from '../lib/customs';
import { persistent } from '../lib/storage';

/**
 * Customs declarations raised in the demo, each with the stage it has reached.
 * Persisted through the storage adapter under 'customs.*' (never directly) and
 * seeded on first open for the same reason as the logistics store: a customs
 * screen with nothing on it says nothing about the line.
 */

const KEY_DECLARATIONS = 'customs.declarations';

function cloneSeed(): Declaration[] {
  return SEED_DECLARATIONS.map((d) => ({ ...d, form: { ...d.form } }));
}

/**
 * Persisted declarations, shape-checked entry by entry. A missing key means an
 * untouched demo (use the seed); an empty list means the visitor cleared it.
 */
export function readDeclarations(): Declaration[] {
  const raw = persistent.get<unknown>(KEY_DECLARATIONS, null);
  if (raw === null) return cloneSeed();
  return Array.isArray(raw) ? raw.filter(isDeclaration) : cloneSeed();
}

interface CustomsState {
  declarations: Declaration[];
  /** Raises an entry at the first stage; returns its reference. */
  raise(form: DeclarationForm): string;
  /** Moves an entry on by one or more stages; 'Cleared' holds. */
  advance(id: string, steps?: number): void;
  remove(id: string): void;
  reset(): void;
}

export const useCustoms = create<CustomsState>((set, get) => ({
  declarations: readDeclarations(),

  raise(form) {
    const id = nextDeclarationRef(get().declarations);
    const declaration: Declaration = {
      id,
      form: { ...form },
      stage: 'Documents received',
      createdAt: stampLabel(),
    };
    const declarations = [declaration, ...get().declarations];
    persistent.set(KEY_DECLARATIONS, declarations);
    set({ declarations });
    return id;
  },

  advance(id, steps = 1) {
    const declarations = get().declarations.map((d) => {
      if (d.id !== id) return d;
      let stage: string = d.stage;
      for (let i = 0; i < Math.max(1, steps); i += 1) stage = nextDeclarationStage(stage);
      return { ...d, stage: stage as Declaration['stage'] };
    });
    persistent.set(KEY_DECLARATIONS, declarations);
    set({ declarations });
  },

  remove(id) {
    const declarations = get().declarations.filter((d) => d.id !== id);
    persistent.set(KEY_DECLARATIONS, declarations);
    set({ declarations });
  },

  reset() {
    persistent.remove(KEY_DECLARATIONS);
    set({ declarations: cloneSeed() });
  },
}));
