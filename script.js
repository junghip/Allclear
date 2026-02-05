// 기준 해상도 1920×1080, 실제 화면에 맞춰 스케일만 적용 (로컬/배포 동일)
(function() {
  var DESIGN_W = 1920;
  var DESIGN_H = 1080;
  var viewportEl = null;

  function updateScale() {
    var s = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
    var back = document.getElementById('design-viewport-back');
    var front = document.getElementById('design-viewport-front');
    if (back) back.style.transform = 'scale(' + s + ')';
    if (front) front.style.transform = 'scale(' + s + ')';
  }

  window.addEventListener('resize', function() {
    updateScale();
    if (window.updateListScreenPosition) requestAnimationFrame(window.updateListScreenPosition);
  });
  document.addEventListener('DOMContentLoaded', function() {
    updateScale();
    if (window.updateListScreenPosition) requestAnimationFrame(window.updateListScreenPosition);
  });
})();

// 배경 이미지 기준 list 위치·크기 (1920×1080 고정 px)
(function() {
  var bgImg = new Image();
  bgImg.src = 'background.png';
  var DESIGN_W = 1920;
  var DESIGN_H = 1080;

  function setListPosition() {
    var vw = DESIGN_W;
    var vh = DESIGN_H;
    var bgW = bgImg.naturalWidth;
    var bgH = bgImg.naturalHeight;
    if (!bgW || !bgH) return;

    var scale = Math.max(vw / bgW, vh / bgH);
    var scaledW = bgW * scale;
    var scaledH = bgH * scale;
    var offsetX = (vw - scaledW) / 2;
    var offsetY = (vh - scaledH) / 2;

    var listLeft = offsetX + scaledW * 0.0992;
    var listTop = offsetY + scaledH * 0.2698;
    var listWidth = scaledW * 0.8803;

    document.documentElement.style.setProperty('--list-left', listLeft + 'px');
    document.documentElement.style.setProperty('--list-top', listTop + 'px');
    document.documentElement.style.setProperty('--list-width', listWidth + 'px');
    if (window.updateListScreenPosition) setTimeout(window.updateListScreenPosition, 0);
  }

  bgImg.onload = function() { setListPosition(); };
  if (bgImg.complete) setListPosition();
})();

// list.png: 스케일 밖 고정 레이어에 배치, 로드·위치 확정 후 표시 → 첫 프레임부터 선명
(function() {
  function setReady() {
    var wrap = document.getElementById('list-image-screen');
    if (wrap) wrap.classList.add('is-ready');
  }
  function updateListScreenPosition() {
    var container = document.querySelector('.table-container');
    var wrap = document.getElementById('list-image-screen');
    var img = wrap && wrap.querySelector('img');
    if (!container || !wrap) return;
    var r = container.getBoundingClientRect();
    wrap.style.left = r.left + 'px';
    wrap.style.top = r.top + 'px';
    wrap.style.width = r.width + 'px';
    wrap.style.height = r.height + 'px';
    if (r.width > 0 && r.height > 0 && img && img.complete && img.naturalWidth) setReady();
  }
  window.updateListScreenPosition = updateListScreenPosition;
  window.addEventListener('resize', function() {
    requestAnimationFrame(updateListScreenPosition);
  });
  document.addEventListener('DOMContentLoaded', function() {
    var img = document.querySelector('#list-image-screen img');
    if (img) {
      img.addEventListener('load', function onLoad() {
        img.removeEventListener('load', onLoad);
        requestAnimationFrame(function() {
          updateListScreenPosition();
          setReady();
        });
      });
      if (img.complete && img.naturalWidth) {
        requestAnimationFrame(function() {
          updateListScreenPosition();
          setReady();
        });
      }
    }
    requestAnimationFrame(function() {
      updateListScreenPosition();
      setTimeout(updateListScreenPosition, 50);
      setTimeout(updateListScreenPosition, 200);
    });
  });
})();

