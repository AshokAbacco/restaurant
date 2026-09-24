// src/crm/components/LoyaltyRedeemPanel.jsx
//
// Rewards at billing: redeem points, apply a reward voucher, or type a
// discount coupon code. Rendered by the POS billing modal only when
// Settings -> Loyalty is on and the order has a customer.
//
// The panel shows what each reward is worth so the cashier knows how much
// is left to collect; the server re-checks every rule (minimum points, the
// % cap, voucher ownership, coupon validity) before applying anything.
import { useEffect, useMemo, useState } from "react";
import { FiAward, FiGift, FiTag, FiX } from "react-icons/fi";
import { listCoupons } from "../loyaltyApi";

const money = (n) => `₹${Number(n || 0).toFixed(2)}`;

export function rewardValueOf({ loyalty, redeemPoints, voucher, coupon, billAmount }) {
  let total = 0;
  const lines = [];
  if (redeemPoints > 0 && loyalty?.redeem) {
    const { redeemPoints: per, redeemValue } = loyalty.redeem;
    const v = Math.round((redeemPoints / per) * redeemValue * 100) / 100;
    total += v;
    lines.push({ label: `${redeemPoints} points`, value: v });
  }
  if (voucher) {
    const v =
      voucher.type === "PERCENTAGE"
        ? Math.min((billAmount * Number(voucher.value)) / 100, voucher.maxDiscount ?? Infinity)
        : Number(voucher.value);
    const capped = Math.round(Math.min(v, billAmount) * 100) / 100;
    total += capped;
    lines.push({ label: voucher.title || voucher.code, value: capped });
  }
  if (coupon) {
    const v = coupon.type === "PERCENTAGE" ? (billAmount * Number(coupon.value)) / 100 : Number(coupon.value);
    const capped = Math.round(Math.min(v, billAmount) * 100) / 100;
    total += capped;
    lines.push({ label: `Coupon ${coupon.code}`, value: capped });
  }
  return { total: Math.round(Math.min(total, billAmount) * 100) / 100, lines };
}

