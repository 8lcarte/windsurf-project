import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Export the worker instance
export const worker = setupWorker(...handlers);

// Initialize the MSW worker
if (process.env.NODE_ENV === 'development') {
  worker.start({
    serviceWorker: {
      options: {
        scope: '/',
      },
    },
    onUnhandledRequest: 'bypass',
  }).catch(console.error);
}
