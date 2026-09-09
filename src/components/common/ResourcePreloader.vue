<!-- 资源预加载组件 -->
<template>
  <!-- 这个组件不会显示任何内容，仅用于资源预加载 -->
  <div class="resource-preloader" style="display: none;">
    <!-- 用于预加载图片的隐藏容器 -->
    <div v-if="preloadImages.length > 0" style="display: none;">
      <img 
        v-for="(src, index) in preloadImages" 
        :key="index" 
        :src="src" 
        alt="preload-img"
        width="1"
        height="1"
        @load="onImageLoaded(src)"
      />
    </div>
  </div>
</template>

<script>
import { onMounted, ref, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import preloadManager from '@/utils/preloadManager';
import { CUSTOMER_SERVICE_CONFIG, AUTH_LAYOUT_CONFIG } from '@/utils/baseConfig';

export default {
  name: 'ResourcePreloader',
  setup() {
    const route = useRoute();
    const isPreloaded = ref({
      components: false,
      images: false,
      scripts: false
    });

    const isCustomerServiceEnabled = CUSTOMER_SERVICE_CONFIG && CUSTOMER_SERVICE_CONFIG.enabled;

    const preloadImages = ref([
      `${process.env.BASE_URL}images/logo.png`
    ]);
    
    const preloadQueue = ref([]);
    const isLoading = ref(false);

    const authLayoutType = computed(() => {
      return AUTH_LAYOUT_CONFIG?.layoutType || 'center';
    });

    const customerServiceComponent = { 
      path: 'CustomerService', 
      name: 'CustomerService', 
      priority: 0, 
      component: () => import('@/views/service/CustomerService.vue') 
    };

    const componentsConfig = {
      base: [
        { path: 'Dashboard', name: 'Dashboard', priority: 1, component: () => import('@/views/dashboard/Dashboard.vue') },
        { path: 'Shop', name: 'Shop', priority: 2, component: () => import('@/views/shop/Shop.vue') },
        { path: 'More', name: 'More', priority: 3, component: () => import('@/views/more/MoreOptions.vue') },
        { path: 'Invite', name: 'Invite', priority: 4, component: () => import('@/views/invite/Invite.vue') },
        { path: 'Profile', name: 'Profile', priority: 5, component: () => import('@/views/profile/UserProfile.vue') }
      ],
      
      route: {
        '/': [
          {
            path: 'Login',
            name: 'Login',
            priority: 1,
            component: () => authLayoutType.value === 'split' 
              ? import('@/views/auth/split/Login.vue')
              : import('@/views/auth/center/Login.vue')
          },
          {
            path: 'Register',
            name: 'Register',
            priority: 2,
            component: () => authLayoutType.value === 'split'
              ? import('@/views/auth/split/Register.vue')
              : import('@/views/auth/center/Register.vue')
          },
          {
            path: 'ForgotPassword',
            name: 'ForgotPassword',
            priority: 3,
            component: () => authLayoutType.value === 'split'
              ? import('@/views/auth/split/ForgotPassword.vue')
              : import('@/views/auth/center/ForgotPassword.vue')
          }
        ],
        '/landing': [
          {
            path: 'Login',
            name: 'Login',
            priority: 1,
            component: () => authLayoutType.value === 'split'
              ? import('@/views/auth/split/Login.vue')
              : import('@/views/auth/center/Login.vue')
          },
          {
            path: 'Register',
            name: 'Register',
            priority: 2,
            component: () => authLayoutType.value === 'split'
              ? import('@/views/auth/split/Register.vue')
              : import('@/views/auth/center/Register.vue')
          },
          {
            path: 'ForgotPassword',
            name: 'ForgotPassword',
            priority: 3,
            component: () => authLayoutType.value === 'split'
              ? import('@/views/auth/split/ForgotPassword.vue')
              : import('@/views/auth/center/ForgotPassword.vue')
          }
        ],
        '/login': [
          {
            path: 'Register',
            name: 'Register',
            priority: 1,
            component: () => authLayoutType.value === 'split'
              ? import('@/views/auth/split/Register.vue')
              : import('@/views/auth/center/Register.vue')
          },
          {
            path: 'ForgotPassword',
            name: 'ForgotPassword',
            priority: 2,
            component: () => authLayoutType.value === 'split'
              ? import('@/views/auth/split/ForgotPassword.vue')
              : import('@/views/auth/center/ForgotPassword.vue')
          },
          { path: 'Dashboard', name: 'Dashboard', priority: 3, component: () => import('@/views/dashboard/Dashboard.vue') }
        ],
        '/register': [
          {
            path: 'Login',
            name: 'Login',
            priority: 1,
            component: () => authLayoutType.value === 'split'
              ? import('@/views/auth/split/Login.vue')
              : import('@/views/auth/center/Login.vue')
          },
          {
            path: 'ForgotPassword',
            name: 'ForgotPassword',
            priority: 2,
            component: () => authLayoutType.value === 'split'
              ? import('@/views/auth/split/ForgotPassword.vue')
              : import('@/views/auth/center/ForgotPassword.vue')
          },
          { path: 'Dashboard', name: 'Dashboard', priority: 3, component: () => import('@/views/dashboard/Dashboard.vue') }
        ],
        '/forgot-password': [
          {
            path: 'Login',
            name: 'Login',
            priority: 1,
            component: () => authLayoutType.value === 'split'
              ? import('@/views/auth/split/Login.vue')
              : import('@/views/auth/center/Login.vue')
          },
          {
            path: 'Register',
            name: 'Register',
            priority: 2,
            component: () => authLayoutType.value === 'split'
              ? import('@/views/auth/split/Register.vue')
              : import('@/views/auth/center/Register.vue')
          },
          { path: 'Dashboard', name: 'Dashboard', priority: 3, component: () => import('@/views/dashboard/Dashboard.vue') }
        ],
        '/dashboard': [
          { path: 'Shop', name: 'Shop', priority: 1, component: () => import('@/views/shop/Shop.vue') },
          { path: 'More', name: 'More', priority: 2, component: () => import('@/views/more/MoreOptions.vue') },
          { path: 'Invite', name: 'Invite', priority: 3, component: () => import('@/views/invite/Invite.vue') },
          { path: 'Profile', name: 'Profile', priority: 4, component: () => import('@/views/profile/UserProfile.vue') },
          { path: 'OrderList', name: 'OrderList', priority: 5, component: () => import('@/views/orders/OrderList.vue') },
          { path: 'Payment', name: 'Payment', priority: 6, component: () => import('@/views/shop/Payment.vue') }
        ],
        '/shop': [
          { path: 'OrderConfirm', name: 'OrderConfirm', priority: 1, component: () => import('@/views/shop/OrderConfirm.vue') },
          { path: 'Payment', name: 'Payment', priority: 2, component: () => import('@/views/shop/Payment.vue') },
          { path: 'Dashboard', name: 'Dashboard', priority: 3, component: () => import('@/views/dashboard/Dashboard.vue') },
          { path: 'More', name: 'More', priority: 4, component: () => import('@/views/more/MoreOptions.vue') },
          { path: 'OrderList', name: 'OrderList', priority: 5, component: () => import('@/views/orders/OrderList.vue') }
        ],
        '/invite': [
          { path: 'Shop', name: 'Shop', priority: 1, component: () => import('@/views/shop/Shop.vue') },
          { path: 'More', name: 'More', priority: 2, component: () => import('@/views/more/MoreOptions.vue') },
          { path: 'Dashboard', name: 'Dashboard', priority: 3, component: () => import('@/views/dashboard/Dashboard.vue') }
        ],
        '/more': [
          { path: 'Profile', name: 'Profile', priority: 1, component: () => import('@/views/profile/UserProfile.vue') },
          { path: 'NodeList', name: 'NodeList', priority: 2, component: () => import('@/views/servers/NodeList.vue') },
          { path: 'OrderList', name: 'OrderList', priority: 3, component: () => import('@/views/orders/OrderList.vue') },
          { path: 'TicketList', name: 'TicketList', priority: 4, component: () => import('@/views/ticket/TicketList.vue') },
          { path: 'Docs', name: 'Docs', priority: 5, component: () => import('@/views/docs/DocsPage.vue') },
          { path: 'TrafficLog', name: 'TrafficLog', priority: 6, component: () => import('@/views/trafficLog/TrafficLog.vue') }
        ],
        '/profile': [
          { path: 'Dashboard', name: 'Dashboard', priority: 1, component: () => import('@/views/dashboard/Dashboard.vue') },
          { path: 'Shop', name: 'Shop', priority: 2, component: () => import('@/views/shop/Shop.vue') },
          { path: 'More', name: 'More', priority: 3, component: () => import('@/views/more/MoreOptions.vue') },
          { path: 'TicketList', name: 'TicketList', priority: 4, component: () => import('@/views/ticket/TicketList.vue') },
          { path: 'Profile', name: 'Profile', priority: 5, component: () => import('@/views/profile/UserProfile.vue') }
        ],
        '/tickets': [
          { path: 'Profile', name: 'Profile', priority: 1, component: () => import('@/views/profile/UserProfile.vue') },
          { path: 'Dashboard', name: 'Dashboard', priority: 2, component: () => import('@/views/dashboard/Dashboard.vue') },
          { path: 'MobileTickets', name: 'MobileTickets', priority: 3, component: () => import('@/views/ticket/MobileTicketList.vue') }
        ],
        '/mobile/tickets': [
          { path: 'TicketList', name: 'TicketList', priority: 1, component: () => import('@/views/ticket/TicketList.vue') },
          { path: 'Dashboard', name: 'Dashboard', priority: 2, component: () => import('@/views/dashboard/Dashboard.vue') }
        ],
        '/orders': [
          { path: 'Shop', name: 'Shop', priority: 1, component: () => import('@/views/shop/Shop.vue') },
          { path: 'Payment', name: 'Payment', priority: 2, component: () => import('@/views/shop/Payment.vue') },
          { path: 'Dashboard', name: 'Dashboard', priority: 3, component: () => import('@/views/dashboard/Dashboard.vue') }
        ],
        '/nodes': [
          { path: 'Dashboard', name: 'Dashboard', priority: 1, component: () => import('@/views/dashboard/Dashboard.vue') },
          { path: 'More', name: 'More', priority: 2, component: () => import('@/views/more/MoreOptions.vue') }
        ],
        '/docs': [
          { path: 'More', name: 'More', priority: 1, component: () => import('@/views/more/MoreOptions.vue') },
          { path: 'DocDetail', name: 'DocDetail', priority: 2, component: () => import('@/views/docs/DocDetail.vue') },
          { path: 'Dashboard', name: 'Dashboard', priority: 3, component: () => import('@/views/dashboard/Dashboard.vue') }
        ],
        '/docs/:id': [
          { path: 'Docs', name: 'Docs', priority: 1, component: () => import('@/views/docs/DocsPage.vue') },
          { path: 'More', name: 'More', priority: 2, component: () => import('@/views/more/MoreOptions.vue') }
        ],
        '/trafficlog': [
          { path: 'Dashboard', name: 'Dashboard', priority: 1, component: () => import('@/views/dashboard/Dashboard.vue') },
          { path: 'More', name: 'More', priority: 2, component: () => import('@/views/more/MoreOptions.vue') },
          { path: 'Profile', name: 'Profile', priority: 3, component: () => import('@/views/profile/UserProfile.vue') }
        ],
        '/wallet/deposit': [
          { path: 'Dashboard', name: 'Dashboard', priority: 1, component: () => import('@/views/dashboard/Dashboard.vue') },
          { path: 'Shop', name: 'Shop', priority: 2, component: () => import('@/views/shop/Shop.vue') },
          { path: 'Profile', name: 'Profile', priority: 3, component: () => import('@/views/profile/UserProfile.vue') }
        ],
        '/payment': [
          { path: 'OrderConfirm', name: 'OrderConfirm', priority: 1, component: () => import('@/views/shop/OrderConfirm.vue') },
          { path: 'Shop', name: 'Shop', priority: 2, component: () => import('@/views/shop/Shop.vue') },
          { path: 'Dashboard', name: 'Dashboard', priority: 3, component: () => import('@/views/dashboard/Dashboard.vue') }
        ],
        '/order-confirm': [
          { path: 'Shop', name: 'Shop', priority: 1, component: () => import('@/views/shop/Shop.vue') },
          { path: 'Payment', name: 'Payment', priority: 2, component: () => import('@/views/shop/Payment.vue') }
        ],
        '/customer-service': [
          { path: 'Dashboard', name: 'Dashboard', priority: 1, component: () => import('@/views/dashboard/Dashboard.vue') },
          { path: 'More', name: 'More', priority: 2, component: () => import('@/views/more/MoreOptions.vue') },
          { path: 'TicketList', name: 'TicketList', priority: 3, component: () => import('@/views/ticket/TicketList.vue') }
        ]
      }
    };

    const onImageLoaded = (src) => {
      preloadManager.markResourceLoaded(src);
    };

    const preloadExternalResources = () => {
      const resources = [
      ];

      resources.forEach(resource => {
        if (!preloadManager.isResourceLoaded(resource.href)) {
          const link = preloadManager.createPreloadLink(resource.href, resource.as, resource.type);
          if (link) {
            document.head.appendChild(link);
          }
        }
      });

      isPreloaded.value.scripts = true;
    };
    
    const processNextComponent = () => {
      if (preloadQueue.value.length === 0) {
        isLoading.value = false;
        return;
      }
      
      isLoading.value = true;
      const nextComponent = preloadQueue.value.shift();
      
      if (preloadManager.isComponentLoaded(nextComponent.name)) {
        processNextComponent();
        return;
      }
      
      
      try {
        nextComponent.component()
          .then(() => {
            preloadManager.markComponentLoaded(nextComponent.name);
            
            setTimeout(() => {
              processNextComponent();
            }, 200);
          })
          .catch(() => {
            setTimeout(() => {
              processNextComponent();
            }, 200);
          });
      } catch (error) {
        setTimeout(() => {
          processNextComponent();
        }, 200);
      }
    };
    
    const enqueueComponents = (components) => {
      if (!components || components.length === 0) return;
      
      const sortedComponents = [...components].sort((a, b) => a.priority - b.priority);
      
      const newComponents = sortedComponents.filter(comp => !preloadManager.isComponentLoaded(comp.name));
      
      if (newComponents.length === 0) return;
      
      preloadQueue.value.push(...newComponents);
      
      if (!isLoading.value) {
        processNextComponent();
      }
    };

    const preloadVueComponents = () => {
      if (isPreloaded.value.components) return;
      
      
      preloadManager.startPreloadTimer();
      
      setTimeout(() => {
        if (route.path in componentsConfig.route) {
          const nextRouteComponents = componentsConfig.route[route.path].slice(0, 2);
          enqueueComponents(nextRouteComponents);
        }
      }, 5000);
      
      isPreloaded.value.components = true;
      
      setTimeout(() => {
      }, 8000);
    };

    const preloadResources = () => {
      const schedulePreload = (callback, timeout) => {
        if (window.requestIdleCallback) {
          window.requestIdleCallback(callback, { timeout });
        } else {
          setTimeout(callback, timeout / 2);
        }
      };

      schedulePreload(() => {
        preloadExternalResources();
      }, 2000);

      schedulePreload(() => {
        preloadVueComponents();
      }, 3000);

      isPreloaded.value.images = true;
    };

    watch(() => route.path, (newPath, oldPath) => {
      if (newPath !== oldPath && newPath in componentsConfig.route) {
        // 僅在路由穩定後預載最可能訪問的少量頁面，避免首屏後一次拉取過多 chunk。
        setTimeout(() => {
          enqueueComponents(componentsConfig.route[newPath].slice(0, 2));
        }, 3000);
      }
    });

    onMounted(() => {
      setTimeout(() => {
        preloadResources();
      }, 2000);
    });

    return {
      isPreloaded,
      preloadImages,
      onImageLoaded
    };
  }
};
</script> 
