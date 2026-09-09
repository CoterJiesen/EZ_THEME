<template>
    <div class="ticket-container">
        <!-- 屏幕尺寸提示 -->

        <div v-if="isSmallScreen" class="screen-size-notice">
            <div class="notice-content">
                <IconDeviceMobile :size="48" />

                <h2>{{ $t('tickets.smallScreenNotice') }}</h2>

                <p>{{ $t('tickets.switchToMobile') }}</p>

                <button class="switch-btn" @click="switchToMobileView">
                    {{ $t('tickets.switchToMobileView') }}
                </button>
            </div>
        </div>

        <!-- 原有内容在非小屏时显示 -->

        <template v-else>
            <!-- 欢迎卡片 -->

            <div class="dashboard-card welcome-card">
                <div class="card-header">
                    <h2 class="card-title">{{ $t('tickets.title') }}</h2>
                </div>

                <div class="card-body">
                    <p>{{ $t('tickets.description') }}</p>
                </div>
            </div>

            <div class="ticket-list-container">
                <!-- 左侧工单列表 -->

                <div class="ticket-sidebar">
                    <div class="ticket-header">
                        <div class="search-box">
                            <input
                                type="text"
                                v-model="searchQuery"
                                :placeholder="$t('tickets.searchPlaceholder')"
                                @input="handleSearch"
                            />

                            <IconSearch :size="16" class="search-icon" />
                        </div>

                        <button
                            class="new-ticket-btn"
                            @click="showNewTicketModal"
                        >
                            <IconPlus :size="16" />

                            {{ $t('tickets.newTicket') }}
                        </button>
                    </div>

                    <div
                        class="ticket-list"
                        v-if="tickets.length > 0 && !loadingTickets"
                    >
                        <div
                            v-for="ticket in filteredTickets"
                            :key="ticket.id"
                            class="ticket-item"
                            :class="{
                                active: selectedTicket?.id === ticket.id
                            }"
                            @click="selectTicket(ticket)"
                        >
                            <div class="ticket-info">
                                <h3 class="ticket-subject">
                                    {{ ticket.subject }}
                                </h3>

                                <div class="ticket-meta">
                                    <span class="ticket-time">{{
                                        formatTime(ticket.updated_at)
                                    }}</span>

                                    <div class="ticket-status">
                                        <span
                                            class="status-badge"
                                            :class="
                                                getStatusClass(ticket.status)
                                            "
                                        >
                                            {{ getStatusText(ticket.status) }}
                                        </span>

                                        <span
                                            class="level-badge"
                                            :class="getLevelClass(ticket.level)"
                                        >
                                            {{ getLevelText(ticket.level) }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 加载状态 -->

                    <div v-else-if="loadingTickets" class="ticket-loading">
                        <LoadingSpinner />

                        <p>{{ $t('tickets.loadingTickets') }}</p>
                    </div>

                    <div v-else class="empty-state">
                        <IconTicket :size="48" class="empty-icon" />

                        <p>{{ $t('tickets.noTickets') }}</p>
                    </div>
                </div>

                <!-- 右侧对话内容 -->

                <div class="ticket-content">
                    <template v-if="selectedTicket">
                        <!-- 工单详情头部 -->

                        <div class="ticket-detail-header">
                            <div class="ticket-subject-info">
                                <h2>{{ selectedTicket.subject }}</h2>

                                <div class="ticket-detail-meta">
                                    <span
                                        class="status-badge"
                                        :class="
                                            getStatusClass(
                                                selectedTicket.status
                                            )
                                        "
                                    >
                                        {{
                                            getStatusText(selectedTicket.status)
                                        }}
                                    </span>

                                    <span
                                        class="level-badge"
                                        :class="
                                            getLevelClass(selectedTicket.level)
                                        "
                                    >
                                        {{ getLevelText(selectedTicket.level) }}
                                    </span>

                                    <span class="ticket-time">
                                        {{ $t('tickets.createdAt') }}:
                                        {{
                                            formatTime(
                                                selectedTicket.created_at
                                            )
                                        }}
                                    </span>
                                </div>
                            </div>

                            <div class="ticket-actions">
                                <button
                                    v-if="selectedTicket.status === 0"
                                    class="close-ticket-btn"
                                    @click="showCloseConfirm()"
                                    :disabled="closingTicket"
                                >
                                    <span v-if="!closingTicket">{{
                                        $t('tickets.closeTicket')
                                    }}</span>

                                    <span v-else class="loading-text">
                                        <span class="loading-spinner"></span>

                                        {{ $t('tickets.closing') }}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <!-- 工单对话内容 -->

                        <div class="ticket-detail-content">
                            <div class="ticket-messages">
                                <!-- 初始工单内容将在获取详情后显示 -->

                                <div
                                    class="message-loading"
                                    v-if="loadingMessages"
                                >
                                    <LoadingSpinner />

                                    <p>{{ $t('tickets.loadingMessages') }}</p>
                                </div>

                                <div
                                    v-else-if="ticketMessages.length === 0"
                                    class="no-messages"
                                >
                                    <IconMessageCircle
                                        :size="64"
                                        class="no-messages-icon"
                                    />

                                    <p>{{ $t('tickets.noMessages') }}</p>
                                </div>

                                <template v-else>
                                    <div
                                        v-for="(
                                            message, index
                                        ) in ticketMessages"
                                        :key="message.id"
                                        class="message-item"
                                        :class="{
                                            'admin-message': message.is_admin,
                                            'user-message': !message.is_admin
                                        }"
                                    >
                                        <div
                                            v-if="message.is_admin"
                                            class="message-avatar admin-avatar"
                                        >
                                            <IconHeadset />
                                        </div>

                                        <div class="message-content">
                                            <div class="message-header">
                                                <span
                                                    v-if="
                                                        shouldShowMessageSender(
                                                            index,
                                                            message.is_admin
                                                        )
                                                    "
                                                    class="message-sender"
                                                >
                                                    {{
                                                        message.is_admin
                                                            ? $t(
                                                                  'tickets.admin'
                                                              )
                                                            : $t('tickets.you')
                                                    }}
                                                </span>
                                            </div>

                                            <div
                                                class="message-text"
                                                v-html="
                                                    md.render(message.message)
                                                "
                                            ></div>
                                        </div>

                                        <div
                                            v-if="!message.is_admin"
                                            class="message-avatar user-avatar"
                                        >
                                            <IconUser />
                                        </div>

                                        <span class="message-time-floating">{{
                                            formatTimeShort(message.created_at)
                                        }}</span>
                                    </div>
                                </template>
                            </div>
                        </div>

                        <!-- 回复输入框 -->

                        <div
                            class="reply-container"
                            v-if="selectedTicket.status === 0"
                        >
                            <textarea
                                ref="replyTextarea"
                                v-model="replyMessage"
                                :placeholder="$t('tickets.replyPlaceholder')"
                                rows="3"
                                @keydown.ctrl.enter="sendReply"
                                @keyup="updateReplyCaret"
                                @click="updateReplyCaret"
                            ></textarea>

                            <!-- 上传图片按钮 -->
                            <div
                                class="reply-tools"
                                style="
                                    display: flex;
                                    gap: 8px;
                                    align-items: center;
                                "
                            >
                                <button
                                    class="send-reply-btn"
                                    type="button"
                                    @click="triggerReplyImageInput"
                                    :disabled="uploadingReplyImages"
                                >
                                    <IconPhotoPlus
                                        :size="18"
                                        v-if="!uploadingReplyImages"
                                    />
                                    <span v-else class="loader"></span>
                                    <span v-if="!uploadingReplyImages">{{
                                        $t('tickets.upPictures') || '上传图片'
                                    }}</span>
                                    <span v-else>{{
                                        $t('tickets.uploadingImages') ||
                                        '上传中'
                                    }}</span>
                                </button>

                                <button
                                    class="send-reply-btn"
                                    @click="sendReply"
                                    :disabled="
                                        !replyMessage.trim() || sendingReply
                                    "
                                >
                                    <span
                                        v-if="sendingReply"
                                        class="loader"
                                    ></span>
                                    <IconSend v-else :size="18" />
                                    {{ $t('tickets.send') }}
                                </button>
                            </div>

                            <!-- 隐藏的文件选择框 -->
                            <input
                                ref="replyImageInput"
                                type="file"
                                accept="image/*"
                                multiple
                                style="display: none"
                                @change="handleReplyImageUpload"
                            />
                        </div>

                        <div class="ticket-closed-notice" v-else>
                            <IconLock :size="20" />

                            <span>{{ $t('tickets.ticketClosed') }}</span>
                        </div>
                    </template>

                    <div v-else class="no-selection">
                        <IconMessage :size="64" class="no-selection-icon" />

                        <p>{{ $t('tickets.selectTicket') }}</p>
                    </div>
                </div>
            </div>

            <!-- 新建工单弹窗 并将弹窗置顶-->
            <teleport to="body">
                <div
                    class="modal-overlay"
                    v-if="showModal"
                    @click="closeModal"
                    :class="{ 'show-overlay': overlayVisible }"
                >
                    <div
                        class="modal-content"
                        :class="{
                            'modal-close-animation': modalCloseAnimation
                        }"
                        @click.stop
                    >
                        <div class="modal-header">
                            <h3>{{ $t('tickets.createNew') }}</h3>

                            <button class="modal-close" @click="closeModal">
                                <IconX :size="20" />
                            </button>
                        </div>

                        <div class="modal-body">
                            <div class="form-group">
                                <label>{{ $t('tickets.subject') }}</label>

                                <input
                                    type="text"
                                    v-model="newTicket.subject"
                                    :placeholder="
                                        $t('tickets.subjectPlaceholder')
                                    "
                                />
                            </div>

                            <div class="form-group">
                                <label>{{ $t('tickets.level') }}</label>

                                <div class="level-tags">
                                    <div
                                        class="level-tag"
                                        :class="{
                                            active: newTicket.level === '0',
                                            'level-low': true
                                        }"
                                        @click="newTicket.level = '0'"
                                    >
                                        <IconCircleCheck
                                            v-if="newTicket.level === '0'"
                                            :size="16"
                                            class="tag-icon"
                                        />

                                        <IconCircle
                                            v-else
                                            :size="16"
                                            class="tag-icon"
                                        />

                                        {{ $t('tickets.levelLow') }}
                                    </div>

                                    <div
                                        class="level-tag"
                                        :class="{
                                            active: newTicket.level === '1',
                                            'level-medium': true
                                        }"
                                        @click="newTicket.level = '1'"
                                    >
                                        <IconCircleCheck
                                            v-if="newTicket.level === '1'"
                                            :size="16"
                                            class="tag-icon"
                                        />

                                        <IconCircle
                                            v-else
                                            :size="16"
                                            class="tag-icon"
                                        />

                                        {{ $t('tickets.levelMedium') }}
                                    </div>

                                    <div
                                        class="level-tag"
                                        :class="{
                                            active: newTicket.level === '2',
                                            'level-high': true
                                        }"
                                        @click="newTicket.level = '2'"
                                    >
                                        <IconCircleCheck
                                            v-if="newTicket.level === '2'"
                                            :size="16"
                                            class="tag-icon"
                                        />

                                        <IconCircle
                                            v-else
                                            :size="16"
                                            class="tag-icon"
                                        />

                                        {{ $t('tickets.levelHigh') }}
                                    </div>
                                </div>
                            </div>

                            <div class="form-group">
                                <label>{{ $t('tickets.message') }}</label>

                                <textarea
                                    ref="newTicketTextarea"
                                    v-model="newTicket.message"
                                    :placeholder="
                                        $t('tickets.messagePlaceholder')
                                    "
                                    rows="5"
                                    @keyup="updateCaret"
                                    @click="updateCaret"
                                ></textarea>

                                <div
                                    v-if="TICKET_CONFIG.isImageHosting"
                                    class="image-upload-area"
                                    :class="{ dragging: draggingImage }"
                                    @dragover.prevent="draggingImage = true"
                                    @dragleave.prevent="draggingImage = false"
                                    @drop.prevent="onDropImage"
                                    @click="triggerImageInput"
                                >
                                    <div class="upload-icon">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="48"
                                            height="48"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="2"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            class="icon icon-tabler icons-tabler-outline icon-tabler-cloud-up"
                                        >
                                            <path
                                                stroke="none"
                                                d="M0 0h24v24H0z"
                                                fill="none"
                                            />
                                            <path
                                                d="M12 18.004h-5.343c-2.572 -.004 -4.657 -2.011 -4.657 -4.487c0 -2.475 2.085 -4.482 4.657 -4.482c.393 -1.762 1.794 -3.2 3.675 -3.773c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.38 0 2.57 .811 3.128 1.986"
                                            />
                                            <path d="M19 22v-6" />
                                            <path d="M22 19l-3 -3l-3 3" />
                                        </svg>
                                    </div>
                                    <div class="upload-tip">
                                        <span class="upload-tip-text">{{
                                            $t('tickets.uploadTipText') ||
                                            '拖拽图片到此处或点击上传'
                                        }}</span
                                        ><br />
                                        <span class="upload-desc">{{
                                            $t('tickets.uploadDescText') ||
                                            '支持 JPG、PNG、GIF 格式，最大 5 MB'
                                        }}</span>
                                    </div>
                                    <input
                                        ref="imageInput"
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        style="display: none"
                                        @change="handleImageUpload"
                                    />
                                </div>
                                <div
                                    v-if="uploadingImages"
                                    style="margin-top: 8px; color: #2196f3"
                                >
                                    {{
                                        $t('tickets.uploadingImages') ||
                                        '图片上传中...'
                                    }}
                                </div>
                                <div
                                    v-if="uploadedImages.length"
                                    style="margin-top: 8px"
                                >
                                    <span
                                        v-for="img in uploadedImages"
                                        :key="img"
                                        class="thumb"
                                        @click="insertImage(img)"
                                        title="点击插入到内容"
                                        style="
                                            display: inline-block;
                                            margin-right: 8px;
                                            cursor: pointer;
                                        "
                                    >
                                        <img
                                            :src="img"
                                            style="
                                                max-width: 60px;
                                                max-height: 60px;
                                                border-radius: 6px;
                                                border: 1px solid #eee;
                                            "
                                        />
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="modal-footer">
                            <button class="btn-cancel" @click="closeModal">
                                {{ $t('common.cancel') }}
                            </button>

                            <button
                                class="btn-submit"
                                @click="submitTicket"
                                :disabled="isSubmitting"
                                type="button"
                            >
                                <span v-if="isSubmitting" class="loader"></span>

                                {{ $t('common.submit') }}
                            </button>
                        </div>
                    </div>
                </div>
            </teleport>
            <!-- 关闭工单确认弹窗 -->

            <div
                class="modal-overlay"
                v-if="showCloseTicketModal"
                @click="showCloseConfirm"
                :class="{ 'show-overlay': overlayVisible }"
            >
                <div
                    class="modal-content"
                    :class="{ 'modal-close-animation': modalCloseAnimation }"
                    @click.stop
                >
                    <div class="modal-header">
                        <h3>{{ $t('tickets.closeConfirmTitle') }}</h3>

                        <button
                            class="modal-close"
                            @click="showCloseTicketModal = false"
                        >
                            <IconX :size="20" />
                        </button>
                    </div>

                    <div class="modal-body">
                        <p>{{ $t('tickets.closeConfirmText') }}</p>
                    </div>

                    <div class="modal-footer">
                        <button
                            class="btn-cancel"
                            @click="showCloseTicketModal = false"
                        >
                            {{ $t('common.cancel') }}
                        </button>

                        <button
                            class="btn-submit"
                            @click="closeTicketHandler"
                            :disabled="closingTicket"
                        >
                            <span v-if="closingTicket" class="loader"></span>

                            {{ $t('common.confirm') }}
                        </button>
                    </div>
                </div>
            </div>
        </template>

        <!-- 工单弹窗 -->

        <TicketPopup
            :show-popup="showTicketPopup"
            :title="ticketPopupCfg.title"
            :content="ticketPopupCfg.content"
            :cooldown-hours="ticketPopupCfg.cooldownHours"
            :close-wait-seconds="ticketPopupCfg.closeWaitSeconds"
            @close="handleTicketPopupClose"
        />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';

