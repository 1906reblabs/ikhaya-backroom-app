const path = require("path");
const sharp = require("sharp");
const { z } = require("zod");

const { uploadsDir } = require("../config/env");
const { db } = require("../db");

const createListingSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().min(20).max(600),
  price: z.coerce.number().int().min(500).max(30000),
  deposit: z.coerce.number().int().min(0).max(30000),
  amenities: z.array(z.string().min(2).max(40)).max(8),
  locationText: z.string().min(3).max(120),
  latitude: z.coerce.number().min(-35).max(-20),
  longitude: z.coerce.number().min(15).max(35),
  nearbyPlaces: z.array(
    z.object({
      type: z.enum(["taxi_rank", "school", "workplace"]),
      name: z.string().min(2).max(80),
      distanceKm: z.coerce.number().min(0).max(50),
    }),
  ).max(6).default([]),
});

function baseListingSelect() {
  return `
    SELECT
      listings.id,
      listings.title,
      listings.description,
      listings.price,
      listings.deposit,
      listings.location_text AS locationText,
      listings.latitude,
      listings.longitude,
      listings.availability_status AS availabilityStatus,
      listings.seen_in_person_count AS seenInPersonCount,
      listings.created_at AS createdAt,
      users.id AS landlordId,
      users.name AS landlordName,
      users.phone_number AS landlordPhoneNumber,
      users.verification_status AS landlordVerificationStatus,
      users.rating AS landlordRating,
      users.review_count AS landlordReviewCount,
      (
        SELECT file_path
        FROM listing_images
        WHERE listing_images.listing_id = listings.id
        ORDER BY listing_images.id ASC
        LIMIT 1
      ) AS heroImage,
      listings.amenities_json AS amenitiesJson
    FROM listings
    JOIN users ON users.id = listings.landlord_id
  `;
}

function hydrateListingRow(row) {
  return {
    ...row,
    amenities: JSON.parse(row.amenitiesJson),
  };
}

function listListings(filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.maxPrice) {
    clauses.push("listings.price <= ?");
    params.push(Number(filters.maxPrice));
  }

  if (filters.location) {
    clauses.push("listings.location_text LIKE ?");
    params.push(`%${filters.location}%`);
  }

  let sql = baseListingSelect();
  if (clauses.length > 0) {
    sql += ` WHERE ${clauses.join(" AND ")}`;
  }
  sql += " ORDER BY users.verification_status DESC, listings.id DESC";

  return db.prepare(sql).all(...params).map(hydrateListingRow).filter((listing) => {
    if (!filters.amenity) {
      return true;
    }
    return listing.amenities.includes(filters.amenity);
  });
}

function getListingById(id, viewerId = null) {
  const row = db.prepare(`${baseListingSelect()} WHERE listings.id = ?`).get(id);
  if (!row) {
    return null;
  }

  const listing = hydrateListingRow(row);
  const images = db.prepare(`
    SELECT id, file_path AS filePath, alt_text AS altText
    FROM listing_images
    WHERE listing_id = ?
    ORDER BY id ASC
  `).all(id);

  const nearbyPlaces = db.prepare(`
    SELECT place_type AS type, name, distance_km AS distanceKm
    FROM nearby_places
    WHERE listing_id = ?
    ORDER BY distance_km ASC
  `).all(id);

  const reviews = db.prepare(`
    SELECT reviews.id, reviews.rating, reviews.comment, reviews.created_at AS createdAt, users.name AS reviewerName
    FROM reviews
    JOIN users ON users.id = reviews.reviewer_id
    WHERE target_user_id = ?
    ORDER BY reviews.id DESC
    LIMIT 5
  `).all(listing.landlordId);

  const interest = viewerId ? db.prepare(`
    SELECT seen_in_person AS seenInPerson
    FROM interests
    WHERE listing_id = ? AND tenant_id = ?
  `).get(id, viewerId) : null;

  return {
    ...listing,
    images,
    nearbyPlaces,
    reviews,
    interest,
    whatsappLink: `https://wa.me/${listing.landlordPhoneNumber.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${listing.landlordName}, I saw your Ikhaya listing: ${listing.title}`)}`,
  };
}

function createListing(user, payload) {
  const data = createListingSchema.parse(payload);
  const result = db.prepare(`
    INSERT INTO listings (
      landlord_id, title, description, price, deposit, amenities_json,
      location_text, latitude, longitude, availability_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')
  `).run(
    user.id,
    data.title,
    data.description,
    data.price,
    data.deposit,
    JSON.stringify(data.amenities),
    data.locationText,
    data.latitude,
    data.longitude,
  );

  for (const place of data.nearbyPlaces) {
    db.prepare("INSERT INTO nearby_places (listing_id, place_type, name, distance_km) VALUES (?, ?, ?, ?)").run(
      result.lastInsertRowid,
      place.type,
      place.name,
      place.distanceKm,
    );
  }

  return getListingById(result.lastInsertRowid, user.id);
}

async function attachListingImage(user, listingId, file) {
  const listing = db.prepare("SELECT id, landlord_id FROM listings WHERE id = ?").get(listingId);
  if (!listing) {
    const error = new Error("Listing not found.");
    error.statusCode = 404;
    throw error;
  }
  if (listing.landlord_id !== user.id) {
    const error = new Error("You can only upload images for your own listings.");
    error.statusCode = 403;
    throw error;
  }

  const filename = `${listingId}-${Date.now()}${path.extname(file.originalname) || ".jpg"}`;
  const outputPath = path.join(uploadsDir, filename);

  await sharp(file.buffer)
    .resize({ width: 1200, height: 900, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 68, mozjpeg: true })
    .toFile(outputPath);

  db.prepare("INSERT INTO listing_images (listing_id, file_path, alt_text) VALUES (?, ?, ?)").run(
    listingId,
    `/uploads/${filename}`,
    `Listing ${listingId} image`,
  );

  return getListingById(listingId, user.id);
}

module.exports = { attachListingImage, createListing, getListingById, listListings };
