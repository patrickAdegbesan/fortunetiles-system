// Gateway to the in-app server. The real implementation (./runtime) is only bundled into the Android build:
// the check below is a compile-time constant, so the desktop build never loads it.
export const isAndroidApp = process.env.REACT_APP_PLATFORM === 'android';

function runtime() {
  if (process.env.REACT_APP_PLATFORM === 'android') {
    return require('./runtime'); // eslint-disable-line global-require
  }
  throw new Error('The in-app server is only available in the Android app');
}

export const ensureReady = () => runtime().ensureReady();
export const localRequest = (request) => runtime().localRequest(request);
export const installFetchShim = () => runtime().installFetchShim();
