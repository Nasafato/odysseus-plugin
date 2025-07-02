import { App, Command, Notice } from 'obsidian';
import { NaiveChunker } from 'src/rag/chunking';
import { VoyageEmbedder } from 'src/rag/embedding';
import { getIndexer } from '../../rag/indexer';
import { OdysseusSettings } from '../../types/OdysseusSettings';

export function createIndexVaultCommand(app: App, settings: OdysseusSettings): Command {
    return {
        id: 'index-vault',
        name: 'Index Vault',
        callback: async () => {
            try {
                new Notice('Starting vault indexing...');
                const embedder = VoyageEmbedder.init(settings.voyageApiKey);
                const indexer = getIndexer(NaiveChunker.default(), embedder);
                await indexer.indexAllFiles(app);
                new Notice('Vault indexing completed successfully!');
            } catch (error) {
                console.error('Failed to index vault:', error);
                new Notice(`Failed to index vault: ${error.message || error}`);
            }
        }
    };
}