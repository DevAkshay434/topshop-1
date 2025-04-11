import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure pool with better connection management
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Return an error if client connection takes longer than 5 seconds
});

// Set up graceful connection handling
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  // Don't crash on connection errors, just log them
});

// Setup process termination cleanup
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing database pool');
  pool.end().then(() => {
    console.log('Database pool has ended');
  });
});

export const db = drizzle({ client: pool, schema });