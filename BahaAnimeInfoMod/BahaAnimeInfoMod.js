// BahaAnimeInfoMod.js
// 這是邏輯層。
// [重要] 它假設 jQuery($) 和 lodash(_) 已經在全域環境中被主腳本(View.js)載入。
// 它也假設 GM_xmlhttpRequest 是可用的。

console.log("BahaAnimeInfoMod.js: (Logic) 檔案已載入並開始執行。");

try {
  window.BahaAnimeInfoLogic = (function () {
    'use strict';
    
    console.log("BahaAnimeInfoMod.js: (Logic) IIFE 正在執行。");

    //---------------------External libarary (from original script)---------------------//
    // detectIncognito (這部分是獨立的，予以保留)
    var detectIncognito = function () { return new Promise(function (t, o) { var e, n = "Unknown"; function r(e) { t({ isPrivate: e, browserName: n }) } function i(e) { return e === eval.toString().length } function a() { (void 0 !== navigator.maxTouchPoints ? function () { try { window.indexedDB.open("test", 1).onupgradeneeded = function (e) { var t = e.target.result; try { t.createObjectStore("test", { autoIncrement: !0 }).put(new Blob), r(!1) } catch (e) { /BlobURLs are not yet supported/.test(e.message) ? r(!0) : r(!1) } } } catch (e) { r(!false) } } : function () { var e = window.openDatabase, t = window.localStorage; try { e(null, null, null, null) } catch (e) { return r(!0), 0 } try { t.setItem("test", "1"), t.removeItem("test") } catch (e) { return r(!0), 0 } r(!false) })() } function c() { navigator.webkitTemporaryStorage.queryUsageAndQuota(function (e, t) { r(t < (void 0 !== (t = window).performance && void 0 !== t.performance.memory && void 0 !== t.performance.memory.jsHeapSizeLimit ? performance.memory.jsHeapSizeLimit : 1073741824)) }, function (e) { o(new Error("detectIncognito somehow failed to query storage quota: " + e.message)) }) } function d() { void 0 !== Promise && void 0 !== Promise.allSettled ? c() : (0, window.webkitRequestFileSystem)(0, 1, function () { r(!false) }, function () { r(!0) }) } void 0 !== (e = navigator.vendor) && 0 === e.indexOf("Apple") && i(37) ? (n = "Safari", a()) : void 0 !== (e = navigator.vendor) && 0 === e.indexOf("Google") && i(33) ? (e = navigator.userAgent, n = e.match(/Chrome/) ? void 0 !== navigator.brave ? "Brave" : e.match(/Edg/) ? "Edge" : e.match(/OPR/) ? "Opera" : "Chrome" : "Chromium", d()) : void 0 !== document.documentElement && void 0 !== document.documentElement.style.MozAppearance && i(37) ? (n = "Firefox", r(void 0 === navigator.serviceWorker)) : void 0 !== navigator.msSaveBlob && i(39) ? (n = "Internet Explorer", r(void 0 === window.indexedDB)) : o(new Error("detectIncognito cannot determine the browser")) }) };

    //--------------------- Utilities (使用 $, _) ---------------------//
    
    /** @param { string } pattern */
    function regexEscape(pattern) {
      return pattern.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1')
    }

    /** @returns { Promise<boolean> } */
    async function isPrivateFF() {
      return new Promise((resolve) => {
        detectIncognito().then((result) => {
          if (result.browserName === 'Firefox' && result.isPrivate) return resolve(true)
          return resolve(false)
        });
      })
    }

    /** @param { string } title */
    function titleProcess(title) {
      if (!title) return '';
      return title.replaceAll('-', '\\-').replaceAll('#', '')
    }

    /** @param { string } time */
    function timeProcess(time) {
      if (!time || time === '不明') return null
      let match = time.match(/([0-9]{4})-([0-9]{2})-([0-9]{2})/)
      if (!match) return null;
      let [, year, month] = match
      return [
        `${year}-${parseInt(month) - 1}～`,
        `${year}-${parseInt(month)}～`,
        `${year}-${parseInt(month) + 1}～`,
      ]
    }

    function getJson(str) {
      try {
        return JSON.parse(str)
      } catch {
        return {}
      }
    }

    /** @param { string } type */
    function songType(type) {
      type = type.toLowerCase().replace('section ', '')
      switch (type) {
        case 'op':
          return 'OP'
        case 'ed':
          return 'ED'
        case 'st':
        case '挿入歌':
          return '插入曲'
        default:
          return '主題曲'
      }
    }

    //--------------------- Network Functions (GM) ---------------------//

    /** @returns { Promise<Tampermonkey.Response<string>> } */
    async function GET(url) {
      // 檢查 GM_xmlhttpRequest 是否存在 (避免 View.js 忘記 grant)
      if (typeof GM_xmlhttpRequest === "undefined") {
          console.error("Logic.js: GM_xmlhttpRequest is undefined!");
          throw new Error("GM_xmlhttpRequest is undefined");
      }
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "GET",
          url: url,
          onload: (response) => resolve(response),
          onerror: (response) => reject(response),
        });
      })
    }

    /** @returns { Promise<Tampermonkey.Response<string>> } */
    async function POST(url, payload, headers = {}) {
      if (typeof GM_xmlhttpRequest === "undefined") {
          console.error("Logic.js: GM_xmlhttpRequest is undefined!");
          throw new Error("GM_xmlhttpRequest is undefined");
      }
      let data = new URLSearchParams(payload).toString()
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "POST",
          url: url,
          data: data,
          headers: { ...headers },
          onload: (response) => resolve(response),
          onerror: (response) => reject(response),
        })
      })
    }
    
    //--------------------- Data Fetching & Parsing (使用 $) ---------------------//

    /** @typedef BahaData ... */

    /**
     * [PUBLIC] 抓取巴哈姆特作品資料 (使用 View 提供的 $)
     * @returns { Promise<BahaData> }
     */
    async function getBahaData() {
      // 這裡的 $ 是由主腳本(View)載入的 jQuery
      if (typeof $ === "undefined") {
          console.error("Logic.js: jQuery ($) is undefined!");
          throw new Error("Logic.js: jQuery ($) is undefined!");
      }
      let bahaDbUrl = $('a:contains(作品資料)')[0].href
      let bahaHtml = $((await GET(bahaDbUrl)).responseText)
      let nameJp = bahaHtml.find('.ACG-info-container > h2')[0].innerText
      let nameEn = bahaHtml.find('.ACG-info-container > h2')[1].innerText
      let broadcast = bahaHtml.find('.ACG-box1listA > li:contains("播映方式")')[0]?.innerText
      let urlObj = new URL(bahaHtml.find('.ACG-box1listB > li:contains("官方網站") > a')[0]?.href ?? 'https://empty')
      let fullUrl = urlObj.searchParams.get('url')
      let time = bahaHtml.find('.ACG-box1listA > li:contains("當地")')[0]?.innerText?.split('：')[1]

      return {
        nameJp: titleProcess(nameJp),
        nameEn: titleProcess(nameEn),
        site: fullUrl ? new URL(fullUrl).hostname.replace('www.', '') : '',
        fullUrl: fullUrl,
        time: timeProcess(time),
        broadcast: broadcast,
      }
    }

    /**
     * @param { 'syoboi' | 'allcinema' } type 
     * @param { string } keyword 
     * @returns { Promise<string> }
     */
    async function google(type, keyword) {
      if (keyword === '') return ''
      let site = ''
      let match = ''
      switch (type) {
        case 'syoboi':
          site = 'https://cal.syoboi.jp/tid'
          match = 'https://cal.syoboi.jp/tid'
          break
        case 'allcinema':
          site = 'https://www.allcinema.net/cinema/'
          match = /https:\/\/www\.allcinema\.net\/cinema\/([0-9]{1,7})/
          break
      }

      let googleUrlObj = new URL('https://www.google.com/search?as_qdr=all&as_occt=any')
      googleUrlObj.searchParams.append('as_q', keyword)
      googleUrlObj.searchParams.append('as_sitesearch', site)
      let googleUrl = googleUrlObj.toString()

      let googleHtml = (await GET(googleUrl)).responseText
      if (googleHtml.includes('為何顯示此頁')) throw { type: 'google', url: googleUrl }
      // 使用 $ 來解析
      let googleResult = $($.parseHTML(googleHtml)).find('#res span a') 
      for (let goo of googleResult) {
        let link = goo.href.replace('http://', 'https://')
        if (link.match(match)) return link
      }
      return ''
    }

    /**
     * @param { BahaData } bahaData 
     * @returns { Promise<string> }
     */
    async function searchSyoboi(bahaData) {
      let { site, time, fullUrl } = bahaData
      if (!site || !time) return ''

      let exceptionSite = [
        'tv-tokyo.co.jp',
        'tbs.co.jp',
        'sunrise-inc.co.jp'
      ]
      if (exceptionSite.includes(site)) {
        let exSiteList = exceptionSite.reduce((acc, cur) => {
          return acc.concat([regexEscape(`${cur}/anime/`), regexEscape(`${cur}/`)])
        }, [])

        for (const ex of exSiteList) {
          let regexResult = fullUrl.match(new RegExp(`(${ex}[^\/]+)`))?.[1]
          if (regexResult) {
            site = regexResult
            break
          }
        }
      }

      let searchUrlObj = new URL('https://cal.syoboi.jp/find?sd=0&ch=&st=&cm=&r=0&rd=&v=0')
      searchUrlObj.searchParams.append('kw', site)
      let searchUrl = searchUrlObj.toString()

      let syoboiHtml = (await GET(searchUrl)).responseText
      // 使用 $ 來解析
      let syoboiResults = $($.parseHTML(syoboiHtml)).find('.tframe td')
      for (let result of syoboiResults) {
        let resultTimeEl = $(result).find('.findComment')[0]
        if (!resultTimeEl) continue;
        let resultTime = resultTimeEl.innerText

        if (time.some(t => resultTime.includes(t))) {
          let resultUrl = $(result).find('a').attr('href')
          return `https://cal.syoboi.jp${resultUrl}`
        }
      }
      return ''
    }

    /**
     * @typedef AniResponse ...
     */
    /**
     * @param { BahaData } bahaData 
     * @returns { Promise<AniResponse | null> }
     */
    async function getAllcinema(bahaData, jpTitle = true) {
      let animeName = jpTitle ? bahaData.nameJp : bahaData.nameEn
      if (animeName === '') return null
      let allcinemaUrl = await google('allcinema', animeName)
      if (!allcinemaUrl) return null

      let allcinemaIdMatch = allcinemaUrl.match(/https://www\.allcinema\.net\/cinema\/([0-9]{1,7})/)
      if (!allcinemaIdMatch) return null;
      let allcinemaId = allcinemaIdMatch[1]

      let allcinemaHtml = (await GET(allcinemaUrl))
      let titleMatch = allcinemaHtml.responseText.match(/<title>([^<]*<\/title>)/)
      let title = titleMatch ? titleMatch[1] : 'allcinema.net';

      let allcinemaXsrfToken = allcinemaHtml.responseHeaders.match(/XSRF-TOKEN=([^=]*); expires/)?.[1]
      let allcinemaSession = allcinemaHtml.responseHeaders.match(/allcinema_session=([^=]*); expires/)?.[1]
      let allcinemaCsrfToken = allcinemaHtml.responseText.match(/var csrf_token = '([^']+)';/)?.[1]

      if (!allcinemaXsrfToken || !allcinemaSession || !allcinemaCsrfToken) {
        console.warn('getAllcinema: 無法抓取 CSRF token。');
      }

      let allcinemaHeader = {
        ...(await isPrivateFF()
          ? { 'Cookie': `XSRF-TOKEN=${allcinemaXsrfToken}; allcinema_session=${allcinemaSession}` }
          : {}
        ),
        'X-CSRF-TOKEN': allcinemaCsrfToken,
        'Content-Type': 'application/x-form-urlencoded; charset=UTF-8',
      }

      let cast = []
      let castDataMatch = allcinemaHtml.responseText.match(/"cast":(.*)};/)
      if (castDataMatch && castDataMatch[1]) {
        let castJson = getJson(castDataMatch[1])
        if (castJson.jobs && castJson.jobs[0] && castJson.jobs[0].persons) {
          cast = castJson.jobs[0].persons.map(it => ({
            char: it.castname,
            cv: it.person.personnamemain.personname
          }))
        }
      }

      let song = []
      if (allcinemaHeader['X-CSRF-TOKEN']) {
        try {
          let songData = await POST('https://www.allcinema.net/ajax/cinema', {
            ajax_data: 'moviesounds',
            key: allcinemaId,
            page_limit: 10
          }, allcinemaHeader)
          let songJson = getJson(songData.responseText)
          if (songJson.moviesounds && songJson.moviesounds.sounds) {
            song = songJson.moviesounds.sounds.map(it => {
              return {
                type: songType(it.sound.usetype),
                title: `「${it.sound.soundtitle}」`,
                singer: it.sound.credit.staff.jobs.
                  filter(job => job.job.jobname.includes('歌'))
                [0]?.persons[0].person.personnamemain.personname
              }
            })
          }
        } catch (songError) {
          console.warn('getAllcinema: 抓取主題曲失敗', songError);
        }
      }

      return {
        source: allcinemaUrl,
        title, cast, song
      }
    }

    /**
     * @param {string} syoboiHtml - 頁面 HTML
     * @returns {{ title: string, h1Title: string, cast: AniResponse['cast'], song: AniResponse['song'] }}
     */
    function parseSyoboiDataFromHtml(syoboiHtml) {
      // 使用 $ 來解析
      let dom = $($.parseHTML(syoboiHtml));
      let title = syoboiHtml.match(/<title>([^<]*)<\/title>/)[1];
      let h1Title = dom.find('h1').clone().children().remove().end().text().trim();
      let cast = []
      let castData = dom.find('.cast table tr')
      for (let role of castData) {
        cast.push({
          char: $(role).find('th').text(),
          cv: $(role).find('td').text()
        })
      }
      let song = []
      let songData = dom.find('.op, .ed, .st, .section:contains("主題歌")')
      for (let sd of songData) {
        let titleNode = $(sd).find('.title')[0]?.childNodes[2];
        let songTitle = titleNode ? titleNode.data : $(sd).find('.title').text().trim();
        song.push({
          type: songType(sd.className),
          title: songTitle || 'N/A',
          singer: $(sd).find('th:contains("歌")').parent().children()[1]?.innerText,
        })
      }
      return { title, h1Title, cast, song }
    }

    /**
     * @returns { Promise<AniResponse & { h1Title: string, rawHtml: string } | null> }
     */
    async function getSyoboi(bahaData, searchGoogle = false) {
      let animeName = bahaData.nameJp ? bahaData.nameJp : bahaData.nameEn
      let syoboiUrl = await (searchGoogle ? google('syoboi', animeName) : searchSyoboi(bahaData))
      if (!syoboiUrl) return null

      let syoboiHtml = (await GET(syoboiUrl)).responseText
      let data = parseSyoboiDataFromHtml(syoboiHtml)

      return {
        source: syoboiUrl,
        ...data,
        rawHtml: syoboiHtml
      }
    }

    /**
     * @param {string} syoboiUrl 
     * @returns { Promise<AniResponse & { h1Title: string } | null> }
     */
    async function getSyoboiData(syoboiUrl) {
      try {
        let syoboiHtml = (await GET(syoboiUrl)).responseText
        let data = parseSyoboiDataFromHtml(syoboiHtml)
        return {
          source: syoboiUrl,
          ...data
        }
      } catch (e) {
        console.error(`Failed to fetch ${syoboiUrl}`, e);
        return null;
      }
    }

    /**
     * @returns { /* Wiki API Response */ }
     */
    async function searchWiki(json) {
      // 依賴 _
      if (typeof _ === "undefined") {
          console.error("Logic.js: Lodash (_) is undefined!");
          throw new Error("Logic.js: Lodash (_) is undefined!");
      }
      let searchWikiUrl = (nameList) => {
        let wikiUrlObj = new URL('https://ja.wikipedia.org/w/api.php')
        const params = {
          action: 'query',
          format: 'json',
          prop: 'langlinks|pageprops',
          titles: nameList,
          redirects: 1,
          lllang: 'zh',
          lllimit: 100,
          ppprop: 'disambiguation'
        }
        for (let [k, v] of Object.entries(params)) {
          wikiUrlObj.searchParams.append(k, v)
        }
        return wikiUrlObj.toString()
      }

      let castList = _.chunk(_.uniq(json.map(j => j.cvName2 ?? j.cv)), 50)
      let result = { query: { pages: {}, normalized: [], redirects: [] } }

      for (let cast50 of castList) {
        let nameList = cast50.join('|')
        let wikiApi = searchWikiUrl(nameList)
        let wikiJson = JSON.parse((await GET(wikiApi)).responseText)
        Object.assign(result.query.pages, wikiJson.query.pages)
        result.query.normalized.push(...wikiJson.query.normalized || [])
        result.query.redirects.push(...wikiJson.query.redirects || [])
      }
      return result
    }

    /**
     * [PUBLIC] 處理 Cast 列表並加入 Wiki 資訊
     * @param { AniResponse['cast'] } json 
     * @returns { Promise<Array<{char: string, cv: string, wikiUrl: string, wikiText: string, isMissing: boolean}>> }
     */
    async function getCastDataWithWiki(json) {
      // 依賴 _
      function replaceEach(array, getFrom = (it) => it.from, getTo = (it) => it.to) {
        array?.forEach((it) => {
          json.forEach((j, index) => {
            if (j.cv === getFrom(it) || j.cvName2 === getFrom(it)) {
              json[index].cvName2 = getTo(it)
            }
          })
        })
      }

      if (!json || json.length === 0) return [];
      let castJson = _.cloneDeep(json); // 使用 _.cloneDeep
      
      let wikiJson = await searchWiki(castJson)
      let disamb = _.filter(wikiJson.query.pages, ['pageprops', { disambiguation: '' }])
      let normalized = wikiJson.query.normalized
      let redirects = wikiJson.query.redirects

      replaceEach(normalized)
      replaceEach(redirects)
      if (disamb.length) {
        replaceEach(disamb, (it) => it.title, (it) => `${it.title} (声優)`)
        wikiJson = await searchWiki(castJson)
        redirects = wikiJson.query.redirects
        replaceEach(redirects)
      }

      // 回傳結構化 JSON
      return castJson.map(j => {
        let wikiPage = _.filter(wikiJson.query.pages, page =>
          page.title === j.cv || page.title === j.cvName2
        )[0]
        let zhName = wikiPage?.langlinks?.[0]['*']
        let wikiUrl = zhName ? `https://zh.wikipedia.org/zh-tw/${zhName}` : `https://ja.wikipedia.org/wiki/${j.cvName2 ?? j.cv}`
        let wikiText = zhName ? 'Wiki' : 'WikiJP'
        let isMissing = (wikiPage?.missing === '' || !wikiPage);

        return {
          char: j.char ?? '',
          cv: j.cv,
          wikiUrl: wikiUrl,
          wikiText: wikiText,
          isMissing: isMissing
        }
      })
    }


    //--------------------- Main Logic Controller ---------------------//

    /**
     * [PUBLIC] 執行主要的邏輯流程 (你原本的 masterMain)
     * @param { BahaData } bahaData (由 View 傳入)
     * @param { {onStateChange: (state: string, params: any) => void} } callbacks 
     * @param { boolean } [debug=false] 
     */
    async function runLogicFlow(bahaData, callbacks, debug = false) {
      const { onStateChange } = callbacks;
      if (!onStateChange) {
        console.error("Logic Error: onStateChange callback is missing!");
        return;
      }

      try {
        if (debug) {
          onStateChange('debug-start', null)
          let aaa = await getSyoboi(bahaData, false)
          let bbb = await getSyoboi(bahaData, true)
          let ccc = await getAllcinema(bahaData, true)
          let ddd = await getAllcinema(bahaData, false)
          onStateChange('debug-end', { aaa, bbb, ccc, ddd })
          return
        }

        let allResults = [];
        let processedUrls = new Set();
        let initialResult;
        
        if (bahaData.broadcast && bahaData.broadcast.includes('電視')){
          onStateChange('syoboi', null); // 呼叫 View 的 changeState('syoboi')
          initialResult = await getSyoboi(bahaData, false);
          if (!initialResult) {
            initialResult = await getSyoboi(bahaData, true);
          }
        }

        if (initialResult) {
          // --- Syoboi 成功路徑 ---
          allResults.push({ title: initialResult.h1Title, data: initialResult });
          processedUrls.add(initialResult.source);

          // 使用 $ 解析
          let dom = $($.parseHTML(initialResult.rawHtml));
          let baseTitle = initialResult.h1Title;
          let relatedParts = [];

          dom.find('div.tidGroup ul.tidList li').each(function () {
            let a = $(this).find('a');
            let span = $(this).find('span.selected');
            let element = a.length ? a : span;
            if (!element.length) return;
            let linkTitle = element.text().trim();
            if (linkTitle.startsWith(baseTitle)) {
              if (a.length) {
                let linkHref = a.attr('href');
                let url = new URL(linkHref, 'https://cal.syoboi.jp/').href;
                if (!processedUrls.has(url)) {
                  relatedParts.push({ title: linkTitle, url: url });
                  processedUrls.add(url);
                }
              }
            }
          });
          
          relatedParts.reverse();

          if (relatedParts.length > 0) {
            onStateChange('loading', { total: allResults.length + relatedParts.length, fetched: allResults.length });

            for (const part of relatedParts) {
              let partData = await getSyoboiData(part.url);
              if (partData) {
                allResults.push({ title: part.title, data: partData });
              }
              onStateChange('loading', { total: allResults.length + relatedParts.length - (partData ? 0 : 1), fetched: allResults.length });
            }
          }

          // [修改] 刪除 rawHtml，避免回傳過大的 JSON
          allResults.forEach(r => { if(r.data) delete r.data.rawHtml; });
          
          // 回傳分頁結果
          onStateChange('tabResult', { data: allResults }); // ***回傳 JSON***

        } else {
          // --- Fallback 路徑 (allCinema) ---
          onStateChange('allcinema', null);
          let result = await getAllcinema(bahaData, true);
          if (!result) {
            result = await getAllcinema(bahaData, false);
          }

          if (result) {
            onStateChange('result', { data: result }); // ***回傳 JSON***
          } else {
            onStateChange('fail', { error: 'Syoboi 和 allcinema 均查無資料' });
          }
        }

      } catch (e) {
        if (e.type === 'google') {
          onStateChange('google', { url: e.url })
        } else {
          console.error('Logic.runLogicFlow error:', e);
          onStateChange('fail', { error: e.message || e })
        }
      }
    }


    // --- Public API ---
    // 匯出 View 層會需要呼叫的函式
    const PublicAPI = {
      getBahaData,          // 讓 View.js 呼叫來取得 bahaData
      getCastDataWithWiki,  // 讓 View.js 的 getCastHtml 呼叫
      runLogicFlow          // 讓 View.js 呼叫來執行主要流程
    };
    
    console.log("BahaAnimeInfoMod.js: (Logic) PublicAPI 已建立。");
    return PublicAPI;

  })();

  console.log("BahaAnimeInfoMod.js: (Logic) window.BahaAnimeInfoLogic 已成功指派:", window.BahaAnimeInfoLogic);

} catch (e) {
  // 如果 IIFE 內部或任何地方出錯，印出錯誤
  console.error("BahaAnimeInfoMod.js: (Logic) 發生致命錯誤！", e);
}