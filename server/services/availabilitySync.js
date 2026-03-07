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
    // 1. Get all products to check them manually (more reliable than complex JSON queries in some DBs)
    const products = await prisma.product.findMany();
    
    // Filter products that need sync (either global or any region)
    const productsToSync = products.filter(p => {
      if (p.autoSyncAvailability) return true;
      const regions = typeof p.regions === 'string' ? JSON.parse(p.regions) : p.regions;
      return Array.isArray(regions) && regions.some(r => r.autoSyncAvailability);
    });

    console.log(`[Availability Sync] Found ${productsToSync.length} products to sync out of ${products.length} total.`);

    if (productsToSync.length === 0) {
      return;
    }

    // 2. Fetch all services from KD1S (main provider)
    // Note: We'll implement a simple fetch for KD1S services here
    const kd1sServices = await fetchKD1SServices();
    
    for (const product of productsToSync) {
      let productChanged = false;
      let regions = product.regions;
      const apiConfig = typeof product.apiConfig === 'string' ? JSON.parse(product.apiConfig) : product.apiConfig;

      // Case A: Sync for specific regions
      let currentRegions = typeof regions === 'string' ? JSON.parse(regions) : regions;
      if (Array.isArray(currentRegions)) {
        for (let i = 0; i < currentRegions.length; i++) {
          const region = currentRegions[i];
          if (region.autoSyncAvailability && region.apiServiceId) {
            const service = kd1sServices.find(s => String(s.service) === String(region.apiServiceId));
            const isAvailable = !!service; // If service exists in provider list, it's available
            
            // ✅ Match manual behavior: If service is missing, set isAvailable to false
            if (region.isAvailable !== isAvailable) {
              console.log(`[Availability Sync] Updating Region ${region.name} in Product ${product.name}: ${isAvailable ? 'Available' : 'Unavailable'}`);
              currentRegions[i].isAvailable = isAvailable;
              productChanged = true;
            }
          }
        }
      }

      // Case B: Sync for the whole product
      if (product.autoSyncAvailability && apiConfig?.serviceId) {
        const service = kd1sServices.find(s => String(s.service) === String(apiConfig.serviceId));
        const isAvailable = !!service;

        // ✅ Match manual behavior: If service is missing, set isAvailable to false
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
          data: { regions: currentRegions }
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
