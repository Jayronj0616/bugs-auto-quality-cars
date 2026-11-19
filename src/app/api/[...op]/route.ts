import { createRouteHandler } from '@openpanel/nextjs/server'

// First-party proxy for OpenPanel so ad blockers do not drop the script or events.
export const { GET, POST } = createRouteHandler()
