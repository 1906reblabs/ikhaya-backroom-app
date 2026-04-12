const state = {
  token: localStorage.getItem("ikhaya-token") || "",
  user: null,
  listings: [],
  selectedListing: null,
  chats: [],
  route: "home",
  filters: { maxPrice: "", location: "", amenity: "" },
};

const app = document.querySelector("#app");
const amenityOptions = ["Electricity included", "Private shower", "Prepaid electricity", "Parking", "Wi-Fi ready", "Near taxi rank", "Secure gate"];

const currency = (amount) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(amount || 0);
const escapeHtml = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!options.bodyIsForm) headers["Content-Type"] = "application/json";
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(path, { ...options, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "Request failed." }));
    throw new Error(payload.error || "Request failed.");
  }
  return response.json();
}

async function bootstrap() {
  const [session, listingPayload] = await Promise.all([api("/api/session"), api(`/api/listings?${new URLSearchParams(state.filters)}`)]);
  state.user = session.user;
  state.listings = listingPayload.listings;
  if (state.user) state.chats = (await api("/api/chats")).chats;
  render();
}

function toast(message, isError = false) {
  document.querySelector(".toast")?.remove();
  const node = document.createElement("div");
  node.className = "card toast";
  Object.assign(node.style, {
    position: "fixed", top: "18px", left: "50%", transform: "translateX(-50%)", zIndex: "1000", maxWidth: "320px",
    background: isError ? "rgba(180,67,56,0.96)" : "rgba(14,122,95,0.96)", color: "white",
  });
  node.textContent = message;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 2500);
}

function listingCard(listing) {
  return `<article class="card listing-card">
    <img class="listing-image" loading="lazy" src="${listing.heroImage || ""}" alt="${escapeHtml(listing.title)}" />
    <div class="listing-body stack">
      <div class="chip-row">
        <span class="chip ${listing.landlordVerificationStatus === "verified" ? "chip-verified" : ""}">${listing.landlordVerificationStatus === "verified" ? "Verified landlord" : "Pending verification"}</span>
        <span class="chip chip-warm">${escapeHtml(listing.locationText)}</span>
      </div>
      <div>
        <h3 class="listing-title">${escapeHtml(listing.title)}</h3>
        <div class="price">${currency(listing.price)} <span class="text-muted">/ month</span></div>
        <div class="meta">Deposit ${currency(listing.deposit)} • ${escapeHtml(listing.landlordName)}</div>
      </div>
      <div class="chip-row">${listing.amenities.slice(0, 3).map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("")}</div>
      <button class="btn btn-primary" data-action="open-listing" data-id="${listing.id}">View details</button>
    </div>
  </article>`;
}

function homeView() {
  return `<section class="hero">
    <div class="hero-grid">
      <div class="stack">
        <span class="chip chip-warm">Gauteng backrooms, made safer</span>
        <h1>Find trusted rooms without wasting data.</h1>
        <p>Search verified landlords, compare prices, and chat only when you’re ready.</p>
        <div class="quick-actions">
          <button class="btn btn-primary" data-action="nav" data-route="search">Start search</button>
          <button class="btn btn-secondary" data-action="nav" data-route="profile">Login with phone</button>
        </div>
      </div>
      <div class="list-grid">
        <div class="mini-stat"><strong>${state.listings.length}</strong><span>live listings</span></div>
        <div class="mini-stat"><strong>68%</strong><span>smaller images</span></div>
        <div class="mini-stat"><strong>3 taps</strong><span>to contact landlord</span></div>
        <div class="mini-stat"><strong>3 languages</strong><span>ready to scale</span></div>
      </div>
    </div>
  </section>
  <section class="section"><h2 class="section-title">Quick picks</h2><div class="list-grid">${state.listings.slice(0, 3).map(listingCard).join("")}</div></section>`;
}

