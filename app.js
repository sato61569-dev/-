/**
 * 問題チェッカー v2 - メインアプリケーション
 * 機能: 送信予定日多段機能、メール統合送信、スケジュール管理、UI改善
 */

// ================================
// グローバル状態管理
// ================================
const AppState = {
  problems: [],
  records: [],
  folders: [],
  schedules: [],
  settings: {
    email: localStorage.getItem('userEmail') || '',
    autoScheduleDays: [1, 7, 16, 35, 62],
    mergeEmails: true,
    questionsPerPage: 2
  },
  currentTab: 'tab1',
  currentRecord: null,
  registeredWords: JSON.parse(localStorage.getItem('registeredWords') || '{}')
};

// ================================
// 初期化
// ================================
document.addEventListener('DOMContentLoaded', () => {
  loadDataFromStorage();
  initializeEventListeners();
  renderTab1();
  renderTab2();
  updateScheduleDisplay();
});

// ================================
// ストレージ管理
// ================================
function loadDataFromStorage() {
  const stored = localStorage.getItem('appData');
  if (stored) {
    const data = JSON.parse(stored);
    AppState.records = data.records || [];
    AppState.folders = data.folders || [];
    AppState.schedules = data.schedules || [];
  }
  AppState.settings.email = localStorage.getItem('userEmail') || '';
}

function saveDataToStorage() {
  localStorage.setItem('appData', JSON.stringify({
    records: AppState.records,
    folders: AppState.folders,
    schedules: AppState.schedules
  }));
}

function saveRegisteredWords() {
  localStorage.setItem('registeredWords', JSON.stringify(AppState.registeredWords));
}

// ================================
// イベントリスナー初期化
// ================================
function initializeEventListeners() {
  // タブ切り替え
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', handleTabChange);
  });

  // TAB1 イベント
  document.getElementById('tab1-apply')?.addEventListener('click', applyTab1Settings);
  document.getElementById('tab1-save')?.addEventListener('click', saveTab1Record);
  document.getElementById('tab1-export')?.addEventListener('click', exportTab1Data);
  document.getElementById('tab1-clear')?.addEventListener('click', clearTab1Data);
  document.getElementById('tab1-open-drag-assign')?.addEventListener('click', openDragAssignModal);
  document.getElementById('tab1-use-pages')?.addEventListener('change', togglePageSettings);
  document.getElementById('tab1-skip-enable')?.addEventListener('change', toggleSkipSettings);
  document.getElementById('tab1-use-candidates')?.addEventListener('change', toggleCandidates);

  // TAB2 イベント
  document.getElementById('tab2-save')?.addEventListener('click', saveTab2Email);
  document.getElementById('tab2-add-folder')?.addEventListener('click', addNewFolder);

  // スケジュール設定
  document.querySelectorAll('.auto-schedule').forEach(checkbox => {
    checkbox.addEventListener('change', handleScheduleToggle);
  });

  document.getElementById('generateSchedule')?.addEventListener('click', generateSchedules);
  document.getElementById('previewSchedule')?.addEventListener('click', previewSchedules);
  document.getElementById('resetSchedule')?.addEventListener('click', resetSchedules);
  document.getElementById('sendTestEmail')?.addEventListener('click', sendTestEmail);
}

// ================================
// タブ管理
// ================================
function handleTabChange(e) {
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.content').forEach(content => content.classList.remove('active'));
  
  e.target.classList.add('active');
  const tabId = e.target.dataset.tab;
  document.getElementById(tabId).classList.add('active');
  AppState.currentTab = tabId;

  if (tabId === 'tab1') renderTab1();
  if (tabId === 'tab2') renderTab2();
}

// ================================
// TAB1: 基本モード
// ================================
function renderTab1() {
  updateTab1Stats();
  renderTab1Grid();
  renderTab1History();
}

function applyTab1Settings() {
  const settings = getTab1Settings();
  if (!settings) return;

  console.log('TAB1設定適用:', settings);
  localStorage.setItem('tab1Settings', JSON.stringify(settings));
  alert('設定が反映されました！');
}

