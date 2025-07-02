-- Load the sqlite-vec extension
.load ./vec0

-- Create a regular table for notes
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    filepath TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create a virtual table for vector embeddings using sqlite-vec
CREATE VIRTUAL TABLE IF NOT EXISTS chunks USING vec0(
    note_id TEXT,
    content TEXT,
    embedding float[1024]
);