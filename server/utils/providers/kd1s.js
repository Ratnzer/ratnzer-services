const kd1sClient = require('../kd1sClient');

/**
 * KD1S Provider Implementation
 */
const kd1sProvider = {
  name: 'KD1S',

  /**
   * Place an order with KD1S
   */
  placeOrder: async ({ serviceId, link, quantity }) => {
    const result = await kd1sClient.placeOrder({
      serviceId,
      link,
      quantity
    });
    return {
      orderId: result.orderId,
      providerName: 'KD1S',
      raw: result.raw
    };
  },

  /**
   * Get order status from KD1S
   */
  getOrderStatus: async (providerOrderId) => {
    const result = await kd1sClient.getOrderStatus(providerOrderId);
    return {
      normalizedStatus: result.normalizedStatus,
      providerStatus: result.providerStatus,
      raw: result.raw
    };
  }
};

module.exports = kd1sProvider;
