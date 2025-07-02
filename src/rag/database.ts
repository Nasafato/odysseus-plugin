import Database from 'better-sqlite3';
import { TFile, normalizePath } from 'obsidian';

export interface ChunkData {
    id?: number;
    filePath: string;
    chunkIndex: number;
    content: string;
    embedding: number[];
}

export class EmbeddingDatabase {
    private db: Database.Database;

    constructor(dbPath: string = ':memory:') {
        this.db = new Database(dbPath);
        this.initializeDatabase();
    }

    private initializeDatabase() {
        // Create the chunks table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS chunks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_path TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                content TEXT NOT NULL,
                embedding_json TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create index for faster lookups
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_file_path ON chunks(file_path);
        `);
    }

    async storeChunks(file: TFile, chunks: string[], embeddings: number[][]): Promise<void> {
        if (chunks.length !== embeddings.length) {
            throw new Error('Chunks and embeddings arrays must have the same length');
        }

        const insertStmt = this.db.prepare(`
            INSERT INTO chunks (file_path, chunk_index, content, embedding_json)
            VALUES (?, ?, ?, ?)
        `);

        // See https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Use+%60normalizePath()%60+to+clean+up+user-defined+paths.
        const normalizedFilePath = normalizePath(file.path);
        const transaction = this.db.transaction(() => {
            for (let i = 0; i < chunks.length; i++) {
                insertStmt.run(
                    normalizedFilePath,
                    i,
                    chunks[i],
                    JSON.stringify(embeddings[i])
                );
            }
        });

        transaction();
    }

    getChunksForFile(filePath: string): ChunkData[] {
        const stmt = this.db.prepare(`
            SELECT id, file_path, chunk_index, content, embedding_json
            FROM chunks
            WHERE file_path = ?
            ORDER BY chunk_index ASC
        `);

        const rows = stmt.all(filePath) as any[];
        return rows.map(row => ({
            id: row.id,
            filePath: row.file_path,
            chunkIndex: row.chunk_index,
            content: row.content,
            embedding: JSON.parse(row.embedding_json)
        }));
    }

    getAllChunks(): ChunkData[] {
        const stmt = this.db.prepare(`
            SELECT id, file_path, chunk_index, content, embedding_json
            FROM chunks
            ORDER BY file_path ASC, chunk_index ASC
        `);

        const rows = stmt.all() as any[];
        return rows.map(row => ({
            id: row.id,
            filePath: row.file_path,
            chunkIndex: row.chunk_index,
            content: row.content,
            embedding: JSON.parse(row.embedding_json)
        }));
    }

    deleteChunksForFile(filePath: string): void {
        const stmt = this.db.prepare('DELETE FROM chunks WHERE file_path = ?');
        stmt.run(filePath);
    }

    close(): void {
        this.db.close();
    }
}