# Clipboard Overlay

A web-based clipboard collection tool that stays on top of your screen. This overlay allows you to save multiple text snippets and easily copy them when needed.

## Features

- Draggable overlay that stays on top of other content
- Save multiple clipboard items in one place
- Copy items with a single click
- Minimize/restore functionality
- Persistent storage (items saved between sessions)
- Keyboard shortcuts (Ctrl+Enter to add a new item)

## How to Use

1. Open `index.html` in your web browser
2. Type or paste text into the text area
3. Click "Add to Collection" or press Ctrl+Enter
4. To copy an item, click the clipboard icon (📋) on the item
5. To delete an item, click the trash icon (🗑️)
6. To minimize the overlay, click the minimize button (_)
7. To restore a minimized overlay, click the clipboard icon (📋) at the bottom right
8. To move the overlay, drag it using the header

## Browser Support

This application uses modern JavaScript features and the Clipboard API. It works best in:
- Chrome/Edge (latest versions)
- Firefox (latest versions)
- Safari (latest versions)

## Note on Clipboard Access

The Clipboard API requires a secure context (HTTPS) when used in production. When testing locally, most browsers will allow clipboard access from localhost.

## License

MIT