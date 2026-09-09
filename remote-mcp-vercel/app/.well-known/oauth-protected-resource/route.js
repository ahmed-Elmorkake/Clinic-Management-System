import { protectedResourceHandler, metadataCorsOptionsRequestHandler } from 'mcp-handler'
import { config } from '../../../lib/config.js'

const handler = protectedResourceHandler({ authServerUrls: [config.origin], resourceUrl: `${config.origin}/api/mcp` })
const options = metadataCorsOptionsRequestHandler()
export { handler as GET, options as OPTIONS }
