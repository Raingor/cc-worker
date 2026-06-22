;(function () {
  window.BEAR_GIFS = [
    // 自嘲熊 from aigei.com (22)
    "https://s1.aigei.com/src/img/gif/33/332524b9bbe34f029fc0f2744ebcfd27.gif?e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:zufjktQMAvjjC6hhOdGSlI_oXsY=",
    "https://s1.aigei.com/src/img/gif/3c/3c9153dc281d4934acfd7981ee8fb716.gif?e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:EHaLX3jc72iqRcWdOP1NmFf5Wxs=",
    "https://s1.aigei.com/src/img/gif/4d/4d6b5bb96293402392d921bb0d82f833.gif?e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:I5Hy8_EFaY4c51efWdvJE2-vIaM=",
    "https://s1.aigei.com/src/img/gif/f7/f7e44efc60f94b6db90fecd30bb1e808.gif?e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:cdRc1DqJZKC_BsICTh0qSkADmIo=",
    "https://s1.aigei.com/src/img/gif/d9/d974b06042b64b3ca65cf1703d94c52e.gif?e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:m5KslYddEzRfaSzoGXOIeuNpA6o=",
    "https://s1.aigei.com/src/img/gif/c8/c872ec5aeaec49deae45908bfaa5cf4d.gif?e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:bLsDHdowW8Fd4LxjcyUUtuQ3MUc=",
    "https://s1.aigei.com/src/img/gif/8f/8f5e3d9cbcf84b80aee65ade6ee74f2f.gif?imageMogr2/auto-orient/thumbnail/!282x282r/gravity/Center/crop/282x282/quality/85/%7CimageView2/2/w/282&e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:YAv4Mii91jm-De9i5TtBuk9akF0=",
    "https://s1.aigei.com/src/img/gif/fa/fa7ae40049c64379a86e1e838126174f.gif?imageMogr2/auto-orient/thumbnail/!282x282r/gravity/Center/crop/282x282/quality/85/%7CimageView2/2/w/282&e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:15Ww3II3pU8Jm8f2Um3efKZeDiY=",
    "https://s1.aigei.com/src/img/gif/c4/c4abc99070d648e0be4eaec5f797bf15.gif?imageMogr2/auto-orient/thumbnail/!282x282r/gravity/Center/crop/282x282/quality/85/%7CimageView2/2/w/282&e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:2hkl2YGSC3jPqp3DoQ6qLi_kgMs=",
    "https://s1.aigei.com/src/img/gif/52/52815274551344139dd11d5f74da655f.gif?imageMogr2/auto-orient/thumbnail/!282x282r/gravity/Center/crop/282x282/quality/85/%7CimageView2/2/w/282&e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:dKCrrvzTBCW8_P6MOgjkeZMXg6I=",
    "https://s1.aigei.com/src/img/gif/8a/8a903d29634f4979b280b225c64ed592.gif?imageMogr2/auto-orient/thumbnail/!282x282r/gravity/Center/crop/282x282/quality/85/%7CimageView2/2/w/282&e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:dj6rJmBN059z5oHDMjYjinIxtyM=",
    "https://s1.aigei.com/src/img/gif/47/47986edde9c44c7f80d9b9604a92a0e2.gif?imageMogr2/auto-orient/thumbnail/!282x282r/gravity/Center/crop/282x282/quality/85/%7CimageView2/2/w/282&e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:XlKiR6UQ_v2LwcaDfkns1Rj6dgg=",
    "https://s1.aigei.com/src/img/gif/e4/e491ac0e9ea444f1ada35db2ecec3df8.gif?imageMogr2/auto-orient/thumbnail/!282x282r/gravity/Center/crop/282x282/quality/85/%7CimageView2/2/w/282&e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:5jQeAGMd_jSslcV3ChC1-bV3tyg=",
    "https://s1.aigei.com/src/img/gif/25/254b23f38d784d1f92226a52b700fa04.gif?imageMogr2/auto-orient/thumbnail/!282x282r/gravity/Center/crop/282x282/quality/85/%7CimageView2/2/w/282&e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:7qwyjD6J0VdkOSGf0fPXdyWEhWs=",
    "https://s1.aigei.com/src/img/gif/4c/4c980cc8abfd4db0b18f46ca732d0597.gif?imageMogr2/auto-orient/thumbnail/!282x282r/gravity/Center/crop/282x282/quality/85/%7CimageView2/2/w/282&e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:NtPyZJ2HngsiX-Ym4MFSuIlH1SI=",
    "https://s1.aigei.com/src/img/gif/ad/adc5c174b4a94e93b67702a76adb63d4.gif?imageMogr2/auto-orient/thumbnail/!282x282r/gravity/Center/crop/282x282/quality/85/%7CimageView2/2/w/282&e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:JhiMrZ_DLfOiBqibRnWMMHtUN6U=",
    "https://s1.aigei.com/src/img/gif/cc/cc3962c7eedd40d28323e41f15ffc6ec.gif?imageMogr2/auto-orient/thumbnail/!282x282r/gravity/Center/crop/282x282/quality/85/%7CimageView2/2/w/282&e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:76dqmfxyvaiZS89CkuLjS7zcPbo=",
    "https://s1.aigei.com/src/img/gif/4a/4ad0a06f7b5646e1bc0d54809871bbee.gif?imageMogr2/auto-orient/thumbnail/!282x282r/gravity/Center/crop/282x282/quality/85/%7CimageView2/2/w/282&e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:FOAAGHbTCCsXspCXbsWuGjbTOk0=",
    "https://s1.aigei.com/src/img/gif/b3/b39a0360551b411f8a8c48aaad12510d.gif?imageMogr2/auto-orient/thumbnail/!282x282r/gravity/Center/crop/282x282/quality/85/%7CimageView2/2/w/282&e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:_ma70XYEZGoXBjMJEdzc0vVPPto=",
    "https://s1.aigei.com/src/img/gif/bb/bb270aff17384c4baa8cef860c95a46d.gif?imageMogr2/auto-orient/thumbnail/!282x282r/gravity/Center/crop/282x282/quality/85/%7CimageView2/2/w/282&e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:H36FnqF-GmZKQ6MKwuSi7pEynAE=",
    "https://s1.aigei.com/src/img/gif/9e/9e3c781366814d8a97921d5a6d0ca865.gif?imageMogr2/auto-orient/thumbnail/!282x282r/gravity/Center/crop/282x282/quality/85/%7CimageView2/2/w/282&e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:67QqvgJgaxJ8gXMcdWcg9X5hp0s=",
    "https://s1.aigei.com/src/img/gif/69/691f9304521b40318be1e1e901d61a1e.gif?imageMogr2/auto-orient/thumbnail/!282x282r/gravity/Center/crop/282x282/quality/85/%7CimageView2/2/w/282&e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:aKCGVtKzqe8-XRALIyEAyDMOOnk=",
    // joke bear from Tenor (30)
    "https://media.tenor.com/IIWFOaA_TfoAAAAj/joke-bear.gif",
    "https://media.tenor.com/5nzLdhWL7GoAAAAj/sad-bear-joke-bear-sad.gif",
    "https://media.tenor.com/N-rSTqzfCOEAAAAj/bear-so-cute-funny-point-flower-so-cute.gif",
    "https://media.tenor.com/pjH4YkUVZTcAAAAj/joke-bear.gif",
    "https://media.tenor.com/m33QT3rELicAAAAj/joke-bear.gif",
    "https://media.tenor.com/Bz0U_bztQk0AAAAj/plinker98-jokebear.gif",
    "https://media.tenor.com/4bMDX6ox1JgAAAAj/joke-bear-jokebear.gif",
    "https://media.tenor.com/eJcxJf7gjkYAAAAj/joke-bear-jokebear.gif",
    "https://media.tenor.com/WGbXKRYGrScAAAAj/jokebear-%EB%86%8D%EB%8B%B4%EA%B3%B0.gif",
    "https://media.tenor.com/8gq2h5eWeJAAAAAj/jokebear-%EB%86%8D%EB%8B%B4%EA%B3%B0.gif",
    "https://media.tenor.com/Um-HwZYMg-4AAAAj/jokebear-%EB%86%8D%EB%8B%B4%EA%B3%B0.gif",
    "https://media.tenor.com/hDzZdzfqYsQAAAAj/ivory-yenkim.gif",
    "https://media.tenor.com/nte2LVljZPgAAAAj/bbibenho.gif",
    "https://media.tenor.com/vw3Fy4TMOvAAAAAj/joke-bear-bear-sad.gif",
    "https://media.tenor.com/eIlfvBcLs2QAAAAj/joke-bear.gif",
    "https://media.tenor.com/_QM_wResHSsAAAAj/jokebear-nongdamgom.gif",
    "https://media.tenor.com/klj2_GhIxcoAAAAj/jokebear-nongdamgom.gif",
    "https://media.tenor.com/IbESCchO8hUAAAAj/nongdamgom-bear.gif",
    "https://media.tenor.com/eiQSFUcJ7CAAAAAj/jokebear-nongdamgom.gif",
    "https://media.tenor.com/Tab9dRU9duQAAAAj/jokebear-bear.gif",
    "https://media.tenor.com/8AA1aFbZuMcAAAAj/jokebear-nongdamgom.gif",
    "https://media.tenor.com/g8v6yHwl1GwAAAAj/joke-bear-christmas.gif",
    "https://media.tenor.com/xKwPDw3PRm8AAAAM/thumbs-up-bear.gif",
    "https://media.tenor.com/Yo6aT26XS2cAAAAM/bear-sad-bear.gif",
    "https://media.tenor.com/c7T7aWp7mn4AAAAM/bear-dancing.gif",
    "https://media.tenor.com/9FtDmdpuY-sAAAAM/dance-yenkim.gif",
    "https://media.tenor.com/N1WZEisOLXsAAAAM/%EB%86%8D%EB%8B%B4%EA%B3%B0-jokebear.gif",
    "https://media.tenor.com/MPCPvINDMKUAAAAM/%E5%AF%B6%E8%B2%9D%E7%86%8A.gif",
    "https://media.tenor.com/z4wNGNq_qwwAAAAM/lmtqy.gif",
    "https://media.tenor.com/tUXrpBDSRr4AAAAM/%EB%86%8D%EB%8B%B4%EA%B3%B0-bear.gif"
  ];

  var QUOTES = [
    "你已经在做得很好了，不必苛责自己。",
    "每一个认真的今天，都是一份礼物。",
    "做自己的光，不需要太亮，足够温暖就好。",
    "允许自己慢慢来，成长不是比赛。",
    "你已经比昨天的自己更好了，这就是全部的意义。",
    "走过的路都算数，哪怕是弯路。",
    "不必完美，完成就是最棒的。",
    "可以休息，不必放弃。",
    "小小的进步也是进步，值得被看见。",
    "你不是不够好，你只是还没看到自己的好。",
    "今天也在努力生活，值得为自己骄傲。",
    "累的时候就停一停，世界不会因为你的休息而崩塌。",
    "你比自己想象中更有力量。",
    "不需要和别人比较，你走在你自己的路上。",
    "一天一天来，一步一步走，一切都会好起来的。",
    "允许偶尔的低落，那是向上的弧线。",
    "你已经很勇敢了，继续走下去就好。",
    "生活不会一直顺利，但你会一直成长。",
    "做自己喜欢的事，哪怕只是一点点。",
    "你今天也很了不起，记得给自己一个微笑。",
    "不要用别人的标准衡量自己的价值。",
    "你已经足够好了，刚好就是现在这个样子。",
    "每一次坚持，都是在播种未来的光。",
    "慢慢来，不着急，我们都在路上。",
    "你已经走了很远，别回头，继续向前。",
  ];

  var img = document.createElement('img');
  img.src = BEAR_GIFS[Math.floor(Math.random() * BEAR_GIFS.length)];
  img.id = 'bear-corner';
  img.alt = '自嘲熊';
  img.title = '自嘲熊 · 今天也要加油鸭';
  img.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;width:80px;height:80px;border-radius:12px;object-fit:cover;box-shadow:0 2px 12px rgba(0,0,0,.12);cursor:pointer;transition:transform .3s ease;image-rendering:auto;';
  img.onmouseenter = function () { this.style.transform = 'scale(1.15) rotate(-5deg)'; };
  img.onmouseleave = function () { this.style.transform = 'scale(1) rotate(0deg)'; };
  img.onclick = function () {
    this.src = BEAR_GIFS[Math.floor(Math.random() * BEAR_GIFS.length)];
    this.style.transform = 'scale(1.3) rotate(10deg)';
    setTimeout(function () { img.style.transform = 'scale(1) rotate(0deg)'; }, 300);
    // Also refresh quote on bear click
    showRandomQuote();
  };

  // ── Inspirational Quote ──
  var quoteEl = document.createElement('div');
  quoteEl.id = 'inspire-quote';
  quoteEl.title = '点击换一句';
  quoteEl.style.cssText =
    'position:fixed;bottom:112px;right:20px;z-index:9998;max-width:220px;' +
    'padding:10px 14px;border-radius:10px;' +
    'background:var(--surface,rgba(255,255,255,.85));' +
    'border:1px solid var(--hairline,rgba(0,0,0,.08));' +
    'box-shadow:0 2px 12px rgba(0,0,0,.06);' +
    'font-size:12px;line-height:1.6;color:var(--body,#3a3733);' +
    'text-align:center;cursor:pointer;' +
    'transition:opacity .4s ease,transform .3s ease;' +
    'font-family:"Noto Sans SC",sans-serif;' +
    'opacity:0;transform:translateY(8px);';
  quoteEl.onclick = function () {
    showRandomQuote();
    this.style.transform = 'scale(1.05)';
    setTimeout(function () { quoteEl.style.transform = 'scale(1)'; }, 200);
  };

  function showRandomQuote() {
    var q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    quoteEl.textContent = '「 ' + q + ' 」';
    quoteEl.style.opacity = '1';
    quoteEl.style.transform = 'translateY(0)';
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(img);
    document.body.appendChild(quoteEl);
    // Initial quote with delay
    setTimeout(showRandomQuote, 1200);
    // Auto-refresh every 2 hours
    setInterval(showRandomQuote, 7200000);
  });
})();
