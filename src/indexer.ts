import { App, TFile } from "obsidian";
import { Chunker } from "./chunking";
import { Embedder } from "./embedding";

interface Indexer {
    indexFilePaths(app: App, filePaths: string[]): Promise<void>;
    indexAllFiles(app: App): Promise<void>;
}

class DefaultIndexer implements Indexer {
    constructor(private chunker: Chunker, private embedder: Embedder) {}

    async indexFilePaths(app: App, filePaths: string[]): Promise<void> {
        for (const filePath of filePaths) {
            const file = app.vault.getFileByPath(filePath);
            if (!file) continue;
            const cachedRead = await app.vault.cachedRead(file);
            const chunks = this.chunker.chunk(cachedRead);
            const embeddings = await this.embedder.embedBulk(chunks);
            await this.storeEmbeddings(file, embeddings);
        }
    }

    async indexAllFiles(app: App): Promise<void> {
        const files = app.vault.getMarkdownFiles()
        for (const file of files) {
            const cachedRead = await app.vault.cachedRead(file);
            const chunks = this.chunker.chunk(cachedRead);
            const embeddings = await this.embedder.embedBulk(chunks);
            await this.storeEmbeddings(file, embeddings);
        }
    }

    private async storeEmbeddings(file: TFile, embeddings: number[][]): Promise<void> {
        // TODO: Store the embedding in the database.
        // We'll use a local sqlite database.
    }
}