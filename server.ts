import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// Vite Middleware for Dev / Static Server for Production (Hostinger)
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath =
      path.basename(process.cwd()) === "dist"
        ? process.cwd()
        : path.resolve(process.cwd(), "dist");

    app.use((req, res, next) => {
      if (req.path === "/server.cjs" || req.path === "/server.cjs.map") {
        return res.status(404).end();
      }
      next();
    });
    app.use(express.static(distPath));
    app.get('/sitemap.xml', (req, res) => {
      res.sendFile(path.join(distPath, 'sitemap.xml'));
    });
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
