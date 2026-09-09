import { ref, onBeforeUnmount } from 'vue';
import { clientRelease, prettyName, formatSize, mirrorUrls } from '@/utils/clientRelease';

/**
 * 客户端 Release 数据获取 composable
 * （薄薄一层 Vue 响应式包装，核心逻辑在 @/utils/clientRelease.js）
 *
 * 用法：
 *   const { releaseData, loading, loadRelease, getPrimaryDownloadUrl, ... } = useClientReleases();
 */
export function useClientReleases() {
  const releaseData = ref(clientRelease.data);
  const loading = ref(clientRelease.loading);

  // 订阅单例变化，同步到响应式 ref
  const unsubscribe = clientRelease.subscribe((data, isLoading) => {
    releaseData.value = data;
    loading.value = isLoading;
  });

  async function loadRelease() {
    try {
      return await clientRelease.load();
    } catch (e) {
      throw e;
    }
  }

  function getPrimaryAsset(platform) {
    return clientRelease.getPrimaryAsset(platform);
  }

  function getAllAssets(platform) {
    return clientRelease.getAllAssets(platform);
  }

  function getOtherAssets(platform) {
    return clientRelease.getOtherAssets(platform);
  }

  function getTag() {
    return clientRelease.tag;
  }

  function getPrimaryDownloadUrl(platform) {
    return clientRelease.getPrimaryDownloadUrl(platform);
  }

  function getMirrorDownloadUrl(platform) {
    return clientRelease.getMirrorDownloadUrl(platform);
  }

  // 组件卸载时取消订阅
  onBeforeUnmount(() => {
    unsubscribe();
  });

  return {
    releaseData,
    loading,
    loadRelease,
    getPrimaryAsset,
    getAllAssets,
    getOtherAssets,
    getTag,
    getPrimaryDownloadUrl,
    getMirrorDownloadUrl,
    prettyName,
    formatSize,
    mirrorUrls
  };
}

export default useClientReleases;
