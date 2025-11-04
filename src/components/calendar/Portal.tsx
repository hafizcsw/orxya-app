import { createPortal } from "react-dom";

interface PortalProps {
  children: React.ReactNode;
}

export function Portal({ children }: PortalProps) {
  if (typeof window === "undefined") return null;
  const el = document.getElementById("portals");
  return el ? createPortal(children, el) : null;
}