import { useI18n } from 'vue-i18n';

import { useRouter } from 'vue-router';

import { createMarkdownRenderer, formatTicketTime, formatTicketTimeShort, shouldShowMessageSenderGroup } from './composables/ticketPresentation';

const md = ref({ render: (content) => content || '' });

import {
    IconSearch,
    IconPlus,
    IconTicket,
    IconMessage,
    IconMessageCircle,
    IconX,
    IconUser,
    IconHeadset,
    IconSend,
    IconLock,
    IconCircleCheck,
    IconCircle,
    IconDeviceMobile,
    IconPhotoPlus
} from '@tabler/icons-vue';

import {
    fetchTicketList,
    createTicket,
    getTicketDetail,
    replyTicket,
    closeTicket
} from '@/api/ticket';

import {
    getUserInfo,
    getIpLocationInfo,
    getCommConfig,
    getUserSubscribe
} from '@/api/user';

import { formatUserInfoForTicket } from '@/utils/formatters';

import LoadingSpinner from '@/components/common/LoadingSpinner.vue';

import { useToast } from '@/composables/useToast';

import TicketPopup from '@/components/ticket/TicketPopup.vue';

import { TICKET_CONFIG } from '@/utils/baseConfig';

const { t } = useI18n();

const { showToast } = useToast();

