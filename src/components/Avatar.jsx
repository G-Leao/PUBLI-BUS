import { useState } from "react";
import { Avatar as Root, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)[0]}` : parts[0]?.slice(0, 2) || "?").toUpperCase();
}

export function Avatar({ name, src, size = "md", loading = false, className }) {
  const [failed, setFailed] = useState(false);
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10", lg: "h-24 w-24 text-2xl" };
  return (
    <Root className={cn("bg-gradient-to-br from-indigo-500 to-violet-600 text-white", sizes[size], className)}>
      {!failed && src && <AvatarImage src={src} alt={`Foto de ${name || "usuário"}`} onError={() => setFailed(true)} />}
      <AvatarFallback className="bg-transparent font-semibold">{loading ? "..." : getInitials(name)}</AvatarFallback>
    </Root>
  );
}
