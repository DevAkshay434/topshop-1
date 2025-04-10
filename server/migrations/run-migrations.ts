import { Pool, neonConfig } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ws from 'ws';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

// Get the directory path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration(filePath: string) {
  console.log(`Running migration: ${path.basename(filePath)}`);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  try {
    await pool.query(sql);
    console.log(`Migration ${path.basename(filePath)} completed successfully`);
  } catch (error) {
    console.error(`Error running migration ${path.basename(filePath)}:`, error);
    throw error;
  }
}

async function main() {
  try {
    // Run the multi-store migration
    await runMigration(path.join(__dirname, 'add-multi-store-support.sql'));
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();