const tickets = ref([]);

const selectedTicket = ref(null);

const searchQuery = ref('');

const showModal = ref(false);

const isSubmitting = ref(false);

const ticketMessages = ref([]);

const loadingMessages = ref(false);

const replyMessage = ref('');

const sendingReply = ref(false);

const showCloseTicketModal = ref(false);

const closingTicket = ref(false);

const loadingTickets = ref(false);

const refreshInterval = ref(null);

// 上传相关
const uploadedImages = ref([]);
const uploadingImages = ref(false);
const draggingImage = ref(false);
const imageInput = ref(null);

const newTicketTextarea = ref(null);
const caretPos = ref(0);

// 记录光标位置
const updateCaret = () => {
    const ta = newTicketTextarea.value;
    if (!ta) return;
    caretPos.value = ta.selectionStart ?? newTicket.value.message.length;
};

// 在光标处插入文本（支持选中覆盖）
const insertAtCursor = async (text) => {
    const ta = newTicketTextarea.value;
    const value = newTicket.value.message || '';
    if (!ta) {
        // 没有拿到DOM，直接末尾追加
        newTicket.value.message =
            value + (value && !value.endsWith('\n') ? '\n' : '') + text + '\n';
        return;
    }
    const start = ta.selectionStart ?? caretPos.value ?? value.length;
    const end = ta.selectionEnd ?? start;
    newTicket.value.message = value.slice(0, start) + text + value.slice(end);
    await nextTick();
    const pos = start + text.length;
    ta.focus();
    ta.setSelectionRange(pos, pos);
    caretPos.value = pos;
};

// 点击缩略图时插入 Markdown
const insertImage = (url) => {
    const md = `![image](${url})`;
    // 避免重复插入同一URL（可选）
    if ((newTicket.value.message || '').includes(url)) return;
    insertAtCursor(md);
};

const IMGBB_API_URL = 'https://api.imgbb.com/1/upload';
const IMGBB_API_KEY = TICKET_CONFIG.imgbbApiKey;

const triggerImageInput = () => {
    imageInput.value && imageInput.value.click();
};

const onDropImage = async (e) => {
    draggingImage.value = false;
    const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/')
    );
    if (files.length) {
        await handleImageUpload({ target: { files } });
    }
};

const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    uploadingImages.value = true;

    for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
            showToast('图片不能超过 5MB', 'error');
            continue;
        }

        try {
            // 转成 base64
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const formData = new FormData();
            formData.append('image', base64);

            const res = await fetch(`${IMGBB_API_URL}?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });

            const result = await res.json();
            if (result.success && result.data && result.data.url) {
                uploadedImages.value.push(result.data.url);
                newTicket.value.message += `\n![image](${result.data.url})`;
            } else {
                showToast(result.error?.message || '图片上传失败', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('图片上传异常', 'error');
        }
    }

    uploadingImages.value = false;
};

// ========= 回复区上传图片 =========
const replyImageInput = ref(null);
const replyTextarea = ref(null);
const uploadingReplyImages = ref(false);
const replyCaretPos = ref(0);

const triggerReplyImageInput = () => {
    replyImageInput.value && replyImageInput.value.click();
};

const updateReplyCaret = () => {
    const ta = replyTextarea.value;
    if (!ta) return;
    replyCaretPos.value = ta.selectionStart ?? replyMessage.value.length;
};

const insertAtCursorToReply = async (text) => {
    const ta = replyTextarea.value;
    const value = replyMessage.value || '';
    if (!ta) {
        replyMessage.value =
            value + (value && !value.endsWith('\n') ? '\n' : '') + text + '\n';
        return;
    }
    const start = ta.selectionStart ?? replyCaretPos.value ?? value.length;
    const end = ta.selectionEnd ?? start;
    replyMessage.value = value.slice(0, start) + text + value.slice(end);
    await nextTick();
    const pos = start + text.length;
    ta.focus();
    ta.setSelectionRange(pos, pos);
    replyCaretPos.value = pos;
};

const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

const uploadToImgbb = async (file) => {
    const b64 = await fileToBase64(file);
    const fd = new FormData();
    fd.append('image', b64);
    const res = await fetch(`${IMGBB_API_URL}?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: fd
    });
    const json = await res.json();
    if (json.success && json.data?.url) return json.data.url;
    throw new Error(json.error?.message || 'imgbb 上传失败');
};

const handleReplyImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    uploadingReplyImages.value = true;

    try {
        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) {
                showToast('图片不能超过 5MB', 'error');
                continue;
            }
            const url = await uploadToImgbb(file);
            const md = `![image](${url})`;
            await insertAtCursorToReply(md);
        }
        showToast($t?.('tickets.uploadSuccess') || '图片上传成功', 'success');
    } catch (err) {
        console.error(err);
        showToast(err.message || '图片上传异常', 'error');
    } finally {
        uploadingReplyImages.value = false;
        // 清空 input 值，避免同一文件无法再次触发 change
        if (replyImageInput.value) replyImageInput.value.value = '';
    }
};
// ==================

const errors = ref({
    subject: '',

    message: ''
});

const newTicket = ref({
    subject: '',

    message: '',

    level: '0'
});

const filteredTickets = computed(() => {
    if (!searchQuery.value) return tickets.value;

    const query = searchQuery.value.toLowerCase();

    return tickets.value.filter((ticket) =>
        ticket.subject.toLowerCase().includes(query)
    );
});

const fetchTickets = async () => {
    loadingTickets.value = true;

    try {
        const data = await fetchTicketList();

        tickets.value = Array.isArray(data.data) ? data.data : [];
    } catch (error) {
        console.error('Failed to fetch tickets:', error);

        showToast(
            error.response?.message || error.message || t('tickets.fetchError'),
            'error'
        );

        tickets.value = [];
    } finally {
        loadingTickets.value = false;
    }
};

