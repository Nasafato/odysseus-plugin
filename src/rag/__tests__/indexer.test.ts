import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { App, TFile } from 'obsidian';
import { getIndexer } from '../indexer';
import { NaiveChunker } from '../chunking';
import { Embedder } from '../embedding';
import { EmbeddingDatabase } from '../database';

// Mock Embedder implementation for testing
class MockEmbedder implements Embedder {
    async embedBulk(texts: string[]): Promise<number[][]> {
        return texts.map((text, index) => {
            // Return a consistent fake embedding based on text content and index
            const baseVector = new Array(384).fill(0);
            baseVector[0] = text.length;
            baseVector[1] = index;
            baseVector[2] = text.charCodeAt(0) || 0;
            return baseVector;
        });
    }

    async embed(text: string): Promise<number[]> {
        const embeddings = await this.embedBulk([text]);
        return embeddings[0];
    }
}

// Mock TFile
class MockTFile implements TFile {
    path: string;
    name: string;
    basename: string;
    extension: string;
    stat: any;
    vault: any;
    parent: any;

    constructor(path: string) {
        this.path = path;
        this.name = path.split('/').pop() || '';
        this.basename = this.name.replace(/\.[^/.]+$/, '');
        this.extension = path.split('.').pop() || '';
        this.stat = { mtime: Date.now(), ctime: Date.now(), size: 1000 };
        this.vault = null;
        this.parent = null;
    }
}

// Mock Obsidian App and Vault
const createMockApp = (fixtureContent: string): App => {
    const mockFile = new MockTFile('fixtures/modulation-of-desire.md');
    
    return {
        vault: {
            getFileByPath: vi.fn((path: string) => {
                if (path === 'fixtures/modulation-of-desire.md') {
                    return mockFile;
                }
                return null;
            }),
            cachedRead: vi.fn(async (file: TFile) => {
                if (file.path === 'fixtures/modulation-of-desire.md') {
                    return fixtureContent;
                }
                throw new Error('File not found');
            }),
            getMarkdownFiles: vi.fn(() => [mockFile])
        }
    } as any;
};

