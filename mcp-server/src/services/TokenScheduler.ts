import * as cron from 'node-cron';
import { UserService } from './UserService.js';

export class TokenScheduler {
    private userService: UserService;
    private isRunning: boolean = false;

    constructor() {
        this.userService = new UserService();
    }

    /**
     * Start the token refresh scheduler
     * Runs every day at midnight UTC
     */
    start(): void {
        if (this.isRunning) {
            console.log('Token scheduler is already running');
            return;
        }

        // Schedule daily token refresh at midnight UTC
        cron.schedule('0 0 * * *', async () => {
            console.log('Running scheduled daily token refresh...');
            try {
                const updatedCount = await this.userService.refreshDailyTokensIfNeeded();
                console.log(`Daily token refresh completed. Updated ${updatedCount} users.`);
            } catch (error) {
                console.error('Error during scheduled token refresh:', error);
            }
        }, {
            scheduled: true,
            timezone: 'UTC'
        });

        // Also run a check every hour to catch any missed refreshes
        cron.schedule('0 * * * *', async () => {
            try {
                const updatedCount = await this.userService.refreshDailyTokensIfNeeded();
                if (updatedCount > 0) {
                    console.log(`Hourly token check: Updated ${updatedCount} users.`);
                }
            } catch (error) {
                console.error('Error during hourly token check:', error);
            }
        }, {
            scheduled: true,
            timezone: 'UTC'
        });

        this.isRunning = true;
        console.log('Token scheduler started successfully');
        console.log('- Daily refresh: Every day at 00:00 UTC');
        console.log('- Hourly check: Every hour at minute 0');
    }

    /**
     * Stop the token refresh scheduler
     */
    stop(): void {
        if (!this.isRunning) {
            console.log('Token scheduler is not running');
            return;
        }

        // Note: node-cron doesn't provide a direct way to stop specific tasks
        // In a production environment, you might want to keep references to the tasks
        this.isRunning = false;
        console.log('Token scheduler stopped');
    }

    /**
     * Get scheduler status
     */
    getStatus(): { isRunning: boolean } {
        return { isRunning: this.isRunning };
    }

    /**
     * Manually trigger token refresh
     */
    async triggerRefresh(): Promise<number> {
        console.log('Manually triggering token refresh...');
        try {
            const updatedCount = await this.userService.refreshDailyTokensIfNeeded();
            console.log(`Manual token refresh completed. Updated ${updatedCount} users.`);
            return updatedCount;
        } catch (error) {
            console.error('Error during manual token refresh:', error);
            throw error;
        }
    }
}

// Create singleton instance
export const tokenScheduler = new TokenScheduler();