function getTab1Settings() {
  const useCount = document.getElementById('tab1-use-count')?.checked;
  const usePages = document.getElementById('tab1-use-pages')?.checked;
  const count = parseInt(document.getElementById('tab1-count')?.value || '30');
  const startPage = parseInt(document.getElementById('tab1-start')?.value || '11');
  const endPage = parseInt(document.getElementById('tab1-end')?.value || '25');
  const perPage = parseInt(document.getElementById('tab1-per-page')?.value || '2');

  if (!useCount || count <= 0) {
    alert('問題数は1以上で指定してください');
    return null;
  }

  return { useCount, usePages, count, startPage, endPage, perPage };
}

function saveTab1Record() {
  const title = document.getElementById('tab1-title')?.value || '無題のセット';
  const settings = getTab1Settings();
  if (!settings) return;

  const record = {
    id: Date.now(),
    title,
    timestamp: new Date().toLocaleString('ja-JP'),
    settings,
    correctCount: parseInt(document.getElementById('tab1-wrong')?.textContent || '0'),
    wrongCount: parseInt(document.getElementById('tab1-wrong')?.textContent || '0'),
    totalCount: settings.count
  };

  AppState.records.push(record);
  saveDataToStorage();
  renderTab1History();
  alert(`「${title}」を記録しました！`);
}

function exportTab1Data() {
  const csv = 'タイトル,日時,問題数,正解数,不正解数\n' + 
    AppState.records.map(r => 
      `"${r.title}","${r.timestamp}",${r.totalCount},${r.correctCount},${r.wrongCount}`
    ).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `records_${Date.now()}.csv`;
  link.click();
}

function clearTab1Data() {
  if (confirm('本当に全削除しますか？\nこの操作は取り消せません。')) {
    AppState.records = [];
    saveDataToStorage();
    renderTab1History();
    alert('全削除完了！');
  }
}

function updateTab1Stats() {
  const totalIncorrect = AppState.records.reduce((sum, r) => sum + r.wrongCount, 0);
  const totalProblems = AppState.records.reduce((sum, r) => sum + r.totalCount, 0);
  const totalCorrect = AppState.records.reduce((sum, r) => sum + r.correctCount, 0);

  const rate = totalProblems > 0 ? ((totalCorrect / totalProblems) * 100).toFixed(1) : '-';

  document.getElementById('tab1-rate').textContent = rate + '%';
  document.getElementById('tab1-wrong').textContent = totalIncorrect + '問';
  document.getElementById('tab1-total').textContent = totalProblems + '問';
}

function renderTab1Grid() {
  const grid = document.getElementById('tab1-grid');
  if (!grid) return;

  if (AppState.records.length === 0) {
    grid.innerHTML = '<div class="empty-message">記録がありません</div>';
    return;
  }

  grid.innerHTML = AppState.records.map(r => `
    <div class="grid-cell ${r.wrongCount > 0 ? 'wrong' : 'correct'}" 
         title="${r.title}">
      <div class="num">${r.id}</div>
      <div class="page">${r.timestamp}</div>
    </div>
  `).join('');
}

function renderTab1History() {
  const container = document.getElementById('tab1-history');
  if (!container) return;

  if (AppState.records.length === 0) {
    container.innerHTML = '<div class="empty-message">履歴なし</div>';
    return;
  }

  container.innerHTML = `
    <div class="record-list">
      ${AppState.records.map(r => `
        <div class="list-item">
          <div class="list-item-content">
            <div class="record-title">${r.title}</div>
            <div class="record-meta">${r.timestamp}</div>
            <div class="record-rate">正解: ${r.correctCount} / 不正解: ${r.wrongCount} / 計: ${r.totalCount}問</div>
          </div>
        </div>
      `).reverse().join('')}
    </div>
  `;
}

function togglePageSettings() {
  const enabled = document.getElementById('tab1-use-pages')?.checked;
  document.getElementById('tab1-start').disabled = !enabled;
  document.getElementById('tab1-end').disabled = !enabled;
  document.getElementById('tab1-per-page').disabled = !enabled;
}

