# Telegram Message Forwarding Bot

## Overview
A Node.js/TypeScript Telegram bot that forwards messages between channels with full edit synchronization, message deletion support, and a real-time monitoring dashboard. Supports forwarding to **multiple target channels** (up to 4).

## Features

### Bot Functionality
- **Multi-Channel Forwarding**: Forwards messages to up to 4 target channels simultaneously
- **Message Forwarding**: Automatically forwards all message types (text, photos, videos, documents)
- **Reply Preservation**: When forwarding a reply message, automatically maintains reply chains across all target channels
- **Edit Synchronization**: Syncs message edits across all target channels including formatting (bold, links, etc.)
- **Message Deletion**: Delete forwarded messages using `/delete <message_id>` command
- **Channel & Group Support**: Works with both channel posts and group messages
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Activity Logging**: All operations logged for monitoring
- **Immutable Forward Mapping**: Each message's forward history is preserved regardless of configuration changes

### Dashboard
- **Real-Time Monitoring**: Live statistics updated every 2 seconds
- **Status Cards**: Messages forwarded, edited, deleted, errors, uptime
- **Pause Indicator**: Shows "Paused" badge in header when bot is paused
- **Activity Log**: 
  - Scrollable history of all bot operations
  - **Message Previews**: Shows text content and photo thumbnails for forwarded messages
  - **Delete Button**: Click to delete forwarded messages directly from UI (no channel command needed)
  - Toast notifications with detailed feedback (success/partial/failure)
- **Configuration Panel**: 
  - View source channel ID
  - Configure up to 4 target channels
  - Save channel configuration
  - **Pause/Resume button**: Temporarily stop/resume message forwarding
  - Restart bot button
- **Dark Mode**: Full dark mode support

## Tech Stack

### Backend
- **Node.js** with **TypeScript**
- **Express** for HTTP server
- **Telegraf** for Telegram Bot API
- **PostgreSQL** for data persistence (via Neon)
- **Drizzle ORM** for database operations

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
- Captures message content (text, photos) using Telegram's getFileLink API
- Maintains forward mapping (source→multiple target {chatId, messageId} pairs)
- Preserves formatting entities in edits
- Supports `/delete <message_id>` command for removing forwarded messages
- `deleteForwardedMessage` function: shared deletion logic for bot commands and API
- Logs all operations with per-channel details and message context

### Storage (server/storage.ts & server/postgres-storage.ts)
- **PostgreSQL database** for persistent storage
- Two storage implementations: `MemStorage` (legacy) and `PostgreStorage` (active)
- Bot status tracking (persisted in `bot_stats` table)
- Statistics (forwarded, edited, deleted, errors, uptime)
- Activity logs (stored in `bot_logs` table):
  - Stores message text and photo URLs for preview display
  - `findLog` method for retrieving original FORWARD logs
- **Immutable forward mapping**: Stores `{chatId, messageId}` pairs per source message (in `forward_mapping` table with unique constraint)
- Target channels configuration (stored in `bot_config` table, up to 4 channels)

### API (server/routes.ts)
- `GET /api/stats` - Bot statistics
- `GET /api/logs?limit=50` - Activity history with message content
- `GET /api/config` - Channel configuration (source + target channels array)
- `POST /api/config/channels` - Update target channels
- `POST /api/bot/restart` - Restart bot (requires manual workflow restart)
- `POST /api/messages/delete` - Delete forwarded messages from dashboard
  - Validates parameters with Zod (accepts number or numeric string)
  - Returns 404 for "not found", 200 for all other cases
  - Response includes success flag, counts, and error details

### Dashboard (client/src/pages/Dashboard.tsx)
- Polls API every 2 seconds
- Displays real-time statistics (5 cards including deletions)
- Shows activity log with timestamps and message previews
- Indicates bot running status
- Configuration panel with editable target channels

### Activity Log (client/src/components/ActivityLog.tsx)
- Displays forwarded messages with text and image previews
- Delete button on each FORWARD log entry
- Mutation sends deletion request to API
- Cache invalidation after deletion
- Toast notifications:
  - Success: All channels deleted successfully
  - Warning: Partial deletion (can retry)
  - Error: No deletions successful or not found

## Configuration

### Environment Variables (via Replit Secrets)
- `BOT_TOKEN` - Telegram bot token from @BotFather
- `SOURCE_CHAT_ID` - Source channel/group ID (e.g., -1003141215929)
- `TARGET_CHAT_ID` - Default target channel ID (optional, can be changed via UI)

### Target Channels
- Configure up to 4 target channels via the dashboard
- Each channel is optional (empty fields are skipped)
- Changes are saved to PostgreSQL database (persists across restarts)
- **Important**: Configuration changes only affect NEW messages (see behavior notes)

## Bot Behavior

