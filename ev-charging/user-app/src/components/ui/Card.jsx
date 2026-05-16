import React from "react";

export default function Card({ children, className, ...props }) {
  return (
    <div
      className={["bg-white rounded-lg shadow-sm border border-gray-200", className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardBody({ children, className, ...props }) {
  return (
    <div className={["p-4", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </div>
  );
}