function toggleSkipSettings() {
  const enabled = document.getElementById('tab1-skip-enable')?.checked;
  document.getElementById('tab1-skip').disabled = !enabled;
}

function toggleCandidates() {
  const enabled = document.getElementById('tab1-use-candidates')?.checked;
  document.getElementById('tab1-candidates').style.display = enabled ? 'block' : 'none';
}

// ================================
// TAB2: フォルダ管理
// ================================
function renderTab2() {
  renderFolderTree();
  renderRecords();
}

function renderFolderTree() {
  const container = document.getElementById('tab2-folders');
  if (!container) return;

  if (AppState.folders.length === 0) {
    container.innerHTML = '<div class="empty-message">フォルダがありません</div>';
    return;
  }

  // 50音順にソート
  const sortedFolders = [...AppState.folders].sort((a, b) => {
    return a.name.localeCompare(b.name, 'ja');
  });

  container.innerHTML = sortedFolders.map(folder => `
    <div class="folder-item" draggable="true" data-folder-id="${folder.id}">
      <div class="folder-header">
        <span class="folder-toggle">📁</span>
        <span>${folder.name}</span>
        <span style="margin-left: auto; color: #999; font-size: 0.9rem;">${folder.items?.length || 0}件</span>
      </div>
      <div class="folder-actions">
        <button class="btn btn-small" onclick="renameFolder(${folder.id})">編集</button>
        <button class="btn btn-small" onclick="deleteFolder(${folder.id})">削除</button>
      </div>
    </div>
  `).join('');

  setupFolderDragAndDrop();
}

function addNewFolder() {
  const name = prompt('フォルダ名を入力してください:');
  if (!name) return;

  const folder = {
    id: Date.now(),
    name: name.trim(),
    items: [],
    createdAt: new Date().toISOString()
  };

  AppState.folders.push(folder);
  saveDataToStorage();
  renderFolderTree();
}

function renameFolder(folderId) {
  const folder = AppState.folders.find(f => f.id === folderId);
  if (!folder) return;

  const newName = prompt('新しい名前を入力してください:', folder.name);
  if (!newName) return;

  folder.name = newName.trim();
  saveDataToStorage();
  renderFolderTree();
}

function deleteFolder(folderId) {
  if (!confirm('このフォルダを削除しますか？')) return;

  AppState.folders = AppState.folders.filter(f => f.id !== folderId);
  saveDataToStorage();
  renderFolderTree();
}

function setupFolderDragAndDrop() {
  document.querySelectorAll('.folder-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.target.style.opacity = '0.5';
    });

    item.addEventListener('dragend', (e) => {
      e.target.style.opacity = '1';
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      e.target.closest('.folder-item').style.background = '#e8f4ff';
    });

    item.addEventListener('dragleave', (e) => {
      e.target.closest('.folder-item').style.background = '';
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      e.target.style.background = '';
    });
  });
}

function renderRecords() {
  const container = document.getElementById('tab2-records-list');
  if (!container) return;

  if (AppState.records.length === 0) {
    container.innerHTML = '<div class="empty-message">記録がありません</div>';
    return;
  }

  container.innerHTML = AppState.records.map(r => `
    <div class="record-item" onclick="selectRecord(${r.id})">
      <div class="record-title">${r.title}</div>
      <div class="record-meta">${r.timestamp}</div>
      <div class="record-rate">正答率: ${r.totalCount > 0 ? ((r.correctCount / r.totalCount) * 100).toFixed(1) : 0}%</div>
    </div>
  `).join('');
}

