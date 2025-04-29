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

### Method 1: Standard Installation

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

### Method 2: Docker Installation (Cross-Platform)

Using Docker provides a containerized environment with PostgreSQL included, making it easy to run the application across different platforms without complex setup.

#### Prerequisites:
- [Docker](https://docs.docker.com/get-docker/) installed
- [Docker Compose](https://docs.docker.com/compose/install/) installed

#### For Linux/macOS Users:

1. Clone or download this repository
2. Open terminal in the project directory
3. Run the application:
   ```
   ./run.sh
   ```
   This script will:
   - Check for Docker and Docker Compose
   - Set up X11 permissions for the GUI
   - Start PostgreSQL container
   - Start BetteResearch application

#### For Windows Users:

1. Clone or download this repository
2. Install an X Server like [VcXsrv](https://sourceforge.net/projects/vcxsrv/) or [Xming](https://sourceforge.net/projects/xming/)
3. Start the X Server with "Disable access control" option enabled
4. Double-click `run.bat` to start the application
5. Follow the on-screen instructions

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

## Docker Details

The Docker setup includes:

- A PostgreSQL container that persists data in a Docker volume
- An Electron application container with X11 forwarding for GUI display
- Environment configuration for cross-platform compatibility

Data is persisted between sessions through Docker volumes. You can manage the Docker containers using standard Docker commands:

```bash
# View running containers
docker ps

# Stop the application
docker-compose down

# Start just the PostgreSQL database
docker-compose up -d postgres

# View logs
docker-compose logs -f app
```

## License

MIT