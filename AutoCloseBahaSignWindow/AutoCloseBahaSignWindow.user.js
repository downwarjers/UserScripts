// ==UserScript==
// @name         巴哈姆特動畫瘋 - 自動關閉簽到視窗
// @namespace    https://github.com/downwarjers/UserScripts
// @version      1.1
// @description  偵測並自動關閉 ani.gamer.com.tw 上的彈出視窗 (dialogify_1)
// @author       downwarjers
// @license      MIT
// @match        https://ani.gamer.com.tw/*
// @grant        none
// @run-at       document-body
// @downloadURL  https://github.com/downwarjers/UserScripts/raw/refs/heads/main/AutoCloseBahaSignWindow/AutoCloseBahaSignWindow.user.js
// ==/UserScript==

(function() {
    'use strict';

    // 您提供的元素特徵
    const dialogId = 'dialogify_1';
    const closeButtonClass = 'dialogify__close';

    // CSS 選擇器：尋找 id 為 "dialogify_1" 元素內，class 為 "dialogify__close" 的元素
    const closeButtonSelector = `#${dialogId} .${closeButtonClass}`;

    // 建立一個監聽器 (Observer) 來觀察 DOM 的變化
    const observer = new MutationObserver((mutationsList, obs) => {
        
        const closeButton = document.querySelector(closeButtonSelector);

        // 如果找到了按鈕
        if (closeButton) {
            console.log('偵測到巴哈動畫瘋彈出視窗，自動點擊關閉...');
            closeButton.click(); // 模擬點擊

            // 任務完成，停止監聽，節省資源
            obs.disconnect();
        }
    });

    // 開始監聽 <body> 及其子節點的變化
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();