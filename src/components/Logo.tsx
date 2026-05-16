import React from 'react';

export function Logo({ className = "", size = "md" }: { className?: string, size?: "sm" | "md" | "lg" }) {
  const imgSize = size === "sm" ? "w-7 h-7" : size === "lg" ? "w-12 h-12" : "w-9 h-9";
  const textSize = size === "sm" ? "text-lg" : size === "lg" ? "text-3xl" : "text-2xl";

  return (
    <div className={`flex items-center gap-2 group cursor-default transition-all duration-500 ease-in-out ${className}`} title="$martMone¥ AI">
      <img 
        src="/SM_icon.png" 
        alt="SmartMone¥ AI" 
        className={`${imgSize} rounded-xl shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-all duration-500`}
      />
      <span className={`${textSize} font-black tracking-tighter text-slate-900 leading-none transition-colors duration-500`}>
        $martMone¥<span className="text-blue-600 italic">AI</span>
      </span>
    </div>
  );
}
