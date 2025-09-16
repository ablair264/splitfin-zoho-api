import axios from 'axios';
import { logger } from '../utils/logger.js';

class ZohoAuth {
  constructor() {
    this.clientId = process.env.ZOHO_CLIENT_ID;
    this.clientSecret = process.env.ZOHO_CLIENT_SECRET;
    this.refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    this.orgId = process.env.ZOHO_ORG_ID;
    this.accessToken = null;
    this.tokenExpiry = null;
    
    this.authUrl = 'https://accounts.zoho.eu/oauth/v2/token';
    this.inventoryApiUrl = 'https://www.zohoapis.eu/inventory/v1';
    this.crmApiUrl = 'https://www.zohoapis.eu/crm/v5';
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        this.authUrl,
        new URLSearchParams({
          refresh_token: this.refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + 3500 * 1000); // 58 minutes
      
      logger.info('Zoho access token refreshed successfully');
      return this.accessToken;
    } catch (error) {
      logger.error('Failed to refresh Zoho access token:', error.response?.data || error.message);
      throw error;
    }
  }

  async makeRequest(url, method = 'GET', data = null, retries = 3) {
    const accessToken = await this.getAccessToken();
    
    try {
      const response = await axios({
        method,
        url,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-com-zoho-inventory-organizationid': this.orgId,
          'Content-Type': 'application/json',
        },
        data,
        params: method === 'GET' ? data : undefined,
      });

      return response.data;
    } catch (error) {
      if (error.response?.status === 429 && retries > 0) {
        const retryAfter = parseInt(error.response.headers['retry-after'] || '5');
        const delay = Math.min(retryAfter * 1000, 60000); // Cap at 1 minute max
        logger.warn(`Rate limit hit, waiting ${delay}ms before retry (retry-after: ${retryAfter}s)...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequest(url, method, data, retries - 1);
      }
      
      if (error.response?.status === 401 && retries > 0) {
        logger.warn('Access token expired, refreshing...');
        this.accessToken = null;
        return this.makeRequest(url, method, data, retries - 1);
      }

      throw error;
    }
  }

  async getInventoryData(endpoint, params = {}) {
    const url = `${this.inventoryApiUrl}/${endpoint}`;
    return this.makeRequest(url, 'GET', params);
  }

  async getCRMData(endpoint, params = {}) {
    const url = `${this.crmApiUrl}/${endpoint}`;
    return this.makeRequest(url, 'GET', params);
  }
}

export const zohoAuth = new ZohoAuth();