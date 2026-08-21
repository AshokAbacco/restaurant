// server/src/middleware/validate.js
//
// Generic request-body validator: pass a Zod schema, get back Express
// middleware. On failure, responds 400 with a field-by-field message list
// instead of letting a malformed request reach the service layer (where it
// previously surfaced as a confusing Prisma error, or worse, silently did
// the wrong thing).
//
// Usage: router.post("/login", validate(loginSchema), loginHandler)
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      field: issue.path.join(".") || "(body)",
      message: issue.message,
    }));

    return res.status(400).json({
      success: false,
      message: issues[0]?.message || "Invalid request.",
      errors: issues,
    });
  }

  // Replaces req.body with the parsed/coerced data (e.g. trimmed strings,
  // defaults applied) so handlers downstream can trust its shape.
  req.body = result.data;
  return next();
};
