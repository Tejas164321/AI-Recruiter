import { CandidateListSkeleton } from "@/components/skeletons";

export default function Loading() {
    return (
        <div className="container py-8">
            <div className="mb-8 space-y-2">
                <div className="h-8 w-48 bg-muted/50 rounded animate-pulse" />
                <div className="h-4 w-96 bg-muted/50 rounded animate-pulse" />
            </div>
            <CandidateListSkeleton />
        </div>
    );
}