function searchView() {
  return `<section class="section"><div class="card card-strong">
    <h2 class="section-title">Search rentals</h2>
    <form id="filters-form" class="filter-grid">
      <div class="field"><label class="field-label" for="maxPrice">Max monthly rent</label><input class="input" id="maxPrice" name="maxPrice" type="number" value="${state.filters.maxPrice}" /></div>
      <div class="field"><label class="field-label" for="location">Area</label><input class="input" id="location" name="location" value="${escapeHtml(state.filters.location)}" /></div>
      <div class="field"><label class="field-label" for="amenity">Amenity</label><select class="select" id="amenity" name="amenity"><option value="">Any</option>${amenityOptions.map((item) => `<option value="${item}" ${state.filters.amenity === item ? "selected" : ""}>${item}</option>`).join("")}</select></div>
      <div class="field" style="align-self:end;"><button class="btn btn-primary" type="submit">Update results</button></div>
    </form></div></section>
    <section class="section"><h2 class="section-title">List view</h2><div class="list-grid">${state.listings.length ? state.listings.map(listingCard).join("") : '<div class="card">No listings found yet.</div>'}</div></section>
    <section class="section"><h2 class="section-title">Map view</h2><div class="card map-card">${state.listings.map((listing, index) => `<button class="map-pin" data-action="open-listing" data-id="${listing.id}" style="left:${18 + ((index * 21) % 60)}%;top:${25 + ((index * 17) % 52)}%">${currency(listing.price)}</button>`).join("")}</div></section>`;
}

function authMarkup() {
  return `<div class="notice">Use the demo OTP code <strong>123456</strong>.</div>
  <form id="auth-form" class="filter-grid" style="margin-top:12px;">
    <div class="field"><label class="field-label" for="role">I am a</label><select class="select" id="role" name="role"><option value="tenant">Tenant</option><option value="landlord">Landlord</option></select></div>
    <div class="field"><label class="field-label" for="name">Name</label><input class="input" id="name" name="name" required /></div>
    <div class="field"><label class="field-label" for="phoneNumber">Phone number</label><input class="input" id="phoneNumber" name="phoneNumber" required placeholder="+2771..." /></div>
    <div class="field"><label class="field-label" for="code">OTP</label><input class="input" id="code" name="code" required value="123456" /></div>
    <button class="btn btn-primary" type="submit">Login</button>
  </form>`;
}

function listingDetailView() {
  const listing = state.selectedListing;
  if (!listing) return '<section class="section"><div class="card">Select a listing to continue.</div></section>';
  return `<section class="section details-grid">
    <div class="stack">
      <div class="card detail-hero"><img class="listing-image" src="${listing.images[0]?.filePath || listing.heroImage || ""}" alt="${escapeHtml(listing.title)}" /></div>
      <div class="card">
        <div class="chip-row">
          <span class="chip ${listing.landlordVerificationStatus === "verified" ? "chip-verified" : ""}">${listing.landlordVerificationStatus === "verified" ? "Verified landlord" : "Pending verification"}</span>
          <span class="chip chip-warm">${escapeHtml(listing.locationText)}</span>
          <span class="chip">${listing.seenInPersonCount} seen in person</span>
        </div>
        <h2 class="section-title" style="margin-top:10px;">${escapeHtml(listing.title)}</h2>
        <div class="price">${currency(listing.price)} <span class="text-muted">/ month</span></div>
        <p class="text-muted">Deposit ${currency(listing.deposit)} • ${escapeHtml(listing.description)}</p>
        <div class="chip-row">${listing.amenities.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("")}</div>
      </div>
      <div class="card"><h3>Nearby</h3><div class="stack">${listing.nearbyPlaces.map((place) => `<div>${place.type.replace("_", " ")} • ${escapeHtml(place.name)} • ${place.distanceKm} km</div>`).join("")}</div></div>
    </div>
    <div class="stack">
      <div class="card">
        <h3>${escapeHtml(listing.landlordName)}</h3>
        <div class="meta">${listing.landlordReviewCount} reviews • rating ${listing.landlordRating || 0}</div>
        <div class="quick-actions" style="margin-top:12px;">
          <a class="btn btn-primary" style="display:grid;place-items:center;text-decoration:none;" href="${listing.whatsappLink}" target="_blank" rel="noreferrer">WhatsApp</a>
          <button class="btn btn-ghost" data-action="start-chat" data-id="${listing.id}">In-app chat</button>
        </div>
        ${state.user?.role === "tenant" ? `<div class="stack" style="margin-top:14px;">
          <button class="btn btn-primary" data-action="interest" data-id="${listing.id}">I'm interested</button>
          <button class="btn btn-ghost" data-action="interest-seen" data-id="${listing.id}">Seen in person</button>
          <button class="btn btn-secondary" style="color:var(--brand-deep);border-color:var(--line);" data-action="request-viewing" data-id="${listing.id}">Request viewing</button>
          <button class="btn btn-danger" data-action="report" data-id="${listing.id}">Report listing</button>
        </div>` : '<div class="notice" style="margin-top:12px;">Login as a tenant to express interest or request a viewing.</div>'}
      </div>
      <div class="card"><h3>Reviews</h3><div class="stack">${listing.reviews.length ? listing.reviews.map((review) => `<div class="card"><strong>${"★".repeat(review.rating)}</strong><div>${escapeHtml(review.comment)}</div><div class="meta">${escapeHtml(review.reviewerName)}</div></div>`).join("") : '<div class="card">No reviews yet.</div>'}</div></div>
    </div>
  </section>`;
}

