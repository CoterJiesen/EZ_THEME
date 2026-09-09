<template>

  <div class="auth-container">

    <!-- 域名授权验证提示 -->





    <!-- 背景装饰 -->

    <div class="background-decoration">

      <div class="floating-ball ball-1"></div>

      <div class="floating-ball ball-2"></div>

      <div class="floating-ball ball-3"></div>

    </div>



    <!-- 顶部工具栏：语言选择器和主题切换 -->

    <div class="top-toolbar">

      <ThemeToggle />

      <LanguageSelector />

    </div>



    <div class="auth-card">

      <div class="auth-header">

        <div class="auth-logo">

          <img

            :src="logoPath"

            alt="Logo"

            @error="handleLogoError"

            @click="goTo('/')"

          />

        </div>

        <h1 class="auth-title">{{ $t('auth.forgotPasswordTitle') }}</h1>

        <p class="auth-subtitle">{{ $t('auth.forgotPasswordSubtitle') }}</p>

      </div>



      <form class="auth-form" @submit.prevent="handleSubmit">

        <div class="form-group">

          <label for="email">{{ $t('common.email') }} <span class="required">*</span></label>

          <div class="input-with-icon">

            <IconMail class="input-icon" />

            <input

              type="email"

              id="email"

              class="form-control"

              v-model="formData.email"

              :placeholder="$t('auth.emailPlaceholder')"

            />

          </div>

          <div v-if="errors.email" class="error-message">{{ errors.email }}</div>

        </div>



        <div class="form-group">

          <label for="verificationCode">{{ $t('common.verificationCode') }} <span class="required">*</span></label>

          <div class="input-with-button">

            <div class="input-with-icon verification-input">

              <IconCode class="input-icon" />

              <input

                type="text"

                id="verificationCode"

                class="form-control"

                v-model="formData.verificationCode"

                :placeholder="$t('auth.codePlaceholder')"

              />

            </div>

            <button

              class="send-code-btn"

              @click="sendVerificationCode"

              :disabled="!isValidEmail(formData.email) || cooldown > 0 || loading"

              type="button"

            >

              <IconSend v-if="cooldown === 0" class="icon-left" />

              <span>{{ cooldown > 0 ? `${cooldown}s` : $t('common.sendCode') }}</span>

            </button>

          </div>

          <div v-if="errors.verificationCode" class="error-message">{{ errors.verificationCode }}</div>

        </div>



        <div class="form-group">

          <label for="newPassword">{{ $t('auth.newPassword') }} <span class="required">*</span></label>

          <div class="input-with-icon">

            <IconLock class="input-icon" />

            <input

              :type="showPassword ? 'text' : 'password'"

              id="newPassword"

              class="form-control"

              v-model="formData.newPassword"

              :placeholder="$t('auth.newPasswordPlaceholder')"

            />

            <div class="password-toggle" @click="showPassword = !showPassword">

              <IconEye v-if="!showPassword" />

              <IconEyeOff v-else />

            </div>

          </div>

          <div v-if="errors.newPassword" class="error-message">{{ errors.newPassword }}</div>

        </div>



        <div class="form-group">

          <label for="confirmPassword">{{ $t('common.confirmPassword') }} <span class="required">*</span></label>

          <div class="input-with-icon">

            <IconLock class="input-icon" />

            <input

              :type="showConfirmPassword ? 'text' : 'password'"

              id="confirmPassword"

              class="form-control"

              v-model="formData.confirmPassword"

              :placeholder="$t('auth.confirmPasswordPlaceholder')"

            />

            <div class="password-toggle" @click="showConfirmPassword = !showConfirmPassword">

              <IconEye v-if="!showConfirmPassword" />

              <IconEyeOff v-else />

            </div>

          </div>

          <div v-if="errors.confirmPassword" class="error-message">{{ errors.confirmPassword }}</div>

        </div>



        <button

          class="btn btn-primary btn-block"

          :disabled="loading || !formData.email || !formData.verificationCode || !formData.newPassword || !formData.confirmPassword"

          type="submit"

        >

          <span v-if="loading" class="loading-wrapper">

            <span>{{ $t('common.loading') }}</span>

          </span>

          <span v-else>

            {{ $t('common.resetPassword') }}

            <IconArrowRight class="icon-right" />

          </span>

        </button>

      </form>



      <div class="auth-footer">

        <div class="auth-divider">

          <span class="auth-divider-text">{{ $t('auth.rememberPassword') }}</span>

        </div>



        <router-link to="/login" class="btn btn-secondary btn-block">

          {{ $t('common.login') }}

        </router-link>

      </div>

    </div>



    <!-- 验证码弹窗 -->

    <div class="captcha-modal" v-if="showCaptchaModal" :class="{ 'closing': isClosingModal }">

      <div class="captcha-modal-overlay" @click="closeCaptchaModal"></div>

      <div class="captcha-modal-content" :class="{ 'closing': isClosingModal }">

        <div class="captcha-modal-header">

          <h3>{{ $t('auth.captcha') }}</h3>

          <button class="close-btn" @click="closeCaptchaModal">

            <span>&times;</span>

          </button>

        </div>

        <div class="captcha-modal-body">

          <p>{{ $t('auth.captchaRequired') }}</p>



          <!-- Google reCAPTCHA -->

          <div v-if="captchaConfig.type === 'google'" class="google-captcha" @click.stop>

            <div id="modal-recaptcha"></div>

          </div>



          <!-- Cloudflare Turnstile -->

          <div v-else-if="captchaConfig.type === 'cloudflare'" class="cloudflare-captcha" @click.stop>

            <div id="modal-turnstile"></div>

          </div>

        </div>

      </div>

    </div>



    <!-- 自定义弹窗 -->

    <AuthPopup

      :show-popup="showAuthPopup"

      :title="authPopupConfig.title"

      :content="authPopupConfig.content"

      :cooldown-hours="authPopupConfig.cooldownHours"

      :close-wait-seconds="authPopupConfig.closeWaitSeconds"

      @close="handleAuthPopupClose"

    />

  </div>

