import type { SVGProps } from "react";

export const Logo = (props: SVGProps<SVGSVGElement>) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
    >
        <path d="M11.6,3.44H3.92V20.56h4.3V13.88h3.38a6.11,6.11,0,0,0,6.11-6.1A6.11,6.11,0,0,0,11.6,3.44Zm0,8.3H8.22V7.58h3.38a2,2,0,0,1,2,2,2,2,0,0,1-2,2Z"></path>
    </svg>
);
