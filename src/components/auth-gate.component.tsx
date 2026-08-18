//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { type ReactNode } from "react";

import { useAuth } from "@/hooks/auth.context";

interface AuthGateProps {
    children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
    const { isLoading, isAuthenticated } = useAuth();

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-sm text-muted-foreground">
                    Connecting to Fabric…
                </div>
            </div>
        );
    }

    // `import.meta.env.DEV` is statically false in the production build that
    // ships to Fabric (`vite build`), so this can never bypass auth outside
    // `npm run dev` — it only unblocks local layout/visual iteration without
    // a Fabric embed. Semantic-model queries still won't resolve locally.
    if (!isAuthenticated && import.meta.env.DEV) {
        return (
            <>
                <div className="fixed bottom-200 right-200 z-50 rounded-full bg-destructive px-300 py-100 font-base text-200 text-destructive-foreground shadow">
                    DEV PREVIEW — unauthenticated (no Fabric embed)
                </div>
                {children}
            </>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <div className="w-full max-w-md text-center">
                    <h2 className="mb-2 text-lg font-semibold text-foreground">
                        Can't open this app outside Fabric
                    </h2>
                    <p className="mb-4 text-sm text-muted-foreground">
                        Opening apps connected to semantic models outside of the Fabric portal is not supported at this time.
                    </p>
                </div>
            </div>
        );
    };
    
    return <>{children}</>;
}