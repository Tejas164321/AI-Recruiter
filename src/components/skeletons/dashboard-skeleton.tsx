import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
    return (
        <div className="container mx-auto p-4 md:p-8 pt-24 space-y-8">
            {/* Header Section */}
            <div className="space-y-4 mb-8">
                <Skeleton className="h-12 w-3/4 max-w-lg" />
                <Skeleton className="h-6 w-1/2 max-w-md" />
            </div>

            {/* Feature Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="border rounded-xl p-6 space-y-4 h-[250px] flex flex-col justify-between">
                        <div className="space-y-3">
                            <div className="flex items-center space-x-4">
                                <Skeleton className="h-12 w-12 rounded-lg" />
                                <Skeleton className="h-6 w-1/2" />
                            </div>
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-4/5" />
                        </div>
                        <Skeleton className="h-10 w-1/2 mt-auto" />
                    </div>
                ))}
            </div>
        </div>
    )
}
