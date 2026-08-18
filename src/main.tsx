//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from "react-error-boundary";

import App from './App.tsx';
import { ErrorFallback } from './ErrorFallback';
import { useAppTheme } from './hooks/use-theme';
import { ThemeContext } from './hooks/theme.context';
import { AuthProvider } from './hooks/use-auth';
import { bootstrapAuth, type IAuthService } from './services/rayfin-auth.service';
import { AuthGate } from './components/auth-gate.component';

import "./global.css"

/**
 * `bootstrapAuth()` throws synchronously when Rayfin/Fabric env vars aren't
 * set (before `npx rayfin up` registers this app). In dev mode only, fall
 * back to an unauthenticated stub instead of failing to boot at all, so
 * layout/visual work can iterate locally without a Fabric embed —
 * `AuthGate`'s own dev-only bypass then renders `<App>` with a "DEV
 * PREVIEW" badge. `import.meta.env.DEV` is statically false in the
 * production build, so this never runs there.
 */
function createAuthService(): IAuthService {
    if (import.meta.env.DEV) {
        try {
            return bootstrapAuth();
        } catch (err) {
            console.warn(
                "[dev] Rayfin not configured (run `npx rayfin up` for real auth) — using unauthenticated dev preview.",
                err,
            );
            return { initEmbeddedAuth: () => Promise.resolve(null) };
        }
    }
    return bootstrapAuth();
}

const rayfinAuthService = createAuthService();

function Root() {
    const { isDark, toggleTheme } = useAppTheme();

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            <ErrorBoundary FallbackComponent={ErrorFallback}>
                <AuthProvider rayfinAuthService={rayfinAuthService}>
                    <AuthGate>
                        <App />
                    </AuthGate>
                </AuthProvider>
            </ErrorBoundary>
        </ThemeContext.Provider>
    );
}

createRoot(document.getElementById('root')!).render(<Root />)