function profileView() {
  return `<section class="section profile-grid">
    <div class="card card-strong">
      <h2 class="section-title">Profile</h2>
      ${state.user ? `<div class="stack"><div><strong>${escapeHtml(state.user.name)}</strong></div><div class="meta">${state.user.role} • ${escapeHtml(state.user.phone_number)}</div><div class="chip-row"><span class="chip">${escapeHtml(state.user.preferred_language.toUpperCase())}</span><span class="chip ${state.user.verification_status === "verified" ? "chip-verified" : ""}">${escapeHtml(state.user.verification_status)}</span></div><button class="btn btn-danger" data-action="logout">Logout</button></div>` : authMarkup()}
    </div>
    <div class="stack">
      ${state.user?.role === "landlord" ? `<div class="card"><h3>Create listing</h3><form id="listing-form" class="form-grid" style="margin-top:12px;">
        <div class="field"><label class="field-label" for="title">Title</label><input class="input" id="title" name="title" required /></div>
        <div class="field"><label class="field-label" for="locationText">Location</label><input class="input" id="locationText" name="locationText" required /></div>
        <div class="split" style="grid-column:1 / -1;"><div class="field"><label class="field-label" for="price">Price</label><input class="input" id="price" name="price" type="number" required /></div><div class="field"><label class="field-label" for="deposit">Deposit</label><input class="input" id="deposit" name="deposit" type="number" required /></div></div>
        <div class="split" style="grid-column:1 / -1;"><div class="field"><label class="field-label" for="latitude">Latitude</label><input class="input" id="latitude" name="latitude" type="number" step="0.0001" value="-26.2041" required /></div><div class="field"><label class="field-label" for="longitude">Longitude</label><input class="input" id="longitude" name="longitude" type="number" step="0.0001" value="28.0473" required /></div></div>
        <div class="field" style="grid-column:1 / -1;"><label class="field-label" for="description">Description</label><textarea class="textarea" id="description" name="description" required></textarea></div>
        <div class="field" style="grid-column:1 / -1;"><label class="field-label" for="amenities">Amenities</label><input class="input" id="amenities" name="amenities" placeholder="Comma-separated amenities" /></div>
        <div class="field" style="grid-column:1 / -1;"><label class="field-label" for="listingImage">Image</label><input class="input" id="listingImage" name="listingImage" type="file" accept="image/*" /></div>
        <button class="btn btn-primary" type="submit" style="grid-column:1 / -1;">Save listing</button></form></div>` : '<div class="card">Landlords can add new listings here after logging in.</div>'}
      ${state.user?.role === "tenant" ? `<div class="card"><h3>Leave a landlord review</h3><form id="review-form" class="filter-grid" style="margin-top:12px;">
        <div class="field"><label class="field-label" for="targetUserId">Landlord ID</label><input class="input" id="targetUserId" name="targetUserId" type="number" required /></div>
        <div class="field"><label class="field-label" for="rating">Rating</label><select class="select" id="rating" name="rating"><option value="5">5</option><option value="4">4</option><option value="3">3</option></select></div>
        <div class="field" style="grid-column:1 / -1;"><label class="field-label" for="comment">Comment</label><textarea class="textarea" id="comment" name="comment" required></textarea></div>
        <button class="btn btn-primary" type="submit">Submit review</button></form></div>` : '<div class="card">Tenants can leave reviews here after logging in.</div>'}
    </div>
  </section>`;
}

