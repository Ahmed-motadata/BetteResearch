-- Clipboard items table for text, links, and images
CREATE TABLE IF NOT EXISTS clipboard_items (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL, -- 'text', 'link', or 'image'
    content TEXT,       -- text or link
    image_data BYTEA,   -- image binary data
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE clipboard_items ADD COLUMN collection_name TEXT;
