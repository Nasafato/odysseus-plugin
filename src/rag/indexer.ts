import { App, TFile } from "obsidian";
import { Chunker, NaiveChunker } from "./chunking";
import { Embedder, VoyageEmbedder } from "./embedding";
import { EmbeddingDatabase } from "./database";

interface Indexer {
    indexFilePaths(app: App, filePaths: string[]): Promise<void>;
    indexAllFiles(app: App): Promise<void>;
}

class DefaultIndexer implements Indexer {
    constructor(
        private chunker: Chunker, 
        private embedder: Embedder,
        private database: EmbeddingDatabase
    ) {}

    async indexFilePaths(app: App, filePaths: string[]): Promise<void> {
        for (const filePath of filePaths) {
            const file = app.vault.getFileByPath(filePath);
            if (!file) continue;
            const cachedRead = await app.vault.cachedRead(file);
            const chunks = this.chunker.chunk(cachedRead);
            const embeddings = await this.embedder.embedBulk(chunks);
            await this.database.storeChunks(file, chunks, embeddings);
        }
    }

    async indexAllFiles(app: App): Promise<void> {
        const files = app.vault.getMarkdownFiles()
        for (const file of files) {
            const cachedRead = await app.vault.cachedRead(file);
            const chunks = this.chunker.chunk(cachedRead);
            const embeddings = await this.embedder.embedBulk(chunks);
            await this.database.storeChunks(file, chunks, embeddings);
        }
    }

}

export function getIndexer(
    chunker: Chunker = NaiveChunker.default(), 
    embedder: Embedder = VoyageEmbedder.default(),
    database: EmbeddingDatabase = new EmbeddingDatabase()
): Indexer {
    return new DefaultIndexer(chunker, embedder, database);
}