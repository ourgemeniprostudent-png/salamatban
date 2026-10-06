import { defineConfig } from 'drizzle-kit';
export default defineConfig({schema:'./db/pilot-schema.ts',out:'./drizzle-pilot',dialect:'sqlite'});
