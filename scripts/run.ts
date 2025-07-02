import { NaiveChunker } from '../src/rag/chunking';
import { db } from '../src/rag/db/db';
import { getIndexer } from '../src/rag/indexer';

// This is just a test script, so we'll skip the actual indexing for now
console.log('Indexer script loaded successfully');
// const indexer = getIndexer();
// indexer.indexAllFiles();
