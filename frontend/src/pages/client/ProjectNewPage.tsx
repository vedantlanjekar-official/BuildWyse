import { Navigate } from 'react-router-dom'

/** Legacy route — create flow now opens as a dialog on the projects list. */
export function ProjectNewPage() {
  return <Navigate to="/projects?new=1" replace />
}