describe('Indexer', () => {
    let fixtureContent: string;
    let mockApp: App;
    let database: EmbeddingDatabase;
    let chunker: NaiveChunker;
    let mockEmbedder: MockEmbedder;

    beforeEach(() => {
        // Load the fixture content
        const fixturePath = join(__dirname, 'fixtures', 'modulation-of-desire.md');
        fixtureContent = readFileSync(fixturePath, 'utf-8');
        
        // Create mocks
        mockApp = createMockApp(fixtureContent);
        database = new EmbeddingDatabase(':memory:'); // In-memory database for testing
        chunker = NaiveChunker.default();
        mockEmbedder = new MockEmbedder();
    });

    describe('chunking', () => {
        it('should chunk the fixture file correctly', () => {
            const chunks = chunker.chunk(fixtureContent);
            
            // The fixture file is 5,305 characters long
            expect(fixtureContent.length).toBe(5305);
            
            // With 500-character chunks, we expect 11 chunks (10 full + 1 partial)
            expect(chunks).toHaveLength(11);
            
            // Verify chunk sizes
            for (let i = 0; i < 10; i++) {
                expect(chunks[i]).toHaveLength(500);
            }
            expect(chunks[10]).toHaveLength(305); // Remaining characters
            
            // Verify chunks contain expected content
            expect(chunks[0]).toContain('# The modulation of desire');
            expect(chunks[10]).toContain('Give yourself some more credit.');
            
            // Verify chunks can be reassembled
            const reassembled = chunks.join('');
            expect(reassembled).toBe(fixtureContent);
        });
    });

    describe('embedding', () => {
        it('should generate embeddings for chunks', async () => {
            const chunks = chunker.chunk(fixtureContent);
            const embeddings = await mockEmbedder.embedBulk(chunks);
            
            expect(embeddings).toHaveLength(11);
            expect(embeddings[0]).toHaveLength(384);
            
            // Verify embeddings are consistent (same text should produce same embedding)
            const embedding1 = await mockEmbedder.embed(chunks[0]);
            const embedding2 = await mockEmbedder.embed(chunks[0]);
            expect(embedding1).toEqual(embedding2);
        });
    });

    describe('database storage', () => {
        it('should store and retrieve chunks with embeddings', async () => {
            const mockFile = new MockTFile('test.md');
            const chunks = ['chunk 1', 'chunk 2', 'chunk 3'];
            const embeddings = await mockEmbedder.embedBulk(chunks);
            
            // Store chunks
            await database.storeChunks(mockFile, chunks, embeddings);
            
            // Retrieve chunks
            const storedChunks = database.getChunksForFile('test.md');
            
            expect(storedChunks).toHaveLength(3);
            expect(storedChunks[0].content).toBe('chunk 1');
            expect(storedChunks[1].content).toBe('chunk 2');
            expect(storedChunks[2].content).toBe('chunk 3');
            
            // Verify embeddings are stored correctly
            expect(storedChunks[0].embedding).toEqual(embeddings[0]);
            expect(storedChunks[1].embedding).toEqual(embeddings[1]);
            expect(storedChunks[2].embedding).toEqual(embeddings[2]);
            
            // Verify chunk indices
            expect(storedChunks[0].chunkIndex).toBe(0);
            expect(storedChunks[1].chunkIndex).toBe(1);
            expect(storedChunks[2].chunkIndex).toBe(2);
        });
    });

    describe('full indexing pipeline', () => {
        it('should index a single file path correctly', async () => {
            const indexer = getIndexer(chunker, mockEmbedder, database);
            
            // Index the fixture file
            await indexer.indexFilePaths(mockApp, ['fixtures/modulation-of-desire.md']);
            
            // Verify the file was processed
            const storedChunks = database.getChunksForFile('fixtures/modulation-of-desire.md');
            
            expect(storedChunks).toHaveLength(11);
            expect(storedChunks[0].content).toContain('# The modulation of desire');
            expect(storedChunks[10].content).toContain('Give yourself some more credit.');
            
            // Verify all chunks have embeddings
            storedChunks.forEach((chunk, index) => {
                expect(chunk.embedding).toHaveLength(384);
                expect(chunk.chunkIndex).toBe(index);
                expect(chunk.filePath).toBe('fixtures/modulation-of-desire.md');
            });
        });

        it('should index all files correctly', async () => {
            const indexer = getIndexer(chunker, mockEmbedder, database);
            
            // Index all files (mock returns just our fixture)
            await indexer.indexAllFiles(mockApp);
            
            // Verify the file was processed
            const allChunks = database.getAllChunks();
            
            expect(allChunks).toHaveLength(11);
            expect(allChunks[0].filePath).toBe('fixtures/modulation-of-desire.md');
            
            // Verify content integrity
            const reassembledContent = allChunks
                .sort((a, b) => a.chunkIndex - b.chunkIndex)
                .map(chunk => chunk.content)
                .join('');
            
            expect(reassembledContent).toBe(fixtureContent);
        });

        it('should handle non-existent files gracefully', async () => {
            const indexer = getIndexer(chunker, mockEmbedder, database);
            
            // Try to index a non-existent file
            await expect(indexer.indexFilePaths(mockApp, ['non-existent.md'])).resolves.not.toThrow();
            
            // Verify no chunks were stored
            const storedChunks = database.getChunksForFile('non-existent.md');
            expect(storedChunks).toHaveLength(0);
        });

        it('should handle empty content gracefully', async () => {
            const emptyApp = createMockApp('');
            const indexer = getIndexer(chunker, mockEmbedder, database);
            
            await indexer.indexFilePaths(emptyApp, ['fixtures/modulation-of-desire.md']);
            
            // Empty content should produce one empty chunk
            const storedChunks = database.getChunksForFile('fixtures/modulation-of-desire.md');
            expect(storedChunks).toHaveLength(1);
            expect(storedChunks[0].content).toBe('');
        });
    });

    describe('edge cases', () => {
        it('should handle mismatched chunk and embedding arrays', async () => {
            const mockFile = new MockTFile('test.md');
            const chunks = ['chunk 1', 'chunk 2'];
            const embeddings = [[1, 2, 3]]; // Only one embedding for two chunks
            
            await expect(database.storeChunks(mockFile, chunks, embeddings))
                .rejects.toThrow('Chunks and embeddings arrays must have the same length');
        });

        it('should handle very long content', async () => {
            const longContent = 'a'.repeat(10000); // 10k characters
            const chunks = chunker.chunk(longContent);
            
            expect(chunks).toHaveLength(20); // 10000 / 500 = 20 chunks
            expect(chunks.every(chunk => chunk.length === 500)).toBe(true);
        });
    });
});