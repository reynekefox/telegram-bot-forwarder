import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { storage } from "./storage";

const BOT_TOKEN = process.env.BOT_TOKEN!;
const SOURCE_CHAT_ID = process.env.SOURCE_CHAT_ID!;

if (!BOT_TOKEN || !SOURCE_CHAT_ID) {
  console.error("Missing required environment variables: BOT_TOKEN, SOURCE_CHAT_ID");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

console.log(`Bot configured to forward from ${SOURCE_CHAT_ID}`);

// Helper to forward message to multiple targets
async function forwardMessage(ctx: any) {
  const sourceChatId = ctx.chat.id.toString();
  const msg = ctx.message || ctx.channelPost;
  
  if (!msg) {
    console.error("No message or channelPost found in context");
    return;
  }

  const sourceMessageId = msg.message_id;
  const targetChannels = storage.getTargetChannels().filter(ch => ch.trim() !== "");

  if (targetChannels.length === 0) {
    console.log("No target channels configured");
    return;
  }

  console.log(`New message in source chat ${sourceChatId} #${sourceMessageId}`);

  const forwardedMessages: Array<{ chatId: string; messageId: number }> = [];
  let successCount = 0;

  for (const targetChatId of targetChannels) {
    try {
      const forwarded = await ctx.telegram.copyMessage(
        targetChatId,
        sourceChatId,
        sourceMessageId
      );

      forwardedMessages.push({ chatId: targetChatId, messageId: forwarded.message_id });
      successCount++;
      console.log(`Forwarded as #${forwarded.message_id} to ${targetChatId}`);
    } catch (error: any) {
      console.error(`Error forwarding to ${targetChatId}:`, error.message);
      storage.incrementErrors();

      await storage.addLog({
        type: "error",
        sourceChatId,
        sourceMessageId,
        targetMessageId: null,
        status: "failed",
        message: `Failed to forward to ${targetChatId}: ${error.message}`,
      });
    }
  }

  if (successCount > 0) {
    storage.setForwardMapping(sourceChatId, sourceMessageId, forwardedMessages);
    storage.incrementForwarded();

    await storage.addLog({
      type: "forward",
      sourceChatId,
      sourceMessageId,
      targetMessageId: forwardedMessages[0]?.messageId || null,
      status: "success",
      message: `Message forwarded to ${successCount} of ${targetChannels.length} channels`,
    });
  }
}

// Helper to edit forwarded messages in multiple targets
async function editForwardedMessage(ctx: any) {
  const sourceChatId = ctx.chat.id.toString();
  const editedMsg = ctx.editedMessage || ctx.editedChannelPost;
  
  if (!editedMsg) {
    console.error("No editedMessage or editedChannelPost found in context");
    return;
  }

  const sourceMessageId = editedMsg.message_id;
  const forwardedMessages = storage.getForwardMapping(sourceChatId, sourceMessageId);

  if (!forwardedMessages || forwardedMessages.length === 0) {
    console.log(`No forwarded messages found for edited #${sourceMessageId}`);
    return;
  }
  
  console.log(`Editing ${forwardedMessages.length} forwarded messages (src #${sourceMessageId})`);

  let successCount = 0;

  for (const { chatId, messageId } of forwardedMessages) {
    try {
      if (editedMsg.text) {
        await ctx.telegram.editMessageText(
          chatId,
          messageId,
          undefined,
          editedMsg.text,
          {
            entities: editedMsg.entities,
          }
        );
      } else if (editedMsg.caption) {
        await ctx.telegram.editMessageCaption(
          chatId,
          messageId,
          undefined,
          editedMsg.caption,
          {
            caption_entities: editedMsg.caption_entities,
          }
        );
      }

      successCount++;
      console.log(`Edit synchronized for message #${messageId} in ${chatId}`);
    } catch (error: any) {
      console.error(`Error editing message #${messageId}:`, error.message);
      storage.incrementErrors();

      await storage.addLog({
        type: "error",
        sourceChatId,
        sourceMessageId,
        targetMessageId: messageId,
        status: "failed",
        message: `Failed to edit in ${chatId}: ${error.message}`,
      });
    }
  }

  if (successCount > 0) {
    storage.incrementEdited();

    await storage.addLog({
      type: "edit",
      sourceChatId,
      sourceMessageId,
      targetMessageId: forwardedMessages[0]?.messageId || null,
      status: "success",
      message: `Edit synchronized in ${successCount} of ${forwardedMessages.length} channels`,
    });
  }
}

// Handle new messages from source chat
bot.on(message(), async (ctx) => {
  if (ctx.chat.id.toString() === SOURCE_CHAT_ID) {
    await forwardMessage(ctx);
  }
});

// Handle channel posts from source chat
bot.on("channel_post", async (ctx) => {
  if (ctx.chat.id.toString() === SOURCE_CHAT_ID) {
    await forwardMessage(ctx);
  }
});

// Handle edited messages
bot.on("edited_message", async (ctx) => {
  if (ctx.chat.id.toString() === SOURCE_CHAT_ID) {
    await editForwardedMessage(ctx);
  }
});

// Handle edited channel posts
bot.on("edited_channel_post", async (ctx) => {
  if (ctx.chat.id.toString() === SOURCE_CHAT_ID) {
    await editForwardedMessage(ctx);
  }
});

// Handle delete command
bot.command("delete", async (ctx) => {
  if (ctx.chat.id.toString() !== SOURCE_CHAT_ID) {
    return;
  }

  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    storage.incrementErrors();
    await storage.addLog({
      type: "error",
      sourceChatId: ctx.chat.id.toString(),
      sourceMessageId: 0,
      targetMessageId: null,
      status: "failed",
      message: "Delete command failed: missing message ID",
    });
    await ctx.reply("Usage: /delete <message_id>\nExample: /delete 12345");
    return;
  }

  const messageId = parseInt(args[1]);
  if (isNaN(messageId)) {
    storage.incrementErrors();
    await storage.addLog({
      type: "error",
      sourceChatId: ctx.chat.id.toString(),
      sourceMessageId: 0,
      targetMessageId: null,
      status: "failed",
      message: `Delete command failed: invalid message ID "${args[1]}"`,
    });
    await ctx.reply("Invalid message ID. Please provide a numeric message ID.");
    return;
  }

  const sourceChatId = ctx.chat.id.toString();
  const forwardedMessages = storage.getForwardMapping(sourceChatId, messageId);

  if (!forwardedMessages || forwardedMessages.length === 0) {
    storage.incrementErrors();
    await storage.addLog({
      type: "error",
      sourceChatId,
      sourceMessageId: messageId,
      targetMessageId: null,
      status: "failed",
      message: `Delete command failed: message #${messageId} not found in forwarding history`,
    });
    await ctx.reply(`Message #${messageId} not found in forwarding history.`);
    return;
  }

  console.log(`Deleting ${forwardedMessages.length} forwarded messages (src #${messageId})`);

  let successCount = 0;
  const remainingMessages: Array<{ chatId: string; messageId: number }> = [];

  for (const { chatId, messageId: targetMessageId } of forwardedMessages) {
    try {
      await ctx.telegram.deleteMessage(chatId, targetMessageId);
      successCount++;
      storage.incrementDeleted();
      console.log(`Deleted message #${targetMessageId} from ${chatId}`);
    } catch (error: any) {
      console.error(`Error deleting message #${targetMessageId}:`, error.message);
      storage.incrementErrors();
      
      // Keep this message in the mapping for future retry
      remainingMessages.push({ chatId, messageId: targetMessageId });

      await storage.addLog({
        type: "error",
        sourceChatId,
        sourceMessageId: messageId,
        targetMessageId,
        status: "failed",
        message: `Failed to delete from ${chatId}: ${error.message}`,
      });
    }
  }

  // Update mapping: keep only messages that failed to delete
  if (successCount > 0) {
    if (remainingMessages.length > 0) {
      storage.setForwardMapping(sourceChatId, messageId, remainingMessages);
    } else {
      // All deletions succeeded - remove mapping completely
      storage.deleteForwardMapping(sourceChatId, messageId);
    }
  }

  // Log the delete operation
  await storage.addLog({
    type: "delete",
    sourceChatId,
    sourceMessageId: messageId,
    targetMessageId: forwardedMessages[0]?.messageId || null,
    status: successCount > 0 ? "success" : "failed",
    message: `Message deleted from ${successCount} of ${forwardedMessages.length} channels`,
  });

  // Send user feedback
  if (successCount === 0) {
    await ctx.reply(`❌ Failed to delete message #${messageId} from any channels.`);
  } else if (remainingMessages.length > 0) {
    await ctx.reply(`⚠️ Message #${messageId} deleted from ${successCount} of ${forwardedMessages.length} channels. ${remainingMessages.length} failed - you can retry.`);
  } else {
    await ctx.reply(`✅ Message #${messageId} deleted from all ${successCount} channels.`);
  }
});

