;(function () {
  var BEAR_GIFS = [
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
