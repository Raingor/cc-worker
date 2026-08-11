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
    // joke bear from Tenor (56)
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
    "https://media.tenor.com/tUXrpBDSRr4AAAAM/%EB%86%8D%EB%8B%B4%EA%B3%B0-bear.gif",
    // jokebear / nongdamgom / yenkim — 2026-08-12 补充 (26)
    "https://media.tenor.com/MiVO5ntD6JEAAAAM/jokebear.gif",
    "https://media.tenor.com/YsW43jVD1wEAAAAM/jokebear-monch.gif",
    "https://media.tenor.com/KlBgIzD1k-wAAAAM/jokebear-together.gif",
    "https://media.tenor.com/_jqI9rb09D4AAAAM/joke-bear-run-away.gif",
    "https://media.tenor.com/IxV_nvAAZtQAAAAM/joke-bear-line.gif",
    "https://media.tenor.com/0HXLpbpnbkEAAAAM/bar-joke.gif",
    "https://media.tenor.com/itYwNwGIOxgAAAAM/akuu-bear.gif",
    "https://media.tenor.com/7twRUwaX-CoAAAAM/%EB%86%8D%EB%8B%B4%EA%B3%B0-jokebear.gif",
    "https://media.tenor.com/Sxyf_E_7F6wAAAAM/ivory-yenkim.gif",
    "https://media.tenor.com/9rLwpsslHogAAAAM/%EB%86%8D%EB%8B%B4%EA%B3%B0-jokebear.gif",
    "https://media.tenor.com/Mg_iMjOUQUoAAAAM/yenkim-ivory.gif",
    "https://media.tenor.com/byg3R82aUhYAAAAM/yenkim-ivory.gif",
    "https://media.tenor.com/PWXEWpx8WZ4AAAAM/vitwoiv-joke-bear.gif",
    "https://media.tenor.com/L9MBh0RfIuUAAAAM/yenkim-jokebear.gif",
    "https://media.tenor.com/pxmY2glVxGoAAAAM/nagano-yenkim.gif",
    "https://media.tenor.com/hr44bmI5OpwAAAAM/yenkim-jokebear.gif",
    "https://media.tenor.com/wHA-wkYQajEAAAAM/jokebear-yenkim.gif",
    "https://media.tenor.com/FiXIDyT6xHwAAAAM/huh-yenkim.gif",
    "https://media.tenor.com/n9RZftqM7n0AAAAM/yenkim-dance.gif",
    "https://media.tenor.com/59KdJdwetL0AAAAM/dance-yenkim.gif",
    "https://media.tenor.com/ztOzrYcm8WoAAAAM/yenkim-no.gif",
    "https://media.tenor.com/ORcbs7lq3LwAAAAM/yenkim-jokebear.gif",
    "https://media.tenor.com/dPtUTHf6iG0AAAAM/no-yenkim.gif",
    "https://media.tenor.com/zvIu_tUjNvoAAAAM/yenkim-ivory.gif",
    "https://media.tenor.com/CDhLuH_cX1sAAAAM/yay-jokebear.gif",
    "https://media.tenor.com/fdvnXO6c_bkAAAAM/fly-yenkim.gif"
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
    "今天的你，比昨天多坚持了一点点，这就是胜利。",
    "别怕慢，只怕站。你已经在路上了。",
    "努力的人运气不会差，只是时间问题。",
    "你不需要一下子做完所有事，一步一步来就好。",
    "就算今天只做了一点点，也比原地不动强。",
    "允许自己不完美，但不允许自己停下来。",
    "每一次跌倒，都是在为下一次站起积蓄力量。",
    "你比自己想象的更有潜力，别低估自己。",
    "今天的事今天做，明天会轻松一点。",
    "没有什么太难的事，只怕你不敢开始。",
    "你已经走了很远的路，别忘了回头看看自己有多棒。",
    "慢慢来，比较快。稳扎稳打才能走得更远。",
    "累了就歇一歇，但别忘了你当初为什么出发。",
    "你值得被温柔对待，尤其是被你自己。",
    "不要因为别人的节奏，打乱你自己的步伐。",
    "每一个不曾起舞的日子，都是对生命的辜负。",
    "你今天流的汗，终将成为你明天的光芒。",
    "没有什么绝境，只有不肯转身的目光。",
    "先完成，再完美。做完比做好更重要。",
    "你已经在变好了，只是改变需要时间才能被看见。",
    "别和别人比，和昨天的自己比就够了。",
    "生活偶尔给你难题，但你也从未真正被打倒。",
    "保持热爱，奔赴下一场山海。",
    "你比自己以为的更有能力，也比现在更接近目标。",
    "不要等待机会，要创造机会。",
    "今天的努力，是明天从容的底气。",
    "你值得拥有更好的一切，继续加油。",
    "即使全世界都放弃你，也要记得你还有自己。",
    "每一次尝试，都是一次成长，无论结果如何。",
    "别怕犯错，犯错是成长最快的路。",
    "你不需要取悦所有人，做好自己就好。",
    "把焦虑变成行动，把行动变成习惯。",
    "你比自己以为的更强，也比你以为的更好。",
    "不要因为一次失败，就否定所有的努力。",
    "慢慢来，你会成为自己期待的那个人。",
    "今天也是新的一天，值得全力以赴。",
    "你已经在做得很好了，继续保持这份热爱。",
    "每一次坚持，都是在为未来铺路。",
    "别放弃，你离成功可能只差一步。",
    "你值得被看见，也值得被赞美。",
    "生活不会辜负每一个努力的人。",
    "你比自己想象的更有力量，去做就对了。",
    "不要怕开始，更不要怕重新开始。",
    "你今天的样子，就是最好的自己。",
    "允许自己偶尔脆弱，但永远不要放弃。",
    "你走过的每一步，都算数。",
    "别急，时间会给你答案。",
    "你值得所有美好的事情，正在来的路上。",
    "今天也要好好爱自己。",
    "你已经做得很棒了，给自己一点掌声吧。",
    "不要和别人比较，你的节奏就是最好的节奏。",
    "每一次努力都不会白费，哪怕暂时看不到结果。",
    "你比自己以为的更有韧性。",
    "保持微笑，你值得这个世界温柔以待。",
    "别怕慢，只要不停下来就好。",
    "你已经在变好了，只是还没意识到而已。",
    "今天也是值得庆祝的一天，因为你还在努力。",
    "你值得拥有更好的未来，继续加油。",
    "不要因为困难而放弃，放弃才是真正的失败。",
    "你比自己想象的更强大。",
    "每一次跌倒后站起来，你都比昨天更强。",
    "你值得被爱，被关心，被珍惜。",
    "别怕重新开始，你永远有时间。",
    "你今天的样子，就是最好的自己。",
    "保持热爱，奔赴下一场山海。",
    "你比自己以为的更有能力，也比现在更接近目标。",
    "不要等待机会，要创造机会。",
    "今天的努力，是明天从容的底气。",
    "你值得拥有更好的一切，继续加油。",
    "即使全世界都放弃你，也要记得你还有自己。",
    "每一次尝试，都是一次成长，无论结果如何。",
    "别怕犯错，犯错是成长最快的路。",
    "你不需要取悦所有人，做好自己就好。",
    "把焦虑变成行动，把行动变成习惯。",
    "你比自己以为的更强，也比你以为的更好。",
    "不要因为一次失败，就否定所有的努力。",
    "慢慢来，你会成为自己期待的那个人。",
    "今天也是新的一天，值得全力以赴。",
    "你已经在做得很好了，继续保持这份热爱。",
    "每一次坚持，都是在为未来铺路。",
    "别放弃，你离成功可能只差一步。",
    "你值得被看见，也值得被赞美。",
    "生活不会辜负每一个努力的人。",
    "你比自己想象的更有力量，去做就对了。",
    "不要怕开始，更不要怕重新开始。",
    "你今天的样子，就是最好的自己。",
    "允许自己偶尔脆弱，但永远不要放弃。",
    "你走过的每一步，都算数。",
    "别急，时间会给你答案。",
    "你值得所有美好的事情，正在来的路上。",
    "今天也要好好爱自己。",
    "你已经做得很棒了，给自己一点掌声吧。",
    "不要和别人比较，你的节奏就是最好的节奏。",
    "每一次努力都不会白费，哪怕暂时看不到结果。",
    "你比自己以为的更有韧性。",
    "保持微笑，你值得这个世界温柔以待。",
    "别怕慢，只要不停下来就好。",
    "你已经在变好了，只是还没意识到而已。",
    "今天也是值得庆祝的一天，因为你还在努力。",
    "你值得拥有更好的未来，继续加油。",
    "不要因为困难而放弃，放弃才是真正的失败。",
    "你比自己想象的更强大。",
    "每一次跌倒后站起来，你都比昨天更强。",
    "你值得被爱，被关心，被珍惜。",
    "别怕重新开始，你永远有时间。",
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
