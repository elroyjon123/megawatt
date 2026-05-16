import React from "react";

export default function Input({
  icon: Icon,
  className,
  ...props
}) {
  return (
    <div
      className={["flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2", className].filter(Boolean).join(" ")}
    >
      {Icon && <Icon className="w-5 h-5 text-gray-400" />}
      <input
        className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 placeholder-gray-400"
        {...props}
      />
    </div>
  );
}