/**
 * 客户端 Release 数据获取核心模块
 * 从 GitHub 最新 release 动态获取下载地址，支持三源降级 + 本地缓存
 *
 * 设计：纯 JS 单例类，不依赖任何框架。
 * - Vue 侧：直接 import 使用（ESM 格式）
 * - 静态页面（landingpage.html）侧：通过 IIFE 版本挂载到 window.ClientRelease 使用
 *
 * 仓库：go2world-icu/FlClash-Publish
 */

const SOURCES = [
  'https://api.github.com/repos/go2world-icu/FlClash-Publish/releases/latest',
  'https://app.toworld.uk/https://api.github.com/repos/go2world-icu/FlClash-Publish/releases/latest',
  'https://appr2.toworld.uk/repos/go2world-icu/FlClash-Publish/releases/latest'
];

const CACHE_KEY = 'client_latest_release';
const CACHE_TTL = 60 * 60 * 1000; // 1 小时

// 各平台首选架构优先级
const PLATFORM_PREFS = {
  android: ['arm64-v8a', 'arm64'],
  macos: ['arm64'],
  windows: ['amd64', 'setup'],
  linux: ['amd64', 'x86_64'],
  openwrt: [] // 暂时没有首选，返回第一个匹配
};

// ===== 工具函数 =====

function getCached() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (c && c.ts && (Date.now() - c.ts < CACHE_TTL) && c.data && Array.isArray(c.data.assets)) {
      return c.data;
    }
  } catch (e) {}
  return null;
}

function setCached(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch (e) {}
}

/**
 * 依次尝试三个源，返回第一个结构正确的 release
 */
function fetchRelease() {
  return SOURCES.reduce((promise, url) => {
    return promise.catch(() => {
      return fetch(url).then(res => {
        if (!res.ok) throw new Error('http ' + res.status);
        return res.json();
      }).then(data => {
        if (!data || !Array.isArray(data.assets)) throw new Error('bad shape');
        return data;
      });
    });
  }, Promise.reject());
}

/**
 * 过滤指定平台的 assets
 */
function assetsOf(data, platform) {
  const assets = (data && data.assets) || [];
  return assets.filter(a => {
    const n = (a.name || '').toLowerCase();
    switch (platform) {
      case 'android':
        return n.includes('-android-') && /\.apk$/i.test(n);
      case 'windows':
        return n.includes('-windows-');
      case 'macos':
        return n.includes('-macos-') && /\.dmg$/i.test(n);
      case 'linux':
        return n.includes('-linux-');
      case 'openwrt':
        return n.includes('-openwrt-');
      default:
        return false;
    }
  });
}

/**
 * 从列表中按优先级选择首选 asset
 */
function pickPrimary(list, prefs) {
  if (!list || !list.length) return null;
  for (let i = 0; i < prefs.length; i++) {
    for (let j = 0; j < list.length; j++) {
      if ((list[j].name || '').indexOf(prefs[i]) !== -1) return list[j];
    }
  }
  return list[0] || null;
}

/**
 * 美化版本变体名称（去掉前缀版本号、扩展名、连字符等）
 */
function prettyName(name) {
  let n = (name || '').replace(/^[^-]+-\d[\d.]*-/i, '')
    .replace(/\.(apk|dmg|exe|zip|tar\.gz|ipk)$/i, '')
    .replace(/-+/g, ' ')
    .trim();
  n = n.charAt(0).toUpperCase() + n.slice(1);
  n = n.replace(/\bmacos\b/gi, 'macOS');
  return n;
}

/**
 * 格式化字节大小
 */
function formatSize(bytes) {
  if (!bytes) return '';
  const mb = bytes / 1024 / 1024;
  return mb >= 1024 ? (mb / 1024).toFixed(2) + ' GB' : mb.toFixed(1) + ' MB';
}

/**
 * 将 GitHub 下载 URL 转换为两个镜像地址
 */
function mirrorUrls(url) {
  if (!url) return ['', ''];
  return [
    url.replace(/^https:\/\/github\.com\//, 'https://app.toworld.uk/https://github.com/'),
    url.replace(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\//, 'https://appr2.toworld.uk/$1/$2/')
  ];
}

// ===== 单例类 =====

class ClientReleaseManager {
  constructor() {
    this._releaseData = null;
    this._loading = false;
    this._promise = null;
    this._loadedFromCache = false;
    this._listeners = [];
  }

  /**
   * 订阅数据变化（供 Vue/React 等响应式框架使用）
   * callback 会在 data/loading 变化时被调用
   */
  subscribe(callback) {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter(cb => cb !== callback);
    };
  }

  _notify() {
    this._listeners.forEach(cb => {
      try { cb(this._releaseData, this._loading); } catch (e) {}
    });
  }

  get data() {
    return this._releaseData;
  }

  get loading() {
    return this._loading;
  }

  get tag() {
    return this._releaseData?.tag_name || '';
  }

  /**
   * 加载 release 数据（带缓存 + 单例）
   * 返回 Promise，resolve 时数据已就绪
   */
  async load() {
    // 1. 先尝试本地缓存
    if (!this._releaseData && !this._loadedFromCache) {
      const cached = getCached();
      if (cached) {
        this._releaseData = cached;
        this._loadedFromCache = true;
        this._notify();
      }
    }

    // 2. 如果已经在加载中，复用同一个 promise
    if (this._loading && this._promise) {
      return this._promise;
    }

    this._loading = true;
    this._notify();

    this._promise = fetchRelease()
      .then(data => {
        this._releaseData = data;
        setCached(data);
        this._notify();
        return data;
      })
      .catch(err => {
        console.warn('[clientRelease] 所有源均获取失败:', err);
        throw err;
      })
      .finally(() => {
        this._loading = false;
        this._promise = null;
        this._notify();
      });

    return this._promise;
  }

  /**
   * 获取指定平台的首选架构 asset
   */
  getPrimaryAsset(platform) {
    if (!this._releaseData) return null;
    const list = assetsOf(this._releaseData, platform);
    const prefs = PLATFORM_PREFS[platform] || [];
    return pickPrimary(list, prefs);
  }

  /**
   * 获取指定平台所有 asset
   */
  getAllAssets(platform) {
    return assetsOf(this._releaseData, platform);
  }

  /**
   * 获取指定平台除首选架构外的其他 asset
   * （用于「其他版本」列表，避免与主下载按钮重复）
   */
  getOtherAssets(platform) {
    const primary = this.getPrimaryAsset(platform);
    const list = assetsOf(this._releaseData, platform);
    if (!primary) return list;
    return list.filter(a => a.name !== primary.name);
  }

  /**
   * 获取指定平台的主下载链接（镜像1）
   */
  getPrimaryDownloadUrl(platform) {
    const asset = this.getPrimaryAsset(platform);
    if (!asset) return '';
    return mirrorUrls(asset.browser_download_url)[0];
  }

  /**
   * 获取指定平台的备用下载链接（镜像2）
   */
  getMirrorDownloadUrl(platform) {
    const asset = this.getPrimaryAsset(platform);
    if (!asset) return '';
    return mirrorUrls(asset.browser_download_url)[1];
  }
}

// 单例
const clientRelease = new ClientReleaseManager();

// 导出工具函数
export {
  prettyName,
  formatSize,
  mirrorUrls,
  clientRelease,
  ClientReleaseManager
};

export default clientRelease;
