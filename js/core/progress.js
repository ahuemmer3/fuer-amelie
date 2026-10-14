import { store } from './utils.js';

const listeners = new Set();
let state = store.get('progress', { done: [], eggs: [], wishes: [] });
if (!Array.isArray(state.done)) state = { done: [], eggs: [], wishes: [] };
state.eggs = state.eggs || [];
state.wishes = state.wishes || [];

function save() { store.set('progress', state); listeners.forEach(fn => fn(state)); }

export const Progress = {
  isDone: id => state.done.includes(id),
  /** returns true when newly completed */
  complete(id) {
    if (state.done.includes(id)) return false;
    state.done.push(id); save(); return true;
  },
  doneCount: ids => ids.filter(id => state.done.includes(id)).length,
  allDone: ids => ids.every(id => state.done.includes(id)),
  findEgg(id) {
    if (state.eggs.includes(id)) return false;
    state.eggs.push(id); save(); return true;
  },
  eggs: () => [...state.eggs],
  addWish(text) { state.wishes.push({ text, at: Date.now() }); if (state.wishes.length > 60) state.wishes.shift(); save(); },
  wishes: () => [...state.wishes],
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  reset() { state = { done: [], eggs: [], wishes: [] }; save(); }
};
