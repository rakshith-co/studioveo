import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: 'Revspot Vision',
  description: 'AI-powered video tagging for real estate.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background overflow-hidden">
        <div className="fixed inset-0 z-[-10] h-full w-full bg-background">
          <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_farthest-side_at_35%_40%,_rgba(180,0,0,0.15),_rgba(0,0,0,0))]"></div>
        </div>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
