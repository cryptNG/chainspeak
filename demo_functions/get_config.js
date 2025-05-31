// functions/get_config.js

const { getData } = require('../data/store');

module.exports = {
  definition: {
    name:        'get_config',
    description: 'Retrieves stored configuration values.',
    parameters: {
      type:       'object',
      properties: {
        key: {
          type:        'string',
          description: 'Configuration key to retrieve.'
        }
      },
      required: ['key'],
      additionalProperties: false
    }
  },
  handler: async ({userId, key }) => {
    const value = getData(`${userId}:${key}`) || null;
    return { value };
  }
};
