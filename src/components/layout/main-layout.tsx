
"use client";

import type { ReactNode } from 'react';
// Components
import { Header } from './header';
import { PageLoader } from '@/components/page-loader';
// Hooks and Contexts
import { useLoading } from '@/contexts/loading-context';

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
 * @param {MainLayoutProps} props - The component props.
 */
export function MainLayout({ children }: MainLayoutProps) {
  const { isPageLoading } = useLoading();

  return (
    <div className="flex min-h-full flex-col bg-background">
      {/* Conditionally render the full-page loader */}
      {isPageLoading && <PageLoader />}
      
      {/* The main application header */}
      <Header />
      
      {/* The main content area where pages will be rendered */}
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
