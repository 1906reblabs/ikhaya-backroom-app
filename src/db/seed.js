const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const { uploadsDir } = require("../config/env");

const demoUsers = [
  { role: "landlord", name: "Nomsa Dlamini", phoneNumber: "+27710000001", verificationStatus: "verified" },
  { role: "landlord", name: "Thabo Mokoena", phoneNumber: "+27710000002", verificationStatus: "verified" },
  { role: "tenant", name: "Lebo Khumalo", phoneNumber: "+27710000003", verificationStatus: "verified" },
];

const demoListings = [
  {
    landlordPhone: "+27710000001",
    title: "Sunny backroom in Soweto",
    description: "Clean room with secure gate, prepaid electricity, and quick taxi access.",
    price: 2300,
    deposit: 1200,
    amenities: ["Water included", "Near taxi rank", "Secure gate"],
    locationText: "Orlando East, Soweto",
    latitude: -26.2503,
    longitude: 27.9073,
    places: [
      { type: "taxi_rank", name: "Noord Taxi Rank", distanceKm: 1.4 },
      { type: "school", name: "Orlando High School", distanceKm: 0.8 },
      { type: "workplace", name: "Jabulani Mall", distanceKm: 2.1 },
    ],
    baseColor: "#c9713d",
  },
  {
    landlordPhone: "+27710000002",
    title: "Neat room near Tembisa CBD",
    description: "Private shower, compact yard, and easy commute for students or young workers.",
    price: 2800,
    deposit: 1500,
    amenities: ["Private shower", "Prepaid electricity", "Parking"],
    locationText: "Tembisa, Ekurhuleni",
    latitude: -25.9967,
    longitude: 28.2268,
    places: [
      { type: "taxi_rank", name: "Tembisa Plaza Rank", distanceKm: 0.9 },
      { type: "school", name: "Ekurhuleni East TVET", distanceKm: 1.2 },
      { type: "workplace", name: "Tembisa Hospital", distanceKm: 2.8 },
    ],
    baseColor: "#4a7a68",
  },
  {
    landlordPhone: "+27710000001",
    title: "Affordable cottage room in Mamelodi",
    description: "Budget-friendly stay with water included and enough space for one working adult.",
    price: 1900,
    deposit: 900,
    amenities: ["Electricity included", "Shared bathroom", "Wi-Fi ready"],
    locationText: "Mamelodi East, Tshwane",
    latitude: -25.7163,
    longitude: 28.3569,
    places: [
      { type: "taxi_rank", name: "Mamelodi Taxi Rank", distanceKm: 1.1 },
      { type: "school", name: "Mams Mall College Hub", distanceKm: 1.6 },
      { type: "workplace", name: "Denneboom Station", distanceKm: 3.1 },
    ],
    baseColor: "#6878b8",
  },
];

async function generatePlaceholderImage(filename, background) {
  const filePath = path.join(uploadsDir, filename);
  if (fs.existsSync(filePath)) {
    return filePath;
  }

  const svg = `
  <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="${background}" />
        <stop offset="100%" stop-color="#f4e8d8" />
      </linearGradient>
    </defs>
    <rect width="1200" height="800" fill="url(#g)" />
    <rect x="120" y="160" width="960" height="480" rx="32" fill="rgba(255,255,255,0.78)" />
    <rect x="220" y="230" width="300" height="280" rx="18" fill="rgba(0,0,0,0.12)" />
    <rect x="580" y="230" width="280" height="44" rx="16" fill="rgba(0,0,0,0.12)" />
    <rect x="580" y="302" width="360" height="32" rx="16" fill="rgba(0,0,0,0.1)" />
    <rect x="580" y="356" width="300" height="32" rx="16" fill="rgba(0,0,0,0.1)" />
    <rect x="580" y="448" width="180" height="56" rx="22" fill="rgba(0,0,0,0.15)" />
  </svg>`;

  await sharp(Buffer.from(svg)).jpeg({ quality: 68 }).toFile(filePath);
  return filePath;
}

async function seedDatabase(db) {
  const userCount = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  if (userCount > 0) {
    return;
  }

  const insertUser = db.prepare(`
    INSERT INTO users (role, name, phone_number, verification_status, preferred_language)
    VALUES (@role, @name, @phoneNumber, @verificationStatus, 'en')
  `);

  for (const user of demoUsers) {
    insertUser.run(user);
  }

  const findUser = db.prepare("SELECT id FROM users WHERE phone_number = ?");
  const insertListing = db.prepare(`
    INSERT INTO listings (
      landlord_id, title, description, price, deposit, amenities_json,
      location_text, latitude, longitude, availability_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')
  `);
  const insertImage = db.prepare("INSERT INTO listing_images (listing_id, file_path, alt_text) VALUES (?, ?, ?)");
  const insertPlace = db.prepare("INSERT INTO nearby_places (listing_id, place_type, name, distance_km) VALUES (?, ?, ?, ?)");

  for (let index = 0; index < demoListings.length; index += 1) {
    const listing = demoListings[index];
    const landlord = findUser.get(listing.landlordPhone);
    const result = insertListing.run(
      landlord.id,
      listing.title,
      listing.description,
      listing.price,
      listing.deposit,
      JSON.stringify(listing.amenities),
      listing.locationText,
      listing.latitude,
      listing.longitude,
    );

    const imagePath = await generatePlaceholderImage(`seed-listing-${index + 1}.jpg`, listing.baseColor);
    insertImage.run(result.lastInsertRowid, `/uploads/${path.basename(imagePath)}`, listing.title);

    for (const place of listing.places) {
      insertPlace.run(result.lastInsertRowid, place.type, place.name, place.distanceKm);
    }
  }

  const tenantId = findUser.get("+27710000003").id;
  const landlordId = findUser.get("+27710000001").id;
  const chat = db.prepare("INSERT INTO chats (listing_id, landlord_id, tenant_id) VALUES (1, ?, ?)").run(landlordId, tenantId);
  db.prepare("INSERT INTO messages (chat_id, sender_id, body) VALUES (?, ?, ?)").run(chat.lastInsertRowid, tenantId, "Hi, is this room still available?");
  db.prepare("INSERT INTO messages (chat_id, sender_id, body) VALUES (?, ?, ?)").run(chat.lastInsertRowid, landlordId, "Yes, you can request a viewing for tomorrow.");
  db.prepare("INSERT INTO reviews (reviewer_id, target_user_id, listing_id, rating, comment) VALUES (?, ?, 1, 5, ?)").run(tenantId, landlordId, "Quick replies and the room matched the photos.");
  db.prepare("UPDATE users SET rating = 5, review_count = 1 WHERE id = ?").run(landlordId);
}

module.exports = { seedDatabase };
