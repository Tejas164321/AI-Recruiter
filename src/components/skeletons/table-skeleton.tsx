import { Skeleton } from "@/components/ui/skeleton"

export function TableSkeleton() {
    return (
        <div className="w-full space-y-6">
            {/* Toolbar / Filters Area */}
            <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-[250px]" />
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-[100px]" />
                    <Skeleton className="h-10 w-[100px]" />
                </div>
            </div>

            {/* Table Header */}
            <div className="border rounded-md">
                <div className="border-b p-4 grid grid-cols-4 gap-4 bg-muted/50">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                </div>

                {/* Table Rows */}
                <div className="divide-y">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="p-4 grid grid-cols-4 gap-4 items-center">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-4 w-2/3" />
                            <div className="flex gap-2 justify-end">
                                <Skeleton className="h-8 w-8 rounded-md" />
                                <Skeleton className="h-8 w-8 rounded-md" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
