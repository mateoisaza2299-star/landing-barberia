(function () {
  var CDN = [
    "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js",
    "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js",
    "https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js"
  ];
  var root = document.documentElement;
  var leaving = false;
  var lenisRef = null;
  var lenisTicker = null;

  function isPublicPath(pathname) {
    var file = String(pathname || "").split("/").pop();
    return file === "" || file === "index.html" || file === "historia.html";
  }

  function headerOffset(target) {
    if (target && (target.id === "inicio" || target.id === "contenido")) return 0;
    var header = document.querySelector("[data-header]");
    var height = header ? header.getBoundingClientRect().height : 76;
    return -(Math.max(64, Math.round(height)) + 18);
  }

  function removePreloader() {
    var pre = document.querySelector("[data-preloader]");
    if (pre) pre.remove();
    root.classList.remove("is-booting");
  }

  function showAll() {
    root.classList.remove("has-motion", "motion-pending", "is-booting", "has-cursor", "is-cursor-view", "is-cursor-button");
    root.classList.add("motion-ready");
    removePreloader();
    if (window.ScrollTrigger && ScrollTrigger.getAll) {
      ScrollTrigger.getAll().forEach(function (trigger) { trigger.kill(); });
    }
    if (lenisTicker && window.gsap) gsap.ticker.remove(lenisTicker);
    if (lenisRef && lenisRef.destroy) {
      try { lenisRef.destroy(); } catch (error) {}
      lenisRef = null;
    }
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
    var cursor = document.querySelector("[data-cursor]");
    if (cursor) cursor.remove();
    document.querySelectorAll(".marquee").forEach(function (el) { el.remove(); });
  }

  function fail() {
    if (window.__pupilosPremium === "on" && root.classList.contains("has-motion")) return;
    if (root.classList.contains("motion-ready") && window.__pupilosPremium === "off") return;
    window.__pupilosPremium = "off";
    showAll();
    document.dispatchEvent(new CustomEvent("pupilos:hero-css"));
    document.dispatchEvent(new CustomEvent("pupilos:motion-abort"));
  }

  function setupIntro() {
    return new Promise(function (resolve) {
      var el = document.querySelector("[data-preloader]");
      if (!root.classList.contains("is-booting") || !el) {
        if (el) el.remove();
        resolve();
        return;
      }
      var settled = false;
      function finish() {
        if (settled) return;
        settled = true;
        removePreloader();
        document.dispatchEvent(new CustomEvent("pupilos:intro-done"));
        resolve();
      }
      window.setTimeout(function () {
        if (!settled) el.classList.add("is-rise");
      }, 860);
      el.addEventListener("transitionend", function (event) {
        if (event.target === el && event.propertyName === "transform") finish();
      });
      window.setTimeout(finish, 1800);
    });
  }

  function settleArrival() {
    var curtain = document.querySelector("[data-curtain]");
    if (root.classList.contains("is-arriving")) {
      window.setTimeout(function () { root.classList.remove("is-arriving"); }, 1600);
    }
    if (!root.classList.contains("is-arriving-js") || !curtain) return;
    curtain.classList.add("is-on");
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        curtain.classList.add("is-anim", "is-reveal");
        var done = false;
        function clear() {
          if (done) return;
          done = true;
          root.classList.remove("is-arriving-js");
          curtain.classList.remove("is-on", "is-anim", "is-reveal", "is-cover");
        }
        curtain.addEventListener("transitionend", function (event) {
          if (event.propertyName === "transform") clear();
        });
        window.setTimeout(clear, 1000);
      });
    });
  }

  function leaveWithCurtain(href) {
    if (leaving) return;
    leaving = true;
    var curtain = document.querySelector("[data-curtain]");
    try { sessionStorage.setItem("pb-curtain", "js"); } catch (error) {}
    if (!curtain) {
      window.location.href = href;
      return;
    }
    curtain.classList.add("is-on", "is-anim");
    window.requestAnimationFrame(function () { curtain.classList.add("is-cover"); });
    var gone = false;
    function go() {
      if (gone) return;
      gone = true;
      window.location.href = href;
    }
    curtain.addEventListener("transitionend", function (event) {
      if (event.target === curtain && event.propertyName === "transform") go();
    });
    window.setTimeout(go, 900);
  }

  function bindTransport(lenis) {
    var supportsVT = "onpageswap" in window;
    document.addEventListener("click", function (event) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      var link = event.target.closest && event.target.closest("a");
      if (!link || link.hasAttribute("data-open-reserva") || link.hasAttribute("download")) return;
      if (link.target && link.target !== "_self") return;
      var url;
      try { url = new URL(link.href, window.location.href); } catch (error) { return; }
      if (url.origin !== window.location.origin) return;
      var same = url.pathname === window.location.pathname;
      if (same && url.hash && lenis) {
        var target = document.querySelector(decodeURIComponent(url.hash));
        if (!target) return;
        event.preventDefault();
        lenis.scrollTo(target, { offset: headerOffset(target), duration: 1.15 });
        if (window.history && history.pushState) history.pushState(null, "", url.hash);
        if (link.classList.contains("skip-link")) {
          if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
        }
        return;
      }
      if (!isPublicPath(url.pathname) || same) return;
      if (leaving) {
        event.preventDefault();
        return;
      }
      if (supportsVT) {
        try { sessionStorage.setItem("pb-curtain", "vt"); } catch (error) {}
        return;
      }
      event.preventDefault();
      leaveWithCurtain(link.href);
    });
  }

  function bindViewHooks() {
    window.addEventListener("pageswap", function (event) {
      if (!event.viewTransition) return;
      var dest = "";
      try { dest = event.activation && event.activation.entry ? event.activation.entry.url : ""; } catch (error) {}
      if (!dest) return;
      var url;
      try { url = new URL(dest); } catch (error) { return; }
      if (!isPublicPath(url.pathname)) return;
      if (event.viewTransition.types) event.viewTransition.types.add("pb");
      var curtain = document.querySelector("[data-curtain]");
      if (curtain) curtain.classList.add("is-vt", "is-cover");
    });
    window.addEventListener("pagereveal", function (event) {
      if (!event.viewTransition) return;
      if (event.viewTransition.types) event.viewTransition.types.add("pb");
      var done = function () {
        root.classList.remove("is-arriving");
        var curtain = document.querySelector("[data-curtain]");
        if (curtain) curtain.classList.remove("is-vt", "is-cover");
      };
      event.viewTransition.finished.then(done, done);
    });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error("cdn")); };
      document.head.appendChild(script);
    });
  }

  function loadScripts(list) {
    return list.reduce(function (chain, src) {
      return chain.then(function () { return loadScript(src); });
    }, Promise.resolve());
  }

  function splitLines(el) {
    if (!el || el.dataset.split === "1") return [];
    var text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return [];
    var words = text.split(" ");
    el.textContent = "";
    var spans = words.map(function (word, index) {
      if (index) el.appendChild(document.createTextNode(" "));
      var span = document.createElement("span");
      span.className = "split-word";
      span.textContent = word;
      el.appendChild(span);
      return span;
    });
    var lines = [];
    var line = [];
    var top = null;
    spans.forEach(function (span) {
      var y = span.offsetTop;
      if (top === null || Math.abs(y - top) <= 3) {
        if (top === null) top = y;
        line.push(span);
      } else {
        lines.push(line);
        line = [span];
        top = y;
      }
    });
    if (line.length) lines.push(line);
    el.replaceChildren();
    var inners = [];
    lines.forEach(function (group) {
      var mask = document.createElement("span");
      mask.className = "line-mask";
      var inner = document.createElement("span");
      inner.className = "line-inner";
      group.forEach(function (span, index) {
        if (index) inner.appendChild(document.createTextNode(" "));
        inner.appendChild(span);
      });
      mask.appendChild(inner);
      el.appendChild(mask);
      inners.push(inner);
    });
    el.dataset.split = "1";
    var reveal = el.closest(".reveal");
    if (reveal) reveal.dataset.motion = "1";
    return inners;
  }

  function maskTitle(el, play) {
    var inners = splitLines(el);
    if (!inners.length) return;
    gsap.set(inners, { yPercent: 112 });
    if (play) return inners;
    gsap.to(inners, {
      yPercent: 0,
      duration: 1.12,
      ease: "power4.out",
      stagger: 0.08,
      scrollTrigger: { trigger: el, start: "top 86%", once: true }
    });
    return inners;
  }

  function fadeLines(el, play) {
    var inners = splitLines(el);
    if (!inners.length) return [];
    gsap.set(inners, { opacity: 0, y: 12 });
    if (play) return inners;
    gsap.to(inners, {
      opacity: 1,
      y: 0,
      duration: 0.75,
      ease: "power2.out",
      stagger: 0.05,
      scrollTrigger: { trigger: el, start: "top 90%", once: true }
    });
    return inners;
  }

  function fadeUp(el, trigger) {
    if (!el) return;
    gsap.fromTo(el, { opacity: 0, y: 16 }, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power3.out",
      scrollTrigger: { trigger: trigger || el, start: "top 88%", once: true }
    });
  }

  function revealClip(img, trigger) {
    if (!img) return;
    gsap.fromTo(img, { clipPath: "inset(100% 0% 0% 0%)", scale: 1.08 }, {
      clipPath: "inset(0% 0% 0% 0%)",
      scale: 1,
      duration: 1.28,
      ease: "power3.out",
      scrollTrigger: { trigger: trigger || img, start: "top 82%", once: true }
    });
  }

  function playIndexHero() {
    var hero = document.querySelector(".hero");
    if (!hero) return;
    var h1 = hero.querySelector("h1");
    if (!h1 || h1.dataset.ready === "1") return;
    h1.dataset.ready = "1";
    var inners = splitLines(h1);
    var leads = fadeLines(hero.querySelector(".hero-lead"), true);
    var eyebrow = hero.querySelector(".eyebrow");
    var actions = hero.querySelector(".hero-actions");
    hero.classList.add("is-live");
    h1.classList.add("is-split");
    gsap.set(inners, { yPercent: 112 });
    if (eyebrow) gsap.set(eyebrow, { opacity: 0, y: 14 });
    if (actions) gsap.set(actions, { opacity: 0, y: 16 });
    var tl = gsap.timeline({ delay: 0.06 });
    if (inners.length) tl.to(inners, { yPercent: 0, duration: 1.16, stagger: 0.09, ease: "power4.out" }, 0);
    if (eyebrow) tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, 0.12);
    if (leads.length) tl.to(leads, { opacity: 1, y: 0, duration: 0.72, stagger: 0.05, ease: "power2.out" }, 0.3);
    if (actions) tl.to(actions, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, 0.46);
  }

  function playHistoriaHero() {
    var hero = document.querySelector(".historia-hero");
    if (!hero) return;
    var h1 = hero.querySelector("h1");
    if (!h1 || h1.dataset.ready === "1") return;
    h1.dataset.ready = "1";
    var inners = splitLines(h1);
    var leads = fadeLines(hero.querySelector(".historia-lead"), true);
    gsap.set(inners, { yPercent: 112 });
    var tl = gsap.timeline({ delay: 0.05 });
    if (inners.length) tl.to(inners, { yPercent: 0, duration: 1.12, stagger: 0.08, ease: "power4.out" }, 0);
    if (leads.length) tl.to(leads, { opacity: 1, y: 0, duration: 0.72, stagger: 0.05, ease: "power2.out" }, 0.28);
  }

  function initPhrases() {
    var pull = document.querySelector(".about .pull");
    if (!pull || pull.dataset.swap === "1") return;
    var text = (pull.textContent || "").trim();
    if (!text) return;
    pull.textContent = "";
    pull.classList.add("pull-swap");
    pull.dataset.swap = "1";
    var first = document.createElement("span");
    first.className = "pull-line pull-line--a";
    first.textContent = text;
    var second = document.createElement("span");
    second.className = "pull-line pull-line--b";
    second.textContent = "Tijera, navaja y tiempo.";
    second.setAttribute("aria-hidden", "true");
    pull.append(first, second);
  }

  function initNavRoll() {
    document.querySelectorAll(".nav-link").forEach(function (link) {
      if (link.querySelector(".nav-roll")) return;
      var text = (link.textContent || "").trim();
      if (!text) return;
      var roll = document.createElement("span");
      roll.className = "nav-roll";
      var a = document.createElement("span");
      a.textContent = text;
      var b = document.createElement("span");
      b.textContent = text;
      b.setAttribute("aria-hidden", "true");
      roll.append(a, b);
      link.textContent = "";
      link.appendChild(roll);
    });
  }

  function makeMarquee() {
    var block = document.createElement("div");
    block.className = "marquee";
    block.setAttribute("aria-hidden", "true");
    var track = document.createElement("div");
    track.className = "marquee-track";
    var phrase = "Corte  ·  Barba  ·  Navaja  ·  Funza  ·  ";
    for (var copy = 0; copy < 2; copy += 1) {
      var span = document.createElement("span");
      span.textContent = phrase.repeat(6);
      track.appendChild(span);
    }
    block.appendChild(track);
    return block;
  }

  function buildMarquees() {
    var services = document.querySelector("#servicios");
    if (services && services.parentNode) services.parentNode.insertBefore(makeMarquee(), services);
    var quotes = document.querySelector("#testimonios");
    if (quotes && quotes.parentNode) quotes.parentNode.insertBefore(makeMarquee(), quotes);
    var history = document.querySelector(".historia-body");
    if (!services && history && history.parentNode) history.parentNode.insertBefore(makeMarquee(), history);
  }

  function animateMarquees() {
    var tweens = [];
    document.querySelectorAll(".marquee-track").forEach(function (track) {
      tweens.push(gsap.to(track, { xPercent: -50, duration: 32, ease: "none", repeat: -1 }));
    });
    if (!tweens.length) return;
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: function (self) {
        var boost = Math.min(2.2, Math.abs(self.getVelocity()) / 1400);
        tweens.forEach(function (tween) {
          gsap.to(tween, { timeScale: 1 + boost, duration: 0.35, overwrite: true });
        });
      }
    });
    document.addEventListener("visibilitychange", function () {
      tweens.forEach(function (tween) {
        if (document.hidden) tween.pause();
        else tween.play();
      });
    });
  }

  function buildServicesDepth() {
    var section = document.querySelector(".services");
    if (!section || section.querySelector(".services-depth")) return;
    var depth = document.createElement("div");
    depth.className = "services-depth";
    depth.setAttribute("aria-hidden", "true");
    var far = document.createElement("span");
    far.className = "services-depth-far";
    var near = document.createElement("span");
    near.className = "services-depth-near";
    depth.append(far, near);
    section.prepend(depth);
  }

  function buildTimeline() {
    var list = document.querySelector("[data-historia-timeline]");
    if (!list || list.querySelector(".timeline-line")) return;
    var line = document.createElement("span");
    line.className = "timeline-line";
    line.setAttribute("aria-hidden", "true");
    list.prepend(line);
    gsap.fromTo(line, { scaleY: 0 }, {
      scaleY: 1,
      ease: "none",
      scrollTrigger: {
        trigger: list,
        start: "top 75%",
        end: "bottom 65%",
        scrub: true
      }
    });
    list.querySelectorAll(".timeline-item").forEach(function (item) {
      item.dataset.motion = "1";
      ScrollTrigger.create({
        trigger: item,
        start: "top 72%",
        end: "bottom 42%",
        onToggle: function (self) { item.classList.toggle("is-active", self.isActive); }
      });
    });
  }

  function pinAbout() {
    var about = document.querySelector(".about");
    var img = document.querySelector(".about-media img");
    var lineA = document.querySelector(".pull-line--a");
    var lineB = document.querySelector(".pull-line--b");
    if (!about || !img) return;
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: about,
        start: "top top+=72",
        end: "+=85%",
        pin: true,
        scrub: 0.65,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        fastScrollEnd: true
      }
    });
    tl.fromTo(img,
      { clipPath: "inset(100% 0% 0% 0%)", scale: 1.08 },
      { clipPath: "inset(0% 0% 0% 0%)", scale: 1, ease: "none", duration: 1 },
      0
    );
    if (lineA && lineB) {
      tl.to(lineA, { opacity: 0, y: -14, ease: "none", duration: 0.28 }, 0.62);
      tl.fromTo(lineB, { opacity: 0, y: 14 }, { opacity: 1, y: 0, ease: "none", duration: 0.28 }, 0.62);
    }
  }

  function servicesDesktop() {
    document.querySelectorAll(".service-card").forEach(function (card, index) {
      card.dataset.motion = "1";
      gsap.fromTo(card, { opacity: 0, y: 56 + (index % 3) * 14 }, {
        opacity: 1,
        y: 0,
        ease: "none",
        scrollTrigger: {
          trigger: card,
          start: "top 94%",
          end: "top 58%",
          scrub: true
        }
      });
    });
    var far = document.querySelector(".services-depth-far");
    var near = document.querySelector(".services-depth-near");
    if (far) gsap.to(far, { yPercent: -22, ease: "none", scrollTrigger: { trigger: ".services", scrub: true } });
    if (near) gsap.to(near, { yPercent: 16, ease: "none", scrollTrigger: { trigger: ".services", scrub: true } });
  }

  function servicesMobile() {
    var cards = gsap.utils.toArray(".service-card");
    cards.forEach(function (card) { card.dataset.motion = "1"; });
    if (!cards.length) return;
    gsap.from(cards, {
      opacity: 0,
      y: 18,
      duration: 0.6,
      stagger: 0.05,
      ease: "power2.out",
      scrollTrigger: { trigger: ".service-grid", start: "top 90%", once: true }
    });
  }

  function heroScroll() {
    var hero = document.querySelector(".hero");
    if (!hero) return;
    var media = hero.querySelector(".hero-media");
    var dim = hero.querySelector(".hero-dim");
    var content = hero.querySelector(".hero-content");
    if (media) {
      gsap.fromTo(media, { scale: 1 }, {
        scale: 1.1,
        ease: "none",
        transformOrigin: "50% 40%",
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true }
      });
    }
    if (dim) {
      gsap.fromTo(dim, { opacity: 0 }, {
        opacity: 1,
        ease: "none",
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true }
      });
    }
    if (content) {
      gsap.to(content, {
        y: 88,
        ease: "none",
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true }
      });
    }
  }

  function initCursor() {
    var cursor = document.createElement("div");
    cursor.className = "cursor";
    cursor.setAttribute("data-cursor", "");
    cursor.setAttribute("aria-hidden", "true");
    var ringWrap = document.createElement("div");
    ringWrap.className = "cursor-ring-wrap";
    var ring = document.createElement("span");
    ring.className = "cursor-ring";
    var label = document.createElement("span");
    label.className = "cursor-label";
    label.textContent = "Ver";
    ring.appendChild(label);
    ringWrap.appendChild(ring);
    var dot = document.createElement("span");
    dot.className = "cursor-dot";
    cursor.append(ringWrap, dot);
    document.body.appendChild(cursor);
    root.classList.add("has-cursor");
    var x = window.innerWidth * 0.5;
    var y = window.innerHeight * 0.4;
    var rx = x;
    var ry = y;
    var mode = "default";
    function paint(next) {
      if (next === mode) return;
      mode = next;
      var view = next === "view";
      var button = next === "button";
      gsap.to(ring, {
        scale: view ? 2.2 : button ? 1.45 : 1,
        backgroundColor: view ? "#c9a24b" : "rgba(201,162,75,0)",
        duration: 0.35,
        ease: "power3.out",
        overwrite: "auto"
      });
      gsap.to(dot, { opacity: view || button ? 0 : 1, duration: 0.2, overwrite: "auto" });
      gsap.to(label, { opacity: view ? 1 : 0, duration: 0.25, overwrite: "auto" });
    }
    function onMove(event) {
      if (event.pointerType && event.pointerType !== "mouse") return;
      x = event.clientX;
      y = event.clientY;
      cursor.classList.add("is-on");
      var target = event.target;
      var field = target.closest && target.closest("input, textarea, select");
      cursor.classList.toggle("is-hidden", !!field);
      if (field) {
        paint("default");
        return;
      }
      var card = target.closest && target.closest(".service-card, .about-media, .historia-photo");
      var button = target.closest && target.closest("button, .btn");
      if (card) paint("view");
      else if (button) paint("button");
      else paint("default");
    }
    function onLeave() { cursor.classList.remove("is-on"); }
    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    var tick = function () {
      rx += (x - rx) * 0.16;
      ry += (y - ry) * 0.16;
      gsap.set(ringWrap, { x: rx, y: ry });
      gsap.set(dot, { x: x, y: y });
    };
    gsap.ticker.add(tick);
    return function () {
      gsap.ticker.remove(tick);
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      root.classList.remove("has-cursor", "is-cursor-view", "is-cursor-button");
      cursor.remove();
    };
  }

  function initMagnetic() {
    var stops = [];
    document.querySelectorAll(".btn").forEach(function (btn) {
      function move(event) {
        if (event.pointerType && event.pointerType !== "mouse") return;
        var rect = btn.getBoundingClientRect();
        var dx = event.clientX - (rect.left + rect.width / 2);
        var dy = event.clientY - (rect.top + rect.height / 2);
        gsap.to(btn, { x: dx * 0.26, y: dy * 0.32, duration: 0.35, ease: "power3.out", overwrite: "auto" });
      }
      function leave() {
        gsap.to(btn, { x: 0, y: 0, duration: 0.85, ease: "elastic.out(1, 0.52)", overwrite: "auto" });
      }
      btn.addEventListener("pointermove", move);
      btn.addEventListener("pointerleave", leave);
      stops.push(function () {
        btn.removeEventListener("pointermove", move);
        btn.removeEventListener("pointerleave", leave);
        gsap.set(btn, { clearProps: "transform" });
      });
    });
    return function () { stops.forEach(function (fn) { fn(); }); };
  }

  function initTilt() {
    var stops = [];
    document.querySelectorAll(".service-card").forEach(function (card) {
      var target = card.querySelector(".service-open") || card;
      function move(event) {
        if (event.pointerType && event.pointerType !== "mouse") return;
        var rect = card.getBoundingClientRect();
        var px = (event.clientX - rect.left) / rect.width - 0.5;
        var py = (event.clientY - rect.top) / rect.height - 0.5;
        gsap.to(target, {
          rotateX: py * -5,
          rotateY: px * 6,
          transformPerspective: 900,
          duration: 0.45,
          ease: "power2.out",
          overwrite: "auto"
        });
      }
      function leave() {
        gsap.to(target, { rotateX: 0, rotateY: 0, duration: 0.7, ease: "power3.out", overwrite: "auto" });
      }
      card.addEventListener("pointermove", move);
      card.addEventListener("pointerleave", leave);
      stops.push(function () {
        card.removeEventListener("pointermove", move);
        card.removeEventListener("pointerleave", leave);
        gsap.set(target, { clearProps: "transform" });
      });
    });
    return function () { stops.forEach(function (fn) { fn(); }); };
  }

  function initProgress(lenis) {
    var bar = document.querySelector("[data-progress]");
    if (!bar) return;
    function render() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = "scaleX(" + progress.toFixed(4) + ")";
    }
    lenis.on("scroll", render);
    render();
  }

  function watchLock(lenis) {
    document.querySelectorAll(".modal-panel, [data-nav]").forEach(function (el) {
      el.setAttribute("data-lenis-prevent", "");
    });
    function sync() {
      if (document.body.classList.contains("is-locked")) lenis.stop();
      else lenis.start();
    }
    sync();
    var observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  }

  function createLenis() {
    var lenis = new Lenis({
      lerp: 0.085,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.92,
      autoRaf: false
    });
    lenis.on("scroll", ScrollTrigger.update);
    lenisTicker = function (time) { lenis.raf(time * 1000); };
    gsap.ticker.add(lenisTicker);
    gsap.ticker.lagSmoothing(0);
    root.style.scrollBehavior = "auto";
    lenisRef = lenis;
    if (window.location.hash) {
      var hashed = document.querySelector(decodeURIComponent(window.location.hash));
      if (hashed) lenis.scrollTo(hashed, { offset: headerOffset(hashed), immediate: true });
    }
    return lenis;
  }

  function layoutMotion() {
    root.classList.remove("motion-pending");
    root.classList.add("has-motion");
    playIndexHero();
    playHistoriaHero();
    document.querySelectorAll("main h2").forEach(function (title) { maskTitle(title, false); });
    document.querySelectorAll(".historia-block h3").forEach(function (title) { maskTitle(title, false); });
    document.querySelectorAll(".section-head > p:not(.kicker), .about-copy > p:not(.about-actions), .historia-intro p, .historia-end p, .visit-note").forEach(function (paragraph) {
      fadeLines(paragraph, false);
    });
    document.querySelectorAll(".about-copy .kicker, .about-copy .stats, .about-copy .about-actions, .section-head .kicker, .about .pull").forEach(function (el) {
      fadeUp(el);
    });
    document.querySelectorAll(".historia-photo img").forEach(function (img) {
      revealClip(img, img.closest(".historia-block") || img);
    });
    document.querySelectorAll(".historia-block").forEach(function (block) {
      block.dataset.motion = "1";
      var copy = block.querySelector(".historia-block-copy");
      if (copy) fadeUp(copy, block);
    });
    var media = document.querySelector(".about-media");
    if (media) media.dataset.motion = "1";
    buildTimeline();
    animateMarquees();
    var mm = gsap.matchMedia();
    mm.add("(min-width: 768px)", function () {
      heroScroll();
      pinAbout();
      servicesDesktop();
    });
    mm.add("(max-width: 767px)", function () {
      servicesMobile();
      revealClip(document.querySelector(".about-media img"), document.querySelector(".about-media"));
    });
    mm.add("(min-width: 768px) and (hover: hover) and (pointer: fine)", function () {
      var cursor = initCursor();
      var magnetic = initMagnetic();
      var tilt = initTilt();
      return function () {
        cursor();
        magnetic();
        tilt();
      };
    });
    document.querySelectorAll(".reveal").forEach(function (el) {
      if (el.dataset.motion === "1") return;
      if (el.classList.contains("timeline-item")) return;
      fadeUp(el);
    });
    ScrollTrigger.refresh();
  }

  function boot() {
    gsap.registerPlugin(ScrollTrigger);
    initPhrases();
    initNavRoll();
    buildMarquees();
    buildServicesDepth();
    var lenis = createLenis();
    bindTransport(lenis);
    initProgress(lenis);
    watchLock(lenis);
    var reduceWatch = window.matchMedia("(prefers-reduced-motion: reduce)");
    var onReduce = function () {
      if (!reduceWatch.matches) return;
      showAll();
    };
    if (reduceWatch.addEventListener) reduceWatch.addEventListener("change", onReduce);
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([
      fonts.catch(function () {}),
      new Promise(function (resolve) { window.setTimeout(resolve, 900); })
    ]).then(function () {
      try { layoutMotion(); } catch (error) { showAll(); }
    });
    window.addEventListener("load", function () {
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  }

  bindViewHooks();
  var introReady = setupIntro();
  settleArrival();
  if (window.__pupilosPremium !== "pending") return;

  loadScripts(CDN).then(function () {
    if (window.__pupilosPremium !== "pending") return null;
    if (!window.gsap || !window.ScrollTrigger || !window.Lenis) throw new Error("libs");
    window.__pupilosPremium = "on";
    return introReady;
  }).then(function (ready) {
    if (ready === null || window.__pupilosPremium !== "on") return;
    try { boot(); } catch (error) { showAll(); }
  }).catch(function () { fail(); });
})();
