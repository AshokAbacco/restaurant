// server/src/auth/auth.validation.js
//
// Was an empty stub — every auth request body (login, forgot/reset
// password, change password, profile update) previously reached the
// service layer completely unvalidated. Paired with
// src/middleware/validate.js.
import { z } from "zod";

// login accepts either "identifier" or legacy "email" (see
// auth.controller.js's loginHandler: `identifier || email`) — at least one
// must be present. password is intentionally NOT given a min-length check
// here: this is the LOGIN form, not signup: a too-short password on login
// just means "wrong password", which auth.service.js already reports
// correctly. Enforcing a min-length here would reject a correct password
// with a confusing "too short" error instead of the real reason.
export const loginSchema = z
  .object({
    identifier: z.string().trim().min(1).optional(),
    email: z.string().trim().min(1).optional(),
    password: z.string().min(1, "Password is required."),
  })
  .refine((data) => data.identifier || data.email, {
    message: "Email or username is required.",
    path: ["identifier"],
  });

// POST /api/auth/register — the public Owner signup. Unlike loginSchema
// above, password IS min-length checked here: this is the form that SETS
// the password, so "too short" is the accurate, actionable message rather
// than a misleading one.
//
// Note there is no `role` field. The service hardcodes role: "OWNER" (see
// auth.service.js's registerOwner) and never reads one off the body, so a
// caller can't request a different role by adding it here. Zod strips
// unknown keys by default, so it wouldn't survive validation anyway.
export const registerSchema = z.object({
  restaurantName: z
    .string()
    .trim()
    .min(2, "Restaurant name must be at least 2 characters.")
    .max(120, "Restaurant name is too long."),
  fullName: z
    .string()
    .trim()
    .min(2, "Owner name must be at least 2 characters.")
    .max(120, "Owner name is too long."),
  // Deliberately permissive on format — international numbers, spaces,
  // "+91", and hyphens are all legitimate. The digit count is what actually
  // matters, so that's what's checked.
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number.")
    .max(20, "Enter a valid phone number.")
    .regex(
      /^[+]?[\d\s()-]{7,20}$/,
      "Phone number can only contain digits, spaces, and + ( ) -",
    ),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  address: z
    .string()
    .trim()
    .min(5, "Address must be at least 5 characters.")
    .max(300, "Address is too long."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

// POST /api/auth/select-outlet — second step of login when the account has
// access to more than one outlet (see auth.service.js's login()). Both
// fields come from the client, but preAuthToken is itself the proof of
// having already passed the password check, not a normal Bearer token.
export const selectOutletSchema = z.object({
  preAuthToken: z.string().min(1, "Session token is required."),
  outletId: z.string().min(1, "Outlet is required."),
});

// POST /api/auth/switch-outlet — the header switcher, used from an
// already-authenticated session. No preAuthToken needed here (unlike
// selectOutletSchema above) since requireAuth already establishes who's
// asking; only the destination outlet needs to be specified.
export const switchOutletSchema = z.object({
  outletId: z.string().min(1, "Outlet is required."),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
});

// Matches auth.service.js's EDITABLE_EMPLOYEE_FIELDS allow-list exactly —
// anything not in that list (role, department, employeeCode, etc.) simply
// isn't accepted here, so there's no need to separately reject it.
const addressSchema = z.object({
  houseNo: z.string().trim().max(100).optional().nullable(),
  street: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(100).optional().nullable(),
  pincode: z.string().trim().max(20).optional().nullable(),
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Full name cannot be empty.").optional(),
  gender: z.string().trim().max(20).optional().nullable(),
  mobile: z.string().trim().max(20).optional().nullable(),
  dob: z.string().optional().nullable(), // yyyy-mm-dd from <input type="date">
  emergencyContact: z.string().trim().max(20).optional().nullable(),
  photoUrl: z.string().trim().url().optional().nullable(),
  address: addressSchema.optional().nullable(),
});