// BahaAnimeInfoMod.Logic.js (極簡安全版 / SMOKE TEST v2)
// 唯一的目的：測試 @require 載入和 GM_xmlhttpRequest 的可用性

console.log("BahaAnimeInfoMod.Logic.js: [極簡版] 腳本開始執行。");

try {
  window.BahaAnimeInfoLogic = (function () {
    'use strict';
    
    console.log("BahaAnimeInfoMod.Logic.js: [極簡版] IIFE 正在執行。");

    /**
     * [Logic] 測試 GM_xmlhttpRequest
     */
    function testGoogle() {
      return new Promise((resolve, reject) => {
        // 檢查 GM_xmlhttpRequest 是否存在
        if (typeof GM_xmlhttpRequest === "undefined") {
            console.error("BahaAnimeInfoMod.Logic.js: [極簡版] 致命錯誤! GM_xmlhttpRequest 是 undefined!");
            reject(new Error("GM_xmlhttpRequest is undefined"));
            return;
        }
        
        console.log("BahaAnimeInfoMod.Logic.js: [極簡版] 正在呼叫 GM_xmlhttpRequest...");
        
        GM_xmlhttpRequest({
          method: "GET",
          url: "https://www.google.com/robots.txt",
          onload: (response) => {
            console.log("BahaAnimeInfoMod.Logic.js: [極簡版] GM_xmlhttpRequest 成功。");
            resolve(response);
          },
          onerror: (response) => {
            console.error("BahaAnimeInfoMod.Logic.js: [極簡版] GM_xmlhttpRequest 失敗。", response);
            reject(response);
          },
        });
      });
    }


    /**
     * [Logic] 唯一的進入點
     */
    async function fetchAnimeData(url, debug) {
      console.log("BahaAnimeInfoMod.Logic.js: [極簡版] fetchAnimeData 已被呼叫。");
      
      try {
        await testGoogle();
        // 如果 GM_xmlhttpRequest 成功，回傳這個訊息
        return {
          status: 'fail', // 我們故意用 'fail' 狀態來顯示訊息
          message: 'Logic.js (極簡版) 載入成功！<br>GM_xmlhttpRequest 運作正常！'
        };
      } catch (e) {
        // 如果 GM_xmlhttpRequest 失敗
        return {
          status: 'fail',
          message: `Logic.js 載入成功，但 GM_xmlhttpRequest 失敗: ${e.message}`
        };
      }
    }

    /**
     * [Logic] 輔助函式 (空的)
     */
    async function getCastDataWithWiki(castData) {
      console.log("BahaAnimeInfoMod.Logic.js: [極簡版] getCastDataWithWiki 已被呼叫。");
      return []; // 回傳空陣列
    }
  
    // 匯出 Public API
    const PublicAPI = {
      fetchAnimeData,
      getCastDataWithWiki
    };
    
    console.log("BahaAnimeInfoMod.Logic.js: [極簡版] PublicAPI 已建立。");
    
    return PublicAPI;
  
  })();

  console.log("BahaAnimeInfoMod.Logic.js: [極簡版] window.BahaAnimeInfoLogic 已成功指派:", window.BahaAnimeInfoLogic);

} catch (e) {
  // 如果 IIFE 內部或任何地方出錯，印出錯誤
  console.error("BahaAnimeInfoMod.Logic.js: [極簡版] 發生致命錯誤！", e);
}