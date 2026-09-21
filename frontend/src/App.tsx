import { useAuthInit } from '@/hooks/useAuth'
import { router } from '@/router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

function AuthInitializer({ children }: { children: React.ReactNode }) {
  useAuthInit()
  return children
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>
        <RouterProvider router={router} />
      </AuthInitializer>
    </QueryClientProvider>
  )
}