</template>



<script>

import { reactive, ref, onMounted, onBeforeUnmount, getCurrentInstance, onActivated } from 'vue';

import { useRouter } from 'vue-router';

import { useI18n } from 'vue-i18n';

import ThemeToggle from '@/components/common/ThemeToggle.vue';

import LanguageSelector from '@/components/common/LanguageSelector.vue';

import { isValidEmail } from '@/utils/validators';

import { useToast } from '@/composables/useToast';

import IconMail from '@/components/icons/IconMail.vue';

import IconCode from '@/components/icons/IconCode.vue';

import IconLock from '@/components/icons/IconLock.vue';

import IconArrowRight from '@/components/icons/IconArrowRight.vue';

import IconSend from '@/components/icons/IconSend.vue';

import IconEye from '@/components/icons/IconEye.vue';

import IconEyeOff from '@/components/icons/IconEyeOff.vue';

import { resetPassword, sendEmailVerify, checkLoginStatus, getWebsiteConfig } from '@/api/auth';


import DomainAuthAlert from '@/components/common/DomainAuthAlert.vue';

import { CAPTCHA_CONFIG, AUTH_CONFIG } from '@/utils/baseConfig';

import AuthPopup from '@/components/auth/AuthPopup.vue';

import { shouldShowAuthPopup } from '@/utils/authPopupState';
import { useNavigator } from "@/composables/useNavigator";



window.onCaptchaForgotPasswordVerified = function(response) {

  if (window._forgotPasswordInstance) {

    window._forgotPasswordInstance.handleCaptchaResponse(response);

  }

};



window.onCaptchaForgotPasswordModalVerified = function(response) {

  if (window._forgotPasswordInstance) {

    window._forgotPasswordInstance.handleCaptchaModalResponse(response);

  }

};



let isGoogleModalRecaptchaRendered = false;



