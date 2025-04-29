-- Clipboard items table for text, links, and images
CREATE TABLE IF NOT EXISTS clipboard_items (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL, -- 'text', 'link', or 'image'
    content TEXT,       -- text or link
    image_data BYTEA,   -- image binary data
    created_at TIMESTAMP DEFAULT NOW()
);

-- Collections table for organizing clipboard items
CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

-- Insert a default collection if none exists
INSERT INTO collections (name) 
VALUES ('Default') 
ON CONFLICT (name) DO NOTHING;

-- Add collection name column to clipboard_items if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='clipboard_items' AND column_name='collection_name'
    ) THEN
        ALTER TABLE clipboard_items ADD COLUMN collection_name TEXT;
    END IF;
END $$;
