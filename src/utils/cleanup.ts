import logger from "../logger/winston.logger";
import { CLEANUP_INTERVAL, REQUEST_TIMEOUT } from "../constants";

export function setupCleanupTask(pendingRequests: Map<any, any>) {
    const cleanupInterval = setInterval(() => {
        const now = Date.now();
        let cleanedCount = 0;
        
        pendingRequests.forEach((value, key) => {
            if (now - value.timestamp > REQUEST_TIMEOUT) {
                logger.warn(`Cleaning up expired request ${key}`);
                pendingRequests.delete(key);
                cleanedCount++;
            }
        });
        
        if (cleanedCount > 0) {
            logger.info(`Cleaned up ${cleanedCount} expired DNS requests`);
        }
    }, CLEANUP_INTERVAL);
    
    process.on("exit", () => {
        clearInterval(cleanupInterval);
    });
    
    return cleanupInterval;
}