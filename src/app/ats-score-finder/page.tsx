
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChartBig, HardHat } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AtsScoreFinderPage() {
  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-lg text-center shadow-xl">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <BarChartBig className="w-16 h-16 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold font-headline">ATS Score Finder</CardTitle>
          <CardDescription className="text-lg text-muted-foreground pt-2">
            This feature is under construction!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-6">
            We&apos;re working hard to bring you a powerful tool to analyze resume compatibility with Applicant Tracking Systems. 
            Soon, you&apos;ll be able to get detailed scores and optimization suggestions.
          </p>
          <div className="flex justify-center mb-6">
            <HardHat className="w-12 h-12 text-yellow-500 animate-bounce" />
          </div>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
