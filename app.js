(function () {
  'use strict';

  var STORAGE_USER = 'career_portfolio_user';
  var STORAGE_DETAIL = 'career_portfolio_detail';

  /* 세부 항목 (영역별) */
  var SUB_ITEMS = [
    ['표준화 검사 결과', '나의 가치관', '흥미와 적성'],
    ['나의 꿈(비전)', '로드맵', '희망 직무/기업 분석'],
    ['교과 활동', '비교과 활동', '자격 및 이수증'],
    ['성장 일기', '멘토링 기록']
  ];

  var AREA_NAMES = ['1. 자기 이해', '2. 진로 목표', '3. 학습·활동 기록', '4. 성찰·피드백'];

  /* ----- 로그인 ----- */
  var loginForm = document.getElementById('loginForm');
  var loginUser = document.getElementById('loginUser');
  var userName = document.getElementById('userName');
  var btnLogout = document.getElementById('btnLogout');
  var loginMsg = document.getElementById('loginMsg');
  var userIdInput = document.getElementById('userId');
  var passwordInput = document.getElementById('password');

  function showMsg(text, type) {
    loginMsg.textContent = text;
    loginMsg.className = 'login-msg ' + (type || '');
    loginMsg.classList.remove('hidden');
  }

  function hideMsg() {
    loginMsg.classList.add('hidden');
  }

  function setLoginState(loggedIn, name) {
    if (loggedIn) {
      loginForm.classList.add('hidden');
      loginUser.classList.remove('hidden');
      userName.textContent = name ? name + '님' : '회원님';
      hideMsg();
    } else {
      loginForm.classList.remove('hidden');
      loginUser.classList.add('hidden');
      userName.textContent = '';
    }
  }

  function loadLoginState() {
    var saved = sessionStorage.getItem(STORAGE_USER);
    if (saved) {
      try {
        var user = JSON.parse(saved);
        setLoginState(true, user.name || user.userId);
        return;
      } catch (e) {}
    }
    setLoginState(false);
  }

  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var id = (userIdInput && userIdInput.value) ? userIdInput.value.trim() : '';
      var pw = (passwordInput && passwordInput.value) ? passwordInput.value : '';
      if (!id) {
        showMsg('아이디를 입력하세요.', 'error');
        return;
      }
      if (!pw) {
        showMsg('비밀번호를 입력하세요.', 'error');
        return;
      }
      sessionStorage.setItem(STORAGE_USER, JSON.stringify({ userId: id, name: id }));
      setLoginState(true, id);
      showMsg('로그인되었습니다.', 'success');
      setTimeout(hideMsg, 2000);
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', function () {
      sessionStorage.removeItem(STORAGE_USER);
      setLoginState(false);
      if (userIdInput) userIdInput.value = '';
      if (passwordInput) passwordInput.value = '';
    });
  }

  loadLoginState();

  /* ----- 상단 메뉴 클릭 시 메뉴바 밑에 해당 항목 표시 ----- */
  (function () {
    var navBtns = document.querySelectorAll('.nav-btn');
    var panelSections = document.querySelectorAll('.nav-panel-section');
    navBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var sectionId = btn.getAttribute('data-section');
        if (!sectionId) return;
        navBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        panelSections.forEach(function (sec) {
          sec.classList.toggle('active', sec.id === sectionId);
        });
      });
    });
  })();

  /* ----- 학습 결과 시각화 (영역 클릭 → 세부 항목 진행률) ----- */
  function loadDetailValues() {
    try {
      var saved = localStorage.getItem(STORAGE_DETAIL);
      if (saved) {
        var obj = JSON.parse(saved);
        if (obj && typeof obj === 'object') return obj;
      }
    } catch (e) {}
    return {};
  }

  function saveDetailValues(obj) {
    try {
      localStorage.setItem(STORAGE_DETAIL, JSON.stringify(obj));
    } catch (e) {}
  }

  function getAreaValues(areaIndex) {
    var obj = loadDetailValues();
    var key = String(areaIndex);
    if (obj[key] && Array.isArray(obj[key])) return obj[key];
    var len = SUB_ITEMS[areaIndex] ? SUB_ITEMS[areaIndex].length : 0;
    var arr = [];
    for (var i = 0; i < len; i++) arr.push(0);
    return arr;
  }

  function setAreaValue(areaIndex, itemIndex, value) {
    var obj = loadDetailValues();
    var key = String(areaIndex);
    if (!obj[key] || !Array.isArray(obj[key])) obj[key] = getAreaValues(areaIndex);
    obj[key][itemIndex] = value;
    saveDetailValues(obj);
  }

  function getAreaAvg(areaIndex) {
    var vals = getAreaValues(areaIndex);
    if (vals.length === 0) return 0;
    var sum = 0;
    for (var i = 0; i < vals.length; i++) sum += parseInt(vals[i], 10) || 0;
    return Math.round(sum / vals.length);
  }

  var vizAreas = document.getElementById('vizAreas');
  var vizDetail = document.getElementById('vizDetail');
  var vizDetailTitle = document.getElementById('vizDetailTitle');
  var vizDetailBars = document.getElementById('vizDetailBars');

  function updateAreaRowAvgs() {
    if (!vizAreas) return;
    var rows = vizAreas.querySelectorAll('.viz-area-row');
    for (var i = 0; i < rows.length; i++) {
      var avgEl = rows[i].querySelector('.viz-area-avg');
      if (avgEl) avgEl.textContent = getAreaAvg(i) + '%';
    }
  }

  function renderDetail(areaIndex) {
    if (!vizDetailBars || !vizDetailTitle) return;
    var names = SUB_ITEMS[areaIndex];
    var values = getAreaValues(areaIndex);
    if (!names || !values) return;
    vizDetailTitle.textContent = AREA_NAMES[areaIndex] + ' – 세부 항목 진행률';
    vizDetailBars.innerHTML = '';
    for (var i = 0; i < names.length; i++) {
      var val = values[i] != null ? parseInt(values[i], 10) : 0;
      if (isNaN(val)) val = 0;
      var item = document.createElement('div');
      item.className = 'viz-detail-item';
      item.innerHTML =
        '<span class="viz-detail-label">' + escapeHtml(names[i]) + '</span>' +
        '<div class="bar-track">' +
        '<div class="bar-fill" style="width:' + val + '%">' +
        '<span class="bar-value">' + val + '%</span></div></div>';
      vizDetailBars.appendChild(item);
    }
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function openDetail(areaIndex) {
    var rows = vizAreas ? vizAreas.querySelectorAll('.viz-area-row') : [];
    for (var i = 0; i < rows.length; i++) {
      if (i === areaIndex) {
        rows[i].classList.add('active');
        rows[i].setAttribute('aria-expanded', 'true');
      } else {
        rows[i].classList.remove('active');
        rows[i].setAttribute('aria-expanded', 'false');
      }
    }
    renderDetail(areaIndex);
    if (vizDetail) {
      vizDetail.classList.remove('hidden');
      vizDetail.setAttribute('aria-hidden', 'false');
    }
  }

  function closeDetail() {
    var rows = vizAreas ? vizAreas.querySelectorAll('.viz-area-row') : [];
    for (var i = 0; i < rows.length; i++) {
      rows[i].classList.remove('active');
      rows[i].setAttribute('aria-expanded', 'false');
    }
    if (vizDetail) {
      vizDetail.classList.add('hidden');
      vizDetail.setAttribute('aria-hidden', 'true');
    }
  }

  function toggleDetail(areaIndex) {
    var rows = vizAreas ? vizAreas.querySelectorAll('.viz-area-row') : [];
    var row = rows[areaIndex];
    var isActive = row && row.classList.contains('active');
    if (isActive) {
      closeDetail();
    } else {
      openDetail(areaIndex);
    }
  }

  if (vizAreas) {
    var areaButtons = vizAreas.querySelectorAll('.viz-area-row');
    for (var a = 0; a < areaButtons.length; a++) {
      (function (idx) {
        areaButtons[idx].addEventListener('click', function () {
          toggleDetail(idx);
        });
      })(a);
    }
    updateAreaRowAvgs();
  }

  /* ----- 챗봇 단추 & Gemini API 연동 ----- */
  var chatToggle = document.getElementById('chatToggle');
  var chatPanel = document.getElementById('chatPanel');
  var chatClose = document.getElementById('chatClose');
  var chatMessages = document.getElementById('chatMessages');
  var chatInput = document.getElementById('chatInput');
  var chatSend = document.getElementById('chatSend');
  var chatLoading = document.getElementById('chatLoading');
  var chatApiKey = document.getElementById('chatApiKey');

  var CHAT_STORAGE_KEY = 'career_portfolio_gemini_key';
  var chatHistory = [];

  if (chatToggle && chatPanel) {
    chatToggle.addEventListener('click', function () {
      chatPanel.classList.remove('hidden');
      chatPanel.setAttribute('aria-hidden', 'false');
      if (chatApiKey && !chatApiKey.value) {
        try {
          var saved = sessionStorage.getItem(CHAT_STORAGE_KEY);
          if (saved) chatApiKey.value = saved;
        } catch (e) {}
      }
      if (chatInput) chatInput.focus();
    });
  }

  if (chatClose && chatPanel) {
    chatClose.addEventListener('click', function () {
      chatPanel.classList.add('hidden');
      chatPanel.setAttribute('aria-hidden', 'true');
    });
  }

  if (chatApiKey) {
    chatApiKey.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var key = chatApiKey.value.trim();
        if (key) {
          try { sessionStorage.setItem(CHAT_STORAGE_KEY, key); } catch (err) {}
        }
      }
    });
    chatApiKey.addEventListener('blur', function () {
      var key = chatApiKey.value.trim();
      if (key) {
        try { sessionStorage.setItem(CHAT_STORAGE_KEY, key); } catch (err) {}
      }
    });
  }

  function getApiKey() {
    if (chatApiKey && chatApiKey.value.trim()) return chatApiKey.value.trim();
    try {
      return sessionStorage.getItem(CHAT_STORAGE_KEY) || '';
    } catch (e) { return ''; }
  }

  /* 홈페이지 기능·학습 상황을 AI에게 전달하는 문맥 */
  function getLearningProgressText() {
    try {
      var saved = localStorage.getItem(STORAGE_DETAIL);
      if (!saved) return '저장된 학습 진행률 없음.';
      var obj = JSON.parse(saved);
      var lines = [];
      for (var a = 0; a < AREA_NAMES.length; a++) {
        var key = String(a);
        var vals = obj[key] && Array.isArray(obj[key]) ? obj[key] : [];
        var names = SUB_ITEMS[a];
        if (!names) continue;
        var parts = [];
        for (var i = 0; i < names.length; i++) {
          var v = vals[i] != null ? parseInt(vals[i], 10) : 0;
          if (isNaN(v)) v = 0;
          parts.push(names[i] + ' ' + v + '%');
        }
        lines.push(AREA_NAMES[a] + ': ' + parts.join(', '));
      }
      return lines.length ? lines.join('\n') : '저장된 학습 진행률 없음.';
    } catch (e) { return '저장된 학습 진행률 없음.'; }
  }

  function getSystemInstruction() {
    var progress = getLearningProgressText();
    return '당신은 "진로 포트폴리오" 홈페이지의 챗봇입니다. 특성화고등학교 학생의 진로·취업 역량을 기록하는 사이트입니다.\n\n' +
      '[홈페이지 기능]\n' +
      '• 로그인: 상단에서 아이디/비밀번호로 로그인할 수 있습니다.\n' +
      '• 1. 자기 이해: 표준화 검사 결과(워크넷, MBTI, 강점 검사), 나의 가치관(돈·보람·워라밸 등), 흥미와 적성(좋아하는 것/잘하는 것)을 정리합니다.\n' +
      '• 2. 진로 목표: 나의 꿈(비전), 로드맵(시기별 계획), 희망 직무/기업 분석을 작성합니다.\n' +
      '• 3. 학습·활동 기록: 교과 활동(수행평가·생활기록부), 비교과 활동(동아리·봉사·독서), 자격 및 이수증을 기록합니다.\n' +
      '• 4. 성찰·피드백: 성장 일기, 멘토링 기록(선생님·선배·전문가 조언)을 씁니다.\n' +
      '• 학습 결과 시각화: 영역별 진행률을 막대 그래프로 보여주며, 영역을 클릭하면 세부 항목별 진행률을 볼 수 있습니다.\n' +
      '• 메인 화면은 1~4 영역이 3초 간격으로 슬라이드되며 교대로 표시됩니다.\n\n' +
      '[현재 사용자의 학습 진행 상황]\n' + progress + '\n\n' +
      '위 기능과 학습 진행 상황을 바탕으로, 홈페이지 사용 방법, 진로·포트폴리오 작성 조언, 학습 상황 관련 질문에 친절하고 구체적으로 답해 주세요.';
  }

  function appendMessage(role, text) {
    if (!chatMessages) return;
    var div = document.createElement('div');
    div.className = 'chat-msg chat-msg-' + (role === 'user' ? 'user' : 'ai');
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function setLoading(show) {
    if (chatLoading) chatLoading.classList.toggle('hidden', !show);
    if (chatSend) chatSend.disabled = show;
  }

  function callGemini(userText, onDone) {
    var apiKey = getApiKey();
    if (!apiKey) {
      onDone('API 키를 입력해 주세요. (상단 API 키 칸에 입력 후 Enter)', true);
      return;
    }

    chatHistory.push({ role: 'user', parts: [{ text: userText }] });

    var contents = chatHistory.map(function (m) {
      return { role: m.role, parts: m.parts };
    });

    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(apiKey);
    var payload = {
      contents: contents,
      systemInstruction: { parts: [{ text: getSystemInstruction() }] }
    };
    var body = JSON.stringify(payload);

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var text = '';
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
          text = data.candidates[0].content.parts[0].text || '';
        }
        if (data.error) {
          var errMsg = data.error.message || 'API 오류가 발생했습니다.';
          if (errMsg.indexOf('quota') !== -1 || errMsg.indexOf('Quota') !== -1) {
            var retryMatch = errMsg.match(/retry in (\d+(?:\.\d+)?)\s*s/i);
            var retrySec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 6;
            text = '할당량을 초과했거나 무료 한도(0)입니다. ' + retrySec + '초 후 다시 시도해 보세요.\n\n' +
              '• 사용량 확인: https://ai.dev/rate-limit\n' +
              '• 요금/한도 안내: https://ai.google.dev/gemini-api/docs/rate-limits';
          } else {
            text = errMsg;
          }
          onDone(text, true);
          chatHistory.pop();
          return;
        }
        if (!text) text = '답변을 생성하지 못했습니다.';
        chatHistory.push({ role: 'model', parts: [{ text: text }] });
        onDone(text, false);
      })
      .catch(function (err) {
        chatHistory.pop();
        onDone('연결 오류: ' + (err.message || '네트워크를 확인해 주세요.'), true);
      });
  }

  function sendMessage() {
    if (!chatInput || !chatMessages) return;
    var text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';
    appendMessage('user', text);
    setLoading(true);

    callGemini(text, function (aiText, isError) {
      setLoading(false);
      appendMessage('ai', aiText);
    });
  }

  if (chatSend && chatInput) {
    chatSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }
})();
