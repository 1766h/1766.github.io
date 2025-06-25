// — 초기 데이터 로드 및 설정
let questions = [];
let users = JSON.parse(localStorage.getItem('users')) || [];
let comments = JSON.parse(localStorage.getItem('comments')) || [];
let currentUser = localStorage.getItem('currentUser') || null;
const adminAccount = { username: '원서호', password: '2357', isAdmin: true };
// 관리자 계정 자동 등록
if (!users.some(u => u.username === adminAccount.username)) {
  users.push(adminAccount);
  localStorage.setItem('users', JSON.stringify(users));
}

// — DOM 요소 참조
const authScreen       = document.getElementById('authScreen');
const signupForm       = document.getElementById('signupForm');
const loginForm        = document.getElementById('loginForm');
const showSignupBtn    = document.getElementById('showSignup');
const showLoginBtn     = document.getElementById('showLogin');
const authMsg          = document.getElementById('authMsg');
const app              = document.getElementById('app');
const welcomeUser      = document.getElementById('welcomeUser');
const logoutBtn        = document.getElementById('logoutBtn');
const gradeSelect      = document.getElementById('gradeSelect');
const difficultySelect = document.getElementById('difficultySelect');
const container        = document.getElementById('questionContainer');
const adminPanel       = document.createElement('div');

// — 인증 화면 표시
function showAuth() {
  authScreen.classList.remove('hidden');
  app.classList.add('hidden');
}
// — 메인 앱 화면 표시
function showApp() {
  authScreen.classList.add('hidden');
  app.classList.remove('hidden');
  welcomeUser.textContent = `${currentUser} 님, 환영합니다`;
  renderAdminPanel();
}

// — 탭 전환 이벤트
showSignupBtn.onclick = () => { signupForm.classList.remove('hidden'); loginForm.classList.add('hidden'); authMsg.textContent = ''; };
showLoginBtn.onclick  = () => { loginForm.classList.remove('hidden'); signupForm.classList.add('hidden'); authMsg.textContent = ''; };

// — 회원가입 처리
signupForm.onsubmit = e => {
  e.preventDefault();
  const username = document.getElementById('suUsername').value.trim();
  const password = document.getElementById('suPassword').value;
  if (users.some(u => u.username === username)) {
    authMsg.textContent = '이미 존재하는 사용자입니다.';
    return;
  }
  users.push({ username, password, isAdmin: false });
  localStorage.setItem('users', JSON.stringify(users));
  currentUser = username;
  localStorage.setItem('currentUser', currentUser);
  showApp();
};

// — 로그인 처리
loginForm.onsubmit = e => {
  e.preventDefault();
  const username = document.getElementById('liUsername').value.trim();
  const password = document.getElementById('liPassword').value;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    authMsg.textContent = '아이디 또는 비밀번호가 잘못되었습니다.';
    return;
  }
  currentUser = username;
  localStorage.setItem('currentUser', currentUser);
  showApp();
};

// — 로그아웃 처리
logoutBtn.onclick = () => {
  localStorage.removeItem('currentUser');
  currentUser = null;
  showAuth();
};

// — 질문 데이터 로드 (기본 + 기출)
Promise.all([
  fetch('questions.json').then(r => r.json()),
  fetch('mock.json').then(r => r.json())
]).then(([base, mock]) => {
  questions = [...base, ...mock];
  initApp();
}).catch(err => console.error('데이터 로드 오류:', err));

// — 앱 초기화: 로그인 상태에 따라 화면 표시 및 이벤트 연결
function initApp() {
  if (currentUser) showApp(); else showAuth();
  gradeSelect.addEventListener('change', updateQuestions);
  difficultySelect.addEventListener('change', updateQuestions);
}

// — 관리자 패널 생성
function renderAdminPanel() {
  const isAdmin = users.some(u => u.username === currentUser && u.isAdmin);
  if (isAdmin) {
    adminPanel.id = 'adminPanel';
    adminPanel.innerHTML = '<h3>관리자 패널: 사용자 목록</h3>';
    users.forEach(u => {
      const div = document.createElement('div');
      div.className = 'user-item';
      div.textContent = `${u.username} (${u.isAdmin ? '관리자' : '사용자'})`;
      if (u.username !== adminAccount.username) {
        const btn = document.createElement('button');
        btn.className = 'user-delete';
        btn.textContent = '삭제';
        btn.onclick = () => {
          if (confirm(`${u.username} 계정을 삭제하시겠습니까?`)) {
            users = users.filter(x => x.username !== u.username);
            localStorage.setItem('users', JSON.stringify(users));
            renderAdminPanel();
          }
        };
        div.appendChild(btn);
      }
      adminPanel.appendChild(div);
    });
    if (!document.getElementById('adminPanel')) app.insertBefore(adminPanel, container);
  } else {
    adminPanel.remove();
  }
}

