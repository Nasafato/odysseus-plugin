export interface Chunker {
    chunk(text: string): string[];
}

let naiveChunker: NaiveChunker;

export class NaiveChunker implements Chunker {
    static default() {
        if (!naiveChunker) naiveChunker = new NaiveChunker();
        return naiveChunker;
    }

    chunk(text: string): string[] {
        const chunks: string[] = [];
        for (let i = 0 ; i <text.length; i+= 500) {
            chunks.push(text.slice(i, i + 500));
        }
        return chunks;
    }
}