// Enter 버튼: 1920×1080 설계 좌표, 마우스는 화면→설계 변환
(function() {
  var DESIGN_W = 1920;
  var DESIGN_H = 1080;
  var SPEED_MIN = 5;
  var SPEED_MAX = 11;
  var ACTIVATE_RADIUS = 200;
  var FLEE_RADIUS = 260;
  var FLEE_STRENGTH = 3.5;
  var MAX_SPEED = 16;
  var mouseScreenX = -1e5;
  var mouseScreenY = -1e5;
  var buttons = [];
  var rafId = null;
  var viewportEl = null;

  function randomSpeed() {
    var v = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN);
    return Math.random() < 0.5 ? -v : v;
  }

  function screenToDesign(sx, sy) {
    if (!viewportEl) viewportEl = document.getElementById('design-viewport-front');
    if (!viewportEl) return { x: sx, y: sy };
    var r = viewportEl.getBoundingClientRect();
    return {
      x: (sx - r.left) * DESIGN_W / r.width,
      y: (sy - r.top) * DESIGN_H / r.height
    };
  }

  function initButtons() {
    var list = document.querySelectorAll('.table-container .enter-btn');
    if (!list.length) return;
    var layer = document.querySelector('.enter-buttons-layer');
    if (!layer) return;
    viewportEl = document.getElementById('design-viewport-front');
    if (!viewportEl) return;
    var vr = viewportEl.getBoundingClientRect();
    var scale = vr.width / DESIGN_W;
    buttons = [];
    var positions = [];
    for (var i = 0; i < list.length; i++) {
      var br = list[i].getBoundingClientRect();
      positions.push({
        left: (br.left - vr.left) / scale,
        top: (br.top - vr.top) / scale,
        width: br.width / scale,
        height: br.height / scale
      });
    }
    for (var j = 0; j < list.length; j++) {
      var btn = list[j];
      var pos = positions[j];
      buttons.push({
        el: btn,
        x: pos.left,
        y: pos.top,
        w: pos.width,
        h: pos.height,
        vx: 0,
        vy: 0
      });
      layer.appendChild(btn);
      btn.style.position = 'absolute';
      btn.style.left = pos.left + 'px';
      btn.style.top = pos.top + 'px';
      btn.style.right = 'auto';
      btn.style.bottom = 'auto';
      btn.style.pointerEvents = 'auto';
    }
  }

  function tick() {
    var d = screenToDesign(mouseScreenX, mouseScreenY);
    var mouseX = d.x;
    var mouseY = d.y;
    var vw = DESIGN_W;
    var vh = DESIGN_H;
    buttons.forEach(function(b) {
      var cx = b.x + b.w / 2;
      var cy = b.y + b.h / 2;
      var dx = mouseX - cx;
      var dy = mouseY - cy;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (b.vx === 0 && b.vy === 0 && dist < ACTIVATE_RADIUS) {
        b.vx = randomSpeed();
        b.vy = randomSpeed();
      }

      if ((b.vx !== 0 || b.vy !== 0) && dist < FLEE_RADIUS && dist > 1) {
        var ux = -dx / dist;
        var uy = -dy / dist;
        b.vx += ux * FLEE_STRENGTH;
        b.vy += uy * FLEE_STRENGTH;
        var s = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        if (s > MAX_SPEED) {
          b.vx = (b.vx / s) * MAX_SPEED;
          b.vy = (b.vy / s) * MAX_SPEED;
        }
      }

      b.x += b.vx;
      b.y += b.vy;
      if (b.x < 0) { b.x = 0; b.vx = -b.vx; }
      if (b.x + b.w > vw) { b.x = vw - b.w; b.vx = -b.vx; }
      if (b.y < 0) { b.y = 0; b.vy = -b.vy; }
      if (b.y + b.h > vh) { b.y = vh - b.h; b.vy = -b.vy; }
      b.el.style.left = b.x + 'px';
      b.el.style.top = b.y + 'px';
    });
    rafId = requestAnimationFrame(tick);
  }

  document.addEventListener('DOMContentLoaded', function() {
    console.log('올클기원 웹사이트 로드됨');
    setTimeout(function() {
      initButtons();
      if (buttons.length) {
        document.addEventListener('mousemove', function(e) {
          mouseScreenX = e.clientX;
          mouseScreenY = e.clientY;
        });
        rafId = requestAnimationFrame(tick);
      }
    }, 250);
  });
})();

// ========== 알림 모달: 열기/닫기 (Enter 버튼 클릭 시 화면 중앙에 표시) ==========
(function() {
  function getOverlay() { return document.getElementById('alert-modal-overlay'); }
  function getCloseBtn() { return document.getElementById('alert-modal-close'); }
  function getConfirmBtn() { return document.getElementById('alert-modal-confirm'); }

  function closeAlertModal() {
    var overlay = getOverlay();
    if (overlay) overlay.classList.add('is-hidden');
  }
  function showAlertModal() {
    var overlay = getOverlay();
    var closeBtn = getCloseBtn();
    if (overlay) {
      overlay.classList.remove('is-hidden');
      if (closeBtn) closeBtn.focus();
    }
  }

  window.showAlertModal = showAlertModal;
  window.closeAlertModal = closeAlertModal;

  document.addEventListener('DOMContentLoaded', function() {
    var overlay = getOverlay();
    var closeBtn = getCloseBtn();
    var confirmBtn = getConfirmBtn();
    if (closeBtn) closeBtn.addEventListener('click', closeAlertModal);
    if (confirmBtn) confirmBtn.addEventListener('click', closeAlertModal);
    if (overlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeAlertModal();
      });
    }
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay && !overlay.classList.contains('is-hidden')) {
        closeAlertModal();
      }
    });
    // 모든 Enter 버튼 클릭 시 모달 열기 (이벤트 위임: 레이어·버튼 이동 후에도 동작)
    document.addEventListener('click', function(e) {
      var target = e.target && (e.target.closest ? e.target.closest('.enter-btn') : e.target);
      if (target && target.classList && target.classList.contains('enter-btn')) {
        showAlertModal();
      }
    });
  });
})();
