import { Skeleton } from "@/components/ui/skeleton"

export function PageHeaderSkeleton() {
    return (
        <div className="space-y-4 mb-8">
            <Skeleton className="h-10 w-1/3 min-w-[300px]" />
            <Skeleton className="h-5 w-2/3 max-w-2xl" />
        </div>
    )
}
