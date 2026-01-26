import { LoadingIndicator } from "@/components/loading-indicator";

export default function Loading() {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <LoadingIndicator stage="screening" />
        </div>
    );
}