// — 문제 및 댓글 표시
function updateQuestions() {
  container.innerHTML = '';
  const grade = gradeSelect.value;
  const diff  = difficultySelect.value;
  if (!grade || !diff) {
    container.innerHTML = '<p>학년과 난이도를 모두 선택하세요.</p>';
    return;
  }
  const filtered = questions.filter(q => q.grade === grade && q.difficulty === diff);
  if (!filtered.length) {
    container.innerHTML = '<p>해당하는 문제가 없습니다.</p>';
    return;
  }

  // 로그인 사용자 정보
  const userObj = users.find(u => u.username === currentUser);
  const isAdmin = userObj && userObj.isAdmin;

  filtered.forEach(q => {
    // 1) 문제 블록
    const qDiv = document.createElement('div');
    qDiv.className = 'question';
    qDiv.innerHTML = `<strong>${q.id}.</strong> ${q.question}`;

    // 2) 정답 입력 및 제출
    const ansInput = document.createElement('input');
    ansInput.placeholder = '정답을 입력하세요';
    const ansBtn = document.createElement('button');
    ansBtn.textContent = '제출';
    const resultDiv = document.createElement('div');
    resultDiv.className = 'result';
    const solDiv = document.createElement('div');
    solDiv.className = 'solution';
    solDiv.textContent = `[정답] ${q.answer} | 풀이: ${q.solution}`;
    solDiv.style.display = 'none';

    ansBtn.onclick = () => {
      const ua = ansInput.value.trim().replace(/\s/g, '');
      const ca = q.answer.trim().replace(/\s/g, '');
      if (!ua) { resultDiv.textContent = '답을 입력하세요.'; return; }
      resultDiv.textContent = (ua.toLowerCase() === ca.toLowerCase())
        ? '✅ 정답입니다!'
        : `❌ 오답입니다. 정답은 [${q.answer}]`;
      solDiv.style.display = 'block';
    };

    // 3) 댓글 입력 창
    const ci = document.createElement('input');
    ci.className = 'comment-input';
    ci.placeholder = '댓글을 입력하세요';
    const cb = document.createElement('button');
    cb.className = 'comment-btn';
    cb.textContent = '댓글';

    // 4) 댓글 리스트 컨테이너
    const cl = document.createElement('div');
    cl.className = 'comment-list';

    // 5) 댓글 렌더 함수
    function renderComments() {
      cl.innerHTML = '';
      comments.filter(c => c.qid === q.id).forEach(c => {
        const div = document.createElement('div');
        div.className = 'comment-item';
        div.innerHTML = `
          <span class="comment-user">${c.user}</span>
          <span class="comment-time">[${new Date(c.time).toLocaleString()}]</span><br>
          ${c.text}
        `;
        // 삭제 버튼: 관리자이나 (for others) OR 작성자 본인
        if (isAdmin || c.user === currentUser) {
          const dbtn = document.createElement('span');
          dbtn.className = 'comment-delete';
          dbtn.textContent = ' [삭제]';
          dbtn.onclick = () => {
            if (confirm('댓글을 삭제하시겠습니까?')) {
              comments = comments.filter(x => x !== c);
              localStorage.setItem('comments', JSON.stringify(comments));
              renderComments();
            }
          };
          div.appendChild(dbtn);
        }
        cl.appendChild(div);
      });
    }

    // 6) 댓글 등록 핸들러
    cb.onclick = () => {
      const text = ci.value.trim();
      if (!text) return;
      comments.push({ qid: q.id, user: currentUser, text, time: Date.now() });
      localStorage.setItem('comments', JSON.stringify(comments));
      ci.value = '';
      renderComments();
    };

    // 7) DOM에 요소 추가 및 초기 렌더
    qDiv.append(ansInput, ansBtn, resultDiv, solDiv, ci, cb, cl);
    container.appendChild(qDiv);
    renderComments();
  });
}