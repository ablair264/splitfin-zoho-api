import OrdersAggregator from './ordersAggregator.js';

class OrdersController {
    constructor() {
        this.aggregator = new OrdersAggregator();
    }

    /**
     * Get orders data for a specific date range
     */
    async getOrdersData(req, res) {
        try {
            const { rangeKey = 'this_week' } = req.query;
            
            console.log(`📦 Fetching orders data for range: ${rangeKey}`);
            
            const data = await this.aggregator.getOrdersData(rangeKey);
            
            res.json({
                success: true,
                data,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Error fetching orders data:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch orders data',
                message: error.message
            });
        }
    }

    /**
     * Get orders data for custom date range
     */
    async getOrdersDataCustomRange(req, res) {
        try {
            const { startDate, endDate } = req.query;
            
            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    error: 'startDate and endDate are required'
                });
            }
            
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid date format'
                });
            }
            
            console.log(`📦 Fetching orders data for custom range: ${startDate} to ${endDate}`);
            
            const data = await this.aggregator.combineAggregatesForRange(start, end);
            
            res.json({
                success: true,
                data,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Error fetching orders data for custom range:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch orders data',
                message: error.message
            });
        }
    }

    /**
     * Trigger daily aggregation
     */
    async runDailyAggregation(req, res) {
        try {
            console.log('🚀 Triggering daily orders aggregation...');
            
            await this.aggregator.runDailyAggregation();
            
            res.json({
                success: true,
                message: 'Daily orders aggregation completed successfully',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Error running daily orders aggregation:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to run daily aggregation',
                message: error.message
            });
        }
    }

    /**
     * Get available date ranges
     */
    getAvailableRanges(req, res) {
        const ranges = [
            { key: 'today', label: 'Today' },
            { key: 'this_week', label: 'This Week' },
            { key: '7_days', label: 'Last 7 Days' },
            { key: '30_days', label: 'Last 30 Days' },
            { key: 'quarter', label: 'This Quarter' },
            { key: 'this_year', label: 'This Year' },
            { key: 'all_time', label: 'All Time' }
        ];
        
        res.json({
            success: true,
            data: ranges
        });
    }
}

export default OrdersController; 