function selectRecord(recordId) {
  const record = AppState.records.find(r => r.id === recordId);
  if (!record) return;

  AppState.currentRecord = record;
  const detail = document.getElementById('tab2-record-detail');
  if (detail) {
    detail.innerHTML = `
      <div class="detail-row">
        <span class="detail-label">タイトル</span>
        <span class="detail-value">${record.title}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">日時</span>
        <span class="detail-value">${record.timestamp}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">問題数</span>
        <span class="detail-value">${record.totalCount}問</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">正解</span>
        <span class="detail-value">${record.correctCount}問</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">不正解</span>
        <span class="detail-value">${record.wrongCount}問</span>
      </div>
    `;
  }
}

function saveTab2Email() {
  const email = document.getElementById('tab2-email')?.value;
  if (!email) {
    alert('メールアドレスを入力してください');
    return;
  }

  localStorage.setItem('userEmail', email);
  AppState.settings.email = email;
  alert('メールアドレスを保存しました！');
}

// ================================
// 送信スケジュール管理
// ================================
function handleScheduleToggle(e) {
  const days = parseInt(e.target.dataset.days);
  if (e.target.checked) {
    if (!AppState.settings.autoScheduleDays.includes(days)) {
      AppState.settings.autoScheduleDays.push(days);
    }
  } else {
    AppState.settings.autoScheduleDays = AppState.settings.autoScheduleDays.filter(d => d !== days);
  }
  localStorage.setItem('autoScheduleDays', JSON.stringify(AppState.settings.autoScheduleDays));
}

function generateSchedules() {
  if (AppState.records.length === 0) {
    alert('記録がありません。先に「結果を記録」してください。');
    return;
  }

  const newSchedules = [];
  const today = new Date();

  AppState.records.forEach(record => {
    AppState.settings.autoScheduleDays.forEach(days => {
      const scheduleDate = new Date(today);
      scheduleDate.setDate(scheduleDate.getDate() + days);

      newSchedules.push({
        id: Date.now() + Math.random(),
        recordId: record.id,
        recordTitle: record.title,
        days: days,
        scheduleDate: scheduleDate.toISOString().split('T')[0],
        scheduleDatetime: scheduleDate.toLocaleString('ja-JP'),
        status: 'pending',
        mergedWith: []
      });
    });
  });

  // 重複排除：同じ日に同じ記録がある場合はマージ
  if (AppState.settings.mergeEmails) {
    const merged = {};
    newSchedules.forEach(s => {
      const key = s.scheduleDate;
      if (!merged[key]) {
        merged[key] = s;
        merged[key].mergedWith = [];
      } else {
        merged[key].mergedWith.push(s.recordTitle);
      }
    });
    AppState.schedules = Object.values(merged);
  } else {
    AppState.schedules = newSchedules;
  }

  saveDataToStorage();
  updateScheduleDisplay();
  alert(`${AppState.schedules.length}個のスケジュールが生成されました！`);
}

function updateScheduleDisplay() {
  const container = document.getElementById('scheduleList');
  if (!container) return;

  if (AppState.schedules.length === 0) {
    container.innerHTML = '<div class="empty-message">スケジュールがありません</div>';
    return;
  }

  container.innerHTML = AppState.schedules.map(s => `
    <div class="schedule-item">
      <div class="schedule-info">
        <strong>${s.recordTitle}</strong><br/>
        <small>${s.scheduleDatetime}</small>
        ${s.mergedWith.length > 0 ? `<br/><span style="color: #999;">+ ${s.mergedWith.join(', ')}</span>` : ''}
      </div>
      <div class="schedule-status">${s.status === 'sent' ? '✅ 送信済み' : '⏳ 予定中'}</div>
    </div>
  `).join('');
}

function previewSchedules() {
  const preview = document.getElementById('schedulePreview');
  const content = document.getElementById('previewContent');
  
  if (!preview || !content) return;

  if (AppState.schedules.length === 0) {
    alert('プレビューするスケジュールがありません');
    return;
  }

  let html = '<table border="1" style="width:100%; border-collapse:collapse;"><thead><tr><th>日時</th><th>問題名</th><th>統合内容</th></tr></thead><tbody>';
  
  AppState.schedules.forEach(s => {
    html += `<tr><td>${s.scheduleDatetime}</td><td>${s.recordTitle}</td><td>${s.mergedWith.length > 0 ? s.mergedWith.join(', ') : '-'}</td></tr>`;
  });

  html += '</tbody></table>';
  content.innerHTML = html;
  preview.style.display = 'block';
}