function chatsView() {
  return `<section class="section details-grid">
    <div class="card"><h2 class="section-title">Chats</h2>${!state.user ? '<div class="notice">Login to use in-app chat.</div>' : `<div class="chat-list">${state.chats.length ? state.chats.map((chat) => `<button class="card" style="text-align:left;background:rgba(255,255,255,0.7);" data-action="open-chat" data-id="${chat.id}"><strong>${escapeHtml(chat.counterpartName)}</strong><div>${escapeHtml(chat.listingTitle)}</div><div class="meta">${escapeHtml(chat.lastMessage || "No messages yet")}</div></button>`).join("") : '<div class="card">No chats yet. Open a listing and start one.</div>'}</div>`}</div>
    <div class="card" id="chat-panel"><div class="notice">Choose a conversation to read messages.</div></div>
  </section>`;
}

function shell(content) {
  const navItems = [["home", "Home", "⌂"], ["search", "Search", "◫"], ["chats", "Chats", "✉"], ["profile", "Profile", "☺"]];
  return `<main class="shell">${content}</main><div class="nav-wrap"><nav class="nav">${navItems.map(([route, label, glyph]) => `<button class="${state.route === route ? "active" : ""}" data-action="nav" data-route="${route}"><span>${glyph}</span><span class="nav-label">${label}</span></button>`).join("")}</nav></div>`;
}

function render() {
  const views = { home: homeView(), search: searchView(), listing: listingDetailView(), chats: chatsView(), profile: profileView() };
  app.innerHTML = shell(views[state.route] || homeView());
}

document.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action, route, id } = target.dataset;
  try {
    if (action === "nav") { state.route = route; render(); }
    if (action === "open-listing") { state.selectedListing = (await api(`/api/listings/${id}`)).listing; state.route = "listing"; render(); }
    if (action === "logout") { localStorage.removeItem("ikhaya-token"); state.token = ""; state.user = null; state.chats = []; state.route = "home"; await bootstrap(); toast("Logged out."); }
    if (action === "interest" || action === "interest-seen") { state.selectedListing = (await api(`/api/listings/${id}/interest`, { method: "POST", body: JSON.stringify({ seenInPerson: action === "interest-seen" }) })).listing; render(); toast(action === "interest-seen" ? "Marked as seen in person." : "Interest saved."); }
    if (action === "request-viewing") { const requestedFor = prompt("When would you like to view?"); if (!requestedFor) return; await api(`/api/listings/${id}/view-request`, { method: "POST", body: JSON.stringify({ requestedFor, notes: "" }) }); toast("Viewing request sent."); }
    if (action === "report") { const reason = prompt("Why are you reporting this listing?"); if (!reason) return; await api(`/api/listings/${id}/report`, { method: "POST", body: JSON.stringify({ reason }) }); toast("Report submitted."); }
    if (action === "start-chat") { const body = prompt("Send a first message"); if (!body) return; await api("/api/chats", { method: "POST", body: JSON.stringify({ listingId: Number(id), body }) }); state.chats = (await api("/api/chats")).chats; state.route = "chats"; render(); toast("Chat started."); }
    if (action === "open-chat") {
      const payload = await api(`/api/chats/${id}/messages`);
      document.querySelector("#chat-panel").innerHTML = `<h3>Messages</h3><div class="messages">${payload.messages.map((message) => `<div class="message ${message.senderId === state.user.id ? "mine" : "theirs"}"><strong>${escapeHtml(message.senderName)}</strong><div>${escapeHtml(message.body)}</div></div>`).join("")}</div><form id="message-form" class="filter-grid" data-chat-id="${id}" style="margin-top:14px;"><textarea class="textarea" name="body" placeholder="Type your message"></textarea><button class="btn btn-primary" type="submit">Send</button></form>`;
    }
  } catch (error) { toast(error.message, true); }
});

