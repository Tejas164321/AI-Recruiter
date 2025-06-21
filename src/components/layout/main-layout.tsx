
"use client";

import type { ReactNode } from 'react';
import { Header } from './header';
import { useLoading } from '@/contexts/loading-context';
import { PageLoader } from '@/components/page-loader';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { isPageLoading } = useLoading();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {isPageLoading && <PageLoader />}
      <Header />
      <main className="flex-1 py-4 md:py-6">{children}</main>
    </div>
  );
}
