
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
// UI and Layout Components
import { MainLayout } from '@/components/layout/main-layout';
import { Toaster } from "@/components/ui/toaster";
// Providers for theming, loading state, and authentication
import { ThemeProvider } from "@/components/theme-provider";
import { LoadingProvider } from "@/contexts/loading-context"; 
import { AuthProvider } from "@/contexts/auth-context";
import { cn } from '@/lib/utils';

/**
 * Initializes the Inter font with specified subsets and a CSS variable.
 * This is the modern, optimized approach for handling fonts in Next.js.
 */
const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter', // Defines a CSS variable for the font
});


/**
 * Metadata for the application.
 * This information is used for SEO and browser tab information.
 */
export const metadata: Metadata = {
  title: 'ResumeRank AI',
  description: 'AI-Powered Resume Screening and Ranking',
};

/**
 * The root layout for the entire application.
 * This component wraps all pages and provides shared UI and context.
 * @param {object} props - The props object.
 * @param {React.ReactNode} props.children - The child components to be rendered within the layout.
 * @returns {JSX.Element} The root layout structure.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Font link tags are no longer needed as we are using next/font */}
      </head>
      <body className={cn(inter.variable, "font-body antialiased")}>
        {/* ThemeProvider manages light/dark mode */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* LoadingProvider manages global page loading indicators */}
          <LoadingProvider>
            {/* AuthProvider manages user authentication state */}
            <AuthProvider>
              {/* MainLayout provides the consistent header and page structure */}
              <MainLayout>{children}</MainLayout>
              {/* Toaster component handles all pop-up notifications */}
              <Toaster />
            </AuthProvider>
          </LoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