document.addEventListener("submit", async (event) => {
  try {
    if (event.target.id === "auth-form") {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(event.target).entries());
      await api("/api/auth/request-otp", { method: "POST", body: JSON.stringify(payload) });
      const result = await api("/api/auth/verify-otp", { method: "POST", body: JSON.stringify(payload) });
      state.token = result.token; state.user = result.user; localStorage.setItem("ikhaya-token", result.token); state.chats = (await api("/api/chats")).chats; state.route = "home"; render(); toast(`Welcome, ${result.user.name}.`);
    }
    if (event.target.id === "filters-form") {
      event.preventDefault();
      state.filters = Object.fromEntries(new FormData(event.target).entries());
      state.listings = (await api(`/api/listings?${new URLSearchParams(state.filters)}`)).listings; render(); toast("Results updated.");
    }
    if (event.target.id === "listing-form") {
      event.preventDefault();
      const form = new FormData(event.target);
      const payload = {
        title: form.get("title"),
        description: form.get("description"),
        price: Number(form.get("price")),
        deposit: Number(form.get("deposit")),
        amenities: String(form.get("amenities") || "").split(",").map((item) => item.trim()).filter(Boolean),
        locationText: form.get("locationText"),
        latitude: Number(form.get("latitude")),
        longitude: Number(form.get("longitude")),
        nearbyPlaces: [],
      };
      const result = await api("/api/listings", { method: "POST", body: JSON.stringify(payload) });
      const image = form.get("listingImage");
      if (image && image.size) {
        const upload = new FormData();
        upload.set("image", image);
        await api(`/api/listings/${result.listing.id}/images`, { method: "POST", body: upload, bodyIsForm: true });
      }
      state.listings = (await api(`/api/listings?${new URLSearchParams(state.filters)}`)).listings;
      state.selectedListing = (await api(`/api/listings/${result.listing.id}`)).listing;
      state.route = "listing";
      render();
      toast("Listing created.");
    }
    if (event.target.id === "review-form") {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(event.target).entries());
      payload.listingId = state.selectedListing?.id;
      await api("/api/reviews", { method: "POST", body: JSON.stringify(payload) });
      toast("Review submitted.");
    }
    if (event.target.id === "message-form") {
      event.preventDefault();
      const body = String(new FormData(event.target).get("body") || "").trim();
      if (!body) return;
      const chatId = Number(event.target.dataset.chatId);
      const listingId = state.chats.find((chat) => chat.id === chatId)?.listingId;
      await api("/api/chats", { method: "POST", body: JSON.stringify({ listingId, body }) });
      const payload = await api(`/api/chats/${chatId}/messages`);
      document.querySelector("#chat-panel .messages").innerHTML = payload.messages.map((message) => `<div class="message ${message.senderId === state.user.id ? "mine" : "theirs"}"><strong>${escapeHtml(message.senderName)}</strong><div>${escapeHtml(message.body)}</div></div>`).join("");
      event.target.reset();
      toast("Message sent.");
    }
  } catch (error) { toast(error.message, true); }
});

bootstrap().catch((error) => { app.innerHTML = `<main class="shell"><div class="card">${escapeHtml(error.message)}</div></main>`; });
