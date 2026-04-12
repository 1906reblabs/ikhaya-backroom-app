const { z } = require("zod");

const { db } = require("../db");
const { getListingById } = require("./listing-service");

const reviewSchema = z.object({
  targetUserId: z.coerce.number().int(),
  listingId: z.coerce.number().int().optional(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(8).max(240),
});

const reportSchema = z.object({
  reason: z.string().min(4).max(240),
});

const interestSchema = z.object({
  seenInPerson: z.boolean().default(false),
});

const viewingSchema = z.object({
  requestedFor: z.string().min(4).max(120),
  notes: z.string().max(240).default(""),
});

function submitReview(user, payload) {
  const data = reviewSchema.parse(payload);
  db.prepare("INSERT INTO reviews (reviewer_id, target_user_id, listing_id, rating, comment) VALUES (?, ?, ?, ?, ?)").run(
    user.id,
    data.targetUserId,
    data.listingId || null,
    data.rating,
    data.comment,
  );

  const stats = db.prepare(`
    SELECT ROUND(AVG(rating), 2) AS rating, COUNT(*) AS reviewCount
    FROM reviews
    WHERE target_user_id = ?
  `).get(data.targetUserId);

  db.prepare("UPDATE users SET rating = ?, review_count = ? WHERE id = ?").run(
    stats.rating || 0,
    stats.reviewCount || 0,
    data.targetUserId,
  );

  return { success: true };
}

function reportListing(user, listingId, payload) {
  const data = reportSchema.parse(payload);
  db.prepare("INSERT INTO reports (listing_id, reporter_id, reason) VALUES (?, ?, ?)").run(listingId, user.id, data.reason);
  return { success: true };
}

function registerInterest(user, listingId, payload) {
  const data = interestSchema.parse(payload);
  db.prepare(`
    INSERT INTO interests (listing_id, tenant_id, seen_in_person)
    VALUES (?, ?, ?)
    ON CONFLICT(listing_id, tenant_id)
    DO UPDATE SET seen_in_person = excluded.seen_in_person
  `).run(listingId, user.id, data.seenInPerson ? 1 : 0);

  const seenCount = db.prepare("SELECT COUNT(*) AS count FROM interests WHERE listing_id = ? AND seen_in_person = 1").get(listingId).count;
  db.prepare("UPDATE listings SET seen_in_person_count = ? WHERE id = ?").run(seenCount, listingId);

  return getListingById(listingId, user.id);
}

function requestViewing(user, listingId, payload) {
  const data = viewingSchema.parse(payload);
  db.prepare("INSERT INTO viewing_requests (listing_id, tenant_id, requested_for, notes) VALUES (?, ?, ?, ?)").run(
    listingId,
    user.id,
    data.requestedFor,
    data.notes,
  );
  return { success: true };
}

module.exports = { registerInterest, reportListing, requestViewing, submitReview };
