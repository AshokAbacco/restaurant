// src/billing/BillCodes.jsx
//
// The barcode + UPI QR block printed at the foot of a bill, and reused as the
// live preview in Settings -> QR Settings so what you configure is literally
// what prints.
//
// Neither image is ever stored. Both are deterministic renders of the bill's
// own data, so a stored PNG could only go stale — and the UPI QR in
// particular MUST be regenerated per bill, because it carries that bill's
// amount and reference.
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";

// Builds a NPCI-standard UPI deep link. Scanning it with any UPI app (GPay,
// PhonePe, Paytm...) opens payment with the payee and amount prefilled.
//
//   pa = payee address (the VPA)     pn = payee name
//   am = amount        cu = currency  tn = transaction note
//   tr = reference — the invoice number, so a settlement can be traced back
//        to a specific bill
//
// Every value is URI-encoded: payee names contain spaces and ampersands
// ("Royal Spice Restaurant & Bar") which would otherwise break the query
// string and produce a QR that fails to scan.
export function buildUpiLink({ upiId, payeeName, amount, reference }) {
  if (!upiId) return null;
  const params = new URLSearchParams();
  params.set("pa", upiId);
  if (payeeName) params.set("pn", payeeName);
  if (amount != null) params.set("am", Number(amount).toFixed(2));
  params.set("cu", "INR");
  if (reference) {
    params.set("tn", `Bill ${reference}`);
    params.set("tr", reference);
  }
  return `upi://pay?${params.toString()}`;
}

// Code128 accepts the printable ASCII range. Invoice numbers here are
// alphanumeric with dashes and a "#", all of which are in range — but a
// stray character would make JsBarcode throw and take the whole invoice
// down with it, so the value is sanitised and the render is guarded.
function barcodeValue(reference, tableName) {
  const raw = [reference, tableName].filter(Boolean).join("-");
  return raw.replace(/[^\x20-\x7E]/g, "").slice(0, 48);
}

function Barcode({ value }) {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format: "CODE128",
        displayValue: true,
        fontSize: 11,
        fontOptions: "bold",
        font: "monospace",
        height: 44,
        width: 1.6,
        margin: 0,
        // Explicit black-on-white: the app has a dark mode, but a barcode
        // rendered in light-on-dark won't scan and paper is always white.
        background: "#ffffff",
        lineColor: "#000000",
      });
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [value]);

  if (failed || !value) return null;
  return <svg ref={ref} className="max-w-full" />;
}

function UpiQr({ link, size = 132 }) {
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!link) {
      setDataUrl(null);
      return;
    }
    QRCode.toDataURL(link, {
      width: size * 2, // 2x so it stays sharp when printed
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [link, size]);

  if (!dataUrl) return null;
  return (
    <img
      src={dataUrl}
      alt="Scan to pay via UPI"
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
  );
}

export default function BillCodes({
  outlet = {},
  reference,
  tableName,
  amount,
  className = "",
}) {
  const showBarcode = outlet.showBillBarcode !== false && !!reference;
  const upiLink =
    outlet.showBillQr !== false
      ? buildUpiLink({
          upiId: outlet.upiId,
          payeeName: outlet.upiPayeeName || outlet.name,
          amount,
          reference,
        })
      : null;

  // Nothing configured and nothing to encode — render nothing at all rather
  // than an empty bordered box on every printed bill.
  if (!showBarcode && !upiLink && !outlet.billFooterNote) return null;

  return (
    <div className={`text-center ${className}`}>
      {outlet.billFooterNote && (
        <p className="mb-2 text-[10px] italic">{outlet.billFooterNote}</p>
      )}

      {showBarcode && (
        <div className="flex justify-center bg-white py-1">
          <Barcode value={barcodeValue(reference, tableName)} />
        </div>
      )}

      {upiLink && (
        <div className="mt-2 flex flex-col items-center">
          <div className="bg-white p-1">
            <UpiQr link={upiLink} />
          </div>
          <p className="mt-1 text-[10px]">Scan QR to Pay via UPI</p>
          <p className="text-[9px] text-[#6B7280]">{outlet.upiId}</p>
        </div>
      )}
    </div>
  );
}