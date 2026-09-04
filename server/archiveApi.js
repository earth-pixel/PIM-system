// Compatibility wrapper; the shared API requires a verified server session.
import express from 'express';
import { createApi } from './api.js';
export function createArchiveApi(dbPath) {
  const app = express();
  const api = createApi(dbPath);
  app.use((req, res, next) => {
    if (req.url.startsWith('/archive-delete')) req.url = '/quotations' + req.url;
    api(req, res, next);
  });
  return app;
}
