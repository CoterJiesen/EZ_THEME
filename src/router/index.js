import { createRouter, createWebHashHistory } from 'vue-router';

import { SITE_CONFIG, DEFAULT_CONFIG, isBrowserRestricted, TRAFFICLOG_CONFIG, isXiaoV2board, AUTH_LAYOUT_CONFIG, NAVIGATION_CONFIG } from '@/utils/baseConfig';

import i18n from '@/i18n';
import { reloadMessages } from '@/i18n';
import { shouldCheckApiAvailability } from '@/utils/apiAvailabilityChecker';

import pageCache from '@/utils/pageCache';

import LandingPage from '@/views/landing/LandingPage.vue';
import CustomLandingPage from '@/views/landing/CustomLandingPage.vue';
import ApiValidation from '@/views/errors/ApiValidation.vue';
import BrowserRestricted from '@/views/errors/BrowserRestricted.vue';
import NotFound from '@/views/errors/NotFound.vue';
import CustomerService from '@/views/service/CustomerService.vue';
import Dashboard from '@/views/dashboard/Dashboard.vue';
import MainBoard from '@/views/layout/MainBoard.vue';
import Profile from '@/views/profile/UserProfile.vue';
import Shop from '@/views/shop/Shop.vue';
import OrderConfirm from '@/views/shop/OrderConfirm.vue';
import Payment from '@/views/shop/Payment.vue';
import Invite from '@/views/invite/Invite.vue';
import MoreOptions from '@/views/more/MoreOptions.vue';
import DocsPage from '@/views/docs/DocsPage.vue';
import DocDetail from '@/views/docs/DocDetail.vue';
import NodeList from '@/views/servers/NodeList.vue';
import OrderList from '@/views/orders/OrderList.vue';
import TicketList from '@/views/ticket/TicketList.vue';
import MobileTicketList from '@/views/ticket/MobileTicketList.vue';
import TrafficLog from '@/views/trafficLog/TrafficLog.vue';
import WalletDeposit from '@/views/wallet/WalletDeposit.vue';

import CenterLogin from '@/views/auth/center/Login.vue';
import CenterRegister from '@/views/auth/center/Register.vue';
import CenterForgotPassword from '@/views/auth/center/ForgotPassword.vue';
import SplitLogin from '@/views/auth/split/Login.vue';
import SplitRegister from '@/views/auth/split/Register.vue';
import SplitForgotPassword from '@/views/auth/split/ForgotPassword.vue';

// 认证页面两套布局都静态引入，运行时按 layoutType 选用，避免动态模板 import 拆出多余碎片
const authComponents = {
  center: { Login: CenterLogin, Register: CenterRegister, ForgotPassword: CenterForgotPassword },
  split: { Login: SplitLogin, Register: SplitRegister, ForgotPassword: SplitForgotPassword }
};

const getAuthComponent = (componentName) => {
  const layoutType = AUTH_LAYOUT_CONFIG?.layoutType || 'center';
  const layout = authComponents[layoutType] || authComponents.center;
  return layout[componentName];
};

const Login = getAuthComponent('Login');
const Register = getAuthComponent('Register');
const ForgotPassword = getAuthComponent('ForgotPassword');

const getThirdNavItem = () => {
  return NAVIGATION_CONFIG?.thirdNavItem || 'docs';
};

const getFourthNavItem = () => {
  return NAVIGATION_CONFIG?.fourthNavItem || '';
};

