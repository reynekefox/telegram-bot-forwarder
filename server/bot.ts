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
  const targetChannels = (await storage.getTargetChannels()).filter(ch => ch.trim() !== "");

  if (targetChannels.length === 0) {
    console.log("No target channels configured");
    return;
  }

  console.log(`New message in source chat ${sourceChatId} #${sourceMessageId}`);

  // Check if bot is paused
  if (await storage.isPaused()) {
    console.log("Bot is paused, skipping message forwarding");
    return;
  }

  // Check if this message is a reply to another message
  let replyToMapping: Map<string, number> | null = null;
  if (msg.reply_to_message) {
    const replyToMessageId = msg.reply_to_message.message_id;
    console.log(`Message #${sourceMessageId} is a reply to #${replyToMessageId}`);
    
    // Find where the original message was forwarded
    const originalForwarded = await storage.getForwardMapping(sourceChatId, replyToMessageId);
    if (originalForwarded && originalForwarded.length > 0) {
      replyToMapping = new Map();
      for (const { chatId, messageId } of originalForwarded) {
        replyToMapping.set(chatId, messageId);
      }
      console.log(`Found reply mapping: original #${replyToMessageId} -> targets`, Array.from(replyToMapping.entries()));
    } else {
      console.log(`Warning: Reply to #${replyToMessageId} but no forward mapping found`);
    }
  }

  const forwardedMessages: Array<{ chatId: string; messageId: number }> = [];
  let successCount = 0;

  for (const targetChatId of targetChannels) {
    try {
      const copyOptions: any = {};
      
      // If this message is a reply and we have the mapping for this target channel
      if (replyToMapping && replyToMapping.has(targetChatId)) {
        const targetReplyMessageId = replyToMapping.get(targetChatId)!;
        copyOptions.reply_to_message_id = targetReplyMessageId;
        console.log(`Setting reply_to_message_id=${targetReplyMessageId} for ${targetChatId}`);
      }

      const forwarded = await ctx.telegram.copyMessage(
        targetChatId,
        sourceChatId,
        sourceMessageId,
        copyOptions
      );

      forwardedMessages.push({ chatId: targetChatId, messageId: forwarded.message_id });
      successCount++;
      console.log(`Forwarded as #${forwarded.message_id} to ${targetChatId}`);
    } catch (error: any) {
      console.error(`Error forwarding to ${targetChatId}:`, error.message);
      await storage.incrementErrors();

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
    await storage.setForwardMapping(sourceChatId, sourceMessageId, forwardedMessages);
    await storage.incrementForwarded();

    const messageText = msg.text || msg.caption || "";
    const hasPhoto = !!msg.photo;
    let photoUrl = null;

    if (hasPhoto && msg.photo && msg.photo.length > 0) {
      try {
        const largestPhoto = msg.photo[msg.photo.length - 1];
        const fileLink = await ctx.telegram.getFileLink(largestPhoto.file_id);
        photoUrl = fileLink.href;
      } catch (error) {
        console.error("Failed to get photo URL:", error);
      }
    }

    await storage.addLog({
      type: "forward",
      sourceChatId,
      sourceMessageId,
      targetMessageId: forwardedMessages[0]?.messageId || null,
      status: "success",
      message: `Message forwarded to ${successCount} of ${targetChannels.length} channels`,
      messageText,
      hasPhoto,
      photoUrl,
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
  const forwardedMessages = await storage.getForwardMapping(sourceChatId, sourceMessageId);

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
      await storage.incrementErrors();

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
    await storage.incrementEdited();

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

// Helper to delete forwarded messages
async function deleteForwardedMessage(telegram: any, sourceChatId: string, sourceMessageId: number) {
  const forwardedMessages = await storage.getForwardMapping(sourceChatId, sourceMessageId);

  if (!forwardedMessages || forwardedMessages.length === 0) {
    await storage.incrementErrors();
    await storage.addLog({
      type: "error",
      sourceChatId,
      sourceMessageId,
      targetMessageId: null,
      status: "failed",
      message: `Delete command failed: message #${sourceMessageId} not found in forwarding history`,
    });
    return {
      success: false,
      error: "Message not found in forwarding history",
      successCount: 0,
      totalCount: 0,
    };
  }

  const totalCount = forwardedMessages.length + 1; // +1 for source channel
  console.log(`Deleting message #${sourceMessageId} from source and ${forwardedMessages.length} target channels`);

  let successCount = 0;
  let lastDeletedMessageId: number | null = null;
  const remainingMessages: Array<{ chatId: string; messageId: number }> = [];

  // First, delete from source channel
  try {
    await telegram.deleteMessage(sourceChatId, sourceMessageId);
    successCount++;
    lastDeletedMessageId = sourceMessageId;
    await storage.incrementDeleted();
    console.log(`Deleted message #${sourceMessageId} from source channel ${sourceChatId}`);
  } catch (error: any) {
    console.error(`Error deleting from source channel #${sourceMessageId}:`, error.message);
    await storage.incrementErrors();
    
    await storage.addLog({
      type: "error",
      sourceChatId,
      sourceMessageId,
      targetMessageId: sourceMessageId,
      status: "failed",
      message: `Failed to delete from source channel: ${error.message}`,
    });
  }

  // Then delete from all target channels
  for (const { chatId, messageId: targetMessageId } of forwardedMessages) {
    try {
      await telegram.deleteMessage(chatId, targetMessageId);
      successCount++;
      lastDeletedMessageId = targetMessageId;
      await storage.incrementDeleted();
      console.log(`Deleted message #${targetMessageId} from ${chatId}`);
    } catch (error: any) {
      console.error(`Error deleting message #${targetMessageId}:`, error.message);
      await storage.incrementErrors();
      
      remainingMessages.push({ chatId, messageId: targetMessageId });

      await storage.addLog({
        type: "error",
        sourceChatId,
        sourceMessageId,
        targetMessageId,
        status: "failed",
        message: `Failed to delete from target ${chatId}: ${error.message}`,
      });
    }
  }

  if (successCount > 0) {
    if (remainingMessages.length > 0) {
      await storage.setForwardMapping(sourceChatId, sourceMessageId, remainingMessages);
    } else {
      await storage.deleteForwardMapping(sourceChatId, sourceMessageId);
    }
  }

  const originalLog = await storage.findLog(sourceChatId, sourceMessageId, "forward");

  await storage.addLog({
    type: "delete",
    sourceChatId,
    sourceMessageId,
    targetMessageId: lastDeletedMessageId,
    status: successCount > 0 ? "success" : "failed",
    message: `Message deleted from ${successCount} of ${totalCount} channels (source + targets)`,
    messageText: originalLog?.messageText || null,
    hasPhoto: originalLog?.hasPhoto || null,
    photoUrl: originalLog?.photoUrl || null,
  });

  return {
    success: successCount > 0,
    error: successCount === 0 ? "Failed to delete from all channels" : undefined,
    successCount,
    totalCount,
    partialFailure: successCount > 0 && remainingMessages.length > 0,
  };
}

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
    await storage.incrementErrors();
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
    await storage.incrementErrors();
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
  const result = await deleteForwardedMessage(ctx.telegram, sourceChatId, messageId);

  if (!result.success && result.error) {
    await ctx.reply(`❌ ${result.error}`);
  } else if (result.successCount === 0) {
    await ctx.reply(`❌ Failed to delete message #${messageId} from any channels.`);
  } else if (result.partialFailure) {
    await ctx.reply(`⚠️ Message #${messageId} deleted from ${result.successCount} of ${result.totalCount} channels. ${result.totalCount - result.successCount} failed - you can retry.`);
  } else {
    await ctx.reply(`✅ Message #${messageId} deleted from all ${result.successCount} channels.`);
  }
});

// Error handling
bot.catch(async (err: any) => {
  console.error("Bot error:", err);
  await storage.incrementErrors();
  
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
    // Delete any existing webhook to prevent 409 Conflict
    console.log("Clearing webhook...");
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    console.log("Webhook cleared successfully");
    
    // Set status to running before attempting to launch
    await storage.setBotRunning(true);
    
    await bot.launch({
      dropPendingUpdates: true,
    });
    
    console.log("✅ Bot successfully started and running!");
  } catch (error: any) {
    // Set status to not running on any error
    await storage.setBotRunning(false);
    
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
    await storage.setBotRunning(false);
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
    await storage.setBotRunning(false);
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

export { bot, deleteForwardedMessage, SOURCE_CHAT_ID };
