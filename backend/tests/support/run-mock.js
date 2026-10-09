// Starts the stand-in cloud on a fixed port for manual testing:  node tests/support/run-mock.js 6001
const { createMockSupabase } = require('./mock-supabase');
const port = Number(process.argv[2] || 6001);
const mock = createMockSupabase({ appSecret: 'test-app-secret', apiKey: 'test-publishable-key' });
const server = require('http').createServer();
mock.listen(port).then((p) => console.log(`mock cloud on http://127.0.0.1:${p}`));