const submitTicket = async () => {
    if (!newTicket.value.subject.trim()) {
        errors.value.subject = t('tickets.subjectRequired');

        return;
    } else {
        errors.value.subject = '';
    }

    if (!newTicket.value.message.trim()) {
        errors.value.message = t('tickets.messageRequired');

        return;
    } else {
        errors.value.message = '';
    }

    isSubmitting.value = true;

    try {
        const [
            userInfoResponse,
            commConfigResponse,
            subscribeResponse,
            ipLocationResponse
        ] = await Promise.all([
            getUserInfo(),

            getCommConfig(),

            getUserSubscribe(),

            getIpLocationInfo().catch((error) => {
                console.warn('Failed to get ticket IP location info:', error);

                return null;
            })
        ]);

        if (
            commConfigResponse &&
            commConfigResponse.data &&
            commConfigResponse.data.currency_symbol
        ) {
            userInfoResponse.currency_symbol =
                commConfigResponse.data.currency_symbol;
        }

        const userInfoText = formatUserInfoForTicket(
            userInfoResponse,

            ipLocationResponse,

            subscribeResponse
        );

        const messageWithUserInfo = `${newTicket.value.message}\n\n${userInfoText}`;

        const data = await createTicket({
            subject: newTicket.value.subject,

            message: messageWithUserInfo,

            level: parseInt(newTicket.value.level)
        });

        if (data.data) {
            showToast(data.message || t('tickets.createSuccess'), 'success');

            closeModal();

            await fetchTickets();

            if (tickets.value.length > 0) {
                const newTicketCreated = tickets.value[0];

                selectTicket(newTicketCreated);
            }
        }
    } catch (error) {
        console.error('Failed to create ticket:', error);

        showToast(
            error.response?.message ||
                error.message ||
                t('tickets.createError'),
            'error'
        );
    } finally {
        isSubmitting.value = false;
    }
};

const fetchTicketDetail = async (ticketId, isAutoRefresh = false) => {
    if (!isAutoRefresh) {
        loadingMessages.value = true;

        ticketMessages.value = [];
    }

    try {
        const data = await getTicketDetail(ticketId);

        if (data.data) {
            if (data.data.message && Array.isArray(data.data.message)) {
                ticketMessages.value = data.data.message.map((msg) => ({
                    ...msg,

                    is_admin: !msg.is_me
                }));
            } else {
                ticketMessages.value = [];
            }

            if (selectedTicket.value && selectedTicket.value.id === ticketId) {
                if (data.data.status !== undefined) {
                    selectedTicket.value.status = data.data.status;

                    if (data.data.status === 1) {
                        clearRefreshInterval();
                    }
                }
            }
        }
    } catch (error) {
        console.error('Failed to fetch ticket details:', error);

        showToast(
            error.response?.message ||
                error.message ||
                t('tickets.fetchDetailError'),
            'error'
        );
    } finally {
        if (!isAutoRefresh) {
            loadingMessages.value = false;
        }
    }
};

const clearRefreshInterval = () => {
    if (refreshInterval.value) {
        clearInterval(refreshInterval.value);

        refreshInterval.value = null;
    }
};

const setupRefreshInterval = (ticketId) => {
    clearRefreshInterval();

    if (selectedTicket.value && selectedTicket.value.status === 0) {
        refreshInterval.value = setInterval(() => {
            if (selectedTicket.value && selectedTicket.value.id === ticketId) {
                fetchTicketDetail(ticketId, true);
            } else {
                clearRefreshInterval();
            }
        }, 5000);
    }
};

const sendReply = async () => {
    if (!replyMessage.value.trim() || !selectedTicket.value) return;

    sendingReply.value = true;

    try {
        const data = await replyTicket(
            selectedTicket.value.id,
            replyMessage.value
        );

        if (data.data) {
            showToast(data.message || t('tickets.replySent'), 'success');

            replyMessage.value = '';

            await fetchTicketDetail(selectedTicket.value.id, true);
        }
    } catch (error) {
        console.error('Failed to send reply:', error);

        showToast(
            error.response?.message || error.message || t('tickets.replyError'),
            'error'
        );
    } finally {
        sendingReply.value = false;
    }
};

const closeTicketHandler = async () => {
    if (!selectedTicket.value) return;

    closingTicket.value = true;

    try {
        const data = await closeTicket(selectedTicket.value.id);

        if (data.data === true) {
            showToast(data.message || t('tickets.closeSuccess'), 'success');

            selectedTicket.value.status = 1;

            clearRefreshInterval();

            await fetchTicketDetail(selectedTicket.value.id);

            await fetchTickets();

            modalCloseAnimation.value = true;

            overlayVisible.value = false;

            setTimeout(() => {
                showCloseTicketModal.value = false;

                modalCloseAnimation.value = false;
            }, 250);
        }
    } catch (error) {
        console.error('Failed to close ticket:', error);

        showToast(
            error.response?.message || error.message || t('tickets.closeError'),
            'error'
        );
    } finally {
        closingTicket.value = false;
    }
};

const formatTime = formatTicketTime;

const getStatusText = (status) => {
    return status === 0 ? t('tickets.statusOpen') : t('tickets.statusClosed');
};

const getStatusClass = (status) => {
    return status === 0 ? 'status-open' : 'status-closed';
};

const getLevelText = (level) => {
    const levels = {
        0: t('tickets.levelLow'),

        1: t('tickets.levelMedium'),

        2: t('tickets.levelHigh')
    };

    return levels[level] || levels[0];
};

const getLevelClass = (level) => {
    const classes = {
        0: 'level-low',

        1: 'level-medium',

        2: 'level-high'
    };

    return classes[level] || classes[0];
};

const handleSearch = () => {};

const selectTicket = (ticket) => {
    clearRefreshInterval();

    selectedTicket.value = ticket;

    fetchTicketDetail(ticket.id);

    if (ticket.status === 0) {
        setupRefreshInterval(ticket.id);
    }
};

const modalCloseAnimation = ref(false);

const overlayVisible = ref(false);

const closeModal = () => {
    modalCloseAnimation.value = true;

    overlayVisible.value = false;

    setTimeout(() => {
        showModal.value = false;

        modalCloseAnimation.value = false;
        newTicket.value = {
            subject: '',

            message: '',

            level: '0'
        };
    }, 250);
};

const showNewTicketModal = () => {
    modalCloseAnimation.value = false;
    showModal.value = true;

    setTimeout(() => {
        overlayVisible.value = true;
    }, 10);
};

const showCloseConfirm = () => {
    if (showCloseTicketModal.value) {
        modalCloseAnimation.value = true;

        overlayVisible.value = false;

        setTimeout(() => {
            showCloseTicketModal.value = false;

            modalCloseAnimation.value = false;
        }, 250);
    } else {
        modalCloseAnimation.value = false;
        showCloseTicketModal.value = true;

        setTimeout(() => {
            overlayVisible.value = true;
        }, 10);
    }
};

const shouldShowMessageSender = (index, isAdmin) => shouldShowMessageSenderGroup(ticketMessages.value, index, isAdmin);

const formatTimeShort = formatTicketTimeShort;

const isSmallScreen = ref(false);

const router = useRouter();

const checkScreenSize = () => {
    isSmallScreen.value = window.innerWidth < 905;
};

const switchToMobileView = () => {
    router.push('/mobile/tickets');
};

const showTicketPopup = ref(false);

const ticketPopupCfg = TICKET_CONFIG?.popup || {};

const checkTicketPopup = () => {
    if (!ticketPopupCfg.enabled) return;

    const lastClose = Number(
        localStorage.getItem('ticket_popup_close_time') || 0
    );

    const cooldownMs = (ticketPopupCfg.cooldownHours || 0) * 3600 * 1000;

    if (!lastClose || Date.now() - lastClose >= cooldownMs) {
        showTicketPopup.value = true;
    }
};

const handleTicketPopupClose = () => {
    showTicketPopup.value = false;
};

onMounted(async () => {
    md.value = await createMarkdownRenderer();
    checkScreenSize();

    window.addEventListener('resize', checkScreenSize);

    fetchTickets();

    checkTicketPopup();
});

onUnmounted(() => {
    window.removeEventListener('resize', checkScreenSize);

    clearRefreshInterval();
});
</script>

<style lang="scss" scoped>
.ticket-container {
    padding: 20px;

    display: flex;

    flex-direction: column;
}

.dashboard-card {
    background-color: var(--card-bg-color);

    border-radius: 12px;

    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);

    padding: 20px;

    margin-bottom: 24px;

    border: 1px solid var(--border-color);

    transition: all 0.3s ease;

    &:hover {
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);

        border-color: rgba(var(--theme-color-rgb), 0.3);
    }

    .card-header {
        display: flex;

        justify-content: space-between;

        align-items: center;

        margin-bottom: 15px;

        .card-title {
            font-size: 18px;

            font-weight: 600;

            margin: 0;
        }
    }

    .card-body {
        p {
            color: var(--text-muted);

            margin: 0;

            line-height: 1.5;
        }
    }
}

