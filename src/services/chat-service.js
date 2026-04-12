const { z } = require("zod");

const { db } = require("../db");

const chatSchema = z.object({
  listingId: z.coerce.number().int(),
  body: z.string().min(1).max(280),
});

function listChats(user) {
  return db.prepare(`
    SELECT
      chats.id,
      chats.listing_id AS listingId,
      listings.title AS listingTitle,
      CASE WHEN ? = chats.landlord_id THEN tenant.name ELSE landlord.name END AS counterpartName,
      (
        SELECT body
        FROM messages
        WHERE messages.chat_id = chats.id
        ORDER BY messages.id DESC
        LIMIT 1
      ) AS lastMessage
    FROM chats
    JOIN listings ON listings.id = chats.listing_id
    JOIN users AS landlord ON landlord.id = chats.landlord_id
    JOIN users AS tenant ON tenant.id = chats.tenant_id
    WHERE chats.landlord_id = ? OR chats.tenant_id = ?
    ORDER BY chats.id DESC
  `).all(user.id, user.id, user.id);
}

function getMessages(user, chatId) {
  const chat = db.prepare("SELECT * FROM chats WHERE id = ?").get(chatId);
  if (!chat) {
    const error = new Error("Chat not found.");
    error.statusCode = 404;
    throw error;
  }
  if (![chat.landlord_id, chat.tenant_id].includes(user.id)) {
    const error = new Error("You are not part of this chat.");
    error.statusCode = 403;
    throw error;
  }

  const messages = db.prepare(`
    SELECT
      messages.id,
      messages.body,
      messages.created_at AS createdAt,
      messages.sender_id AS senderId,
      users.name AS senderName
    FROM messages
    JOIN users ON users.id = messages.sender_id
    WHERE messages.chat_id = ?
    ORDER BY messages.id ASC
  `).all(chatId);

  return { chatId, messages };
}

function createOrReplyToChat(user, payload) {
  const data = chatSchema.parse(payload);
  const listing = db.prepare("SELECT id, landlord_id FROM listings WHERE id = ?").get(data.listingId);
  if (!listing) {
    const error = new Error("Listing not found.");
    error.statusCode = 404;
    throw error;
  }

  let chat;
  if (user.role === "tenant") {
    db.prepare(`
      INSERT INTO chats (listing_id, landlord_id, tenant_id)
      VALUES (?, ?, ?)
      ON CONFLICT(listing_id, tenant_id) DO NOTHING
    `).run(data.listingId, listing.landlord_id, user.id);

    chat = db.prepare("SELECT * FROM chats WHERE listing_id = ? AND tenant_id = ?").get(data.listingId, user.id);
  } else {
    chat = db.prepare("SELECT * FROM chats WHERE listing_id = ? ORDER BY id DESC LIMIT 1").get(data.listingId);
  }

  if (!chat) {
    const error = new Error("No tenant conversation exists for this listing yet.");
    error.statusCode = 400;
    throw error;
  }
  if (![chat.landlord_id, chat.tenant_id].includes(user.id)) {
    const error = new Error("You are not part of this chat.");
    error.statusCode = 403;
    throw error;
  }

  db.prepare("INSERT INTO messages (chat_id, sender_id, body) VALUES (?, ?, ?)").run(chat.id, user.id, data.body);
  return getMessages(user, chat.id);
}

module.exports = { createOrReplyToChat, getMessages, listChats };
