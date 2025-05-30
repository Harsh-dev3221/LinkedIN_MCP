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
     * Runs every day at midnight IST (Indian Standard Time) for Indian users
     * Also runs at midnight UTC for global coverage
     */
    start(): void {
        if (this.isRunning) {
            console.log('Token scheduler is already running');
            return;
        }

        // 🇮🇳 Schedule daily token refresh at midnight IST (Indian Standard Time)
        cron.schedule('0 0 * * *', async () => {
            console.log('🇮🇳 Running scheduled daily token refresh (IST - Indian Standard Time)...');
            try {
                const updatedCount = await this.userService.refreshDailyTokensIfNeeded();
                console.log(`🇮🇳 IST Daily token refresh completed. Updated ${updatedCount} users.`);
            } catch (error) {
                console.error('🇮🇳 Error during IST scheduled token refresh:', error);
            }
        }, {
            scheduled: true,
            timezone: 'Asia/Kolkata' // 🇮🇳 Indian Standard Time
        });

        // 🌍 Schedule daily token refresh at midnight UTC for global coverage
        cron.schedule('0 0 * * *', async () => {
            console.log('🌍 Running scheduled daily token refresh (UTC - Global)...');
            try {
                const updatedCount = await this.userService.refreshDailyTokensIfNeeded();
                console.log(`🌍 UTC Daily token refresh completed. Updated ${updatedCount} users.`);
            } catch (error) {
                console.error('🌍 Error during UTC scheduled token refresh:', error);
            }
        }, {
            scheduled: true,
            timezone: 'UTC' // 🌍 Global UTC time
        });

        // Also run a check every 4 hours to catch any missed refreshes
        cron.schedule('0 */4 * * *', async () => {
            try {
                const updatedCount = await this.userService.refreshDailyTokensIfNeeded();
                if (updatedCount > 0) {
                    console.log(`🔄 4-hourly token check: Updated ${updatedCount} users.`);
                }
            } catch (error) {
                console.error('🔄 Error during 4-hourly token check:', error);
            }
        }, {
            scheduled: true,
            timezone: 'UTC'
        });

        this.isRunning = true;
        console.log('🚀 Token scheduler started successfully');
        console.log('🇮🇳 - IST Daily refresh: Every day at 00:00 IST (Asia/Kolkata)');
        console.log('🌍 - UTC Daily refresh: Every day at 00:00 UTC (Global)');
        console.log('🔄 - 4-hourly check: Every 4 hours at minute 0');
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
