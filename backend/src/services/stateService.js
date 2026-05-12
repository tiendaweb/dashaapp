import fs from 'node:fs/promises';
import path from 'node:path';
import { defaultState } from '../models/defaultState.js';

export class StateService {
  constructor(stateFile) {
    this.stateFile = stateFile;
  }

  async ensureFile() {
    const dir = path.dirname(this.stateFile);
    await fs.mkdir(dir, { recursive: true });
    try {
      await fs.access(this.stateFile);
    } catch {
      await fs.writeFile(this.stateFile, JSON.stringify(defaultState(), null, 2));
    }
  }

  async load() {
    await this.ensureFile();
    const raw = await fs.readFile(this.stateFile, 'utf-8');
    return JSON.parse(raw);
  }

  async save(payload) {
    const state = { ...defaultState(), ...payload };
    state.meta = { ...(state.meta || {}), savedAt: new Date().toISOString(), version: Number(state?.meta?.version || 1) };
    await this.ensureFile();
    await fs.writeFile(this.stateFile, JSON.stringify(state, null, 2));
    return state;
  }

  async reset() {
    return this.save(defaultState());
  }
}
