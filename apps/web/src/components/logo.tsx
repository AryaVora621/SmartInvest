import { cn } from "@/lib/utils";

export const Logo = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      className={cn("text-primary", props.className)}
    >
        <path d="M14.5 7.5C15.5 7.5 17.5 7 19.5 6M9.5 7.5C8.5 7.5 6.5 7 4.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9.5 13.5C6.5 13.5 4 11.5 3 9.5C3.5 8.5 4.5 7.5 5.5 7C7.5 6 9 6.5 9.5 7.5C10 8.5 11 10.5 12 10.5C13 10.5 14 8.5 14.5 7.5C15 6.5 16.5 6 18.5 7C19.5 7.5 20.5 8.5 21 9.5C20 11.5 17.5 13.5 14.5 13.5C12.5 13.5 12.5 12.5 12 12.5C11.5 12.5 11.5 13.5 9.5 13.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 13V15.5C12 17.5 10.5 18.5 9.5 18.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 13V15.5C12 17.5 13.5 18.5 14.5 18.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
