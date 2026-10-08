import type { Database, SqlJsStatic, SqlValue } from 'sql.js';

export type DemoSnapshot = { database: Uint8Array; files: Record<string, Blob> };

/** Implements only the D1 methods used by the pilot; all SQL is the original application's SQL. */
export class BrowserDatabase {
  readonly sqlite: Database;
  constructor(SQL: SqlJsStatic, bytes?: Uint8Array) { this.sqlite = new SQL.Database(bytes); }
  prepare(sql: string) {
    const execute = (values: unknown[]) => {
      const statement = this.sqlite.prepare(sql);
      try {
        statement.bind(values as SqlValue[]);
        const results: Record<string, SqlValue>[] = [];
        while (statement.step()) results.push(statement.getAsObject());
        return { results, success: true, meta: { changes: this.sqlite.getRowsModified() } };
      } finally { statement.free(); }
    };
    const bound = (values: unknown[]) => ({
      bind: (...args: unknown[]) => bound(args),
      first: async () => execute(values).results[0] ?? null,
      all: async () => execute(values),
      run: async () => execute(values),
    });
    return bound([]);
  }
  async batch(statements: ReturnType<BrowserDatabase['prepare']>[]) {
    this.sqlite.run('BEGIN');
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.sqlite.run('COMMIT');
      return results;
    } catch (error) { this.sqlite.run('ROLLBACK'); throw error; }
  }
}

export function browserFiles(files: Record<string, Blob>) {
  return {
    async put(key: string, bytes: ArrayBuffer, options: { httpMetadata: { contentType: string } }) {
      files[key] = new Blob([bytes], { type: options.httpMetadata.contentType });
    },
    async get(key: string) { return files[key] ? { body: files[key] } : null; },
    async delete(key: string) { delete files[key]; },
  };
}

export async function openStore(name: string) {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('demo');
    let blocked = false;
    request.onblocked = () => { blocked = true; reject(new Error('پنجره‌های دیگر همین سایت را ببندید و دوباره تلاش کنید.')); };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { if (blocked) request.result.close(); else resolve(request.result); };
  });
  return {
    close: () => database.close(),
    read: () => new Promise<DemoSnapshot | undefined>((resolve, reject) => {
      const request = database.transaction('demo').objectStore('demo').get('snapshot');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }),
    write: (snapshot: DemoSnapshot) => new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('demo', 'readwrite');
      transaction.objectStore('demo').put(snapshot, 'snapshot');
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    }),
    clear: () => new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('demo', 'readwrite');
      transaction.objectStore('demo').clear();
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    }),
  };
}