.welcome-card {
    margin-bottom: 24px;
}

.ticket-list-container {
    display: flex;

    height: calc(100vh - 250px);

    max-height: 700px;

    background-color: var(--card-bg);

    border-radius: 12px;

    overflow: hidden;

    border: 1px solid var(--border-color);
}

.ticket-sidebar {
    width: 320px;

    border-right: 1px solid var(--border-color);

    display: flex;

    flex-direction: column;

    background-color: var(--bg-secondary);
}

.ticket-header {
    padding: 1rem;

    border-bottom: 1px solid var(--border-color);

    .search-box {
        position: relative;

        margin-bottom: 1rem;

        input {
            width: 100%;

            height: 40px;

            padding: 0 1rem 0 2.5rem;

            border: 1px solid var(--border-color);

            border-radius: 8px;

            background-color: var(--bg-secondary);

            color: var(--text-color);

            font-size: 14px;

            transition: all 0.3s ease;

            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);

            &:focus {
                outline: none;

                border-color: rgba(var(--theme-color-rgb), 0.5);

                box-shadow: 0 2px 12px rgba(var(--theme-color-rgb), 0.1);
            }

            &::placeholder {
                color: var(--text-muted);

                opacity: 0.7;
            }
        }

        .search-icon {
            position: absolute;

            left: 0.75rem;

            top: 50%;

            transform: translateY(-50%);

            color: var(--text-muted);

            transition: color 0.3s ease;
        }

        &:focus-within .search-icon {
            color: var(--theme-color);
        }
    }

    .new-ticket-btn {
        width: 100%;

        height: 40px;

        display: flex;

        align-items: center;

        justify-content: center;

        gap: 8px;

        padding: 0 16px;

        border-radius: 8px;

        font-size: 14px;

        font-weight: 500;

        cursor: pointer;

        transition: all 0.3s ease;

        color: white;

        background-color: rgba(var(--theme-color-rgb), 0.85);

        backdrop-filter: blur(8px);

        -webkit-backdrop-filter: blur(8px);

        border: 1px solid rgba(var(--theme-color-rgb), 0.3);

        box-shadow: 0 8px 20px rgba(var(--theme-color-rgb), 0.25);

        &:hover {
            transform: translateY(-2px);

            box-shadow: 0 10px 25px rgba(var(--theme-color-rgb), 0.35);

            background-color: rgba(var(--theme-color-rgb), 0.95);
        }

        &:active {
            transform: translateY(0);

            box-shadow: 0 5px 15px rgba(var(--theme-color-rgb), 0.3);
        }
    }
}

.ticket-list {
    flex: 1;

    overflow-y: auto;

    padding: 0.5rem;
}

.ticket-item {
    padding: 1rem;

    border-radius: 8px;

    cursor: pointer;

    transition: all 0.3s ease;

    margin-bottom: 0.5rem;

    position: relative;

    &:hover {
        background-color: rgba(var(--theme-color-rgb), 0.05);
    }

    &.active {
        background-color: rgba(var(--theme-color-rgb), 0.1);
    }
}

.ticket-info {
    .ticket-subject {
        margin: 0;

        font-size: 0.95rem;

        margin-bottom: 0.5rem;

        color: var(--text-color);
    }

    .ticket-meta {
        display: flex;

        align-items: center;

        .ticket-time {
            font-size: 0.8rem;

            color: var(--text-muted);

            margin-right: auto;
        }

        .ticket-status {
            display: flex;

            gap: 0.5rem;
        }
    }
}

.status-badge,
.level-badge {
    display: inline-flex;

    align-items: center;

    justify-content: center;

    padding: 0.25rem 0.5rem;

    border-radius: 4px;

    font-size: 0.75rem;

    font-weight: 500;
}

.status-open {
    background-color: rgba(76, 175, 80, 0.1);

    color: #4caf50;
}

.status-closed {
    background-color: rgba(158, 158, 158, 0.1);

    color: #9e9e9e;
}

.level-low {
    background-color: rgba(33, 150, 243, 0.1);

    color: #2196f3;
}

.level-medium {
    background-color: rgba(255, 152, 0, 0.1);

    color: #ff9800;
}

.level-high {
    background-color: rgba(244, 67, 54, 0.1);

    color: #f44336;
}

.ticket-content {
    flex: 1;

    display: flex;

    flex-direction: column;

    background-color: var(--card-bg);
}

.ticket-detail-header {
    padding: 1rem;

    border-bottom: 1px solid var(--border-color);

    display: flex;

    justify-content: space-between;

    align-items: center;

    .ticket-subject-info {
        h2 {
            margin: 0;

            margin-bottom: 0.5rem;

            font-size: 1.2rem;
        }

        .ticket-detail-meta {
            display: flex;

            align-items: center;

            gap: 0.5rem;

            font-size: 0.85rem;

            color: var(--text-muted);

            .ticket-time {
                margin-left: 0.5rem;
            }
        }
    }

    .ticket-actions {
        .close-ticket-btn {
            display: flex;

            align-items: center;

            gap: 0.5rem;

            padding: 0.5rem 0.75rem;

            border-radius: 6px;

            background-color: rgba(244, 67, 54, 0.1);

            color: #f44336;

            border: none;

            cursor: pointer;

            transition: all 0.3s ease;

            &:hover {
                background-color: rgba(244, 67, 54, 0.2);
            }
        }
    }
}

.ticket-detail-content {
    flex: 1;

    overflow-y: auto;

    padding: 1.5rem;

    background-color: var(--bg-secondary);

    display: flex;

    flex-direction: column;

    // 移除系统暗色覆盖
    // @media (prefers-color-scheme: dark) {
    //   background-color: rgba(20, 25, 30, 0.7);
    //   background-image: linear-gradient(to bottom, rgba(30,35,40,.4), rgba(15,20,25,.4));
    // }
}

// 仅在 达世界 主题为暗色时生效
:global(body.dark-theme) .ticket-detail-content {
  background-color: rgba(20, 25, 30, 0.7);
  background-image: linear-gradient(to bottom, rgba(30,35,40,.4), rgba(15,20,25,.4));
}

.ticket-messages {
    display: flex;

    flex-direction: column;

    gap: 0.5rem;

    flex: 1;

    padding-bottom: 1rem;

    .message-date-separator {
        display: flex;

        align-items: center;

        justify-content: center;

        margin: 1.5rem 0;

        position: relative;

        &:before,
        &:after {
            content: '';

            height: 1px;

            background-color: var(--border-color);

            flex: 1;
        }

        .separator-date {
            padding: 0.25rem 0.75rem;

            background-color: rgba(var(--theme-color-rgb), 0.1);

            border-radius: 12px;

            font-size: 0.75rem;

            margin: 0 0.75rem;

            color: var(--text-muted);
        }
    }
}

