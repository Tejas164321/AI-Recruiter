
"use client";

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
// Components
import { Header } from './header';
import { PageLoader } from '@/components/page-loader';
// Hooks and Contexts
import { useLoading } from '@/contexts/loading-context';
import { cn } from '@/lib/utils';

/**
 * Props for the MainLayout component.
 */
interface MainLayoutProps {
  children: ReactNode;
}

/**
 * The main layout structure for the application.
 * It includes the header and a global page loader that is shown
 * based on the state from the LoadingContext.
 * It now conditionally adds padding to all pages except the homepage, login, and signup pages.
 */
export function MainLayout({ children }: MainLayoutProps) {
  const { isPageLoading } = useLoading();
  const pathname = usePathname();

  // Pages that should not have top padding.
  const noPaddingPages = ['/', '/login', '/signup'];
  const applyPadding = !noPaddingPages.includes(pathname);

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-x-hidden selection:bg-primary selection:text-primary-foreground font-mono">
      {/* Global Noise Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}></div>

      {/* Conditionally render the full-page loader */}
      {isPageLoading && <PageLoader />}

      {/* The main application header. Hidden on login/signup pages. */}
      {!['/login', '/signup'].includes(pathname) && <Header />}

      {/* The main content area where pages will be rendered */}
      {/* Conditionally apply top padding to prevent content from being obscured by the floating header. */}
      <main className={cn(
        "flex-1 flex flex-col",
        { "pt-24": applyPadding }
      )}>
        {children}
      </main>
    </div>
  );
}