export default function LoyaltyRedeemPanel({ loyalty, billAmount, onChange }) {
  const [points, setPoints] = useState(0);
  const [voucherCode, setVoucherCode] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");

  const voucher = useMemo(
    () => (loyalty?.vouchers || []).find((v) => v.code === voucherCode) || null,
    [loyalty, voucherCode],
  );

  const reward = useMemo(
    () => rewardValueOf({ loyalty, redeemPoints: points, voucher, coupon, billAmount }),
    [loyalty, points, voucher, coupon, billAmount],
  );

  useEffect(() => {
    onChange?.({
      loyalty: {
        ...(points > 0 ? { redeemPoints: points } : {}),
        ...(voucherCode ? { voucherCode } : {}),
        ...(coupon ? { couponCode: coupon.code } : {}),
      },
      rewardValue: reward.total,
      lines: reward.lines,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, voucherCode, coupon, reward.total]);

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponError("");
    try {
      const all = await listCoupons();
      const found = all.find((c) => c.code === code && c.isActive);
      if (!found) {
        setCoupon(null);
        setCouponError("No active coupon with that code.");
        return;
      }
      if (found.minOrderAmount && billAmount < found.minOrderAmount) {
        setCoupon(null);
        setCouponError(`Valid on bills of ${money(found.minOrderAmount)} or more.`);
        return;
      }
      setCoupon(found);
    } catch (err) {
      setCouponError(err.message);
    }
  }

  if (!loyalty?.enabled) return null;
  const c = loyalty.customer;
  const redeem = loyalty.redeem;

  return (
    <div className="rounded-xl border border-[#E7EAE1] bg-[#F3F5EE]/60 p-3 dark:border-[#262B24] dark:bg-white/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-bold text-[#1F2937] dark:text-[#E4E9E2]">
          <FiAward className="text-[#3FA34D] dark:text-[#43B75A]" /> Loyalty
        </h4>
        {c && (
          <span className="text-xs text-[#6B7280] dark:text-[#9CA8A0]">
            {c.points} points · worth {money(c.pointsValue)}
          </span>
        )}
      </div>

      {!c && <p className="mt-2 text-xs text-[#9CA3AF]">Add a customer to this order to earn or redeem points.</p>}

      {c && (
        <>
          {/* Points */}
          <div className="mt-3">
            {redeem?.canRedeem ? (
              <>
                <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#9CA8A0]">
                  <label htmlFor="redeem-points">Redeem points (max {redeem.maxPoints})</label>
                  <span className="font-semibold text-[#3FA34D] dark:text-[#43B75A]">−{money((points / redeem.redeemPoints) * redeem.redeemValue)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    id="redeem-points"
                    type="range"
                    min={0}
                    max={redeem.maxPoints}
                    step={redeem.minPoints || 1}
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    className="h-1.5 flex-1 accent-[#3FA34D] dark:accent-[#43B75A]"
                  />
                  <input
                    type="number"
                    min={0}
                    max={redeem.maxPoints}
                    value={points}
                    onChange={(e) => setPoints(Math.max(0, Math.min(redeem.maxPoints, Number(e.target.value) || 0)))}
                    className="w-20 rounded-lg border border-[#E7EAE1] bg-white px-2 py-1 text-xs dark:border-[#262B24] dark:bg-[#262B24] dark:text-white"
                  />
                  <button type="button" onClick={() => setPoints(redeem.maxPoints)} className="rounded-lg border border-[#E7EAE1] px-2 py-1 text-xs font-semibold text-[#6B7280] dark:border-[#262B24] dark:text-[#9CA8A0]">
                    Max
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-[#9CA3AF]">
                  {redeem.redeemPoints} points = {money(redeem.redeemValue)} · minimum {redeem.minPoints} points
                </p>
              </>
            ) : (
              <p className="text-[11px] text-[#9CA3AF]">{redeem?.reason || "Points can't be redeemed on this bill."}</p>
            )}
          </div>

          {/* Vouchers */}
          {loyalty.vouchers?.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-[#6B7280] dark:text-[#9CA8A0]"><FiGift size={12} /> Reward vouchers</p>
              <div className="flex flex-wrap gap-1.5">
                {loyalty.vouchers.map((v) => {
                  const on = voucherCode === v.code;
                  return (
                    <button
                      key={v.code}
                      type="button"
                      disabled={!v.usable}
                      onClick={() => setVoucherCode(on ? "" : v.code)}
                      className={`rounded-lg border px-2 py-1 text-[11px] font-semibold disabled:opacity-40 ${
                        on
                          ? "border-[#3FA34D] bg-[#3FA34D] text-white dark:border-[#43B75A] dark:bg-[#43B75A]"
                          : "border-[#E7EAE1] bg-white text-[#1F2937] dark:border-[#262B24] dark:bg-[#171C17] dark:text-[#E4E9E2]"
                      }`}
                      title={v.usable ? v.title : `Needs a bill of ${money(v.minBillAmount)}`}
                    >
                      {v.title} · {v.code}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Coupon */}
          <div className="mt-3">
            <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-[#6B7280] dark:text-[#9CA8A0]"><FiTag size={12} /> Discount coupon</p>
            {coupon ? (
              <span className="inline-flex items-center gap-2 rounded-lg bg-[#3FA34D] px-2 py-1 text-[11px] font-semibold text-white dark:bg-[#43B75A]">
                {coupon.code} · {coupon.type === "PERCENTAGE" ? `${coupon.value}% off` : `${money(coupon.value)} off`}
                <button type="button" onClick={() => { setCoupon(null); setCouponInput(""); }} aria-label="Remove coupon"><FiX size={11} /></button>
              </span>
            ) : (
              <div className="flex gap-1.5">
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Coupon code"
                  className="min-w-0 flex-1 rounded-lg border border-[#E7EAE1] bg-white px-2 py-1 text-xs uppercase dark:border-[#262B24] dark:bg-[#262B24] dark:text-white"
                />
                <button type="button" onClick={applyCoupon} className="rounded-lg border border-[#E7EAE1] px-2 py-1 text-xs font-semibold text-[#6B7280] dark:border-[#262B24] dark:text-[#9CA8A0]">
                  Apply
                </button>
              </div>
            )}
            {couponError && <p className="mt-1 text-[11px] text-red-500">{couponError}</p>}
          </div>

          {/* Totals */}
          {reward.total > 0 && (
            <div className="mt-3 space-y-0.5 border-t border-dashed border-[#D5DAD0] pt-2 text-xs dark:border-[#2E342C]">
              {reward.lines.map((l) => (
                <div key={l.label} className="flex justify-between text-[#6B7280] dark:text-[#9CA8A0]">
                  <span>{l.label}</span>
                  <span>−{money(l.value)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-[#1F2937] dark:text-white">
                <span>To collect</span>
                <span>{money(Math.max(0, billAmount - reward.total))}</span>
              </div>
            </div>
          )}

          {loyalty.estimatedEarn > 0 && (
            <p className="mt-2 text-[11px] text-[#3FA34D] dark:text-[#43B75A]">
              This bill earns about {loyalty.estimatedEarn} points.
            </p>
          )}
        </>
      )}
    </div>
  );
}