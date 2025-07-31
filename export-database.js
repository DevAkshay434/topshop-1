
import { Pool, neonConfig } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import ws from 'ws';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

async function exportTable(tableName) {
  try {
    console.log(`Exporting table: ${tableName}`);
    const result = await pool.query(`SELECT * FROM ${tableName}`);
    return {
      tableName,
      rowCount: result.rows.length,
      data: result.rows
    };
  } catch (error) {
    console.error(`Error exporting table ${tableName}:`, error.message);
    return {
      tableName,
      rowCount: 0,
      data: [],
      error: error.message
    };
  }
}

async function exportDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportData = {
    exportInfo: {
      timestamp: new Date().toISOString(),
      database: 'TopShop SEO App Database',
      version: '1.0'
    },
    tables: {}
  };

  console.log('Starting database export...');
  
  // List of tables to export based on your schema
  const tables = [
    'users',
    'shopify_connections', 
    'shopify_stores',
    'user_stores',
    'blog_posts',
    'sync_activities',
    'content_gen_requests',
    'authors',
    'projects',
    'genders',
    'styles', 
    'tones'
  ];

  // Export each table
  for (const tableName of tables) {
    const tableData = await exportTable(tableName);
    exportData.tables[tableName] = tableData;
    
    if (tableData.error) {
      console.log(`⚠️  ${tableName}: Error - ${tableData.error}`);
    } else {
      console.log(`✅ ${tableName}: ${tableData.rowCount} rows exported`);
    }
  }

  // Create export filename
  const filename = `database-export-${timestamp}.json`;
  const filePath = path.join(process.cwd(), filename);
  
  try {
    // Write to file with pretty formatting
    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
    console.log(`\n📁 Database exported to: ${filename}`);
    console.log(`📊 Export Summary:`);
    
    let totalRows = 0;
    let successfulTables = 0;
    let errorTables = 0;
    
    Object.values(exportData.tables).forEach(table => {
      if (table.error) {
        errorTables++;
      } else {
        successfulTables++;
        totalRows += table.rowCount;
      }
    });
    
    console.log(`   - Tables exported successfully: ${successfulTables}`);
    console.log(`   - Tables with errors: ${errorTables}`);
    console.log(`   - Total rows exported: ${totalRows}`);
    console.log(`   - File size: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error('Failed to write export file:', error);
  }
}

// Also export environment info (without sensitive data)
async function exportEnvironmentInfo() {
  const envInfo = {
    nodeVersion: process.version,
    platform: process.platform,
    timestamp: new Date().toISOString(),
    // Only include non-sensitive environment variables
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      // Don't include sensitive data like API keys or database URLs
    }
  };
  
  const filename = `environment-info-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(filename, JSON.stringify(envInfo, null, 2));
  console.log(`📋 Environment info exported to: ${filename}`);
}

async function main() {
  try {
    await exportDatabase();
    await exportEnvironmentInfo();
    console.log('\n🎉 Export completed successfully!');
  } catch (error) {
    console.error('❌ Export failed:', error);
  } finally {
    await pool.end();
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n⏹️  Export interrupted by user');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏹️  Export terminated');
  await pool.end();
  process.exit(0);
});

main();
