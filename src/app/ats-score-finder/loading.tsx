import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Loading() {
    return (
        <div className="container mx-auto p-4 md:p-8 space-y-8 pt-24">
            {/* Header Skeleton */}
            <Card className="mb-8">
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-96 mt-2" />
                </CardHeader>
            </Card>

            {/* Upload Area Skeleton */}
            <Card className="h-64">
                <CardContent className="h-full flex flex-col items-center justify-center space-y-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-10 w-32" />
                </CardContent>
            </Card>
        </div>
    );
}
