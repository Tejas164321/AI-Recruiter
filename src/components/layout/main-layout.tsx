
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
    <div className="flex flex-col min-h-screen bg-background">
      {/* Conditionally render the full-page loader */}
      {isPageLoading && <PageLoader />}
      
      {/* The main application header */}
      <Header />
      
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