.message-item {
    display: flex;

    margin-bottom: 1.25rem;

    align-items: flex-end;

    position: relative;

    &.user-message {
        justify-content: flex-end;

        .message-content {
            margin-left: 10%;

            background-color: rgba(var(--theme-color-rgb), 0.08);

            border-radius: 18px 18px 4px 18px;

            // @media (prefers-color-scheme: dark) {
            //   background-color: rgba(var(--theme-color-rgb), 0.15);
            //   border: 1px solid rgba(var(--theme-color-rgb), 0.2);
            // }

            .message-sender {
                color: rgba(var(--theme-color-rgb), 0.9);
            }

            .message-time {
                color: rgba(var(--theme-color-rgb), 0.7);
            }
        }

        .message-time-floating {
            right: 48px;
        }
    }

    &.admin-message {
        justify-content: flex-start;

        .message-content {
            margin-right: 10%;

            background-color: rgba(var(--theme-color-rgb), 0.08);

            border-radius: 18px 18px 18px 4px;

            // @media (prefers-color-scheme: dark) {
            //   background-color: rgba(var(--theme-color-rgb), 0.15);
            //   border: 1px solid rgba(var(--theme-color-rgb), 0.2);
            // }

            .message-sender {
                color: rgba(var(--theme-color-rgb), 0.9);
            }

            .message-time {
                color: rgba(var(--theme-color-rgb), 0.7);
            }
        }

        .message-time-floating {
            left: 48px;
        }
    }

    .message-avatar {
        width: 34px;

        height: 34px;

        border-radius: 50%;

        display: flex;

        align-items: center;

        justify-content: center;

        color: #fff;

        flex-shrink: 0;

        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);

        position: relative;

        overflow: hidden;

        &::before {
            content: '';

            position: absolute;

            top: 0;

            left: 0;

            right: 0;

            bottom: 0;

            backdrop-filter: blur(10px);

            -webkit-backdrop-filter: blur(10px);

            z-index: -1;
        }

        &.user-avatar {
            background-color: rgba(91, 138, 245, 0.85);

            margin-left: 8px;

            // @media (prefers-color-scheme: dark) {
            //   background-color: rgba(74, 122, 226, 0.85);
            //   box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
            // }
        }

        &.admin-avatar {
            background-color: rgba(245, 91, 91, 0.85);

            margin-right: 8px;

            // @media (prefers-color-scheme: dark) {
            //   background-color: rgba(216, 73, 73, 0.85);
            //   box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
            // }
        }
    }

    .message-content {
        max-width: 85%;

        padding: 0.85rem 1.1rem;

        border-radius: 18px;

        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);

        position: relative;

        // @media (prefers-color-scheme: dark) {
        //   box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        // }

        .message-header {
            display: flex;

            flex-direction: column;

            margin-bottom: 0.4rem;

            .message-sender {
                font-size: 0.85rem;

                font-weight: 500;

                margin-bottom: 3px;
            }

            .message-time {
                font-size: 0.7rem;

                color: var(--text-muted);

                align-self: flex-end;
            }
        }

        .message-text {
            font-size: 0.97rem;

            line-height: 1.5;

            white-space: pre-wrap;

            word-break: break-word;

            color: var(--text-color);
        }
    }

    .message-time-floating {
        position: absolute;

        bottom: -1.1rem;

        font-size: 0.7rem;

        color: var(--text-muted);

        opacity: 0.8;
    }
}

// 按应用主题启用深色
:global(body.dark-theme) .message-item.user-message .message-content,
:global(body.dark-theme) .message-item.admin-message .message-content {
  background-color: rgba(var(--theme-color-rgb), 0.15);
  border: 1px solid rgba(var(--theme-color-rgb), 0.2);
}
:global(body.dark-theme) .message-item .message-content {
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
:global(body.dark-theme) .message-item .message-avatar.user-avatar {
  background-color: rgba(74, 122, 226, 0.85);
  box-shadow: 0 2px 6px rgba(0,0,0,0.25);
}
:global(body.dark-theme) .message-item .message-avatar.admin-avatar {
  background-color: rgba(216, 73, 73, 0.85);
  box-shadow: 0 2px 6px rgba(0,0,0,0.25);
}

.reply-container {
    padding: 1.25rem;

    border-top: 1px solid var(--border-color);

    display: flex;

    gap: 1rem;

    align-items: flex-start;

    background-color: var(--card-bg);

    // @media (prefers-color-scheme: dark) {
    //   background-color: rgba(25, 30, 35, 0.8);
    // }

    textarea {
        flex: 1;

        padding: 1rem 1.25rem;

        border: 1px solid var(--border-color);

        border-radius: 18px;

        resize: none;

        background-color: var(--bg-secondary);

        color: var(--text-color);

        font-size: 1rem;

        line-height: 1.5;

        transition: all 0.3s ease;

        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);

        min-height: 90px;

        &:focus {
            outline: none;

            border-color: var(--theme-color);

            box-shadow: 0 4px 12px rgba(var(--theme-color-rgb), 0.1);

            transform: translateY(-2px);
        }

        &::placeholder {
            color: var(--text-muted);

            opacity: 0.7;
        }

        // @media (prefers-color-scheme: dark) {
        //   background-color: rgba(30, 35, 40, 0.7);
        //   box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        // }
    }

    .send-reply-btn {
        display: flex;

        align-items: center;

        justify-content: center;

        gap: 0.5rem;

        padding: 0 1.5rem;

        height: 40px;

        border-radius: 8px;

        background-color: rgba(var(--theme-color-rgb), 0.85);

        color: white;

        border: none;

        cursor: pointer;

        transition: all 0.3s ease;

        white-space: nowrap;

        font-weight: 500;

        box-shadow: 0 8px 20px rgba(var(--theme-color-rgb), 0.25);

        backdrop-filter: blur(8px);

        -webkit-backdrop-filter: blur(8px);

        border: 1px solid rgba(var(--theme-color-rgb), 0.3);

        &:hover:not(:disabled) {
            transform: translateY(-2px);

            box-shadow: 0 10px 25px rgba(var(--theme-color-rgb), 0.35);

            background-color: rgba(var(--theme-color-rgb), 0.95);
        }

        &:active:not(:disabled) {
            transform: translateY(0);

            box-shadow: 0 5px 15px rgba(var(--theme-color-rgb), 0.3);
        }

        &:disabled {
            opacity: 0.6;

            cursor: not-allowed;
        }

        .loader {
            width: 16px;

            height: 16px;

            border: 2px solid rgba(255, 255, 255, 0.3);

            border-radius: 50%;

            border-top-color: white;

            animation: spin 1s linear infinite;
        }

        // @media (prefers-color-scheme: dark) {
        //   box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
        // }
    }
}

