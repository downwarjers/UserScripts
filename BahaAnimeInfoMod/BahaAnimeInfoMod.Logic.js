// BahaAnimeInfoMod.Logic.js
// 這是邏輯層，它不依賴任何外部全域變數 (如 $ 或 _)。
// 它使用原生 DOMParser 和 Fetch API (透過 GM_xmlhttpRequest 實現)。

window.BahaAnimeInfoLogic = (function () {
  'use strict';

  //---------------------External libarary (detectIncognito)---------------------//
  // (這部分是獨立的，且不依賴 jQuery/Lodash，予以保留)
  var detectIncognito = function () { return new Promise(function (t, o) { var e, n = "Unknown"; function r(e) { t({ isPrivate: e, browserName: n }) } function i(e) { return e === eval.toString().length } function a() { (void 0 !== navigator.maxTouchPoints ? function () { try { window.indexedDB.open("test", 1).onupgradeneeded = function (e) { var t = e.target.result; try { t.createObjectStore("test", { autoIncrement: !0 }).put(new Blob), r(!1) } catch (e) { /BlobURLs are not yet supported/.test(e.message) ? r(!0) : r(!1) } } } catch (e) { r(!1) } } : function () { var e = window.openDatabase, t = window.localStorage; try { e(null, null, null, null) } catch (e) { return r(!0), 0 } try { t.setItem("test", "1"), t.removeItem("test") } catch (e) { return r(!0), 0 } r(!1) })() } function c() { navigator.webkitTemporaryStorage.queryUsageAndQuota(function (e, t) { r(t < (void 0 !== (t = window).performance && void 0 !== t.performance.memory && void 0 !== t.performance.memory.jsHeapSizeLimit ? performance.memory.jsHeapSizeLimit : 1073741824)) }, function (e) { o(new Error("detectIncognito somehow failed to query storage quota: " + e.message)) }) } function d() { void 0 !== Promise && void 0 !== Promise.allSettled ? c() : (0, window.webkitRequestFileSystem)(0, 1, function () { r(!1) }, function () { r(!0) }) } void 0 !== (e = navigator.vendor) && 0 === e.indexOf("Apple") && i(37) ? (n = "Safari", a()) : void 0 !== (e = navigator.vendor) && 0 === e.indexOf("Google") && i(33) ? (e = navigator.userAgent, n = e.match(/Chrome/) ? void 0 !== navigator.brave ? "Brave" : e.match(/Edg/) ? "Edge" : e.match(/OPR/) ? "Opera" : "Chrome" : "Chromium", d()) : void 0 !== document.documentElement && void 0 !== document.documentElement.style.MozAppearance && i(37) ? (n = "Firefox", r(void 0 === navigator.serviceWorker)) : void 0 !== navigator.msSaveBlob && i(39) ? (n = "Internet Explorer", r(void 0 === window.indexedDB)) : o(new Error("detectIncognito cannot determine the browser")) }) };

  //--------------------- Utilities (Native JS) ---------------------//

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

  /** * 原生 JS 版本的 chunk (取代 _.chunk)
   * @param {Array<any>} arr
   * @param {number} size
   */
  function chunk(arr, size) {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  }
  
  /** * 原生 JS 版本的 uniq (取代 _.uniq)
   * @param {Array<any>} arr
   */
  function uniq(arr) {
      return [...new Set(arr)];
  }
  
  /** * 原生 JS 版本的 cloneDeep (簡易版, 取代 _.cloneDeep)
   * @param {object} obj
   */
  function cloneDeep(obj) {
      try {
          return JSON.parse(JSON.stringify(obj));
      } catch (e) {
          console.error("cloneDeep failed", e);
          return obj; // fallback
      }
  }

  //--------------------- Network Functions (GM) ---------------------//

  /**
   * @param { string } url 
   * @returns { Promise<Tampermonkey.Response<string>> }
   */
  async function GET(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: url,
        onload: (response) => resolve(response),
        onerror: (response) => reject(response),
      });
    })
  }

  /**
   * @param { string } url 
   * @param { Record<string, unknown> } payload 
   * @param { Tampermonkey.RequestHeaders } headers 
   * @returns { Promise<Tampermonkey.Response<string>> }
   */
  async function POST(url, payload, headers = {}) {
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
  
  /**
   * 將 HTML 字串解析為 Document 物件 (取代 $.parseHTML)
   * @param {string} htmlString 
   * @returns {Document}
   */
  function parseHTML(htmlString) {
      const parser = new DOMParser();
      return parser.parseFromString(htmlString, 'text/html');
  }

  //--------------------- Data Fetching & Parsing (Native JS) ---------------------//

  /**
   * @typedef BahaData
   * @property {string} nameJp
   * @property {string} nameEn
   * @property {string} site
   * @property {string} fullUrl
   * @property {string[]} time
   * @property {string} broadcast
  */

  /**
   * [Logic] 抓取巴哈姆特作品資料
   * @param {string} bahaAnimePageUrl - 當前動畫瘋播放頁的 URL
   * @returns { Promise<BahaData> }
   */
  async function getBahaData(bahaAnimePageUrl) {
    // 1. 先抓取當前播放頁 HTML，找到「作品資料」連結
    const pageHtml = (await GET(bahaAnimePageUrl)).responseText;
    const pageDoc = parseHTML(pageHtml);
    
    // 輔助函式：透過 text 尋找 a
    const findLinkByText = (doc, text) => {
        const allLinks = Array.from(doc.querySelectorAll('a'));
        return allLinks.find(a => a.textContent.trim() === text);
    };
    
    const workLink = findLinkByText(pageDoc, '作品資料');
    if (!workLink) {
        throw new Error("Logic Error: 找不到 '作品資料' 連結。");
    }
    const bahaDbUrl = workLink.href;


    // 2. 抓取作品資料頁
    const bahaHtmlText = (await GET(bahaDbUrl)).responseText;
    const bahaHtml = parseHTML(bahaHtmlText);
    
    const nameJp = bahaHtml.querySelector('.ACG-info-container > h2')?.innerText ?? '';
    // 依循原邏輯，抓取第二個 h2
    const nameEn = bahaHtml.querySelectorAll('.ACG-info-container > h2')[1]?.innerText ?? '';

    // 輔助函式：透過 text 尋找 li
    const findLiByText = (container, text) => {
        const lis = Array.from(container.querySelectorAll('li'));
        return lis.find(li => li.innerText.includes(text));
    };

    const broadcast = findLiByText(bahaHtml, '播映方式')?.innerText ?? '';
    const officialSiteLi = findLiByText(bahaHtml, '官方網站');
    const officialSiteHref = officialSiteLi?.querySelector('a')?.href ?? 'https://empty';
    
    let fullUrl = null;
    try {
        // 解析巴哈的跳轉連結
        fullUrl = new URL(officialSiteHref).searchParams.get('url');
    } catch(e) { /* 忽略不合法的 URL */ }

    const timeLi = findLiByText(bahaHtml, '當地');
    const time = timeLi?.innerText?.split('：')[1] ?? '';

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

    let googleHtmlText = (await GET(googleUrl)).responseText
    if (googleHtmlText.includes('為何顯示此頁')) throw { type: 'google', url: googleUrl }
    
    const googleHtml = parseHTML(googleHtmlText);
    // 依循原版選擇器 #res span a
    const googleResult = googleHtml.querySelectorAll('#res span a'); 
    
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

    let syoboiHtmlText = (await GET(searchUrl)).responseText
    const syoboiHtml = parseHTML(syoboiHtmlText);
    const syoboiResults = syoboiHtml.querySelectorAll('.tframe td');

    for (let result of syoboiResults) {
      let resultTimeEl = result.querySelector('.findComment');
      if (!resultTimeEl) continue;
      let resultTime = resultTimeEl.innerText;

      if (time.some(t => resultTime.includes(t))) {
        let resultUrl = result.querySelector('a')?.getAttribute('href');
        if (resultUrl) {
            return `https://cal.syoboi.jp${resultUrl}`;
        }
      }
    }
    return ''
  }

  /**
   * @typedef AniResponse
   * @property { string } source
   * @property { string } title
   * @property { Array<Record<'char' | 'cv', string>> } cast
   * @property { Array<Record<'type' | 'title' | 'singer', string>> } song
  */
  /**
   * @param { BahaData } bahaData 
   * @param { boolean } [jpTitle=true]
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
   * @param {string} syoboiHtmlText - 頁面 HTML
   * @returns {{ title: string, h1Title: string, cast: AniResponse['cast'], song: AniResponse['song'] }}
   */
  function parseSyoboiDataFromHtml(syoboiHtmlText) {
    const dom = parseHTML(syoboiHtmlText);
    const title = syoboiHtmlText.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';

    // 抓取 h1 標題
    const h1 = dom.querySelector('h1');
    let h1Title = '';
    if (h1) {
        // 移除 h1 內部的 span (取代 .clone().children().remove().end().text())
        const h1Clone = h1.cloneNode(true);
        h1Clone.querySelectorAll('span').forEach(span => span.remove());
        h1Title = h1Clone.textContent.trim();
    }

    let cast = []
    const castData = dom.querySelectorAll('.cast table tr');
    for (let role of castData) {
      cast.push({
        char: role.querySelector('th')?.innerText ?? '',
        cv: role.querySelector('td')?.innerText ?? ''
      })
    }

    let song = []
    // 原生 JS 實作 .op, .ed, .st, .section:contains("主題歌")
    const songData = dom.querySelectorAll('.op, .ed, .st, .section');
    for (let sd of songData) {
      // 補上 :contains("主題歌") 邏輯
      if (sd.classList.contains('section') && !sd.innerText.includes('主題歌')) {
          continue;
      }

      // 依循原邏輯抓取 childNodes[2] (通常是歌名文字節點)
      const titleNode = sd.querySelector('.title')?.childNodes[2];
      let songTitle = titleNode ? titleNode.data.trim() : sd.querySelector('.title')?.innerText.trim() ?? '';
      
      let singer = '';
      // 依循原邏輯 th:contains("歌")
      const thSinger = Array.from(sd.querySelectorAll('th')).find(th => th.innerText.includes('歌'));
      if (thSinger) {
          // .parent().children()[1]
          singer = thSinger.parentElement.children[1]?.innerText ?? '';
      }

      song.push({
        type: songType(sd.className),
        title: songTitle || 'N/A',
        singer: singer,
      })
    }

    return {
      title, h1Title, cast, song
    }
  }

  /**
   * @param { BahaData } bahaData 
   * @param { boolean } [searchGoogle=false]
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
   * @param { AniResponse['cast'] } json
   * @returns { /* Wiki API Response */ }
   */
  async function searchWiki(json) {
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

    // 使用原生 JS 實作 _.chunk 和 _.uniq
    let castList = chunk(uniq(json.map(j => j.cvName2 ?? j.cv)), 50)
    let result = {
      query: {
        pages: {},
        normalized: [],
        redirects: [],
      }
    }

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
   * [PUBLIC] 處理 Cast 列表並加入 Wiki 資訊 (供 View 層呼叫)
   * @param { AniResponse['cast'] } json 
   * @returns { Promise<Array<{char: string, cv: string, wikiUrl: string, wikiText: string, isMissing: boolean}>> }
   */
  async function getCastDataWithWiki(json) {
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
    // 使用原生 JS 實作 _.cloneDeep
    let castJson = cloneDeep(json);
    
    let wikiJson = await searchWiki(castJson)
    // 使用原生 JS 實作 _.filter (取代 _.filter(..., ['pageprops', ...]))
    let disamb = Object.values(wikiJson.query.pages).filter(p => p.pageprops && p.pageprops.disambiguation === '');
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

    // 回傳結構化 JSON，而不是 HTML
    return castJson.map(j => {
      // 使用原生 JS 實作 _.filter(..., page => ...)[0]
      let wikiPage = Object.values(wikiJson.query.pages).find(page =>
        page.title === j.cv || page.title === j.cvName2
      );
      
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
   * [PUBLIC] 執行主要的邏輯流程
   * @param { string } bahaAnimePageUrl - 動畫瘋播放頁 URL
   * @param { boolean } [debug=false] 
   * @returns { Promise<object> } - 回傳結果 JSON
   */
  async function fetchAnimeData(bahaAnimePageUrl, debug = false) {
    
    let bahaData;
    try {
        // 步驟 1: 抓取巴哈資料
        bahaData = await getBahaData(bahaAnimePageUrl);
    } catch (e) {
        console.error("Logic.fetchAnimeData: 抓取巴哈資料失敗", e);
        return { status: 'error', message: '抓取巴哈作品資料失敗', details: e.message };
    }

    try {
      if (debug) {
        // Debug 模式：抓取所有資料並回傳
        let [aaa, bbb, ccc, ddd] = await Promise.all([
             getSyoboi(bahaData, false),
             getSyoboi(bahaData, true),
             getAllcinema(bahaData, true),
             getAllcinema(bahaData, false)
        ]);
        // 清理 rawHtml 避免 JSON 過大
        if (aaa) delete aaa.rawHtml;
        if (bbb) delete bbb.rawHtml;
        
        return { status: 'debug', data: { aaa, bbb, ccc, ddd } };
      }

      let allResults = [];
      let processedUrls = new Set();
      let initialResult;
      
      // 步驟 2: 嘗試抓取 Syoboi
      if (bahaData.broadcast && bahaData.broadcast.includes('電視')){
        initialResult = await getSyoboi(bahaData, false);
        if (!initialResult) {
          initialResult = await getSyoboi(bahaData, true);
        }
      }

      if (initialResult) {
        // --- Syoboi 成功路徑 ---
        const initialData = { ...initialResult };
        delete initialData.rawHtml; // 刪除原始碼
        allResults.push({ title: initialResult.h1Title, data: initialData });
        processedUrls.add(initialResult.source);

        // 步驟 3: 解析相關 Part
        const dom = parseHTML(initialResult.rawHtml); // 使用原始碼解析
        let baseTitle = initialResult.h1Title;
        let relatedParts = [];

        dom.querySelectorAll('div.tidGroup ul.tidList li').forEach(li => {
          const a = li.querySelector('a');
          const span = li.querySelector('span.selected');
          const element = a || span; // 優先選 a，其次選 span

          if (!element) return;

          let linkTitle = element.textContent.trim();
          
          if (linkTitle.startsWith(baseTitle)) {
            if (a) { // 是 <a> 連結
              let linkHref = a.getAttribute('href');
              let url = new URL(linkHref, 'https://cal.syoboi.jp/').href;
              if (!processedUrls.has(url)) {
                relatedParts.push({ title: linkTitle, url: url });
                processedUrls.add(url);
              }
            }
          }
        });
        
        relatedParts.reverse(); // 依循原版邏輯反轉

        if (relatedParts.length > 0) {
          // 步驟 4: 並行抓取所有相關 Part
          const partPromises = relatedParts.map(part => 
              getSyoboiData(part.url).then(data => ({ ...part, data }))
          );
          
          const settledResults = await Promise.allSettled(partPromises);

          settledResults.forEach(res => {
              if (res.status === 'fulfilled' && res.value.data) {
                  // 成功抓取，加入結果
                  allResults.push({ title: res.value.title, data: res.value.data });
              } else {
                  // 抓取失敗，也加入一筆錯誤紀錄
                  const partTitle = res.status === 'fulfilled' ? res.value.title : "未知 Part";
                  const errorMsg = res.status === 'rejected' ? res.reason?.message : "抓取失敗";
                  allResults.push({ title: partTitle, data: null, error: errorMsg });
                  console.error("Logic.fetchAnimeData: 抓取 part 失敗", res);
              }
          });
        }

        // 步驟 5: 回傳分頁結果 JSON
        return { status: 'success', type: 'tabs', data: allResults };

      } else {
        // --- Fallback 路徑 (allCinema) ---
        // 步驟 3f: 嘗試抓取 allcinema
        let result = await getAllcinema(bahaData, true);
        if (!result) {
          result = await getAllcinema(bahaData, false);
        }

        if (result) {
          // 步驟 4f: 回傳單頁結果 JSON
          return { status: 'success', type: 'single', data: result };
        } else {
          // 步驟 4f: 完全失敗
          return { status: 'error', message: 'Syoboi 和 allcinema 均查無資料' };
        }
      }

    } catch (e) {
      if (e.type === 'google') {
        return { status: 'error', message: 'Google reCAPTCHA', type: 'google', details: { url: e.url } };
      } else {
        console.error('Logic.fetchAnimeData error:', e);
        return { status: 'error', message: e.message || '未知錯誤', details: e };
      }
    }
  }


  // --- Public API ---
  // 匯出 View 層會需要呼叫的函式
  return {
    // 主要進入點：接收 URL，回傳 Promise<JSON>
    fetchAnimeData,
    
    // 輔助函式：供 View 層呼叫以處理 Cast 的 Wiki 資料 (因為這也需要非同步抓取)
    getCastDataWithWiki
  };

})();