export default {

  name: 'ForgotPasswordView',

  components: {

    ThemeToggle,

    LanguageSelector,

    IconMail,

    IconCode,

    IconLock,

    IconArrowRight,

    IconSend,

    IconEye,

    IconEyeOff,

    DomainAuthAlert,

    AuthPopup

  },

  setup() {

    const router = useRouter();

    const { t } = useI18n();

    const { showToast } = useToast();

    const { goTo } = useNavigator()


    const loading = ref(false);

    const cooldown = ref(0);

    const configLoaded = ref(false);



    const showCaptchaModal = ref(false);

    const captchaModalResponse = ref('');

    const isClosingModal = ref(false);



    const showAuthPopup = ref(false);

    const authPopupConfig = reactive({

      title: AUTH_CONFIG.popup?.title || '',

      content: AUTH_CONFIG.popup?.content || '',

      cooldownHours: AUTH_CONFIG.popup?.cooldownHours || 24,

      closeWaitSeconds: AUTH_CONFIG.popup?.closeWaitSeconds || 0

    });



    const handleAuthPopupClose = () => {

      showAuthPopup.value = false;

    };



    const logoPath = ref(`${process.env.BASE_URL}images/logo.png`);

    const handleLogoError = () => {

      logoPath.value = `${process.env.BASE_URL}images/logo.png`;

    };






    const config = reactive({

      is_email_verify: 1,

      is_recaptcha: 0,

      recaptcha_site_key: ''

    });



    const captchaConfig = reactive({

      type: CAPTCHA_CONFIG.captchaType,

      siteKey: '',

      verifyUrl: CAPTCHA_CONFIG[CAPTCHA_CONFIG.captchaType]?.verifyUrl || ''

    });



    const formData = reactive({

      email: '',

      verificationCode: '',

      newPassword: '',

      confirmPassword: ''

    });



    const errors = reactive({

      email: '',

      verificationCode: '',

      newPassword: '',

      confirmPassword: ''

    });



    const showPassword = ref(false);

    const showConfirmPassword = ref(false);



    const captchaResponse = ref('');



    const app = getCurrentInstance();



    if (app && app.proxy) {

      window._forgotPasswordInstance = {

        handleCaptchaResponse: (response) => {

          captchaResponse.value = response;

        },

        handleCaptchaModalResponse: (response) => {



          if (response && typeof response === 'string' && response.trim().length > 0) {

            captchaModalResponse.value = response;



            setTimeout(() => {

              closeCaptchaModal();

              sendVerificationCodeWithCaptcha(response);

            }, 300);
          } else {

          }

        }

      };

    }



    const fetchWebsiteConfig = async () => {

      try {

        const response = await getWebsiteConfig();

        if (response && response.data) {

          Object.assign(config, response.data);



          if (config.is_recaptcha === 1) {

            captchaConfig.siteKey = config.recaptcha_site_key;



            await loadCaptchaScript();

          }



          configLoaded.value = true;



          showAuthPopup.value = shouldShowAuthPopup(AUTH_CONFIG.popup);

        }

      } catch (error) {

        showToast(t('messages.configLoadFailed'), 'error');

      }

    };



    const loadCaptchaScript = () => {

      return new Promise((resolve) => {

        if (config.is_recaptcha !== 1 || !config.recaptcha_site_key) {

          resolve();

          return;

        }



        if (captchaConfig.type === 'google' && window.grecaptcha) {

          isGoogleModalRecaptchaRendered = false;

          resolve();

          return;

        }



        if (window.turnstile && captchaConfig.type === 'cloudflare') {

          console.log('Turnstile已存在，尝试重置而不是重新加载脚本');



          try {

            if (window.turnstile.reset) {

              window.turnstile.reset();

            }



            const modalContainer = document.getElementById('modal-turnstile');

            if (modalContainer) {

              modalContainer.innerHTML = '';



              setTimeout(() => {

                window.turnstile.render('#modal-turnstile', {

                  'sitekey': captchaConfig.siteKey,

                  'callback': function(token) {

                    if (window._forgotPasswordInstance) {

                      window._forgotPasswordInstance.handleCaptchaModalResponse(token);

                    }

                  },

                  'theme': document.body.classList.contains('dark-theme') ? 'dark' : 'light',

                  'retry': 'auto',
                  'retry-interval': 5000,
                  'refresh-expired': 'manual',
                  'tabindex': 0,
                  'execution': 'render'
                });



                resolve();

              }, 100);

              return;

            }

          } catch (e) {

            console.error('重置Turnstile失败，将尝试重新加载脚本', e);

          }

        }



        const cleanupExistingCaptcha = () => {

          const recaptchaContainer = document.getElementById('modal-recaptcha');

          if (recaptchaContainer) {

            recaptchaContainer.innerHTML = '';

          }



          const turnstileContainer = document.getElementById('modal-turnstile');

          if (turnstileContainer) {

            turnstileContainer.innerHTML = '';

          }



          isGoogleModalRecaptchaRendered = false;

        };



        cleanupExistingCaptcha();



        if (!window.turnstile || captchaConfig.type !== 'cloudflare') {

          const script = document.createElement('script');



          if (captchaConfig.type === 'google') {

            const googleVerifyUrl = 'https://www.recaptcha.net';

            script.src = `${googleVerifyUrl}/recaptcha/api.js?onload=captchaScriptLoaded&render=explicit`;

          } else if (captchaConfig.type === 'cloudflare') {

            script.src = `https://challenges.cloudflare.com/turnstile/v0/api.js?onload=captchaScriptLoaded&render=explicit`;

          }



          script.async = true;

          script.defer = true;



          window.captchaScriptLoaded = () => {

            console.log('验证码脚本加载完成');

            setTimeout(() => {

              resolve();

            }, 100);

          };



          document.head.appendChild(script);

        } else {

          resolve();

        }

      });

    };



    const showCaptchaModalDialog = () => {

      showCaptchaModal.value = true;

      captchaModalResponse.value = '';



      const renderCaptcha = async () => {

        if (config.is_recaptcha === 1 && captchaConfig.siteKey) {

          await loadCaptchaScript();



          setTimeout(() => {

            if (captchaConfig.type === 'google' && window.grecaptcha) {

              const container = document.getElementById('modal-recaptcha');

              if (container && !isGoogleModalRecaptchaRendered) {

                container.innerHTML = '';



                try {

                  window.grecaptcha.render('modal-recaptcha', {

                    'sitekey': captchaConfig.siteKey,

                    'callback': 'onCaptchaForgotPasswordModalVerified',

                    'theme': document.body.classList.contains('dark-theme') ? 'dark' : 'light'

                  });

                  isGoogleModalRecaptchaRendered = true;

                } catch (error) {

                  console.error('Google reCAPTCHA渲染错误:', error);

                  if (error.toString().includes('has already been rendered')) {

                    isGoogleModalRecaptchaRendered = true;

                  } else {

                    isGoogleModalRecaptchaRendered = false;

                  }

                }

              }

            } else if (captchaConfig.type === 'cloudflare' && window.turnstile) {

              const container = document.getElementById('modal-turnstile');

              if (container) {

                container.innerHTML = '';



                if (window.turnstile.reset) {

                  try {

                    window.turnstile.reset();

                  } catch (e) {

                    console.log('无法重置Turnstile验证码，将重新渲染');

                  }

                }



                try {

                  window.turnstile.render('#modal-turnstile', {

                    'sitekey': captchaConfig.siteKey,

                    'callback': function(token) {

                      if (window._forgotPasswordInstance) {

                        window._forgotPasswordInstance.handleCaptchaModalResponse(token);

                      }

                    },

                    'theme': document.body.classList.contains('dark-theme') ? 'dark' : 'light',

                    'retry': 'auto',
                    'retry-interval': 5000,
                    'refresh-expired': 'manual',
                    'tabindex': 0,
                    'execution': 'render'
                  });

                } catch (error) {

                  console.error('Turnstile渲染错误:', error);



                  const scripts = document.getElementsByTagName('script');

                  for (let i = scripts.length - 1; i >= 0; i--) {

                    if (scripts[i].src.includes('turnstile')) {

                      scripts[i].parentNode.removeChild(scripts[i]);

                    }

                  }



                  setTimeout(() => {

                    const script = document.createElement('script');

                    script.src = `https://challenges.cloudflare.com/turnstile/v0/api.js?onload=captchaScriptLoaded&render=explicit`;

                    script.async = true;

                    script.defer = true;

                    document.head.appendChild(script);

                  }, 500);

                }

              } else {

                console.error('找不到modal-turnstile容器');

              }

            } else {

              console.error('验证码脚本未加载或配置不正确', {

                type: captchaConfig.type,

                hasGoogle: !!window.grecaptcha,

                hasTurnstile: !!window.turnstile

              });

            }

          }, 300);
        }

      };



      renderCaptcha();

    };



    const closeCaptchaModal = () => {

      isClosingModal.value = true;



      setTimeout(() => {

        showCaptchaModal.value = false;

        isClosingModal.value = false;



        setTimeout(() => {

          const recaptchaContainer = document.getElementById('modal-recaptcha');

          if (recaptchaContainer) {

            recaptchaContainer.innerHTML = '';

          }

          isGoogleModalRecaptchaRendered = false;

        }, 300);

      }, 300);

    };



    const handleCaptchaModalResponse = (response) => {



      if (response && typeof response === 'string' && response.trim().length > 0) {

        captchaModalResponse.value = response;



        setTimeout(() => {

          closeCaptchaModal();

          sendVerificationCodeWithCaptcha(response);

        }, 300);
      } else {

      }

    };



    const sendVerificationCodeWithCaptcha = async (captchaData) => {

      try {

        loading.value = true;



        const sendData = {

          email: formData.email,

          isForgetPassword: true

        };



        if (captchaData) {

          sendData.recaptcha_data = captchaData;

        }



        const response = await sendEmailVerify(sendData);



        if (response && response.data === true) {

          startCooldown();

          showToast(response.message || t('auth.codeSent'), 'success');



          if (AUTH_CONFIG.verificationCode && AUTH_CONFIG.verificationCode.showCheckSpamTip) {

            const delay = AUTH_CONFIG.verificationCode.checkSpamTipDelay || 1000;

            setTimeout(() => {

              showToast(t('auth.checkSpam'), 'info');

            }, delay);

          }

        } else {

          throw new Error(response.message || t('auth.sendCodeFailed'));

        }

      } catch (error) {

        showToast(error.response?.message || error.message || t('auth.sendCodeFailed'), 'error');

      } finally {

        loading.value = false;

      }

    };



    const sendVerificationCode = async () => {

      errors.email = '';



      if (!formData.email) {

        errors.email = t('auth.emailRequired');

        return;

      }



      if (!isValidEmail(formData.email)) {

        errors.email = t('auth.emailInvalid');

        return;

      }



      if (config.is_recaptcha === 1 && captchaConfig.siteKey) {

        const captchaSuccessElement = document.querySelector('.cloudflare-success-message') ||

                                     document.querySelector('.recaptcha-success');

        const isCaptchaVerified = !!captchaResponse.value ||

                                  (captchaSuccessElement && captchaSuccessElement.style.display !== 'none');



        if (isCaptchaVerified) {

          const captchaData = captchaResponse.value ||

                            document.querySelector('[name="g-recaptcha-response"]')?.value ||

                            document.querySelector('[name="cf-turnstile-response"]')?.value;

          sendVerificationCodeWithCaptcha(captchaData);

        } else {

          showCaptchaModalDialog();

        }

      } else {

        sendVerificationCodeWithCaptcha();

      }

    };



    const startCooldown = () => {

      cooldown.value = 60;

      const timer = setInterval(() => {

        cooldown.value--;

        if (cooldown.value <= 0) {

          clearInterval(timer);

        }

      }, 1000);

    };



    const handleSubmit = async () => {

      errors.email = '';

      errors.verificationCode = '';

      errors.newPassword = '';

      errors.confirmPassword = '';



      let isValid = true;



      if (!formData.email) {

        errors.email = t('auth.emailRequired');

        isValid = false;

      } else if (!isValidEmail(formData.email)) {

        errors.email = t('auth.emailInvalid');

        isValid = false;

      }



      if (!formData.verificationCode) {

        errors.verificationCode = t('auth.codeRequired');

        isValid = false;

      }



      if (!formData.newPassword) {

        errors.newPassword = t('auth.passwordRequired');

        isValid = false;

      } else if (formData.newPassword.length < 8) {

        errors.newPassword = t('auth.passwordTooShort');

        isValid = false;

      }



      if (!formData.confirmPassword) {

        errors.confirmPassword = t('auth.confirmPasswordRequired');

        isValid = false;

      } else if (formData.newPassword !== formData.confirmPassword) {

        errors.confirmPassword = t('auth.passwordsDoNotMatch');

        isValid = false;

      }



      if (!isValid) return;



      try {

        loading.value = true;



        const resetData = {

          email: formData.email,

          password: formData.newPassword,

          email_code: parseInt(formData.verificationCode)

        };



        if (config.is_recaptcha === 1) {

          if (captchaResponse.value) {

            resetData.recaptcha_data = captchaResponse.value;

          } else {

            const captchaElement = document.querySelector('[name="g-recaptcha-response"]') ||

                                  document.querySelector('[name="cf-turnstile-response"]');

            if (captchaElement && captchaElement.value) {

              resetData.recaptcha_data = captchaElement.value;

            }

          }

        }



        const response = await resetPassword(resetData);



        if (response.data === true) {

          showToast(response.message || t('auth.passwordResetSuccess'), 'success');



          router.push('/login');

        } else {

          throw new Error(response.message || t('auth.passwordResetFailed'));

        }

      } catch (error) {

        showToast(error.response?.message || error.message || t('auth.passwordResetFailed'), 'error');

      } finally {

        loading.value = false;

      }

    };



    onMounted(() => {





      fetchWebsiteConfig();



      window.addEventListener('focus', () => {

        if (configLoaded.value && config.is_recaptcha === 1) {

          loadCaptchaScript();

        }

      });



      const urlParams = new URLSearchParams(window.location.search);

      const isJustLoggedOut = urlParams.get('logout') === 'true';



      if (isJustLoggedOut) {

        showToast(t('auth.logoutSuccess'), 'success');



        if (window.history && window.history.replaceState) {

          const newUrl = window.location.href.replace('?logout=true', '').replace('&logout=true', '');

          window.history.replaceState({}, document.title, newUrl);

        }



        return;

      }



      try {

        if (window._isLoggingOut === true) {

          return;

        }



        const loginStatus = checkLoginStatus();



        if (loginStatus) {

          showToast(t('auth.alreadyLoggedIn'), 'info');

          setTimeout(() => {

            router.push('/dashboard');

          }, 500);

        }

      } catch (error) {

      }

    });



    onActivated(() => {

      if (configLoaded.value && config.is_recaptcha === 1 && captchaConfig.type === 'cloudflare') {

        console.log('组件激活，重新加载Cloudflare Turnstile验证组件');

        loadCaptchaScript().then(() => {

          if (window.turnstile && window.turnstile.reset) {

            try {

              window.turnstile.reset();

            } catch (e) {

              console.log('Turnstile重置失败，将重新渲染验证码组件');



              const container = document.getElementById('modal-turnstile');

              if (container && window.turnstile.render) {

                container.innerHTML = '';



                window.turnstile.render('#modal-turnstile', {

                  'sitekey': captchaConfig.siteKey,

                  'callback': function(token) {

                    if (window._forgotPasswordInstance) {

                      window._forgotPasswordInstance.handleCaptchaModalResponse(token);

                    }

                  },

                  'theme': document.body.classList.contains('dark-theme') ? 'dark' : 'light',

                  'retry-interval': 3000

                });

              }

            }

          }

        });

      }

    });



    onBeforeUnmount(() => {

      isGoogleModalRecaptchaRendered = false;



      if (window.turnstile && window.turnstile.reset) {

        try {

          window.turnstile.reset();

        } catch (e) {

          console.log('Turnstile重置失败', e);

        }

      }



      const turnstileContainer = document.getElementById('modal-turnstile');

      if (turnstileContainer) {

        turnstileContainer.innerHTML = '';

      }



      captchaResponse.value = '';

      captchaModalResponse.value = '';



      window.captchaScriptLoaded = undefined;

      window.onCaptchaForgotPasswordVerified = undefined;

      window.onCaptchaForgotPasswordModalVerified = undefined;



      window._forgotPasswordInstance = null;

    });



    return {

      formData,

      errors,

      loading,

      cooldown,

      sendVerificationCode,

      handleSubmit,

      isValidEmail,

      showPassword,

      showConfirmPassword,



      logoPath,

      handleLogoError,

      config,

      captchaConfig,

      showCaptchaModal,

      closeCaptchaModal,

      handleCaptchaModalResponse,

      isClosingModal,

      showAuthPopup,

      authPopupConfig,

      handleAuthPopupClose,

      goTo

    };

  }

};

