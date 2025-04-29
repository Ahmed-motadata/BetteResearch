# BetteResearch

A desktop clipboard collection tool that stays on top of your screen. This application allows you to save multiple text and image snippets, organize them into collections, and easily copy them when needed.

## Features

- Always-on-top window that can be quickly toggled with keyboard shortcuts
- Save text, URLs, and images to your clipboard collection
- Organize content into multiple collections
- Copy items back to your clipboard with a single click
- Persistent storage using PostgreSQL database
- Cross-platform support (Windows, macOS, Linux)
- Global keyboard shortcuts:
  - `Ctrl+Shift+\`: Toggle application visibility
  - `Ctrl+Shift+=`: Capture text from primary selection (Linux)
- Links automatically detected and can be opened in browser

## Requirements

- Node.js (v14+)
- PostgreSQL database
- Dependencies listed in package.json
- For Linux users: xclip (for accessing primary selection buffer)

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up PostgreSQL and create a database for the application
4. Create a `.env` file in the project root with the following information:
   ```
   PGUSER=yourpostgresuser
   PGHOST=localhost
   PGDATABASE=yourdbname
   PGPASSWORD=yourpassword
   PGPORT=5432
   ```
5. Run the application:
   ```
   npm start
   ```

## Usage

1. When started, the application appears as a small window on the right side of your screen
2. Paste text or images into the input area or type directly
3. Click "Add" or press Ctrl+Enter to save the content
4. Use the collection navigation buttons to switch between collections
5. Create new collections using the "New" button
6. To copy an item, click the clipboard icon (📋)
7. To delete an item, click the trash icon (🗑️)
8. For links, click the link icon (🔗) to open in your default browser
9. Use global shortcuts to quickly hide/show the window or capture selections

## Database Structure

- Collections are stored in a `collections` table
- Each collection has its own table for clipboard items
- Clipboard items can store text, links, or image data

## License

MIT