### Message Forwarding
1. Bot receives message from source channel
2. If message is a reply to another message:
   - Looks up forward mapping for the original message
   - For each target channel, sets `reply_to_message_id` to the corresponding forwarded message ID
   - This preserves reply chains across all target channels
3. Copies message to all configured target channels with reply context
4. Stores **immutable** mapping: `(source chat ID, source message ID)` → array of `{chatId, messageId}` pairs
5. Logs the operation with success count

### Edit Synchronization
1. Bot receives edit update from source channel
2. Looks up stored forward mapping for that specific source message
3. Edits messages in **all original destination channels** (preserved from initial forward)
4. Logs the operation with success count

### Message Deletion

**Two Ways to Delete:**

#### 1. Dashboard UI (Recommended)
1. View Activity Log in the dashboard
2. Find the FORWARD log entry with message preview
3. Click the Delete button
4. Receive toast notification:
   - Success: All channels deleted
   - Warning: Partial deletion (can retry)
   - Error: No deletions successful
5. Statistics and logs update automatically

#### 2. Bot Command (Alternative)
1. Send command `/delete <message_id>` in the source channel
2. Bot validates the command:
   - Missing message ID → increment errors, log error, reply with usage
   - Invalid message ID → increment errors, log error, reply with error
   - Message not found → increment errors, log error, reply with error
3. Bot looks up forwarded messages for that source message ID
4. Deletes from each target channel:
   - Success → increment deleted counter, remove from mapping
   - Failure → increment errors, keep in mapping for retry, log error
5. Updates forward mapping intelligently:
   - All succeed → remove mapping completely
   - Partial → update mapping with only failed entries
   - All fail → keep mapping unchanged
6. Logs overall operation (DELETE or ERROR)
7. Responds with appropriate success/failure message

**Usage example:**
```
/delete 12345
```

**Deletion Behavior:**
- `deleteForwardedMessage` function handles both UI and command deletions
- Deletes from **source channel AND all target channels**
- Tracks `lastDeletedMessageId` (accurate targetMessageId for DELETE log)
- Retrieves original FORWARD log to propagate message context
- DELETE log includes messageText, hasPhoto, photoUrl from original
- `totalDeleted` increments per successfully deleted message, not per command
- Example: 1 source + 4 targets → 4 succeed, 1 fails → counter +4
- Failed deletions increment the `errors` counter
- Partial failures allow retry (failed entries remain in mapping)

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
- **Message Previews** (FORWARD entries only):
  - Text preview (2 lines, truncated)
  - Photo thumbnail (rounded, max 128px height)
  - Delete button for direct removal

## Development Notes

### Recent Changes (November 14, 2025)
- **PostgreSQL migration**: Switched from in-memory storage to persistent database storage
  - Created 4 tables: `bot_logs`, `forward_mapping`, `bot_config`, `bot_stats`
  - Implemented `PostgreStorage` class with Drizzle ORM
  - Added unique constraint on forward_mapping (source_chat_id, source_message_id)
  - Data now persists across restarts (verified with end-to-end tests)
  - All storage methods are now async (Promise-based)
- **Dashboard-based deletion**: Delete forwarded messages directly from Activity Log UI
- **Message previews**: Activity Log shows text content and photo thumbnails
- **Message context capture**: Bot stores messageText, hasPhoto, photoUrl during forwarding
- **DELETE API endpoint**: `/api/messages/delete` with Zod validation and proper error handling
- **Reusable deletion logic**: `deleteForwardedMessage` function shared between bot command and API
- **Enhanced logging**: DELETE logs include complete message context from original FORWARD log
- **Accurate deletion tracking**: Last-deleted targetMessageId and metadata propagation
- **Toast notifications**: Success/partial/failure feedback based on actual deletion results
- **Added delete command**: `/delete <message_id>` to remove forwarded messages from channel
- **Added delete statistics**: New status card showing total deleted messages
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
- No retry mechanism for 409 conflicts
- Forward mapping grows unbounded (consider cleanup for long-running instances)
- Bot restart requires manual workflow restart
- No retroactive forwarding when changing target channels
- Delete command only works for messages in forwarding history
- DELETE API endpoint lacks authentication (internal use only)
- Pause state resets on workflow restart (acceptable for now)

### Telegram Bot API Limitations
- **No automatic deletion sync**: Telegram Bot API does not provide events when messages are deleted
- Messages must be deleted manually using `/delete <message_id>` command
- This is a fundamental limitation of Telegram's Bot API, not the application

## Future Enhancements
- Automatic bot restart without workflow restart
- Message filtering rules
- Retry logic for transient errors
- Forward mapping cleanup/expiration
- Per-channel statistics
- Retroactive forwarding option when changing channels
- Bulk delete command from dashboard
- Authentication for DELETE API endpoint
- Video and document previews in Activity Log
- Database indexes for performance optimization
- Pause state persistence across restarts