</script>



<style lang="scss" scoped>

.top-toolbar {

  position: fixed;

  top: 20px;

  right: 20px;

  display: flex;

  gap: 10px;

  z-index: 10;

}



.required {

  color: #ff4d4f;

  margin-left: 4px;

  font-size: 16px;

  vertical-align: middle;

}



.input-with-icon {

  position: relative;

  width: 100%;



  .input-icon {

    position: absolute;

    left: 12px;

    top: 50%;

    transform: translateY(-50%);

    color: var(--secondary-text-color);

    width: 20px;

    height: 20px;

  }



  .password-toggle {

    position: absolute;

    right: 12px;

    top: 50%;

    transform: translateY(-50%);

    color: var(--secondary-text-color);

    cursor: pointer;

    padding: 4px;

    display: flex;

    align-items: center;

    justify-content: center;

    transition: color 0.2s ease;



    &:hover {

      color: var(--theme-color);

    }

  }



  .form-control {

    padding-left: 40px;

    height: 45px;

    border-radius: 8px;

    border: 1px solid var(--input-border-color, transparent);

    background-color: var(--input-bg-color, #f9f9f9);

    transition: all 0.3s ease;

    color: var(--primary-text-color);



    &[type="password"],

    &[type="text"] {

      padding-right: 40px;

    }



    &:focus {

      outline: none;

      border-color: var(--theme-color);

      box-shadow: 0 0 0 2px var(--primary-color-focus);

      background-color: var(--input-focus-bg-color, #fff);

    }



    &::placeholder {

      color: var(--placeholder-color, #aaa);

    }

  }

}



.input-with-button {

  display: flex;

  align-items: stretch;

  height: 45px;

  width: 100%;



  .verification-input {

    flex: 1;



    .form-control {

      border-top-right-radius: 0;

      border-bottom-right-radius: 0;

      height: 100%;

    }

  }



  .send-code-btn {

    border-top-left-radius: 0;

    border-bottom-left-radius: 0;

    border-top-right-radius: 8px;

    border-bottom-right-radius: 8px;

    padding: 0 15px;

    min-width: 100px;

    white-space: nowrap;

    font-size: 0.875rem;

    border: none;

    background-color: var(--theme-color) !important;

    color: white !important;

    margin: 0;

    height: 100%;

    display: flex;

    align-items: center;

    justify-content: center;

    cursor: pointer;

    transition: background-color 0.3s, opacity 0.3s, transform 0.3s;



    &:hover:not(:disabled) {

      background-color: var(--primary-color-hover) !important;

      transform: translateY(-2px);

    }



    &:disabled {

      opacity: 0.6;

      cursor: not-allowed;

      transform: translateY(0);

    }



    &:not(:disabled) {

      transform: translateY(0);

      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);



      &:hover {

        transform: translateY(-2px);

        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);

      }

    }



    .icon-left {

      margin-right: 5px;

    }

  }

}



.btn {

  height: 45px;

  border-radius: 8px;

  transition: all 0.3s;

  display: flex;

  align-items: center;

  justify-content: center;



  &.btn-primary {

    background-color: var(--theme-color);

    border: none;

    color: white;

    font-weight: 600;



    &:hover:not(:disabled) {

      background-color: var(--primary-color-hover);

    }



    &:disabled {

      opacity: 0.6;

      cursor: not-allowed;

    }



    .icon-right {

      margin-left: 8px;

    }

  }

}



.captcha-modal {

  position: fixed;

  top: 0;

  left: 0;

  right: 0;

  bottom: 0;

  z-index: 1000;

  display: flex;

  align-items: center;

  justify-content: center;

  animation: modalFadeIn 0.3s ease;



  &.closing {

    animation: modalFadeOut 0.3s ease forwards;

  }



  .captcha-modal-overlay {

    position: absolute;

    top: 0;

    left: 0;

    width: 100%;

    height: 100%;

    background-color: rgba(0, 0, 0, 0.5);

    z-index: 1;

  }



  .captcha-modal-content {

    position: relative;

    z-index: 2;

    background-color: var(--card-background, #fff);

    border-radius: 12px;

    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);

    width: 90%;

    max-width: 400px;

    animation: modalSlideIn 0.3s ease;



    &.closing {

      animation: modalSlideOut 0.3s ease forwards;

    }



    .captcha-modal-header {

      padding: 16px 20px;

      display: flex;

      align-items: center;

      justify-content: space-between;

      border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));



      h3 {

        margin: 0;

        font-size: 1.25rem;

        color: var(--primary-text-color);

      }



      .close-btn {

        background: none;

        border: none;

        cursor: pointer;

        color: var(--secondary-text-color);

        font-size: 1.5rem;

        display: flex;

        align-items: center;

        justify-content: center;

        width: 32px;

        height: 32px;

        border-radius: 50%;

        transition: all 0.2s;



        &:hover {

          background-color: var(--hover-bg-color, rgba(0, 0, 0, 0.05));

        }

      }

    }



    .captcha-modal-body {

      padding: 20px;



      p {

        margin-top: 0;

        margin-bottom: 16px;

        color: var(--secondary-text-color);

      }



      .google-captcha,

      .cloudflare-captcha {

        display: flex;

        justify-content: center;

        margin: 16px 0;

      }

    }

  }

}



