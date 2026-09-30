import { defineConfig } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Halaman render WebCodecs (web/). Endpoint /__save menulis hasil ke out/.
export default defineConfig({
  root: 'web',
  publicDir: '../public',
  plugins: [

    {
      name: 'simpan-hasil',
      configureServer(server) {
        server.middlewares.use('/__save', (req, res) => {
          const name = new URL(req.url ?? '', 'http://x').searchParams.get('name')?.replace(/[^\w.-]/g, '') || 'promo.mp4';
          const chunks: Buffer[] = [];
          req.on('data', (c) => chunks.push(c));
          req.on('end', () => {
            mkdirSync(join(process.cwd(), 'out'), { recursive: true });
            writeFileSync(join(process.cwd(), 'out', name), Buffer.concat(chunks));
            res.statusCode = 201;
            res.end('ok');
          });
        });
      },
    },
  ],
  // Satu pra-bundel untuk semua: dua salinan `remotion` membuat delayRender dari <Img>
  // tak pernah dilepas oleh renderer web.
  optimizeDeps: { include: ['mediabunny', '@remotion/media', 'react', 'react-dom', 'react/jsx-runtime', 'remotion', '@remotion/web-renderer', '@remotion/transitions', '@remotion/transitions/slide', '@remotion/transitions/wipe', '@remotion/transitions/fade', '@remotion/google-fonts/PlusJakartaSans', 'lucide-react'] },
  resolve: { dedupe: ['react', 'react-dom', 'remotion'] },
  server: { port: 5199, strictPort: true },
});
