import { PageHeaderSkeleton } from "@/components/skeletons/page-header-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ResumeRankerLoading() {
    return (
        <div className="container mx-auto p-4 md:p-8 space-y-8 pt-24">
            <PageHeaderSkeleton />

            {/* Upload Area Skeleton */}
            <Skeleton className="w-full h-[300px] rounded-xl" />

            {/* Results placeholder */}
            <div className="space-y-4">
                <Skeleton className="h-8 w-[200px]" />
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        </div>
    );
}
