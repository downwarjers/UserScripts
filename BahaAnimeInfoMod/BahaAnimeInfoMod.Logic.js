// BahaAnimeInfoMod.Logic.js (SMOKE TEST / 煙霧測試版)
// 這個檔案的唯一目的，是測試 @require 是否能成功載入並執行。

console.log("BahaAnimeInfoMod.Logic.js: [SMOKE TEST] 腳本開始執行。");

// 嘗試在全域範圍內建立 Logic 物件
try {
  window.BahaAnimeInfoLogic = (function () {
    'use strict';
    
    console.log("BahaAnimeInfoMod.Logic.js: [SMOKE TEST] IIFE 正在執行。");

    // 模擬的假函式
    async function fetchAnimeData(url, debug) {
      console.log("BahaAnimeInfoMod.Logic.js: [SMOKE TEST] fetchAnimeData 已被呼叫。");
      
      // 回傳一個 Logic 錯誤，讓 View 顯示
      return {
        status: 'fail',
        message: 'Logic.js (煙霧測試版) 載入成功！<br>現在可以開始實作 Logic.js 的功能了。'
      };
    }

    async function getCastDataWithWiki(castData) {
      console.log("BahaAnimeInfoMod.Logic.js: [SMOKE TEST] getCastDataWithWiki 已被呼叫。");
      return []; // 回傳空陣列
    }
  
    // 匯出 Public API
    const PublicAPI = {
      fetchAnimeData,
      getCastDataWithWiki
    };
    
    console.log("BahaAnimeInfoMod.Logic.js: [SMOKE TEST] PublicAPI 已建立。");
    
    return PublicAPI;
  
  })();

  console.log("BahaAnimeInfoMod.Logic.js: [SMOKE TEST] window.BahaAnimeInfoLogic 已成功指派:", window.BahaAnimeInfoLogic);

} catch (e) {
  // 如果 IIFE 內部或任何地方出錯，印出錯誤
  console.error("BahaAnimeInfoMod.Logic.js: [SMOKE TEST] 發生致命錯誤！", e);
}