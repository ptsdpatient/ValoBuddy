import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = './data';

async function ensureFile(file) {
  const fullPath = path.join(DATA_DIR, file);
  try {
    await fs.access(fullPath);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(fullPath, '{}');
  }
  return fullPath;
}

async function load(file) {
  const filePath = await ensureFile(file);
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
}

async function save(file, data) {
  const filePath = await ensureFile(file);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function get(file, key) {
  const data = await load(file);
  return data[key] ?? null;
} 

export async function set(file, key, value) {
  const data = await load(file);
  data[key] = value;
  await save(file, data);
}

export async function remove(file, key) {
  const data = await load(file);
  delete data[key];
  await save(file, data);
}

export async function getAll(file) {
  return await load(file);
}

export async function clear(file) {
  await save(file, {});
}
