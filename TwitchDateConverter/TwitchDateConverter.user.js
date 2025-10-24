// ==UserScript==
// @name         Twitch 精確日期轉換器
// @namespace    https://github.com/downwarjers/UserScripts
// @version      1.4
// @description  使用 Twitch 原始時間戳將所有日期轉換為 yyyy-MM-dd 格式
// @author       downwarjers
// @license      MIT
// @match        *://www.twitch.tv/*
// @grant        none
// @run-at       document-idle
// @downloadURL  https://github.com/downwarjers/UserScripts/raw/refs/heads/main/TwitchDateConverter/TwitchDateConverter.user.js
// ==/UserScript==

(function() {
    'use strict';

    // 主轉換函數
    function convertDates() {
        // 1. 處理 VOD 列表
        document.querySelectorAll('[data-a-target="video-card-created-at"]').forEach(el => {
            if (el.classList.contains('relin-date-converted')) return;
            // 優先使用 data-a-date 屬性
            if (el.dataset && el.dataset.aDate) {
                const timestamp = parseInt(el.dataset.aDate);
                if (!isNaN(timestamp)) {
                    el.textContent = formatDate(new Date(timestamp));
                    el.classList.add('relin-date-converted');
                    return;
                }
            }

            // 其次使用 title 屬性
            if (el.title) {
                const date = parseTitleDate(el.title);
                if (date) {
                    el.textContent = formatDate(date);
                    el.classList.add('relin-date-converted');
                    return;
                }
            }

            // 最後使用文字內容
            const text = el.textContent.trim();
            const date = parseRelativeDate(text);
            if (date) {
                el.textContent = formatDate(date);
                el.classList.add('relin-date-converted');
            }
        });

        // 2. 處理 Clip 列表
        document.querySelectorAll('.tw-media-card-stat:not(.relin-date-converted)').forEach(el => {
            // 在父元素中尋找時間戳
            const container = el.closest('[data-a-date], [data-a-tooltip], [aria-label]');
            if (container) {
                // 嘗試從各種屬性獲取日期
                const rawDate = container.dataset.aDate ||
                                container.dataset.aTooltip ||
                                container.getAttribute('aria-label');

                if (rawDate) {
                    const date = parseRawDate(rawDate) || parseTitleDate(rawDate);
                    if (date) {
                        el.textContent = formatDate(date);
                        el.classList.add('relin-date-converted');
                        return;
                    }
                }
            }

            // 解析相對日期
            const text = el.textContent.trim();
            const date = parseRelativeDate(text);
            if (date) {
                el.textContent = formatDate(date);
                el.classList.add('relin-date-converted');
            }
        });

        // 3. 處理 VOD 播放頁面
        const vodHeaderDate = document.querySelector('[data-test-selector="vod-header-date"] span[data-a-date]');
        if (vodHeaderDate?.dataset?.aDate && !vodHeaderDate.classList.contains('relin-date-converted')) {
            const timestamp = parseInt(vodHeaderDate.dataset.aDate);
            if (!isNaN(timestamp)) {
                vodHeaderDate.textContent = formatDate(new Date(timestamp));
                vodHeaderDate.classList.add('relin-date-converted');
            }
        }

        // 4. 處理 Clip 播放頁面
        const clipDateElement = document.querySelector('.clips-metadata__created-at');
        if (clipDateElement && !clipDateElement.classList.contains('relin-date-converted')) {
            // 尋找最近的時間戳容器
            const timestampContainer = clipDateElement.closest('[data-a-date]') ||
                                      document.querySelector('[data-test-selector="clips-metadata-date"]');

            if (timestampContainer?.dataset?.aDate) {
                const timestamp = parseInt(timestampContainer.dataset.aDate);
                if (!isNaN(timestamp)) {
                    clipDateElement.textContent = formatDate(new Date(timestamp));
                    clipDateElement.classList.add('relin-date-converted');
                    return;
                }
            }

            // 解析相對日期
            const text = clipDateElement.textContent.trim();
            const date = parseRelativeDate(text);
            if (date) {
                clipDateElement.textContent = formatDate(date);
                clipDateElement.classList.add('relin-date-converted');
            }
        }

        // 5. 新增：處理特定相對日期元素 (如 <p class="CoreText...">7 天前</p>)
        document.querySelectorAll('[data-relingo-block]').forEach(el => {
            if (el.classList.contains('relin-date-converted')) return;

            const text = el.textContent.trim();
            const date = parseRelativeDate(text);
            if (date) {
                el.textContent = formatDate(date);
                el.classList.add('relin-date-converted');
            }
        });
    }

    // 解析原始日期格式
    function parseRawDate(raw) {
        // 嘗試解析時間戳
        const timestampMatch = raw.match(/\d{13}/);
        if (timestampMatch) {
            return new Date(parseInt(timestampMatch[0]));
        }

        // 嘗試解析 ISO 格式
        if (raw.includes('T') && raw.includes('Z')) {
            return new Date(raw);
        }

        return null;
    }

    // 解析 title 中的日期
    function parseTitleDate(title) {
        // 中文格式: 2023年8月15日 下午10:35
        const cnMatch = title.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*(上午|下午)?\s*(\d{1,2}):(\d{2})/);
        if (cnMatch) {
            let [_, year, month, day, period, hour, minute] = cnMatch;
            hour = parseInt(hour);
            if (period === '下午' && hour < 12) hour += 12;
            if (period === '上午' && hour === 12) hour = 0;
            return new Date(year, month - 1, day, hour, minute);
        }

        // 英文格式: August 15, 2023 at 10:35 PM
        const enMatch = title.match(/(\w+)\s+(\d{1,2}),\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i);
        if (enMatch) {
            const months = ['january','february','march','april','may','june',
                          'july','august','september','october','november','december'];
            let [_, monthName, day, year, hour, minute, period] = enMatch;
            const monthIndex = months.indexOf(monthName.toLowerCase());
            if (monthIndex !== -1) {
                hour = parseInt(hour);
                if (period.toLowerCase() === 'pm' && hour < 12) hour += 12;
                if (period.toLowerCase() === 'am' && hour === 12) hour = 0;
                return new Date(year, monthIndex, day, hour, minute);
            }
        }

        return null;
    }

    // 解析相對日期 (完整支援中文)
    function parseRelativeDate(text) {
        const now = new Date();
        const date = new Date(now);

        // 映射表
        const mappings = [
            {regex: /(\d+)\s*秒前?/, unit: 'seconds', value: 1},
            {regex: /(\d+)\s*分鐘前?/, unit: 'minutes', value: 1},
            {regex: /(\d+)\s*小時前?/, unit: 'hours', value: 1},
            {regex: /(\d+)\s*天前?/, unit: 'days', value: 1},
            {regex: /前天/, unit: 'days', value: 2},
        ];

        for (const mapping of mappings) {
            const match = text.match(mapping.regex);
            if (match) {
                const value = match[1] ? parseInt(match[1]) * mapping.value : mapping.value;

                if (!mapping.unit) return now; // 今天/剛剛

                switch(mapping.unit) {
                    case 'seconds': date.setSeconds(date.getSeconds() - value); break;
                    case 'minutes': date.setMinutes(date.getMinutes() - value); break;
                    case 'hours': date.setHours(date.getHours() - value); break;
                    case 'days': date.setDate(date.getDate() - value); break;
                    case 'weeks': date.setDate(date.getDate() - (value * 7)); break;
                    case 'months':
                        date.setMonth(date.getMonth() - value);
                        // 處理跨年
                        if (date.getMonth() > now.getMonth()) {
                            date.setFullYear(date.getFullYear() - 1);
                        }
                        break;
                    case 'years': date.setFullYear(date.getFullYear() - value); break;
                }

                return date;
            }
        }

        return null;
    }

    // 格式化日期為 yyyy-MM-dd
    function formatDate(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 使用 MutationObserver 監聽變化
    const observer = new MutationObserver(() => {
        convertDates();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 初始執行
    setTimeout(convertDates, 2000);
})();