// 按应用主题启用深色
:global(body.dark-theme) .reply-container {
  background-color: rgba(25, 30, 35, 0.8);
}
:global(body.dark-theme) .reply-container textarea {
  background-color: rgba(30, 35, 40, 0.7);
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.no-selection,
.message-loading,
.no-messages {
    flex: 1;

    display: flex;

    flex-direction: column;

    align-items: center;

    justify-content: center;

    color: var(--text-muted);

    height: 100%;

    min-height: 200px;

    .no-selection-icon,
    .no-messages-icon {
        margin-bottom: 1.2rem;

        opacity: 0.6;

        color: var(--text-muted);

        // @media (prefers-color-scheme: dark) {
        //   opacity: 0.4;
        // }
    }

    p {
        font-size: 1rem;

        text-align: center;

        margin-top: 0.8rem;
    }
}

.empty-state {
    flex: 1;

    display: flex;

    flex-direction: column;

    align-items: center;

    justify-content: center;

    color: var(--text-muted);

    padding: 2rem;

    .empty-icon {
        margin-bottom: 1rem;

        opacity: 0.5;
    }

    p {
        font-size: 1rem;

        text-align: center;
    }
}

.modal-overlay {
    position: fixed;

    top: 0;

    left: 0;

    right: 0;

    bottom: 0;

    background-color: rgba(0, 0, 0, 0);

    display: flex;

    justify-content: center;

    align-items: center;

    z-index: 1000;

    backdrop-filter: blur(0px);

    -webkit-backdrop-filter: blur(0px);

    transition: all 0.3s ease;

    pointer-events: none;

    &.show-overlay {
        background-color: rgba(0, 0, 0, 0.5);

        backdrop-filter: blur(5px);

        -webkit-backdrop-filter: blur(5px);

        pointer-events: auto;
    }

    .modal-content {
        pointer-events: auto;
    }
}

.modal-enter-active,
.modal-leave-active {
    transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-content {
    background-color: rgba(var(--card-background-rgb, 255, 255, 255), 1);

    border-radius: 16px;

    width: 90%;

    max-width: 500px;

    max-height: 90vh;

    overflow-y: auto;

    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);

    animation: modal-appear 0.3s cubic-bezier(0.21, 1.02, 0.73, 1);

    border: 1px solid rgba(var(--theme-color-rgb), 0.1);

    transform-origin: center center;

    // @media (prefers-color-scheme: dark) {
    //   background-color: rgba(var(--card-background-rgb, 30, 30, 30), 1);
    // }
}
:global(body.dark-theme) .modal-content {
  background-color: rgba(var(--card-background-rgb, 30, 30, 30), 1);
}

.modal-close-animation {
    animation: modal-disappear 0.25s cubic-bezier(0.33, 1, 0.68, 1) forwards;
}

@keyframes modal-appear {
    from {
        opacity: 0;

        transform: translateY(30px) scale(0.95);
    }

    to {
        opacity: 1;

        transform: translateY(0) scale(1);
    }
}

@keyframes modal-disappear {
    from {
        opacity: 1;

        transform: scale(1);
    }

    to {
        opacity: 0;

        transform: scale(0.95);
    }
}

.modal-header {
    padding: 1.25rem 1.5rem;

    border-bottom: 1px solid var(--border-color);

    display: flex;

    justify-content: space-between;

    align-items: center;

    h3 {
        margin: 0;

        font-size: 1.25rem;

        font-weight: 600;

        color: var(--text-color);
    }

    .modal-close {
        display: flex;

        align-items: center;

        justify-content: center;

        width: 32px;

        height: 32px;

        background: none;

        border: none;

        color: var(--text-muted);

        cursor: pointer;

        border-radius: 50%;

        transition: all 0.2s ease;

        &:hover {
            color: var(--text-color);

            background-color: rgba(0, 0, 0, 0.05);
        }
    }
}

.modal-body {
    padding: 1.5rem;

    .form-group {
        margin-bottom: 1.5rem;

        label {
            display: block;

            margin-bottom: 0.75rem;

            color: var(--text-color);

            font-weight: 500;

            font-size: 0.95rem;
        }

        input,
        textarea {
            width: 100%;

            padding: 0.85rem 1rem;

            border: 1px solid var(--border-color);

            border-radius: 10px;

            background-color: var(--bg-secondary);

            color: var(--text-color);

            font-size: 0.95rem;

            transition: all 0.2s ease;

            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.02);

            &:focus {
                outline: none;

                border-color: rgba(var(--theme-color-rgb), 0.5);

                box-shadow: 0 2px 12px rgba(var(--theme-color-rgb), 0.1);
            }

            &::placeholder {
                color: var(--text-muted);

                opacity: 0.7;
            }
        }

        textarea {
            resize: vertical;

            min-height: 120px;

            line-height: 1.6;
        }

        .level-tags {
            display: flex;

            gap: 10px;

            flex-wrap: wrap;

            .level-tag {
                display: flex;

                align-items: center;

                gap: 6px;

                padding: 8px 14px;

                border-radius: 8px;

                cursor: pointer;

                transition: all 0.2s ease;

                border: 1px solid var(--border-color);

                background-color: var(--bg-secondary);

                font-size: 0.9rem;

                .tag-icon {
                    color: var(--text-muted);
                }

                &:hover:not(.active) {
                    background-color: rgba(var(--theme-color-rgb), 0.05);
                }

                &.active {
                    border-color: rgba(var(--theme-color-rgb), 0.3);

                    &.level-low {
                        background-color: rgba(33, 150, 243, 0.1);

                        border-color: rgba(33, 150, 243, 0.3);

                        .tag-icon {
                            color: #2196f3;
                        }
                    }

                    &.level-medium {
                        background-color: rgba(255, 152, 0, 0.1);

                        border-color: rgba(255, 152, 0, 0.3);

                        .tag-icon {
                            color: #ff9800;
                        }
                    }

                    &.level-high {
                        background-color: rgba(244, 67, 54, 0.1);

                        border-color: rgba(244, 67, 54, 0.3);

                        .tag-icon {
                            color: #f44336;
                        }
                    }
                }
            }
        }
    }
}