const getActiveNavForRoute = (routeName) => {
  const thirdNavItem = getThirdNavItem();
  const fourthNavItem = getFourthNavItem();

  // 导航项对应的路由名称映射
  const routeMap = {
    docs: 'Docs',
    invite: 'Invite',
    tickets: 'TicketList',
    nodes: 'NodeList',
    orders: 'OrderList',
    traffic: 'TrafficLog',
    wallet: 'Deposit',
    profile: 'Profile'
  };

  // 路由名称 -> 导航名称 映射（与 SlideTabsNav 中的 item.name 对齐）
  const navNameMap = {
    Docs: 'Docs',
    Invite: 'Invite',
    TicketList: 'Tickets',
    NodeList: 'Nodes',
    OrderList: 'Orders',
    TrafficLog: 'Traffic',
    Deposit: 'Wallet',
    Profile: 'Profile'
  };

  // 如果当前路由匹配第三个导航项，则返回第三项对应的导航名
  const thirdNavRouteName = routeMap[thirdNavItem];
  if (thirdNavRouteName && routeName === thirdNavRouteName) {
    return navNameMap[thirdNavRouteName] || 'More';
  }

  // 如果当前路由匹配第四个导航项（且第四项存在且有效），返回第四项对应的导航名
  const fourthNavRouteName = fourthNavItem ? routeMap[fourthNavItem] : '';
  if (fourthNavRouteName && routeName === fourthNavRouteName) {
    return navNameMap[fourthNavRouteName] || 'More';
  }

  // 其他情况归类为“更多”
  return 'More';
};

