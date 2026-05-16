import React from "react";
import clsx from "clsx";

export default function Button({
  children,
  variant = "primary",
  className,
  ...props
}) {
  const base =
    "px-4 py-2 rounded-lg font-medium transition-all active:scale-95";

  const variants = {
    primary: "bg-green-500 text-white hover:bg-green-600",
    secondary:
      "border-2 border-green-500 text-green-600 hover:bg-green-50",
    ghost: "text-gray-700 hover:bg-gray-100",
  };

  return (
    <button
      className={clsx(base, variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}