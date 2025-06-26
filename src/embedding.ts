import { assert } from "./utils";

export interface Embedder {
    embedBulk(texts: string[]): Promise<number[][]>;
    embed(text: string): Promise<number[]>;
}

let voyageEmbedder: VoyageEmbedder;

export class VoyageEmbedder implements Embedder {
    private readonly apiUrl = 'https://api.voyageai.com/v1/embeddings';
    private readonly modelConfig = {
        model: 'voyage-3.5-lite',
        maxTokenLength: 1_000_000
    }
    static default() {
        assert(process.env.VOYAGE_API_KEY, "VOYAGE_API_KEY is not set");
        return new VoyageEmbedder(process.env.VOYAGE_API_KEY);
    }

    constructor(private apiKey: string) {
    }

    private batchInputs(texts: string[]): string[][] {
        const batches: string[][] = [];
        for (let i = 0; i < texts.length; i += 100) {
            batches.push(texts.slice(i, i + 100));
        }
        return batches;
    }

    async embedBulk(texts: string[]): Promise<number[][]> {
        const batches = this.batchInputs(texts);
        // TODO: Add max concurrency, or spin out to worker.
        const embeddings = await Promise.all(batches.map(batch => this.embedBatch(batch)));
        return embeddings.flat();
    }

    private async embedBatch(texts: string[]): Promise<number[][]> {
        if (texts.length === 0) {
            return [];
        }

        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                input: texts,
                model: this.modelConfig.model,
                maxTokenLength: this.modelConfig.maxTokenLength
            })
        });

        if (!response.ok) {
            throw new Error(`Voyage API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.data.map((item: any) => item.embedding);
    }

    async embed(text: string): Promise<number[]> {
        const embeddings = await this.embedBulk([text]);
        return embeddings[0];
    }
}



