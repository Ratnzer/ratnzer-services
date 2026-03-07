const prisma = require('../config/db');
const { getProvider } = require('../utils/providerManager');
const kd1sClient = require('../utils/kd1sClient');

/**
 * Smart Availability Sync Service
 * Periodically checks provider services and updates product/region availability
 */
const syncAvailability = async () => {
  console.log('[Availability Sync] Starting sync process...');
  
  try {
    // 1. Get all products that have autoSyncAvailability enabled
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { autoSyncAvailability: true },
          { regions: { not: null } } // Check regions too as they might have sync enabled
        ]
      }
    });

    if (products.length === 0) {
      console.log('[Availability Sync] No products found for sync.');
      return;
    }

    // 2. Fetch all services from KD1S (main provider)
    // Note: We'll implement a simple fetch for KD1S services here
    const kd1sServices = await fetchKD1SServices();
    
    for (const product of products) {
      let productChanged = false;
      let regions = product.regions;
      const apiConfig = typeof product.apiConfig === 'string' ? JSON.parse(product.apiConfig) : product.apiConfig;

      // Case A: Sync for specific regions
      if (Array.isArray(regions)) {
        for (let i = 0; i < regions.length; i++) {
          const region = regions[i];
          if (region.autoSyncAvailability && region.apiServiceId) {
            const service = kd1sServices.find(s => String(s.service) === String(region.apiServiceId));
            const isAvailable = !!service; // If service exists in provider list, it's available
            
            if (region.isAvailable !== isAvailable) {
              console.log(`[Availability Sync] Updating Region ${region.name} in Product ${product.name}: ${isAvailable ? 'Available' : 'Unavailable'}`);
              regions[i].isAvailable = isAvailable;
              productChanged = true;
            }
          }
        }
      }

      // Case B: Sync for the whole product
      if (product.autoSyncAvailability && apiConfig?.serviceId) {
        const service = kd1sServices.find(s => String(s.service) === String(apiConfig.serviceId));
        const isAvailable = !!service;

        if (product.isAvailable !== isAvailable) {
          console.log(`[Availability Sync] Updating Product ${product.name}: ${isAvailable ? 'Available' : 'Unavailable'}`);
          await prisma.product.update({
            where: { id: product.id },
            data: { isAvailable }
          });
        }
      }

      // Save updated regions if any changed
      if (productChanged) {
        await prisma.product.update({
          where: { id: product.id },
          data: { regions }
        });
      }
    }

    console.log('[Availability Sync] Sync process completed successfully.');
  } catch (error) {
    console.error('[Availability Sync] Error during sync:', error.message);
  }
};

/**
 * Helper to fetch all services from KD1S
 */
async function fetchKD1SServices() {
  const KD1S_API_URL = (process.env.KD1S_API_URL || 'https://kd1s.com/api/v2').replace(/\/$/, '');
  const KD1S_API_KEY = process.env.KD1S_API_KEY;

  if (!KD1S_API_KEY) return [];

  try {
    const response = await fetch(`${KD1S_API_URL}?key=${KD1S_API_KEY}&action=services`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[Availability Sync] Failed to fetch KD1S services:', err.message);
    return [];
  }
}

module.exports = { syncAvailability };
