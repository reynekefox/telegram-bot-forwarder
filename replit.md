# Telegram Message Forwarding Bot

## Overview
A Node.js/TypeScript Telegram bot that forwards messages between channels with full edit synchronization, message deletion support, and a real-time monitoring dashboard. Supports forwarding to **multiple target channels** (up to 4).

## Features

### Bot Functionality
- **Multi-Channel Forwarding**: Forwards messages to up to 4 target channels simultaneously
- **Message Forwarding**: Automatically forwards all message types (text, photos, videos, documents)
- **Edit Synchronization**: Syncs message edits across all target channels including formatting (bold, links, etc.)
- **Message Deletion**: Delete forwarded messages using `/delete <message_id>` command
- **Channel & Group Support**: Works with both channel posts and group messages
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Activity Logging**: All operations logged for monitoring
- **Immutable Forward Mapping**: Each message's forward history is preserved regardless of configuration changes

### Dashboard
- **Real-Time Monitoring**: Live statistics updated every 2 seconds
- **Status Cards**: Messages forwarded, edited, deleted, errors, uptime
- **Activity Log**: Scrollable history of all bot operations
- **Configuration Panel**: 
  - View source channel ID
  - Configure up to 4 target channels
  - Save channel configuration
  - Restart bot button
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
- Forwards messages to multiple target channels
- Maintains forward mapping (source→multiple target {chatId, messageId} pairs)
- Preserves formatting entities in edits
- Supports `/delete <message_id>` command for removing forwarded messages
- Logs all operations with per-channel details

### Storage (server/storage.ts)
- In-memory storage with proper interfaces
- Bot status tracking
- Statistics (forwarded, edited, deleted, errors, uptime)
- Activity logs (capped at 1000 entries)
- **Immutable forward mapping**: Stores `{chatId, messageId}` pairs per source message
- Target channels configuration (up to 4 channels)

### API (server/routes.ts)
- `GET /api/stats` - Bot statistics
- `GET /api/logs?limit=50` - Activity history
- `GET /api/config` - Channel configuration (source + target channels array)
- `POST /api/config/channels` - Update target channels
- `POST /api/bot/restart` - Restart bot (requires manual workflow restart)

### Dashboard (client/src/pages/Dashboard.tsx)
- Polls API every 2 seconds
- Displays real-time statistics (5 cards including deletions)
- Shows activity log with timestamps
- Indicates bot running status
- Configuration panel with editable target channels

## Configuration

### Environment Variables (via Replit Secrets)
- `BOT_TOKEN` - Telegram bot token from @BotFather
- `SOURCE_CHAT_ID` - Source channel/group ID (e.g., -1003141215929)
- `TARGET_CHAT_ID` - Default target channel ID (optional, can be changed via UI)

### Target Channels
- Configure up to 4 target channels via the dashboard
- Each channel is optional (empty fields are skipped)
- Changes are saved to in-memory storage
- **Important**: Configuration changes only affect NEW messages (see behavior notes)

## Bot Behavior

### Message Forwarding
1. Bot receives message from source channel
2. Copies message to all configured target channels
3. Stores **immutable** mapping: `(source chat ID, source message ID)` → array of `{chatId, messageId}` pairs
4. Logs the operation with success count

### Edit Synchronization
1. Bot receives edit update from source channel
2. Looks up stored forward mapping for that specific source message
3. Edits messages in **all original destination channels** (preserved from initial forward)
4. Logs the operation with success count

### Message Deletion
1. Send command `/delete <message_id>` in the source channel
2. Bot looks up forwarded messages for that source message ID
3. Deletes all forwarded copies from target channels
4. Removes forward mapping entry
5. Responds with success confirmation

**Usage example:**
```
/delete 12345
```
This will delete message #12345 from all channels where it was forwarded.

### Channel Configuration Changes
**Important behavior:**
- Changing target channel configuration affects **only future messages**
- Previously forwarded messages remain in their original destination channels
- Edits to old messages still go to the original channels (not the new configuration)
- This ensures edit synchronization continues to work correctly

**Example:**
1. Message #123 arrives → forwarded to channels A, B, C
2. User changes config to channels D, E, F
3. Message #124 arrives → forwarded to channels D, E, F
4. User edits message #123 → edit goes to A, B, C (original destinations)
5. User edits message #124 → edit goes to D, E, F (where it was forwarded)

### Error Handling
- **409 Conflict**: Another bot instance is running - shows clear error message
- **Runtime errors**: Caught and logged to activity log
- **Graceful shutdown**: Updates status and logs shutdown event
- **Per-channel errors**: If forwarding/editing/deleting fails for one channel, continues with others

## Monitoring

### Statistics
- **Messages Forwarded**: Total count of successfully forwarded messages
- **Messages Edited**: Total count of synchronized edits
- **Messages Deleted**: Total count of deleted messages via `/delete` command
- **Errors**: Count of failed operations
- **Uptime**: Current session duration (0 when stopped)

### Activity Log
- Type badges: FORWARD (blue), EDIT (amber), DELETE (red), ERROR (red)
- Timestamps in local time
- Message IDs with arrow showing source→target
- Multi-channel operations show "X of Y channels" status
- Error messages with details including which channel failed

## Development Notes

### Recent Changes (November 13, 2025)
- **Added delete command**: `/delete <message_id>` to remove forwarded messages
- **Added delete statistics**: New status card showing total deleted messages
- **Updated activity log**: DELETE badge for deletion operations
- **Multi-channel support**: Forward to up to 4 target channels
- **Configuration UI**: Editable target channels in dashboard
- **Restart button**: Request bot restart via UI
- **Improved forward mapping**: Stores `{chatId, messageId}` pairs for robust edit sync
- **Improved logging**: Per-channel error reporting
- Fixed channel_post handling
- Added entities preservation in edit synchronization
- Implemented proper bot status tracking
- Added uptime reset on bot start/stop
- Added runtime error logging via bot.catch
- Added graceful shutdown logging

### Known Limitations
- In-memory storage (data lost on restart)
- No retry mechanism for 409 conflicts
- Forward mapping grows unbounded (consider cleanup for long-running instances)
- Bot restart requires manual workflow restart
- No retroactive forwarding when changing target channels
- Delete command only works for messages in forwarding history

### Telegram Bot API Limitations
- **No automatic deletion sync**: Telegram Bot API does not provide events when messages are deleted
- Messages must be deleted manually using `/delete <message_id>` command
- This is a fundamental limitation of Telegram's Bot API, not the application

## Future Enhancements
- Persistent database storage
- Automatic bot restart without workflow restart
- Message filtering rules
- Admin commands (pause/resume)
- Retry logic for transient errors
- Forward mapping cleanup/expiration
- Per-channel statistics
- Retroactive forwarding option when changing channels
- Bulk delete command