// Error handling
bot.catch(async (err: any) => {
  console.error("Bot error:", err);
  storage.incrementErrors();
  
  await storage.addLog({
    type: "error",
    sourceChatId: "system",
    sourceMessageId: 0,
    targetMessageId: null,
    status: "failed",
    message: `Bot runtime error: ${err.message || String(err)}`,
  });
});

export async function startBot() {
  console.log("Starting bot with long polling...");
  
  try {
    // Set status to running before attempting to launch
    storage.setBotRunning(true);
    
    await bot.launch({
      dropPendingUpdates: true,
    });
    
    console.log("✅ Bot successfully started and running!");
  } catch (error: any) {
    // Set status to not running on any error
    storage.setBotRunning(false);
    
    if (error.response?.error_code === 409) {
      console.error("\n⚠️  ERROR: Another bot instance is already running!");
      console.error("Please stop any other instances of this bot before starting a new one.");
      console.error("This could be:");
      console.error("  - Your Python bot running in another terminal");
      console.error("  - A previous instance that hasn't fully stopped yet");
      console.error("\nThe application will continue running, but message forwarding won't work until the conflict is resolved.\n");
      
      await storage.addLog({
        type: "error",
        sourceChatId: "system",
        sourceMessageId: 0,
        targetMessageId: null,
        status: "failed",
        message: "Bot startup failed: Another instance is already running (409 Conflict)",
      });
    } else {
      console.error("Error starting bot:", error.message);
      await storage.addLog({
        type: "error",
        sourceChatId: "system",
        sourceMessageId: 0,
        targetMessageId: null,
        status: "failed",
        message: `Bot startup failed: ${error.message}`,
      });
      throw error;
    }
  }

  // Enable graceful stop
  process.once("SIGINT", async () => {
    console.log("Stopping bot (SIGINT)...");
    storage.setBotRunning(false);
    await storage.addLog({
      type: "error",
      sourceChatId: "system",
      sourceMessageId: 0,
      targetMessageId: null,
      status: "stopped",
      message: "Bot stopped gracefully (SIGINT)",
    });
    bot.stop("SIGINT");
  });
  process.once("SIGTERM", async () => {
    console.log("Stopping bot (SIGTERM)...");
    storage.setBotRunning(false);
    await storage.addLog({
      type: "error",
      sourceChatId: "system",
      sourceMessageId: 0,
      targetMessageId: null,
      status: "stopped",
      message: "Bot stopped gracefully (SIGTERM)",
    });
    bot.stop("SIGTERM");
  });
}

export { bot };
