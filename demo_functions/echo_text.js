//  exemplary tool call

module.exports = {
  definition: {
    name:        'echo_text',
    description: 'Echoes back provided text.',
    parameters: {
      type:                 'object',
      properties: {
        text: {
          type:        'string',
          description: 'Text to echo back.'
        }
      },
      required:             ['text'],
      additionalProperties: false
    }
  },
  handler: async ({ text }) => {
    return { result: text };
  }
};
