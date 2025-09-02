import type { SVGProps } from "react";

export const Logo = (props: SVGProps<SVGSVGElement>) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
    >
        <path d="M3.92 3.44H13.6C17.06 3.44 19.82 6.2 19.82 9.66C19.82 13.12 17.06 15.88 13.6 15.88H8.22V20.56H3.92V3.44ZM8.22 11.74H13.6C14.84 11.74 15.82 10.76 15.82 9.52C15.82 8.28 14.84 7.3 13.6 7.3H8.22V11.74Z"></path>
    </svg>
);
