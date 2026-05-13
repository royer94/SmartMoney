import React from 'react';
import { DollarSign } from 'lucide-react';

export function Logo({ className = "", size = "md" }: { className?: string, size?: "sm" | "md" | "lg" }) {
  const iconSize = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-8 h-8" : "w-6 h-6";
  const textSize = size === "sm" ? "text-lg" : size === "lg" ? "text-3xl" : "text-2xl";
  const padding = size === "sm" ? "p-1" : size === "lg" ? "p-3" : "p-2";

  return (
    <div className={`flex items-center gap-2 group cursor-default transition-all duration-500 ease-in-out ${className}`} title="$martMone¥ AI">
      <div className={`bg-blue-600 ${padding} rounded-xl shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-all duration-500`}>
        <DollarSign className={iconSize + " text-white"} />
      </div>
      <span className={`${textSize} font-black tracking-tighter text-slate-900 leading-none transition-colors duration-500`}>$martMone¥<span className="text-blue-600 italic">AI</span></span>
    </div>
  );
}
