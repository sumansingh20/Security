// Vercel Serverless Handler
let app;
try {
  const mod = await import('../src/app.js');
  app = mod.default;
} catch (err) {
  console.error('[VERCEL CRASH]', err.message);
  console.error('[VERCEL STACK]', err.stack);
  // Return a fallback handler that reports the error
  app = (req, res) => {
    res.status(500).json({
      success: false,
      error: 'Server failed to initialize',
      details: err.message,
      stack: err.stack,
    });
  };
}

export default app;
