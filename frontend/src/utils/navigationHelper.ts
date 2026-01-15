/**
 * 导航助手 - 只在Electron环境中生效
 * 用于解决Electron白屏问题
 */

// 检测是否在Electron环境中
export const isElectron = (): boolean => {
  if (typeof window === 'undefined') return false;

  // 简化检测，优先检查user agent
  const hasElectronUA = / electron/i.test(navigator.userAgent);
  if (hasElectronUA) return true;

  // 检查process.versions（在preload脚本中可用）
  const hasElectronProcess = !!(window as any).process?.versions?.electron;
  if (hasElectronProcess) return true;

  return false;
};

/**
 * 安全的页面导航
 * 在Electron中使用pushState，在Web中使用href
 */
export const safeNavigate = (url: string): void => {
  if (typeof window === 'undefined') return;

  // 简单直接的处理
  if (isElectron()) {
    // Electron环境：尝试pushState，如果不行就直接导航
    try {
      const currentUrl = window.location.href;
      window.history.pushState({}, '', url);

      // 检查pushState是否真的改变了URL
      if (window.location.href === currentUrl) {
        // pushState没有生效，直接导航
        window.location.href = url;
      } else {
        // pushState生效了，触发事件让React知道
        const popStateEvent = new PopStateEvent('popstate', {
          state: { url: url }
        });
        window.dispatchEvent(popStateEvent);

        // 额外触发自定义事件，确保React重新渲染
        const urlChangeEvent = new CustomEvent('urlchange', {
          detail: { url: url }
        });
        window.dispatchEvent(urlChangeEvent);
      }
    } catch (error) {
      // 出错了，直接导航
      console.warn('Electron navigation failed, using direct navigation:', error);
      window.location.href = url;
    }
  } else {
    // Web环境：直接使用正常导航
    window.location.href = url;
  }
};

/**
 * 安全返回首页
 */
export const safeGoHome = (): void => {
  safeNavigate('/');
};