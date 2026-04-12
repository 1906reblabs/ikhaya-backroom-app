const express = require("express");
const multer = require("multer");

const { authOptional, authRequired, requireRole } = require("../middleware/auth");
const { requestOtp, verifyOtp } = require("../services/auth-service");
const { attachListingImage, createListing, getListingById, listListings } = require("../services/listing-service");
const { registerInterest, reportListing, requestViewing, submitReview } = require("../services/trust-service");
const { createOrReplyToChat, getMessages, listChats } = require("../services/chat-service");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024 } });

router.post("/auth/request-otp", (req, res, next) => {
  try {
    res.json(requestOtp(req.body));
  } catch (error) {
    next(error);
  }
});

router.post("/auth/verify-otp", (req, res, next) => {
  try {
    res.json(verifyOtp(req.body));
  } catch (error) {
    next(error);
  }
});

router.get("/session", authOptional, (req, res) => {
  res.json({ user: req.user || null });
});

router.get("/listings", (req, res, next) => {
  try {
    res.json({ listings: listListings(req.query) });
  } catch (error) {
    next(error);
  }
});

router.get("/listings/:id", authOptional, (req, res, next) => {
  try {
    const listing = getListingById(Number(req.params.id), req.user?.id);
    if (!listing) {
      res.status(404).json({ error: "Listing not found." });
      return;
    }
    res.json({ listing });
  } catch (error) {
    next(error);
  }
});

router.post("/listings", authRequired, requireRole("landlord"), (req, res, next) => {
  try {
    res.status(201).json({ listing: createListing(req.user, req.body) });
  } catch (error) {
    next(error);
  }
});

router.post("/listings/:id/images", authRequired, requireRole("landlord"), upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Image is required." });
      return;
    }
    const listing = await attachListingImage(req.user, Number(req.params.id), req.file);
    res.json({ listing });
  } catch (error) {
    next(error);
  }
});

router.post("/listings/:id/interest", authRequired, requireRole("tenant"), (req, res, next) => {
  try {
    res.json({ listing: registerInterest(req.user, Number(req.params.id), req.body) });
  } catch (error) {
    next(error);
  }
});

router.post("/listings/:id/view-request", authRequired, requireRole("tenant"), (req, res, next) => {
  try {
    res.json(requestViewing(req.user, Number(req.params.id), req.body));
  } catch (error) {
    next(error);
  }
});

router.post("/listings/:id/report", authRequired, (req, res, next) => {
  try {
    res.json(reportListing(req.user, Number(req.params.id), req.body));
  } catch (error) {
    next(error);
  }
});

router.get("/chats", authRequired, (req, res, next) => {
  try {
    res.json({ chats: listChats(req.user) });
  } catch (error) {
    next(error);
  }
});

router.get("/chats/:chatId/messages", authRequired, (req, res, next) => {
  try {
    res.json(getMessages(req.user, Number(req.params.chatId)));
  } catch (error) {
    next(error);
  }
});

router.post("/chats", authRequired, (req, res, next) => {
  try {
    res.json(createOrReplyToChat(req.user, req.body));
  } catch (error) {
    next(error);
  }
});

router.post("/reviews", authRequired, requireRole("tenant"), (req, res, next) => {
  try {
    res.json(submitReview(req.user, req.body));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