@keyframes modalFadeIn {

  from { opacity: 0; }

  to { opacity: 1; }

}



@keyframes modalFadeOut {

  from { opacity: 1; }

  to { opacity: 0; }

}



@keyframes modalSlideIn {

  from { transform: translateY(20px); opacity: 0; }

  to { transform: translateY(0); opacity: 1; }

}



@keyframes modalSlideOut {

  from { transform: translateY(0); opacity: 1; }

  to { transform: translateY(20px); opacity: 0; }

}



.auth-footer {

  margin-top: 24px;



  a.btn {

    display: flex !important;

    align-items: center !important;

    justify-content: center !important;

    text-decoration: none;

    height: 45px !important;

    line-height: normal !important;

  }

}



.forgot-password, .auth-footer a, a {

  color: var(--theme-color);

  font-size: 0.875rem;

  text-decoration: none;

  transition: color 0.3s, opacity 0.3s, transform 0.3s;

  position: relative;

  display: inline-block;



  &:hover {

    opacity: 0.8;

    transform: translateY(-1px);

  }

}



.btn.btn-secondary.btn-block {

  height: 45px !important;

  display: flex !important;

  align-items: center !important;

  justify-content: center !important;

  line-height: normal !important;

  color: var(--text-color) !important;

  border: 1px solid var(--border-color) !important;

  background-color: transparent !important;

  transition: all 0.3s ease !important;



  &:hover {

    border-color: var(--theme-color) !important;

    background-color: rgba(var(--theme-color-rgb), 0.05) !important;

    color: var(--theme-color) !important;

    -webkit-text-fill-color: var(--theme-color) !important;

    background-image: none !important;

  }

}





