# Telegram Message Forwarding Bot

A production-ready Node.js/TypeScript Telegram bot that forwards messages from one source channel to up to 5 target channels with full edit synchronization, message deletion support, and a real-time monitoring dashboard.

![Bot Status](https://img.shields.io/badge/status-production-success)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Node.js](https://img.shields.io/badge/Node.js-20.x-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)

## ✨ Features

### 🤖 Bot Functionality
- **Multi-Channel Forwarding**: Forwards messages to up to 5 target channels simultaneously
- **All Message Types**: Text, photos, videos, documents, and more
- **Reply Chain Preservation**: Maintains reply relationships across all target channels
- **Edit Synchronization**: Syncs message edits (text & captions) across all channels
- **Message Deletion**: Delete messages from source + all targets via dashboard or bot command
- **Pause/Resume**: Temporarily stop forwarding without restarting the bot
- **Automatic Webhook Cleanup**: Resolves 409 conflicts on startup
- **Comprehensive Error Handling**: Per-channel error tracking and logging

### 📊 Web Dashboard
- **Real-Time Monitoring**: Live statistics updated every 2 seconds
- **Activity Log**: Scrollable history with message previews and photo thumbnails
- **One-Click Deletion**: Delete forwarded messages directly from the UI
- **Channel Configuration**: Manage up to 5 target channels
- **Dark Mode Support**: Full dark/light theme switching
- **Toast Notifications**: Detailed feedback for all operations

### 💾 Data Persistence
- **PostgreSQL Database**: All data persists across restarts
- **Immutable Forward Mapping**: Message history preserved regardless of config changes
- **Configuration Storage**: Target channels saved in database

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or higher
- PostgreSQL 15+ database
- Telegram Bot Token ([get one from @BotFather](https://t.me/BotFather))
- Source channel ID and target channel IDs

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd telegram-bot-forwarder
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:

```env
# Telegram Bot Configuration
BOT_TOKEN=your_bot_token_here
SOURCE_CHAT_ID=-1001234567890
TARGET_CHAT_ID=-1009876543210

# Database Configuration (Neon/PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/database

# Session Secret (generate a random string)
SESSION_SECRET=your_random_secret_here
```

4. **Push database schema**
```bash
npm run db:push
```

5. **Start the application**
```bash
npm run dev
```

6. **Access the dashboard**

Open `http://localhost:5000` in your browser.

## 📝 Configuration

### Adding the Bot to Channels

For each channel (source and all targets):

1. Open the channel in Telegram
2. Go to **Settings → Administrators**
3. Click **Add Administrator**
4. Select your bot
5. Grant permissions:
   - ✅ Post Messages
   - ✅ Delete Messages

### Configuring Target Channels

You can configure up to 5 target channels:

**Option 1: Via Dashboard**
1. Open the dashboard at `http://localhost:5000`
2. Scroll to the Configuration panel
3. Enter target channel IDs (format: `-1001234567890`)
4. Click "Save Channels"

**Option 2: Via Environment Variable**
Set `TARGET_CHAT_ID` in your `.env` file (this becomes the default first channel)

## 🎯 Usage

### Message Forwarding

Simply post a message to your source channel. The bot will automatically:
- Forward to all configured target channels
- Preserve reply chains
- Capture message content for dashboard previews

### Editing Messages

Edit any message in the source channel. The bot will:
- Sync text edits to all target channels
- Sync caption edits for media messages
- Log the operation in the dashboard

**Note**: Telegram API doesn't allow changing message type (e.g., adding a photo to text message).

### Deleting Messages

**Option 1: Dashboard (Recommended)**
1. Open the Activity Log
2. Find the message with preview
3. Click the "Delete" button
4. Confirms deletion from source + all targets

**Option 2: Bot Command**
In the source channel, send:
```
/delete <message_id>
```

### Pausing the Bot

Click the "Pause Forwarding" button in the dashboard to temporarily stop message forwarding. Messages sent during pause won't be forwarded. Click "Resume Forwarding" to continue.

## 🏗️ Architecture

### Tech Stack

**Backend**
- Node.js + TypeScript
- Express.js (HTTP server)
- Telegraf (Telegram Bot API)
- PostgreSQL (via Neon)
- Drizzle ORM

**Frontend**
- React + TypeScript
- Wouter (routing)
- TanStack Query (data fetching)
- Shadcn UI + Tailwind CSS

### Database Schema

Four tables:
- `bot_logs` - Activity history with message previews
- `forward_mapping` - Source → target message mappings
- `bot_config` - Target channel configuration
- `bot_stats` - Statistics and bot status

### Key Files

```
├── server/
│   ├── bot.ts              # Telegram bot logic
│   ├── postgres-storage.ts # Database operations
│   ├── routes.ts           # API endpoints
│   └── index.ts            # Server entry point
├── client/src/
│   ├── pages/Dashboard.tsx # Main dashboard
│   ├── components/         # UI components
│   └── App.tsx             # React app
├── shared/
│   └── schema.ts           # Shared TypeScript types & Drizzle schema
└── replit.md               # Detailed technical documentation
```

## 📊 API Endpoints

- `GET /api/stats` - Bot statistics
- `GET /api/logs?limit=50` - Activity logs
- `GET /api/config` - Channel configuration
- `POST /api/config/channels` - Update target channels
- `POST /api/bot/pause` - Pause forwarding
- `POST /api/bot/resume` - Resume forwarding
- `POST /api/messages/delete` - Delete forwarded message

## 🐛 Troubleshooting

### 409 Conflict Error

**Problem**: Bot shows "Another instance is already running"

**Solution**: The bot automatically deletes webhooks on startup. If the error persists:
1. Stop any other bot instances using the same `BOT_TOKEN`
2. Wait 30 seconds
3. Restart the workflow

### Chat Not Found Error

**Problem**: `400: Bad Request: chat not found`

**Solution**: 
1. Verify the channel ID is correct (format: `-1001234567890`)
2. Ensure the bot is added as administrator to the channel
3. Check bot has "Post Messages" permission

### Messages Not Forwarding

**Checklist**:
- ✅ Bot status shows "Running" in dashboard
- ✅ Bot not paused (no "Paused" badge in header)
- ✅ Target channels configured correctly
- ✅ Bot added as admin to all channels
- ✅ Check Activity Log for error messages

## 🔒 Security Notes

- Never commit `.env` files to version control
- Keep your `BOT_TOKEN` secret
- Use environment variables for all sensitive data
- The database credentials should use SSL in production
- Consider adding authentication to the dashboard for production use

## 📄 License

MIT License - feel free to use this project for any purpose.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues and questions, please use the GitHub Issues page.

---

**Built with ❤️ using Node.js, TypeScript, and Telegram Bot API**