const routes = [
  {
    path: '/',
    redirect: DEFAULT_CONFIG.enableLandingPage ? '/landing' : '/login'
  },
  {
    path: '/api-validation',
    name: 'ApiValidation',
    component: ApiValidation,
    meta: {
      titleKey: 'common.apiChecking',
      requiresAuth: false
    }
  },
  {
    path: '/landing',
    name: 'Landing',
    component: getCustomOrDefaultLandingPage(),
    meta: {
      titleKey: 'landing.mainText',
      requiresAuth: false
    },
    beforeEnter: (to, from, next) => {
      if (!DEFAULT_CONFIG.enableLandingPage) {
        next('/login');
      } else {
        next();
      }
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: {
      titleKey: 'common.login',
      requiresAuth: false
    }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: {
      titleKey: 'common.register',
      requiresAuth: false,
      keepAlive: true
    }
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: ForgotPassword,
    meta: {
      titleKey: 'common.forgotPassword',
      requiresAuth: false,
      keepAlive: true
    }
  },
  {
    path: '/browser-restricted',
    name: 'BrowserRestricted',
    component: BrowserRestricted,
    meta: {
      titleKey: 'errors.browserRestricted',
      requiresAuth: false
    }
  },
  {
    path: '/customer-service',
    name: 'CustomerService',
    component: CustomerService,
    meta: {
      titleKey: 'service.title',
      requiresAuth: false
    }
  },
  {
    path: '/',
    component: MainBoard,
    meta: {
      requiresAuth: true
    },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: Dashboard,
        meta: {
          titleKey: 'menu.dashboard',
          requiresAuth: true,
          keepAlive: true
        }
      },
      {
        path: 'shop',
        name: 'Shop',
        component: Shop,
        meta: {
          titleKey: 'menu.shop',
          requiresAuth: true,
          keepAlive: true
        }
      },
      {
        path: 'order-confirm',
        name: 'OrderConfirm',
        component: OrderConfirm,
        meta: {
          titleKey: 'orders.confirmOrder',
          requiresAuth: true,
          activeNav: 'Shop'
        }
      },
      {
        path: 'payment',
        name: 'Payment',
        component: Payment,
        meta: {
          titleKey: 'orders.payment',
          requiresAuth: true,
          activeNav: 'Shop'
        }
      },
      {
        path: 'invite',
        name: 'Invite',
        component: Invite,
        meta: {
          titleKey: 'menu.invite',
          requiresAuth: true,
          keepAlive: true,
          get activeNav() { return getActiveNavForRoute('Invite'); }
        }
      },
      {
        path: 'more',
        name: 'More',
        component: MoreOptions,
        meta: {
          titleKey: 'menu.more',
          requiresAuth: true
        }
      },
      {
        path: 'docs',
        name: 'Docs',
        component: DocsPage,
        meta: {
          titleKey: 'menu.docs',
          requiresAuth: true,
          get activeNav() { return getActiveNavForRoute('Docs'); }
        }
      },
      {
        path: 'docs/:id',
        name: 'DocDetail',
        component: DocDetail,
        meta: {
          titleKey: 'more.viewHelp',
          requiresAuth: true,
          get activeNav() { return getActiveNavForRoute('Docs'); }
        }
      },
      {
        path: 'nodes',
        name: 'NodeList',
        component: NodeList,
        meta: {
          titleKey: 'nodes.title',
          requiresAuth: true,
          get activeNav() { return getActiveNavForRoute('NodeList'); }
        }
      },
      {
        path: 'orders',
        name: 'OrderList',
        component: OrderList,
        meta: {
          titleKey: 'orders.title',
          requiresAuth: true,
          get activeNav() { return getActiveNavForRoute('OrderList'); }
        }
      },
      {
        path: 'tickets',
        name: 'TicketList',
        component: TicketList,
        meta: {
          titleKey: 'tickets.title',
          requiresAuth: true,
          get activeNav() { return getActiveNavForRoute('TicketList'); }
        }
      },
      {
        path: 'mobile/tickets',
        name: 'MobileTickets',
        component: MobileTicketList,
        meta: {
          titleKey: 'tickets.title',
          requiresAuth: true,
          get activeNav() { return getActiveNavForRoute('TicketList'); }
        }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: Profile,
        meta: {
          titleKey: 'profile.title',
          requiresAuth: true,
          get activeNav() { return getActiveNavForRoute('Profile'); }
        }
      },
      {
        path: 'trafficlog',
        name: 'TrafficLog',
        component: TrafficLog,
        meta: {
          titleKey: 'trafficLog.title',
          requiresAuth: true,
          get activeNav() { return getActiveNavForRoute('TrafficLog'); }
        },
        beforeEnter: (to, from, next) => {
          if (!TRAFFICLOG_CONFIG.enableTrafficLog) {
            next('/dashboard');
          } else {
            next();
          }
        }
      },
      {
        path: 'wallet/deposit',
        name: 'Deposit',
        component: WalletDeposit,
        meta: {
          titleKey: 'wallet.deposit.title',
          requiresAuth: true,
          get activeNav() { return getActiveNavForRoute('Deposit'); }
        },
        beforeEnter: (to, from, next) => {
          if (!isXiaoV2board()) {
            next('/dashboard');
          } else {
            next();
          }
        }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
    meta: {
      titleKey: 'errors.notFound',
      requiresAuth: false
    }
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

router.beforeEach(async (to, from, next) => {
  if (to.name !== 'BrowserRestricted' && isBrowserRestricted()) {
    next({ name: 'BrowserRestricted' });
    return;
  }

  if (shouldCheckApiAvailability() && to.name !== 'ApiValidation') {
    const availableUrl = sessionStorage.getItem('ez_api_available_url');
    if (!availableUrl) {
      const apiRedirectQuery = {
        redirect: to.path,
        ...to.query
      };
      next({
        name: 'ApiValidation',
        query: apiRedirectQuery
      });
      return;
    }
  }

  const getTitle = () => {
    if (to.meta.titleKey) {
      try {
        const title = i18n.global.t(to.meta.titleKey);
        return `${title} - ${SITE_CONFIG.siteName}`;
      } catch (error) {
        return SITE_CONFIG.siteName;
      }
    }
    return SITE_CONFIG.siteName;
  };

  document.title = getTitle();

  const token = localStorage.getItem('token');

  const loginStatusChanged =
    (from.meta.requiresAuth && !to.meta.requiresAuth) ||
    (!from.meta.requiresAuth && to.meta.requiresAuth);

  if (loginStatusChanged) {
    try {
      await reloadMessages();
    } catch (error) {
    }
  }

  if (to.meta.requiresAuth && !token) {
    next({ name: 'Login' });
  } else if (to.path === '/login' && token) {
    next({ path: '/dashboard' });
  } else {
    document.body.classList.add('page-transitioning');

    if (to.meta.keepAlive && to.name) {
      pageCache.addRouteToCache(to.name);
    } else if (to.name && to.meta.keepAlive === false) {
      pageCache.removeRouteFromCache(to.name);
    }

    next();
  }
});

router.afterEach(() => {
  setTimeout(() => {
    document.body.classList.remove('page-transitioning');
  }, 400);
});

function getCustomOrDefaultLandingPage() {
  if (!SITE_CONFIG.customLandingPage) {
    return LandingPage;
  }

  return CustomLandingPage;
}

export default router;