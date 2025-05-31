const { setData } = require('../data/store');

module.exports = {
  definition: {
    name: 'write_config',
    description: 'Stores a configuration value for a given key.',
    parameters: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Configuration key to set.'
        },
        value: {
          type: ['string'],
          description: 'Configuration value to store.'
        }
      },
      required: ['key', 'value'],
      additionalProperties: false
    }
  },
  handler: async ({ userId, key, value }) => {
    setData(`${userId}:${key}`, value);
    return { value };
  }
};
