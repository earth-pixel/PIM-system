export const BrandIcon = ({ className = "w-4 h-4", ...props }) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.8" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
      {...props}
    >
      <defs>
        {/* Mask to subtract/cut out the text from the banner */}
        <mask id="brand-text-mask">
          {/* Everything white is kept */}
          <rect x="0" y="0" width="24" height="24" fill="white" />
          {/* Everything black is cut out (made transparent) */}
          <text 
            x="12" 
            y="13.2" 
            fill="black" 
            fontSize="3.1" 
            fontFamily="system-ui, -apple-system, sans-serif" 
            fontWeight="900" 
            textAnchor="middle" 
            letterSpacing="0.1"
            stroke="none"
          >
            BRAND
          </text>
        </mask>
      </defs>

      {/* 16-point starburst rosette (forced fill="none") */}
      <path 
        fill="none" 
        stroke="currentColor"
        d="M12 2l1.3 1.8 2.2-.4.4 2.2 2 .9-.5 2.2 1.6 1.6-1.1 2 1.1 2-1.6 1.6.5 2.2-2 .9-.4 2.2-2.2-.4L12 22l-1.3-1.8-2.2.4-.4-2.2-2-.9.5-2.2-1.6-1.6 1.1-2-1.1-2 1.6-1.6-.5-2.2 2-.9.4-2.2 2.2.4z" 
      />
      
      {/* Inner circle (forced fill="none") */}
      <circle 
        fill="none" 
        stroke="currentColor"
        cx="12" 
        cy="12" 
        r="5.2" 
      />
      
      {/* Banner (uses the mask to cut the text out of it) */}
      <rect 
        x="2" 
        y="9.75" 
        width="20" 
        height="4.5" 
        rx="0.6" 
        fill="currentColor" 
        stroke="none" 
        mask="url(#brand-text-mask)" 
      />
    </svg>
  );
};
