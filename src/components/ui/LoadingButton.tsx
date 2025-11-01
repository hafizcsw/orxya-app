import { useState } from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  busyText?: string;
};

export default function LoadingButton({ busyText = "..." , children, disabled, onClick, ...rest }: Props) {
  const [busy, setBusy] = useState(false);
  async function handle(e: React.MouseEvent<HTMLButtonElement>) {
    if (!onClick) return;
    try {
      setBusy(true);
      await (onClick as any)(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      {...rest}
      aria-busy={busy}
      disabled={busy || disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 border transition-all
        ${busy ? "opacity-70 cursor-wait" : "hover:shadow-sm active:scale-[0.98]"} ${rest.className ?? ""}`}
      onClick={handle}
    >
      {busy ? <span className="animate-pulse">⏳ {busyText}</span> : children}
    </button>
  );
}