.modal-footer {
    padding: 1.25rem 1.5rem;

    border-top: 1px solid var(--border-color);

    display: flex;

    justify-content: flex-end;

    gap: 1rem;

    button {
        height: 40px;

        min-width: 120px;

        padding: 0 16px;

        border-radius: 8px;

        font-weight: 500;

        font-size: 14px;

        cursor: pointer;

        transition: all 0.3s ease;

        display: flex;

        align-items: center;

        justify-content: center;

        gap: 8px;

        &.btn-cancel {
            background-color: transparent;

            border: 1px solid var(--border-color);

            color: var(--text-color);

            &:hover {
                background-color: rgba(0, 0, 0, 0.05);

                transform: translateY(-2px);
            }

            &:active {
                transform: translateY(0);
            }
        }

        &.btn-submit {
            background-color: rgba(var(--theme-color-rgb), 0.85);

            border: 1px solid rgba(var(--theme-color-rgb), 0.3);

            color: white;

            box-shadow: 0 8px 20px rgba(var(--theme-color-rgb), 0.25);

            backdrop-filter: blur(8px);

            -webkit-backdrop-filter: blur(8px);

            &:hover:not(:disabled) {
                transform: translateY(-2px);

                box-shadow: 0 10px 25px rgba(var(--theme-color-rgb), 0.35);

                background-color: rgba(var(--theme-color-rgb), 0.95);
            }

            &:active:not(:disabled) {
                transform: translateY(0);

                box-shadow: 0 5px 15px rgba(var(--theme-color-rgb), 0.3);
            }

            &:disabled {
                opacity: 0.6;

                cursor: not-allowed;
            }

            .loader {
                width: 16px;

                height: 16px;

                border: 2px solid rgba(255, 255, 255, 0.3);

                border-radius: 50%;

                border-top-color: white;

                animation: spin 1s linear infinite;
            }
        }
    }
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

@media (max-width: 768px) {
    .ticket-container {
        flex-direction: column;

        height: calc(100vh - 120px);
    }

    .ticket-sidebar {
        width: 100%;

        height: 40%;

        border-right: none;

        border-bottom: 1px solid var(--border-color);
    }

    .ticket-content {
        height: 60%;
    }

    .reply-container {
        flex-direction: column;

        .send-reply-btn {
            align-self: flex-end;
        }
    }
}

.ticket-loading {
    display: flex;

    flex-direction: column;

    align-items: center;

    justify-content: center;

    padding: 2rem;

    height: 100%;

    p {
        margin-top: 1rem;

        color: var(--text-muted);

        font-size: 0.9rem;
    }
}

.screen-size-notice {
    position: fixed;

    top: 0;

    left: 0;

    right: 0;

    bottom: 0;

    display: flex;

    align-items: center;

    justify-content: center;

    background-color: var(--bg-color);

    z-index: 1000;

    padding: 1.5rem;

    animation: fadeIn 0.4s ease;

    backdrop-filter: blur(5px);

    -webkit-backdrop-filter: blur(5px);

    .notice-content {
        text-align: center;

        background-color: var(--card-bg);

        padding: 2.5rem;

        border-radius: 16px;

        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);

        max-width: 90%;

        width: 450px;

        border: 1px solid var(--border-color);

        animation: scaleIn 0.5s ease;

        transform-origin: center;

        h2 {
            margin: 1.25rem 0;

            font-size: 1.5rem;

            color: var(--text-color);

            font-weight: 600;
        }

        p {
            color: var(--text-muted);

            margin-bottom: 2rem;

            font-size: 1.05rem;

            line-height: 1.6;
        }

        .switch-btn {
            padding: 0.85rem 1.75rem;

            border-radius: 10px;

            background-color: var(--theme-color);

            color: white;

            border: none;

            font-size: 1.05rem;

            font-weight: 500;

            cursor: pointer;

            transition: all 0.3s ease;

            display: inline-flex;

            align-items: center;

            gap: 0.75rem;

            box-shadow: 0 6px 15px rgba(var(--theme-color-rgb), 0.25);

            &:hover {
                background-color: rgba(var(--theme-color-rgb), 0.9);

                transform: translateY(-1px);

                box-shadow: 0 8px 20px rgba(var(--theme-color-rgb), 0.35);
            }

            &:active {
                transform: translateY(-1px);

                box-shadow: 0 4px 10px rgba(var(--theme-color-rgb), 0.25);
            }
        }
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

@keyframes scaleIn {
    from {
        transform: scale(0.9);

        opacity: 0;
    }

    to {
        transform: scale(1);

        opacity: 1;
    }
}

.image-upload-area {
    border: 2px dashed #2196f3;
    border-radius: 12px;
    background: rgba(33, 150, 243, 0.03);
    padding: 24px 0;
    text-align: center;
    cursor: pointer;
    margin-top: 10px;
    transition: border-color 0.2s, background 0.2s;
    position: relative;
    .upload-icon {
        margin-bottom: 8px;
    }
    .upload-tip {
        font-size: 1rem;
        margin-bottom: 4px;
        .upload-tip-text {
            color: var(--text-color);
            font-weight: 500;
            font-size: 1.08rem;
            transition: color 0.2s;
        }
        .upload-desc {
            display: block;
            font-size: 0.92rem;
            color: #888;
            margin-top: 2px;
        }
        .upload-method {
            display: block;
            font-size: 0.9rem;
            color: #2196f3;
            margin-top: 2px;
            a {
                color: #2196f3;
                text-decoration: underline;
            }
        }
    }
    &.dragging {
        border-color: #1976d2;
        background: rgba(33, 150, 243, 0.08);
    }
}
.reply-tools {
    display: flex;
    flex-direction: column; /* 竖排按钮 */
    align-items: stretch; /* 按钮宽度撑满容器（与输入框对齐） */
    gap: 0.5rem;
}
.reply-tools .send-reply-btn {
    width: 100%; /* 按钮填满右侧容器宽度 */
}
.dashboard-card,
.ticket-list-container {
    background-color: var(--card-background);
    border: 1px solid var(--card-border-color, var(--border-color));
    box-shadow: none;
}

.dashboard-card:hover {
    border-color: var(--card-hover-border-color, var(--theme-color));
    box-shadow: none;
}

.ticket-list-container {
    overflow: hidden;
}

.ticket-sidebar {
    background-color: var(--card-background);
    border-right: 1px solid var(--card-border-color, var(--border-color));
}

.ticket-content {
    background-color: var(--card-background);
}

.ticket-header,
.ticket-detail-header,
.reply-container {
    border-color: var(--card-border-color, var(--border-color));
}

.ticket-item {
    background-color: var(--card-background);
    border: 1px solid var(--card-border-color, var(--border-color));
    box-shadow: none;
}

.ticket-item:hover,
.ticket-item.active {
    border-color: var(--card-hover-border-color, var(--theme-color));
    background-color: var(--card-hover-background, rgba(var(--theme-color-rgb), 0.08));
    transform: none;
}

.ticket-header .search-box input,
.reply-container textarea,
.modal-body .form-group input,
.modal-body .form-group textarea,
.modal-content,
.screen-size-notice .notice-content {
    background-color: var(--card-background);
    border-color: var(--card-border-color, var(--border-color));
    box-shadow: none;
}

.ticket-header .search-box input:focus,
.reply-container textarea:focus,
.modal-body .form-group input:focus,
.modal-body .form-group textarea:focus {
    border-color: var(--card-hover-border-color, var(--theme-color));
    box-shadow: none;
    transform: none;
}

.new-ticket-btn,
.send-reply-btn,
.modal-footer button,
.screen-size-notice .switch-btn,
.close-ticket-btn {
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
}

.new-ticket-btn:hover,
.send-reply-btn:hover,
.modal-footer button:hover,
.screen-size-notice .switch-btn:hover {
    box-shadow: none;
}

.modal-overlay,
.modal-overlay.show-overlay,
.screen-size-notice {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
}

.message-content,
.message-avatar {
    box-shadow: none;
}

.message-item {
    background: transparent;
    border: 0;
    box-shadow: none;
    transform: none;
}

.message-content {
    border: 1px solid var(--card-border-color, var(--border-color));
}

.message-text {
    font-size: 14px;
    line-height: 1.65;
    white-space: normal;
}

.message-text :deep(*) {
    font-size: inherit;
    line-height: inherit;
}

.message-text :deep(p) {
    margin: 0 0 8px;
}

.message-text :deep(p:last-child) {
    margin-bottom: 0;
}

.message-text :deep(h1),
.message-text :deep(h2),
.message-text :deep(h3),
.message-text :deep(h4),
.message-text :deep(h5),
.message-text :deep(h6) {
    margin: 12px 0 8px;
    padding: 0;
    border: 0;
    color: var(--text-color);
    font-size: 15px;
    font-weight: 600;
    line-height: 1.5;
}

.message-text :deep(strong),
.message-text :deep(b) {
    font-weight: 600;
}

.message-text :deep(hr) {
    height: 1px;
    margin: 12px 0;
    border: 0;
    background-color: var(--card-border-color, var(--border-color));
}

.message-text :deep(ul),
.message-text :deep(ol) {
    margin: 8px 0;
    padding-left: 18px;
}

.message-text :deep(li) {
    margin: 4px 0;
}

.message-text :deep(code),
.message-text :deep(pre) {
    font-size: 13px;
    white-space: pre-wrap;
}

.ticket-list-container {
    height: min(720px, calc(100vh - 260px));
    min-height: 560px;
}

.ticket-header {
    background-color: var(--card-background);
}

.ticket-list {
    padding: 8px;
    background-color: var(--bg-secondary);
}

.ticket-item {
    padding: 14px 16px;
    border-radius: 8px;
    margin-bottom: 8px;
}

.ticket-info .ticket-subject {
    margin-bottom: 10px;
    font-size: 14px;
    line-height: 1.4;
}

.ticket-info .ticket-meta {
    align-items: flex-end;
    gap: 10px;
}

.ticket-info .ticket-meta .ticket-time {
    line-height: 1.4;
}

.status-badge,
.level-badge {
    min-height: 24px;
    border-radius: 6px;
    line-height: 1;
}

.ticket-content {
    min-width: 0;
    overflow: hidden;
}

.ticket-detail-header {
    min-height: 96px;
    padding: 20px 24px;
    background-color: var(--card-background);
    align-items: flex-start;
}

.ticket-detail-header .ticket-subject-info h2 {
    margin-bottom: 12px;
    font-size: 18px;
    line-height: 1.4;
}

.ticket-detail-header .ticket-subject-info .ticket-detail-meta {
    flex-wrap: wrap;
    gap: 8px 12px;
}

.ticket-detail-header .ticket-subject-info .ticket-detail-meta .ticket-time {
    margin-left: 0;
    color: var(--secondary-text-color);
}

.ticket-detail-content {
    min-height: 0;
    padding: 24px;
    background-color: var(--card-background);
}

.ticket-messages {
    flex: initial;
    min-height: 100%;
    gap: 18px;
}

.message-item {
    margin-bottom: 0;
    padding: 0;
}

.message-item.user-message .message-content,
.message-item.admin-message .message-content {
    background-color: var(--card-hover-background, rgba(var(--theme-color-rgb), 0.08));
    border-color: var(--card-border-color, var(--border-color));
}

.message-item .message-content {
    max-width: min(520px, 70%);
    padding: 12px 16px;
    border-radius: 12px;
}

.message-item.user-message .message-content {
    border-radius: 12px 12px 4px 12px;
}

.message-item.admin-message .message-content {
    border-radius: 12px 12px 12px 4px;
}

.message-item .message-avatar {
    width: 32px;
    height: 32px;
}

.message-item .message-avatar::before {
    display: none;
}

.message-item .message-time-floating {
    bottom: -18px;
}

.ticket-closed-notice {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 56px;
    padding: 0 24px;
    border-top: 1px solid var(--card-border-color, var(--border-color));
    background-color: var(--card-background);
    color: var(--secondary-text-color);
    font-size: 14px;
    line-height: 1.5;
}

.ticket-closed-notice svg {
    flex: 0 0 auto;
    color: var(--secondary-text-color);
}

.no-selection,
.message-loading,
.no-messages {
    background-color: var(--card-background);
}

</style>


