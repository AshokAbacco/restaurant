// server/src/kiosk/kiosk.middleware.js

const getValidKeys = () =>
  (process.env.KIOSK_API_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

export const requireKioskAuth = (req, res, next) => {
  const validKeys = getValidKeys();
  const key = req.header("x-kiosk-key");

  console.log("===== KIOSK AUTH DEBUG =====");
  console.log("KIOSK_API_KEYS:", process.env.KIOSK_API_KEYS);
  console.log("validKeys:", validKeys);
  console.log("received key:", key);
  console.log("============================");

  if (validKeys.length === 0) {
    console.log("⚠️ No kiosk keys configured, allowing request");
    return next();
  }

  if (!key || !validKeys.includes(key)) {
    console.log("❌ Kiosk key rejected");

    return res.status(401).json({
      success: false,
      message: "Invalid or missing kiosk device key",
    });
  }

  console.log("✅ Kiosk key accepted");

  next();
};
