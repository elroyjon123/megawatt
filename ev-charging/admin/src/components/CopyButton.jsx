import { useState } from "react";

export default function CopyButton({ value, label = "Copy" }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(value ?? ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-60"
      disabled={value == null}
      title={value ? String(value) : ""}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
