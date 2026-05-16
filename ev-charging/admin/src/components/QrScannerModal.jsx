import { useEffect, useId, useMemo, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

import Button from "./ui/Button";

export default function QrScannerModal({ open, onClose, onScan }) {
  const regionId = useId();
  const scannerRegionId = useMemo(() => `qr-region-${regionId}`, [regionId]);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!open) return;

    let qr;
    let cancelled = false;
    setError(null);
    setScanning(false);

    const start = async () => {
      try {
        qr = new Html5Qrcode(scannerRegionId);
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) throw new Error("No cameras found");

        setScanning(true);
        await qr.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decodedText) => {
            if (cancelled) return;
            const value = String(decodedText || "").trim();
            if (!value) return;
            onScan?.(value);
            onClose?.();
          },
          () => {
            // ignore per-frame decode errors
          }
        );
      } catch (e) {
        setError(e?.message || "Failed to start QR scanner");
      }
    };

    start();

    return () => {
      cancelled = true;
      const stop = async () => {
        try {
          if (qr?.isScanning) await qr.stop();
        } catch {
          // ignore
        }
        try {
          await qr?.clear();
        } catch {
          // ignore
        }
      };
      stop();
    };
  }, [open, onClose, onScan, scannerRegionId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-base font-semibold text-slate-900">Scan charger QR</div>
            <div className="mt-1 text-xs text-slate-500">Point the camera at the QR code. The OCPP ID will be extracted.</div>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="p-5">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div id={scannerRegionId} className="w-full" />
              </div>
              <div className="mt-3 text-xs text-slate-500">
                {scanning ? "Scanning…" : "Starting camera…"}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
