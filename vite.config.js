import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import JavaScriptObfuscator from 'javascript-obfuscator';

const generateRandomFileName = (length = 8) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let name = '';
  for (let i = 0; i < length; i += 1) {
    name += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const randomNumber = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${randomNumber}.${name}.js`;
};

const createClientReleasePlugin = ({ isProd }) => {
  const clientReleasePath = path.resolve(__dirname, 'src/utils/clientRelease.js');
  // dev 环境使用的固定路径；生产构建会替换为带内容哈希的文件名
  const devRelPath = 'static/ClientRelease.js';
  let viteBase = './'; // vite 最终解析后的 base（可能是 CDN 前缀）

  // 读取源文件并包装成 IIFE，挂载到 window.ClientRelease
  function buildIIFE() {
    const src = fs.readFileSync(clientReleasePath, 'utf-8');
    // 移除 ESM 的 import/export 语法（本文件没有 import，只有 export）
    let body = src
      // 移除 export {...} 命名导出
      .replace(/export\s*\{[^}]+\};?/g, '')
      // 移除 export default ...
      .replace(/export\s+default\s+[^\n;]+;?/g, '')
      // 移除 export function/class 前缀（本文件没用到，防御性处理）
      .replace(/export\s+function\s+/g, 'function ')
      .replace(/export\s+class\s+/g, 'class ');

    // 包装成 IIFE，挂载到 window
    return `(function(){
  // Auto-generated from src/utils/clientRelease.js — DO NOT EDIT
${body.replace(/^/gm, '  ')}
  window.ClientRelease = { clientRelease, prettyName, formatSize, mirrorUrls, ClientReleaseManager };
})();
`;
  }

  async function minifyCode(code) {
    try {
      const terser = await import('terser');
      const result = await terser.minify(code, {
        compress: {
          drop_console: false,
          drop_debugger: true
        },
        mangle: true,
        format: {
          comments: false,
          ascii_only: true
        }
      });
      return result.code || code;
    } catch (err) {
      console.warn('[client-release-utils] terser 压缩失败，使用未压缩版本:', err.message);
      return code;
    }
  }

  // 将相对路径替换为带 base（CDN）的路径
  function resolveAssetUrl(relPath) {
    // viteBase 结尾已带 /，直接拼接
    return viteBase + relPath;
  }

  // 取内容哈希（与 vite 产物一致，用短哈希即可）
  function contentHash(code) {
    return crypto.createHash('sha256').update(code).digest('hex').slice(0, 8);
  }

  // 更新 landingpage.html 中的脚本引用路径（指向带哈希的文件名 + CDN 前缀）
  function patchLandingPage(relPath) {
    const landingHtmlPath = path.resolve(__dirname, 'dist', 'landingpage.html');
    if (!fs.existsSync(landingHtmlPath)) return; // 如果没有输出 landingpage.html 就跳过

    try {
      let html = fs.readFileSync(landingHtmlPath, 'utf-8');
      const finalUrl = resolveAssetUrl(relPath);
      // 替换 landingpage.html 中的脚本引用
      const before = html;
      html = html.replace(
        /src="\.\/static\/ClientRelease\.js"/g,
        `src="${finalUrl}"`
      );
      if (html === before) {
        // 引用没被替换说明标记不匹配，静默产出旧引用会导致线上加载到过期脚本
        console.warn(
          '[client-release-utils] 未在 landingpage.html 找到 ./static/ClientRelease.js 引用，跳过替换'
        );
        return;
      }
      fs.writeFileSync(landingHtmlPath, html, 'utf-8');
      console.log(`更新 landingpage.html 引用: ${relPath} → ${finalUrl}`);
    } catch (err) {
      console.warn('[client-release-utils] 更新 landingpage.html 失败:', err.message);
    }
  }

  return {
    name: 'client-release-utils',

    // 拿到 vite 解析后的 base（可能包含 CDN 前缀）
    configResolved(config) {
      viteBase = config.base || './';
    },

    // dev 环境：拦截 /static/ClientRelease.js 请求
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url.startsWith(`/${devRelPath}`)) {
          try {
            const content = buildIIFE();
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            res.end(content);
          } catch (err) {
            console.warn('[client-release-utils] dev 生成失败:', err);
            next();
          }
        } else {
          next();
        }
      });
    },

    // 生产构建：写入 dist/static/ClientRelease-<hash>.js（terser 压缩），并更新 landingpage.html 引用
    async closeBundle() {
      if (!isProd) return;
      try {
        let content = buildIIFE();
        content = await minifyCode(content);

        // 带内容哈希的文件名：内容变则 URL 变，避免 CDN 提供过期副本
        const relPath = `static/ClientRelease-${contentHash(content)}.js`;
        const distFile = path.resolve(__dirname, 'dist', relPath);
        const distDir = path.dirname(distFile);
        if (!fs.existsSync(distDir)) {
          fs.mkdirSync(distDir, { recursive: true });
        }
        fs.writeFileSync(distFile, content, 'utf-8');
        console.log(`生成客户端 release 工具: ${relPath} (${(Buffer.byteLength(content, 'utf-8') / 1024).toFixed(1)} kB)`);

        // 文件名已带哈希，无论是否配置 CDN 都必须更新引用
        patchLandingPage(relPath);
      } catch (err) {
        console.warn('[client-release-utils] 构建生成失败:', err);
      }
    }
  };
};

const createRuntimeConfigPlugin = ({ enableConfigJS, enableObfuscation, extraScriptFileName }) => ({
  name: 'ez-runtime-config',
  transformIndexHtml(html) {
    if (!enableConfigJS) {
      return html.replace('<!--EZ_CONFIG_SCRIPT-->', '');
    }

    return html.replace('<!--EZ_CONFIG_SCRIPT-->', `<script src="./${extraScriptFileName}"></script>`);
  },
  closeBundle() {
    if (!enableConfigJS) return;

    const configPath = path.resolve(__dirname, 'src/config/index.js');
    const distPath = path.resolve(__dirname, 'dist', extraScriptFileName);

    try {
      let content = fs.readFileSync(configPath, 'utf-8');
      content = content.replace(/window\.EZ_CONFIG\s*=\s*config\s*;?/g, '');
      content = content.replace(/export\s+const\s+config\s*=/, 'window.EZ_CONFIG =');

      if (enableObfuscation) {
        content = JavaScriptObfuscator.obfuscate(content, {
          compact: true,
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: 0.75,
          numbersToExpressions: true,
          simplify: true,
          stringArray: true,
          stringArrayEncoding: ['rc4'],
          stringArrayThreshold: 0.75,
          transformObjectKeys: true,
          unicodeEscapeSequence: true
        }).getObfuscatedCode();
      }

      fs.writeFileSync(distPath, content, 'utf-8');
      console.log(`生成獨立設定檔: ${extraScriptFileName}`);
    } catch (err) {
      console.warn('生成獨立設定檔失敗:', err);
    }
  }
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';
  const enableConfigJS = isProd && env.VUE_APP_CONFIGJS === 'true';
  const enableObfuscation = env.VUE_APP_OBFUSCATION === 'true';
  const extraScriptFileName = enableConfigJS ? generateRandomFileName() : '';

  // CDN 静态资源前缀：设置后所有构建产物引用该域名
  // 留空则使用相对路径 './'，与原行为一致
  const cdnUrl = env.VITE_CDN_URL || '';
  const base = cdnUrl
    ? cdnUrl.endsWith('/') ? cdnUrl : `${cdnUrl}/`
    : './';

  return {
    base,
    plugins: [
      vue(),
      createRuntimeConfigPlugin({
        enableConfigJS,
        enableObfuscation,
        extraScriptFileName
      }),
      createClientReleasePlugin({ isProd })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    define: {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
      'process.env': {
        NODE_ENV: mode,
        VUE_APP_TITLE: env.VUE_APP_TITLE,
        VUE_APP_ENV: env.VUE_APP_ENV,
        VUE_APP_DEBUGGING: env.VUE_APP_DEBUGGING,
        VUE_APP_CONFIGJS: env.VUE_APP_CONFIGJS,
        VUE_APP_OBFUSCATION: env.VUE_APP_OBFUSCATION,
        VITE_CDN_URL: cdnUrl,
        BASE_URL: base
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "@/assets/styles/base/variables.scss" as *;'
        }
      }
    },
    optimizeDeps: {
      include: ['axios', 'vue', 'vue-router', 'pinia', 'vue-i18n']
    },
    build: {
      outDir: 'dist',
      assetsDir: 'static',
      cssCodeSplit: false,
      sourcemap: false,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProd,
          drop_debugger: true
        },
        mangle: true,
        format: {
          comments: false,
          ascii_only: true
        }
      },
      rollupOptions: {
        output: {
          experimentalMinChunkSize: 150 * 1024,
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;

            // 只把体积大、且首屏用不到的图表库单独拆，其余依赖统一归 vendor，减少文件碎片。
            if (id.includes('echarts') || id.includes('chart.js')) return 'charts';
            return 'vendor';
          }
        }
      }
    },
    server: {
      host: '0.0.0.0',
      port: 5173
    },
    test: {
      setupFiles: ['tests/setup/localStorage.js']
    }
  };
});
