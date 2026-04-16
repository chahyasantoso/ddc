export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: any;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

let dbInstance: D1Database | null = null;

export async function getDB(env: any): Promise<D1Database> {
  // 1. If we have an actual D1 binding, use it (Wrangler/Deployed)
  if (env?.DB) {
    return env.DB;
  }

  // 2. If already instanced in Dev, return it
  if (dbInstance) {
    return dbInstance;
  }

  // 3. Prevent running local fallback on production that might not have env properly loaded yet but isn't dev.
  // Actually, during dev `env?.DB` is null, so it falls through here. 
  try {
    const { existsSync, readdirSync } = await import('fs');
    const { join } = await import('path');
    const { execSync } = await import('child_process');
    const Database = (await import('better-sqlite3')).default;

    class NodeD1Statement implements D1PreparedStatement {
      constructor(private stmt: any, private params: any[] = []) {}
    
      bind(...values: any[]): D1PreparedStatement {
        return new NodeD1Statement(this.stmt, values);
      }
    
      async first<T = unknown>(): Promise<T | null> {
        const result = this.stmt.get(...this.params);
        return (result as T) || null;
      }
    
      async run(): Promise<D1Result> {
        const info = this.stmt.run(...this.params);
        return {
          success: true,
          results: [],
          meta: { last_row_id: info.lastInsertRowid, changes: info.changes }
        };
      }
    
      async all<T = unknown>(): Promise<D1Result<T>> {
        const results = this.stmt.all(...this.params);
        return {
          success: true,
          results: results as T[],
          meta: {}
        };
      }
    }
    
    class NodeD1Database implements D1Database {
      private db: any;
      constructor(dbPath: string) {
        this.db = new Database(dbPath);
      }
      
      prepare(query: string): D1PreparedStatement {
        return new NodeD1Statement(this.db.prepare(query));
      }
    }

    const d1Dir = join(process.cwd(), '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
    
    if (existsSync(d1Dir)) {
      const files = readdirSync(d1Dir);
      const dbFile = files.find(f => f.endsWith('.sqlite') && !f.includes('metadata'));
      
      if (dbFile) {
        const dbPath = join(d1Dir, dbFile);
        console.log('[DB Client] Using local SQLite fallback:', dbPath);
        dbInstance = new NodeD1Database(dbPath);
        
        // Auto-seeding check: Do we have the checkpoints table?
        const checkResult = await dbInstance.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='checkpoints';").first();
        
        if (!checkResult) {
           console.log('[DB Client] Tables missing. Auto-seeding database...');
           try {
             execSync('npm run db:setup', { stdio: 'inherit' });
             execSync('npm run db:seed', { stdio: 'inherit' });
             console.log('[DB Client] Auto-seeding complete.');
             dbInstance = new NodeD1Database(dbPath);
           } catch (e) {
             console.error('[DB Client] Auto-seed failed.', e);
           }
        }
        return dbInstance;
      }
    }

    console.log('[DB Client] No local DB found. Running db:setup ...');
    try {
       execSync('npm run db:setup', { stdio: 'inherit' });
       execSync('npm run db:seed', { stdio: 'inherit' });
       
       if (existsSync(d1Dir)) {
         const files = readdirSync(d1Dir);
         const dbFile = files.find(f => f.endsWith('.sqlite') && !f.includes('metadata'));
         if (dbFile) {
            const dbPath = join(d1Dir, dbFile);
            dbInstance = new NodeD1Database(dbPath);
            return dbInstance;
         }
       }
    } catch (e) {
      console.error('[DB Client] Setup failed.', e);
    }
  } catch(e) {
     console.error("Local fallback initialization failed (probably running in a non-node environment without DB binding).", e);
  }

  throw new Error("No database binding found and could not resolve local fallback.");
}
