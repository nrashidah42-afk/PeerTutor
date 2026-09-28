/**
 * Tiny table store backed by localStorage. Each key of the data object is a "table"
 * (array of rows with numeric ids), matching the tables in database/schema.sql.
 */
import { buildSeed } from './seed.js';

const KEY = 'peertutor_mock_db_v1';
let data = null;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* fall through to seed */
  }
  const seeded = buildSeed();
  persist(seeded);
  return seeded;
}

function persist(value = data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* storage full or blocked – keep working in memory */
  }
}

function tables() {
  data ??= load();
  return data;
}

export const db = {
  all: (table) => tables()[table],
  find: (table, id) => tables()[table].find((row) => row.id === Number(id)),
  where: (table, predicate) => tables()[table].filter(predicate),

  insert(table, row) {
    const rows = tables()[table];
    const id = rows.reduce((max, r) => Math.max(max, r.id || 0), 0) + 1;
    const record = { id, ...row };
    rows.push(record);
    persist();
    return record;
  },

  update(table, id, patch) {
    const row = this.find(table, id);
    if (!row) return null;
    Object.assign(row, patch);
    persist();
    return row;
  },

  remove(table, predicate) {
    const rows = tables()[table];
    const kept = rows.filter((row) => !predicate(row));
    data[table] = kept;
    persist();
    return rows.length - kept.length;
  },

  save: () => persist(),

  reset() {
    data = buildSeed();
    persist();
  },
};
