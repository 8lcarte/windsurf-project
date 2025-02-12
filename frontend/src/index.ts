// Entry point for MSW initialization
async function initializeMockServiceWorker() {
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser');
    return worker.start({
      onUnhandledRequest: 'bypass',
    });
  }
  return Promise.resolve();
}

// Initialize MSW before mounting React
initializeMockServiceWorker().catch(console.error).finally(() => {
  import('./main.tsx');
});
