// ==UserScript==
// @name         Bilibili Video Fix Negative Color
// @namespace    https://github.com/downwarjers/UserScripts
// @version      1.0
// @description  修正Bilibili影片負片反轉後的色偏問題
// @author       downwarjers
// @license      MIT
// @match        *://www.bilibili.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    const fixVideoFilter = () => {
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            video.style.filter = 'invert(100%) hue-rotate(180deg) saturate(120%)';
        });
    };

    fixVideoFilter();

    const observer = new MutationObserver(fixVideoFilter);
    observer.observe(document.body, { childList: true, subtree: true });
})();
