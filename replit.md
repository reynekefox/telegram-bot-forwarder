# Telegram Message Forwarding Bot

## Overview
A Node.js/TypeScript Telegram bot that forwards messages between channels with full edit synchronization and a real-time monitoring dashboard.

## Features

### Bot Functionality
- **Message Forwarding**: Automatically forwards messages from source channel to target channel
- **Edit Synchronization**: Syncs message edits including formatting (bold, links, etc.)
- **Channel & Group Support**: Works with both channel posts and group messages
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Activity Logging**: All operations logged for monitoring

### Dashboard
- **Real-Time Monitoring**: Live statistics updated every 2 seconds
- **Status Cards**: Messages forwarded, edited, errors, uptime
- **Activity Log**: Scrollable history of all bot operations
- **Configuration Display**: Shows source and target channel IDs
- **Dark Mode**: Full dark mode support

## Tech Stack

### Backend
- **Node.js** with **TypeScript**
- **Express** for HTTP server
- **Telegraf** for Telegram Bot API
- **In-memory storage** for logs and statistics

### Frontend
- **React** with **TypeScript**
- **Wouter** for routing
- **TanStack Query** for data fetching
- **Shadcn UI** components
- **Tailwind CSS** for styling

## Architecture

### Bot (server/bot.ts)
- Handles Telegram updates (messages, edits, channel posts)
- Maintains forward mapping (source→target message IDs)
- Preserves formatting entities in edits
- Logs all operations

### Storage (server/storage.ts)
- In-memory storage with proper interfaces
- Bot status tracking
- Statistics (forwarded, edited, errors, uptime)
- Activity logs (capped at 1000 entries)
- Forward mapping for edit synchronization

### API (server/routes.ts)
- `GET /api/stats` - Bot statistics
- `GET /api/logs?limit=50` - Activity history
- `GET /api/config` - Channel configuration

### Dashboard (client/src/pages/Dashboard.tsx)
- Polls API every 2 seconds
- Displays real-time statistics
- Shows activity log with timestamps
- Indicates bot running status

## Configuration

### Environment Variables (via Replit Secrets)
- `BOT_TOKEN` - Telegram bot token from @BotFather
- `SOURCE_CHAT_ID` - Source channel/group ID (e.g., -1003141215929)
- `TARGET_CHAT_ID` - Target channel/group ID (e.g., -1003443779414)

## Running the Application

The workflow "Start application" runs `npm run dev` which:
1. Starts Express server on port 5000
2. Launches Telegram bot with long polling
3. Serves the React dashboard

## Bot Behavior

### Message Forwarding
1. Bot receives message from source channel
2. Copies message to target channel
3. Stores mapping: (source chat ID, source message ID) → target message ID
4. Logs the operation

### Edit Synchronization
1. Bot receives edit update from source channel
2. Looks up target message ID from forward mapping
3. Edits target message with new text/caption AND formatting entities
4. Logs the operation

### Error Handling
- **409 Conflict**: Another bot instance is running - shows clear error message
- **Runtime errors**: Caught and logged to activity log
- **Graceful shutdown**: Updates status and logs shutdown event

## Monitoring

### Statistics
- **Messages Forwarded**: Total count of forwarded messages
- **Messages Edited**: Total count of synchronized edits
- **Errors**: Count of failed operations
- **Uptime**: Current session duration (0 when stopped)

### Activity Log
- Type badges: FORWARD (blue), EDIT (amber), ERROR (red)
- Timestamps in local time
- Message IDs with arrow showing source→target
- Error messages with details

## Development Notes

### Recent Changes (November 13, 2025)
- Fixed channel_post handling (was crashing on undefined ctx.message)
- Added entities preservation in edit synchronization
- Implemented proper bot status tracking
- Added uptime reset on bot start/stop
- Added runtime error logging via bot.catch
- Added graceful shutdown logging

### Known Limitations
- In-memory storage (data lost on restart)
- No retry mechanism for 409 conflicts
- Forward mapping grows unbounded (consider cleanup for long-running instances)

## Future Enhancements
- Persistent database storage
- Multiple source-to-target channel pairs
- Message filtering rules
- Admin commands (pause/resume)
- Retry logic for transient errors
- Forward mapping cleanup/expiration
