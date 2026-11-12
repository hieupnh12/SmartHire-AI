-- V37: Optional pgvector activation & vector store table for AI Interview RAG
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Extension vector is not yet available in this PostgreSQL environment; skipping: %', SQLERRM;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        CREATE TABLE IF NOT EXISTS vector_store (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            content TEXT,
            metadata JSONB,
            embedding vector(768)
        );
        CREATE INDEX IF NOT EXISTS vector_store_hnsw_idx ON vector_store USING hnsw (embedding vector_cosine_ops);
    END IF;
END $$;

