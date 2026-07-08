import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

// Types for our router
export interface RouteParams {
    [key: string]: string
}

export interface RouterContextValue {
    currentPath: string
    params: RouteParams
    navigate: (path: string) => void
}

// Create the router context
const RouterContext = createContext<RouterContextValue | null>(null)

// Custom hook to access router
export function useRouter(): RouterContextValue {
    const context = useContext(RouterContext)
    if (!context) {
        throw new Error('useRouter must be used within a RouterProvider')
    }
    return context
}

interface RouterProviderProps {
    children: ReactNode
}

// Router provider component
export function RouterProvider({ children }: RouterProviderProps) {
    const [currentPath, setCurrentPath] = useState(
        () => window.location.pathname + window.location.search
    )
    const [params] = useState<RouteParams>({})

    useEffect(() => {
        // Listen for browser back/forward navigation
        const handlePopState = () => {
            setCurrentPath(window.location.pathname + window.location.search)
        }

        window.addEventListener('popstate', handlePopState)
        return () => window.removeEventListener('popstate', handlePopState)
    }, [])

    const navigate = (path: string) => {
        const currentSearch = window.location.search;
        let targetPath = path;
        if (currentSearch) {
            const currentParams = new URLSearchParams(currentSearch);
            const pathParts = path.split('?');
            const targetParams = new URLSearchParams(pathParts[1] || '');
            
            // Forward all se_ parameters
            currentParams.forEach((value, key) => {
                if (key.startsWith('se_')) {
                    targetParams.set(key, value);
                }
            });
            
            const queryString = targetParams.toString();
            targetPath = pathParts[0] + (queryString ? '?' + queryString : '');
        }

        // Update browser history
        window.history.pushState({}, '', targetPath)
        setCurrentPath(targetPath)
        window.scrollTo(0, 0)
    }

    const value: RouterContextValue = {
        currentPath,
        params,
        navigate,
    }

    return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

// Link component for navigation
interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    to: string
    activeClassName?: string
}

export function Link({ to, children, className = '', activeClassName = '', ...props }: LinkProps) {
    const { currentPath, navigate } = useRouter()
    const currentPathname = currentPath.split('?')[0]
    const targetPathname = to.split('?')[0]
    const isActive = currentPathname === targetPathname

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault()
        navigate(to)
        props.onClick?.(e)
    }

    const finalClassName = `${className} ${isActive ? activeClassName : ''}`.trim()

    return (
        <a href={to} onClick={handleClick} className={finalClassName} {...props}>
            {children}
        </a>
    )
}
