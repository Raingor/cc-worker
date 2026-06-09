;(function () {
  var BEAR_GIFS = [
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
    "https://s1.aigei.com/src/img/gif/69/691f9304521b40318be1e1e901d61a1e.gif?imageMogr2/auto-orient/thumbnail/!282x282r/gravity/Center/crop/282x282/quality/85/%7CimageView2/2/w/282&e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:aKCGVtKzqe8-XRALIyEAyDMOOnk="
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
  };

  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(img);
  });
})();
