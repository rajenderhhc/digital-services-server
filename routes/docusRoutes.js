const express = require('express');
const path = require('path');

const router = express.Router();

// Helper function to resolve and set up static routes
function setupStaticRoute(routePath, folderName) {
  const resolvedPath = path.resolve(__dirname, `../uploads/${folderName}`);
  router.use(routePath, express.static(resolvedPath));
}

// Set up static file serving routes
setupStaticRoute('/', 'profileDocuments');

module.exports = router;