@media (max-width: 576px) {

  .auth-card {

    padding: 1.5rem;

  }



  .auth-header {

    .auth-logo img {

      height: 50px;

    }



    .auth-title {

      font-size: 1.5rem;

    }

  }

}





@media (min-width: 576px) and (max-width: 992px) {

  .auth-container {

    padding: 2rem;

  }

}





.dark-theme {

  .input-with-icon {

    .input-icon {

      color: var(--secondary-text-color);

    }



    .form-control {

      background-color: var(--input-bg-color, #333);

      border-color: var(--input-border-color, #444);



      &:focus {

        background-color: var(--input-focus-bg-color, #3a3a3a);

        border-color: var(--theme-color);

      }



      &::placeholder {

        color: var(--placeholder-color, #777);

      }

    }

  }



  .input-with-button {

    .send-code-btn {

      background-color: var(--theme-color);



      &:hover:not(:disabled) {

        background-color: var(--primary-color-hover);

      }

    }

  }



  .btn-primary {

    background-color: var(--theme-color);



    &:hover:not(:disabled) {

      background-color: var(--primary-color-hover);

    }

  }

}



.loading-wrapper {

  display: flex;

  align-items: center;

  justify-content: center;

  gap: 8px;

  transition: all 0.3s ease;



  svg {

    display: none;

  }



  &::before {

    content: "";

    width: 16px;

    height: 16px;

    border: 2px solid rgba(255, 255, 255, 0.3);

    border-radius: 50%;

    border-top-color: white;

    animation: spin 1s linear infinite;

    margin-right: 8px;

  }



  span {

    display: inline-block;

    animation: pulse 1.5s infinite ease-in-out;

  }

}



@keyframes pulse {

  0%, 100% { opacity: 1; }

  50% { opacity: 0.7; }

}



@keyframes spin {

  from { transform: rotate(0deg); }

  to { transform: rotate(360deg); }

}



.auth-logo {

  margin-bottom: 1.5rem;

  text-align: center;



  img {

    width: 60px;

    height: 60px;

    min-width: 60px;

    min-height: 60px;

    border-radius: 12px;

    object-fit: cover;

    cursor: pointer;

    user-select: none;

  }

}

</style>
