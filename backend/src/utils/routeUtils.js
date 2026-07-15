const extractRoutes = (app) => {
  const routes = [];

  const extractPath = (layer, prefix = '') => {
    if (layer.route) {
      // It's a registered route
      const path = prefix + (layer.route.path === '/' ? '' : layer.route.path);
      const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
      methods.forEach(method => {
        routes.push({
          method,
          path: path || '/',
          module: prefix.split('/')[2] || 'core' // Extract module name e.g. /api/auth -> auth
        });
      });
    } else if (layer.name === 'router' && layer.handle.stack) {
      // It's a router
      let newPrefix = prefix;
      if (layer.regexp) {
        // Express regex magic to extract mounted path
        const match = layer.regexp.toString().match(/^\/\^\\\/(.*?)\\\/\?\(\?\=\\\/\|\$\)\/i/);
        if (match && match[1]) {
          newPrefix += '/' + match[1].replace(/\\\//g, '/');
        }
      }
      layer.handle.stack.forEach((stackItem) => extractPath(stackItem, newPrefix));
    }
  };

  app._router.stack.forEach((layer) => extractPath(layer));

  // Deduplicate routes
  const uniqueRoutes = [];
  const seen = new Set();
  for (const r of routes) {
    const key = `${r.method}-${r.path}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRoutes.push(r);
    }
  }

  // Sort alphabetically
  return uniqueRoutes.sort((a, b) => a.path.localeCompare(b.path));
};

module.exports = {
  extractRoutes
};
