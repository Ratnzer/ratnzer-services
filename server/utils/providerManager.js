const kd1sProvider = require('./providers/kd1s');

/**
 * Provider Registry
 * To add a new provider, create its file in utils/providers and register it here.
 */
const providers = {
  KD1S: kd1sProvider,
  kd1s: kd1sProvider, // support lowercase
  // NewProviderA: require('./providers/newProviderA'),
};

/**
 * Get a provider instance by name
 * @param {string} providerName - Name of the provider (e.g., 'KD1S')
 * @returns {object} Provider implementation
 */
const getProvider = (providerName) => {
  // Default to KD1S if not specified, for backward compatibility
  const name = providerName || 'KD1S';
  const provider = providers[name];

  if (!provider) {
    throw new Error(`Provider "${name}" is not supported or registered.`);
  }

  return provider;
};

/**
 * Get all registered provider names
 * @returns {string[]} Array of provider names
 */
const getSupportedProviders = () => Object.keys(providers);

module.exports = {
  getProvider,
  getSupportedProviders
};