function resetSchedules() {
  if (confirm('スケジュールをリセットしますか？')) {
    AppState.schedules = [];
    saveDataToStorage();
    updateScheduleDisplay();
    document.getElementById('schedulePreview').style.display = 'none';
    alert('スケジュールをリセットしました！');
  }
}

// ================================
// テスト送信とメール機能
// ================================
function sendTestEmail() {
  const email = document.getElementById('tab2-email')?.value;
  if (!email) {
    alert('メールアドレスを入力してください');
    return;
  }

  if (AppState.schedules.length === 0) {
    alert('送信するスケジュールがありません');
    return;
  }

  // メール本文の生成
  const emailBody = generateEmailBody(AppState.schedules);

  // IFTTT/Zapier用のWebhook送信、またはmailtoリンクで対応
  sendViaWebhook(email, emailBody);
}

function generateEmailBody(schedules) {
  let body = '📧 送信予定リスト\n';
  body += '='.repeat(40) + '\n\n';

  schedules.forEach(s => {
    body += `📚 ${s.recordTitle}\n`;
    body += `📅 予定日時: ${s.scheduleDatetime}\n`;
    if (s.mergedWith.length > 0) {
      body += `📌 合わせて送信: ${s.mergedWith.join(', ')}\n`;
    }
    body += '\n';
  });

  body += '='.repeat(40) + '\n';
  body += `生成日: ${new Date().toLocaleString('ja-JP')}\n`;
  body += 'より詳細な情報は、アプリケーションから確認できます。';

  return body;
}

function sendViaWebhook(email, body) {
  // 方法1: IFTTT Webhookを使用
  const webhookUrl = localStorage.getItem('webhookUrl') || 
    prompt('IFTTTのWebhook URLを入力してください\n(https://maker.ifttt.com/trigger/send_email/with/key/YOUR_KEY)');
  
  if (!webhookUrl) {
    // フォールバック: mailtoで送信
    sendViaMailto(email, body);
    return;
  }

  localStorage.setItem('webhookUrl', webhookUrl);

  const payload = {
    value1: email,
    value2: '📧 送信スケジュール',
    value3: body
  };

  fetch(webhookUrl, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  .then(() => {
    alert('テスト送信に成功しました！\n受信メールをご確認ください。');
    AppState.schedules.forEach(s => s.status = 'sent');
    saveDataToStorage();
    updateScheduleDisplay();
  })
  .catch(() => {
    console.log('Webhook送信失敗、mailtoにフォールバック');
    sendViaMailto(email, body);
  });
}

function sendViaMailto(email, body) {
  const subject = encodeURIComponent('📧 送信スケジュール');
  const encodedBody = encodeURIComponent(body);
  const mailtoLink = `mailto:${email}?subject=${subject}&body=${encodedBody}`;
  window.location.href = mailtoLink;
}

// ================================
// ドラッグ&ドロップ振替モーダル
// ================================
function openDragAssignModal() {
  alert('ドラッグ&ドロップ機能はv3で実装予定です。\n現在は通常の記録管理をお使いください。');
}

// ================================
// ユーティリティ
// ================================
function showMessage(msg, type = 'info') {
  const div = document.createElement('div');
  div.className = `message message-${type}`;
  div.textContent = msg;
  div.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#28a745' : '#667eea'};
    color: white;
    padding: 15px 20px;
    border-radius: 6px;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

// 50音順ソートヘルパー
function hiraganaSort(a, b) {
  const hiraganaA = toHiragana(a);
  const hiraganaB = toHiragana(b);
  return hiraganaA.localeCompare(hiraganaB, 'ja');
}

function toHiragana(str) {
  return str.replace(/[\u30A1-\u30ン]/g, (ch) => {
    return String.fromCharCode(ch.charCodeAt(0) - 0x60);
  });
}
