// Keep-Alive Service - Prevents cold starts on platforms that may idle apps
const https = require('https');

class HerokuKeepAlive {
  constructor(appUrl, interval = 25 * 60 * 1000) { // 25 minutes
    this.appUrl = appUrl;
    this.interval = interval;
    this.timer = null;
  }

  start() {
    if (process.env.NODE_ENV === 'production' && this.appUrl) {
  console.log('🔥 Starting keep-alive service...');
      this.timer = setInterval(() => {
        this.ping();
      }, this.interval);
      
      // Initial ping after 1 minute
      setTimeout(() => this.ping(), 60000);
    }
  }

  ping() {
    const url = `${this.appUrl}/api/health`;
    https.get(url, (res) => {
      console.log(`📍 Keep-alive ping: ${res.statusCode} at ${new Date().toISOString()}`);
    }).on('error', (err) => {
      console.log('⚠️ Keep-alive ping failed:', err.message);
    });
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
  console.log('🛑 Keep-alive service stopped');
    }
  }
}

module.exports = HerokuKeepAlive;