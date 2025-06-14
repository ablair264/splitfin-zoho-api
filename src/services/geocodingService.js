import axios from 'axios';

class GeocodingService {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Get coordinates from UK postcode
   */
  async getCoordinatesFromPostcode(postcode) {
    if (!postcode) return null;
    
    // Check cache first
    const cacheKey = postcode.replace(/\s+/g, '').toUpperCase();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      const response = await axios.get(`https://api.postcodes.io/postcodes/${cacheKey}`);
      
      if (response.data.status === 200 && response.data.result) {
        const result = {
          latitude: response.data.result.latitude,
          longitude: response.data.result.longitude,
          region: response.data.result.european_electoral_region,
          country: response.data.result.country,
          admin_district: response.data.result.admin_district
        };
        
        // Cache the result
        this.cache.set(cacheKey, result);
        
        return result;
      }
      return null;
    } catch (error) {
      console.error(`Geocoding error for ${postcode}:`, error.message);
      return null;
    }
  }

  /**
   * Determine UK region from location data
   */
  determineUKRegion(locationData) {
    if (!locationData) return 'Unknown';
    
    const region = locationData.region?.toLowerCase() || '';
    const country = locationData.country?.toLowerCase() || '';
    const district = locationData.admin_district?.toLowerCase() || '';
    
    if (country === 'scotland') return 'Scotland';
    if (country === 'wales') return 'Wales';
    if (region.includes('london') || district.includes('london')) return 'London';
    if (region.includes('north east')) return 'North East';
    if (region.includes('north west')) return 'North West';
    if (region.includes('yorkshire')) return 'North East';
    if (region.includes('east midlands') || region.includes('west midlands')) return 'Midlands';
    if (region.includes('south east')) return 'South East';
    if (region.includes('south west')) return 'South West';
    if (region.includes('eastern')) return 'South East';
    
    return 'Unknown';
  }

  /**
   * Process customer location data
   */
  async processCustomerLocation(customerData) {
    const postcode = customerData.postcode || customerData.postal_code || customerData.zip_code;
    
    if (!postcode) {
      return {
        ...customerData,
        location_region: 'Unknown'
      };
    }
    
    const locationData = await this.getCoordinatesFromPostcode(postcode);
    
    if (locationData) {
      return {
        ...customerData,
        postcode: postcode.toUpperCase(),
        coordinates: {
          latitude: locationData.latitude,
          longitude: locationData.longitude
        },
        location_region: this.determineUKRegion(locationData),
        location_country: locationData.country,
        location_district: locationData.admin_district,
        location_updated: new Date().toISOString()
      };
    }
    
    return {
      ...customerData,
      location_region: 'Unknown'
    };
  }
}

export default new GeocodingService();