// 배경 이미지(background.png) 기준으로 list.png 위치·크기 계산 (cover + center 반영)
(function() {
  var bgImg = new Image();
  bgImg.src = 'background.png';

  function setListPosition() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var bgW = bgImg.naturalWidth;
    var bgH = bgImg.naturalHeight;
    if (!bgW || !bgH) return;

    // background-size: cover → scale = max(vw/bgW, vh/bgH)
    var scale = Math.max(vw / bgW, vh / bgH);
    var scaledW = bgW * scale;
    var scaledH = bgH * scale;
    // background-position: center
    var offsetX = (vw - scaledW) / 2;
    var offsetY = (vh - scaledH) / 2;

    // 배경 이미지 기준 가로 9.92%, 세로 26.98% 위치 (px)
    var listLeft = offsetX + scaledW * 0.0992;
    var listTop = offsetY + scaledH * 0.2698;
    // 배경 이미지 가로의 88.03%
    var listWidth = scaledW * 0.8803;

    document.documentElement.style.setProperty('--list-left', listLeft + 'px');
    document.documentElement.style.setProperty('--list-top', listTop + 'px');
    document.documentElement.style.setProperty('--list-width', listWidth + 'px');
  }

  bgImg.onload = function() {
    setListPosition();
    window.addEventListener('resize', setListPosition);
  };
  if (bgImg.complete) {
    setListPosition();
    window.addEventListener('resize', setListPosition);
  }
})();

// Enter 버튼: 제자리 있다가 마우스 가까이 오면 이동, 화면 전체에서 튕김. z축은 popup 위에 표시
(function() {
  var SPEED_MIN = 5;
  var SPEED_MAX = 11;
  var ACTIVATE_RADIUS = 200;
  var FLEE_RADIUS = 260;
  var FLEE_STRENGTH = 3.5;
  var MAX_SPEED = 16;
  var mouseX = -1e5;
  var mouseY = -1e5;
  var buttons = [];
  var rafId = null;

  function randomSpeed() {
    var v = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN);
    return Math.random() < 0.5 ? -v : v;
  }

  function initButtons() {
    var list = document.querySelectorAll('.table-container .enter-btn');
    if (!list.length) return;
    var layer = document.querySelector('.enter-buttons-layer');
    if (!layer) return;
    buttons = [];
    // 레이아웃이 바뀌지 않은 상태에서 7개 위치를 먼저 수집
    var positions = [];
    for (var i = 0; i < list.length; i++) {
      var r = list[i].getBoundingClientRect();
      positions.push({ left: r.left, top: r.top, width: r.width, height: r.height });
    }
    // 그 다음 버튼을 레이어로 옮기고 수집한 위치 적용
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
      btn.style.position = 'fixed';
      btn.style.left = pos.left + 'px';
      btn.style.top = pos.top + 'px';
      btn.style.right = 'auto';
      btn.style.bottom = 'auto';
      btn.style.pointerEvents = 'auto';
    }
  }

  function tick() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
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
          mouseX = e.clientX;
          mouseY = e.clientY;
        });
        rafId = requestAnimationFrame(tick);
      }
    }, 200);
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
