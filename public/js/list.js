// ==========================================
// list.js : 메뉴, 리스트, 상세보기, 히스토리 (고정)
// ==========================================

const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('mainContent');
const defaultViewHTML = document.getElementById('defaultView').outerHTML;

let currentListState = { type: 'all', value: '' };
let currentSortType = 'number';
let currentFlashbackSortType = 'number';
let currentInnerSortType = 'main';
let currentStorySortType = 'region';
let currentInfoSortType = 'updated';
let previousViewState = null;

// ==========================================
// ★ 페이지네이션 헬퍼 (30개 단위)
// ==========================================
const PAGE_SIZE = 30;

function buildPaginationHTML(totalItems, currentPage, onPageClick) {
    const totalPages = Math.ceil(totalItems / PAGE_SIZE);
    if (totalPages <= 1) return '';

    const BLOCK = 5;
    const currentBlock = Math.floor((currentPage - 1) / BLOCK);
    const startPage = currentBlock * BLOCK + 1;
    const endPage = Math.min(startPage + BLOCK - 1, totalPages);

    let html = `<div class="pagination">`;

    // 처음
    if (currentPage > 1) {
        html += `<button class="page-btn" data-page="1">«</button>`;
    }
    // 이전 블록
    if (startPage > 1) {
        html += `<button class="page-btn" data-page="${startPage - 1}">‹</button>`;
    }
    // 페이지 번호들
    for (let p = startPage; p <= endPage; p++) {
        const isActive = p === currentPage;
        html += `<button class="page-btn${isActive ? ' active' : ''}" data-page="${p}">${p}</button>`;
    }
    // 다음 블록
    if (endPage < totalPages) {
        html += `<button class="page-btn" data-page="${endPage + 1}">›</button>`;
    }
    // 마지막
    if (currentPage < totalPages) {
        html += `<button class="page-btn" data-page="${totalPages}">»</button>`;
    }
    html += `</div>`;
    return html;
}

function attachPaginationEvent(callback) {
    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = parseInt(btn.dataset.page, 10);
            callback(page);
            // 페이지 상단으로 스크롤
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

// 페이지 슬라이스
function paginate(items, page) {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
}

// ---- 메뉴 렌더링 (레지스트리 기반) ----
for (const [menuKey, cfg] of Object.entries(MENU_REGISTRY)) {
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'menu-category';
    if (cfg.defaultOpen) categoryDiv.classList.add('open');

    const btn = document.createElement('button');
    btn.className = 'menu-btn';
    btn.innerHTML = `<span>${cfg.label}</span><span>▼</span>`;
    btn.addEventListener('click', () => categoryDiv.classList.toggle('open'));

    const ul = document.createElement('ul');
    ul.className = 'sub-menu';
    cfg.subs.forEach(sub => {
        const li = document.createElement('li');
        li.textContent = sub;
        li.dataset.dojong = sub;

        li.addEventListener('click', () => {
            // ★ 준비 중 메뉴는 알림만
            if (cfg.comingSoon) {
                alert(`'${sub}' 메뉴 준비 중입니다.`);
                return;
            }
            // 활성화 표시
            document.querySelectorAll('.sub-menu li').forEach(el => el.classList.remove('active'));
            li.classList.add('active');

            // ★ 렌더러 동적 결정 (specialSubs 우선, 없으면 renderer)
            const rendererName = (cfg.specialSubs && cfg.specialSubs[sub]) || cfg.renderer;
            const fn = window[rendererName];
            if (typeof fn === 'function') {
                fn(sub);
            } else {
                alert(`렌더러 '${rendererName}' 를 찾을 수 없습니다.`);
            }
        });

        ul.appendChild(li);
    });

    categoryDiv.appendChild(btn);
    categoryDiv.appendChild(ul);
    sidebar.appendChild(categoryDiv);
}

// ---- 정렬 ----
function sortPosts(posts, sortType) {
    const sorted = [...posts];
    const parseNumber = (val) => { const n = parseInt(val, 10); return isNaN(n) ? 999999 : n; };
    switch (sortType) {
        case 'number': sorted.sort((a, b) => parseNumber(a.number) - parseNumber(b.number)); break;
        case 'name': sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko')); break;
        case 'dopa': sorted.sort((a, b) => (a.dopa || '').localeCompare(b.dopa || '', 'ko')); break;
        case 'updated': sorted.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)); break;
    }
    return sorted;
}
function getSortDropdownHTML() {
    return `<select id="sortSelect" class="sort-Select">
        <option value="number" ${currentSortType === 'number' ? 'selected' : ''}>도검순</option>
        <option value="dopa" ${currentSortType === 'dopa' ? 'selected' : ''}>도파순</option>
        <option value="name" ${currentSortType === 'name' ? 'selected' : ''}>이름순</option>
        <option value="updated" ${currentSortType === 'updated' ? 'selected' : ''}>업데이트순</option>
    </select>`;
}
function attachSortEvent(callback) {
    const sel = document.getElementById('sortSelect');
    if (sel) sel.addEventListener('change', (e) => { currentSortType = e.target.value; callback(); });
}
// ==========================================
// ★ 내번 정렬 헬퍼
// ==========================================
function sortInnerPosts(posts, sortType) {
    const sorted = [...posts];
    const swordSortKey = (p) => {
        const arr = Array.isArray(p.swordNumbers) ? p.swordNumbers : [];
        const nums = arr.map(n => parseInt(n, 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
        return nums.length > 0 ? nums[0] : 999999;
    };
    switch (sortType) {
        case 'main':
            const typeOrder = (typeof INNER_SCHEMA !== 'undefined' && INNER_SCHEMA.inner) 
                ? INNER_SCHEMA.inner.fields.find(f => f.key === 'innerType').options 
                : ['말당번', '밭당번', '대련'];
                
            sorted.sort((a, b) => {
                const idxA = typeOrder.indexOf(a.innerType);
                const idxB = typeOrder.indexOf(b.innerType);
                // 옵션에 없는 타입은 맨 뒤로 보냄
                const orderA = idxA === -1 ? 999 : idxA;
                const orderB = idxB === -1 ? 999 : idxB;
                
                if (orderA !== orderB) return orderA - orderB;
                // 같은 내번 타입 내에서는 도검 번호순으로 정렬
                return swordSortKey(a) - swordSortKey(b);
            });
            break;
        case 'sword':
            sorted.sort((a, b) => swordSortKey(a) - swordSortKey(b));
            break;
        case 'updated':
            sorted.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
            break;
    }
    return sorted;
}

function getInnerSortDropdownHTML() {
    return `<select id="innerSortSelect" class="sort-Select">
        <option value="main" ${currentInnerSortType === 'main' ? 'selected' : ''}>분류순</option>
        <option value="sword" ${currentInnerSortType === 'sword' ? 'selected' : ''}>도검순</option>
        <option value="updated" ${currentInnerSortType === 'updated' ? 'selected' : ''}>업데이트순</option>
    </select>`;
}

function attachInnerSortEvent(callback) {
    const sel = document.getElementById('innerSortSelect');
    if (sel) sel.addEventListener('change', (e) => {
        currentInnerSortType = e.target.value;
        callback();
    });
}
// ==========================================
// ★ 스토리 정렬 헬퍼
// ==========================================
function sortStoryPosts(posts, sortType) {
    const sorted = [...posts];
    // ★ 날짜 문자열을 타임스탬프(숫자)로 변환하는 헬퍼
    const parseDateKey = (dateStr) => {
        if (!dateStr) return 0;
        // "2019.4.24", "2019-04-24", "2019/04/24" 등에서 숫자만 추출
        const matches = String(dateStr).match(/\d+/g);
        if (!matches || matches.length < 3) return 0;
        const [year, month, day] = matches.map(Number);
        return year * 10000 + month * 100 + day; // YYYYMMDD 형태의 숫자로 변환
    };
    switch (sortType) {
        case 'main':
            sorted.sort((a, b) =>
                String(a.mainCategory || '').localeCompare(String(b.mainCategory || ''), 'ko')
                || String(a.Numbers || '').localeCompare(String(b.Numbers || ''), 'ko')
                || String(a.title || '').localeCompare(String(b.title || ''), 'ko'));
            break;
        case 'region':
            sorted.sort((a, b) => parseDateKey(a.region) - parseDateKey(b.region));
            break;
        case 'sword':
            const swordKey = (p) => {
                const arr = Array.isArray(p.swordNumbers) ? p.swordNumbers : [];
                const nums = arr.map(n => parseInt(n, 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
                return nums.length > 0 ? nums[0] : 999999;
            };
            sorted.sort((a, b) => swordKey(a) - swordKey(b));
            break;
        case 'updated':
        default:
            sorted.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    }
    return sorted;
}

function getStorySortDropdownHTML() {
    return `<select id="storySortSelect" class="sort-Select">
        <option value="region" ${currentStorySortType === 'region' ? 'selected' : ''}>날짜순</option>
        <option value="main" ${currentStorySortType === 'main' ? 'selected' : ''}>분류순</option>
        <option value="sword" ${currentStorySortType === 'sword' ? 'selected' : ''}>도검순</option>
        <option value="updated" ${currentStorySortType === 'updated' ? 'selected' : ''}>업데이트순</option>
    </select>`;
}

function attachStorySortEvent(callback) {
    const sel = document.getElementById('storySortSelect');
    if (sel) sel.addEventListener('change', (e) => {
        currentStorySortType = e.target.value;
        callback();
    });
}

// ==========================================
// ★ 회상 정렬 헬퍼
// ==========================================
function sortFlashbackPosts(posts, sortType) {
    const sorted = [...posts];
    const parseNum = (v) => { const n = parseInt(String(v || '').trim(), 10); return isNaN(n) ? 999999 : n; };
    const swordSortKey = (p) => {
        const arr = Array.isArray(p.swordNumbers) ? p.swordNumbers : [];
        const nums = arr.map(n => parseInt(n, 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
        return nums.length > 0 ? nums[0] : 999999;
    };
    
    switch (sortType) {
        case 'number':
            sorted.sort((a, b) => parseNum(a.flashbackNumber) - parseNum(b.flashbackNumber));
            break;
        case 'region':
            sorted.sort((a, b) => 
                String(a.flashbackRegion || '').localeCompare(String(b.flashbackRegion || ''), 'ko') ||
                parseNum(a.flashbackNumber) - parseNum(b.flashbackNumber)
            );
            break;
        case 'sword':
            sorted.sort((a, b) => swordSortKey(a) - swordSortKey(b));
            break;
        case 'updated':
            sorted.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
            break;
    }
    return sorted;
}

function getFlashbackSortDropdownHTML() {
    return `<select id="flashbackSortSelect" class="sort-Select">
        <option value="number" ${currentFlashbackSortType === 'number' ? 'selected' : ''}>회상순</option>
        <option value="region" ${currentFlashbackSortType === 'region' ? 'selected' : ''}>지역순</option>
        <option value="sword" ${currentFlashbackSortType === 'sword' ? 'selected' : ''}>도검순</option>
        <option value="updated" ${currentFlashbackSortType === 'updated' ? 'selected' : ''}>업데이트순</option>
    </select>`;
}

function attachFlashbackSortEvent(callback) {
    const sel = document.getElementById('flashbackSortSelect');
    if (sel) sel.addEventListener('change', (e) => {
        currentFlashbackSortType = e.target.value;
        callback();
    });
}

// ==========================================
// ★ 게임 정보 정렬 헬퍼
// ==========================================
function sortInfoPosts(posts, sortType) {
    const sorted = [...posts];
    switch (sortType) {
        case 'main':
            sorted.sort((a, b) => {
                const catCompare = String(a.mainCategory || '').localeCompare(String(b.mainCategory || ''), 'ko');
                if (catCompare !== 0) return catCompare;
                return String(a.title || '').localeCompare(String(b.title || ''), 'ko');
            });
            break;
        case 'title':
            sorted.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'ko'));
            break;
        case 'created':
            sorted.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
            break;
        case 'updated':
        default:
            sorted.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
            break;
    }
    return sorted;
}

function getInfoSortDropdownHTML() {
    return `<select id="infoSortSelect" class="sort-Select">
        <option value="updated" ${currentInfoSortType === 'updated' ? 'selected' : ''}>업데이트순</option>
        <option value="main" ${currentInfoSortType === 'main' ? 'selected' : ''}>분류순</option>
        <option value="title" ${currentInfoSortType === 'title' ? 'selected' : ''}>제목순</option>
        <option value="created" ${currentInfoSortType === 'created' ? 'selected' : ''}>등록순</option>
    </select>`;
}

function attachInfoSortEvent(callback) {
    const sel = document.getElementById('infoSortSelect');
    if (sel) sel.addEventListener('change', (e) => {
        currentInfoSortType = e.target.value;
        callback();
    });
}

// ---- 도검남사 리스트들 ----
function renderAllPostsList(pushHistory = true, page = 1) {
    _renderOuterList({
        posts: getPosts(),
        title: '모든 게시물 목록',
        historyType: 'all', historyValue: '',
        filterValue: '모두 보기',
        pushHistory, page
    });
}
function renderPostList(dojong, pushHistory = true, page = 1) {
    const target = dojong.trim().toLowerCase();
    const filtered = getPosts().filter(p => (p.dojong || '').trim().toLowerCase() === target);
    _renderOuterList({
        posts: filtered, title: `도검남사 - ${dojong} 목록`,
        historyType: 'dojong', historyValue: dojong,
        filterValue: '모두 보기',
        pushHistory, page
    });
}
function renderDopaList(dopa, pushHistory = true, page = 1) {
    const target = dopa.trim().toLowerCase();
    const filtered = getPosts().filter(p => (p.dopa || '').trim().toLowerCase() === target);
    _renderOuterList({
        posts: filtered, title: `도검남사 - ${dopa} 도파 목록`,
        historyType: 'dopa', historyValue: dopa,
        filterValue: '모두 보기',
        pushHistory, page
    });
}
function renderRareList(rare, pushHistory = true, page = 1) {
    const target = rare.trim();
    const filtered = getPosts().filter(p => String(p.rare || '').trim() === target);
    _renderOuterList({
        posts: filtered, title: `도검남사 - 레어도 ${rare} 목록`,
        historyType: 'rare', historyValue: rare,
        filterValue: '모두 보기',
        pushHistory, page
    });
}

function renderTagPostList(tag, pushHistory = true, page = 1) {
    currentListState = { type: 'tag', value: tag };
    previousViewState = null;
    if (pushHistory) history.pushState({ view: 'list', type: 'tag', value: tag }, '', `#tag-${encodeURIComponent(tag)}`);

    const target = tag.trim().toLowerCase();
    const filtered = getPosts().filter(post => {
        const tags = post.tags || [];
        return (post.dojong || '').trim().toLowerCase() === target ||
               (post.dopa || '').trim().toLowerCase() === target ||
               (post.status || '').trim().toLowerCase() === target ||
               (post.slot || '').trim().toLowerCase() === target ||
               (post.voice || '').trim().toLowerCase() === target ||
               (post.art || '').trim().toLowerCase() === target ||
               tags.some(t => t.trim().toLowerCase() === target);
    });
    const sorted = sortPosts(filtered, currentSortType);
    const pageItems = paginate(sorted, page);
    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

    mainContent.innerHTML = `<div class="list-container">
        <div class="tag-search-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <h2>태그: <span style="color:var(--color-delete);">${tag}</span> (${sorted.length}개) - ${page}/${totalPages}</h2>
            <div style="display:flex;gap:10px;align-items:center;">
                ${getSortDropdownHTML()}
                <button class="back-btn" id="btn-tag-back">← 뒤로</button>
            </div>
        </div>
        ${buildCardGrid(pageItems)}
        ${buildPaginationHTML(sorted.length, page)}
    </div>`;

    document.getElementById('btn-tag-back').addEventListener('click', () => {
        const activeMenu = document.querySelector('.sub-menu li.active');
        if (activeMenu && activeMenu.dataset.dojong !== '모두 보기') renderPostList(activeMenu.dataset.dojong);
        else renderAllPostsList();
    });
    attachSortEvent(() => renderTagPostList(tag, false, 1));
    attachPaginationEvent((p) => renderTagPostList(tag, false, p));
}

// ---- 도검남사 상세보기 ----
function renderDetailView(postId, pushHistory = true) {
    const allPosts = getPosts();
    const post = allPosts.find(p => String(p.id) === String(postId));
    if (!post) { alert('게시물을 찾을 수 없습니다.'); return; }

    const allSorted = allPosts
        .filter(p => !isNaN(parseInt(p.number, 10)))
        .sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));

    const currentIdx = allSorted.findIndex(p => String(p.id) === String(post.id));
    const prevPost = currentIdx > 0 ? allSorted[currentIdx - 1] : null;
    const nextPost = currentIdx < allSorted.length - 1 ? allSorted[currentIdx + 1] : null;

    const prevBtnHtml = prevPost
        ? `<button class="btn-nav-prev" onclick="renderDetailView(${prevPost.id})">◀ 이전 (${prevPost.number}.${prevPost.name || ''})</button>`
        : `<button disabled class="btn-nav-disabled">◀ 이전</button>`;

    const nextBtnHtml = nextPost
        ? `<button class="btn-nav-next" onclick="renderDetailView(${nextPost.id})">다음 (${nextPost.number}.${nextPost.name || ''}) ▶</button>`
        : `<button disabled class="btn-nav-disabled">다음 ▶</button>`;

    if (pushHistory) {
        if (!currentListState.value && currentListState.type !== 'all') {
            currentListState = { type: 'dojong', value: post.dojong || '' };
        }
        previousViewState = { ...currentListState };
        history.pushState({ view: 'detail', postId: post.id }, '', `#detail-${post.id}`);
    }

    const dojongTag = post.dojong || '';
    const dopaTag = post.dopa || '';
    const statusTag = post.status || '';
    const extraTags = (post.tags || []).filter(t => t !== dojongTag && t !== dopaTag && t !== statusTag);
    let tagsHtml = '';
const safeTag = (v) => escapeHtml(String(v)).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
if (dojongTag) tagsHtml += `<span class="tag tag-yellow" onclick="renderTagPostList('${safeTag(dojongTag)}')">${escapeHtml(dojongTag)}</span>`;
if (dopaTag) tagsHtml += `<span class="tag tag-blue" onclick="renderTagPostList('${safeTag(dopaTag)}')">${escapeHtml(dopaTag)}</span>`;
if (statusTag) tagsHtml += `<span class="tag tag-green" onclick="renderTagPostList('${safeTag(statusTag)}')">${escapeHtml(statusTag)}</span>`;
extraTags.forEach(t => { tagsHtml += `<span class="tag tag-gray" onclick="renderTagPostList('${safeTag(t)}')">${escapeHtml(t)}</span>`; });

    const tabsHtml = renderTabsNavHTML(post);
	const isBm = isOuterBookmarked(post.id);

    const html = `
        <div class="detail-view">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                <button id="btn-detail-back" class="back-btn">← 뒤로</button>
                <div style="display: flex; gap: 8px;">
                    ${prevBtnHtml}
                    ${nextBtnHtml}
                </div>
            </div>

            <div class="detail-tag-row">
                <span class="label">태그:</span>
                ${tagsHtml || '<span style="color:#aaa;">태그 없음</span>'}
            </div>

            <div class="detail-tab-nav" id="detailTabs">${tabsHtml}</div>

            <div id="detailContentArea"></div>

            <div class="detail-actions" id="outerBookmarkWrap">
                <!-- ★ 좌측 그룹 -->
                <div class="detail-actions-left">
                    <button class="btn-bmk" onclick="toggleOuterBookmark(${Number(post.id)})">${isBm ? '★ 북마크 해제' : '☆ 북마크'}</button>
                    <button id="btn-detail-all" class="btn-none">목록 보기</button>
                </div>
                
                <!-- ★ 우측 그룹 -->
                <div class="detail-actions-right">
                    <button class="btn-txt" onclick="downloadTxt(${post.id})">txt다운</button>
                    <button class="btn-edit" onclick="editPostById(${Number(post.id)})">수정</button>
                    <button class="btn-none" onclick="copyPostById(${Number(post.id)})">복제</button>
                    <button class="btn-delete" onclick="deletePost(${post.id})">삭제</button>
                </div>
            </div>
        </div>
    `;
	
    mainContent.innerHTML = html;

    document.getElementById('btn-detail-back').addEventListener('click', () => {
		history.back();
    });
    document.getElementById('btn-detail-all').addEventListener('click', () => {
        document.querySelectorAll('.sub-menu li').forEach(el => el.classList.remove('active'));
        const allMenu = Array.from(document.querySelectorAll('.sub-menu li')).find(li => li.textContent === '모두 보기');
        if (allMenu) allMenu.classList.add('active');
        renderAllPostsList();
    });

    document.querySelectorAll('#detailTabs .detail-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#detailTabs .detail-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTabContent(post, btn.dataset.tab);
        });
    });

    const firstVisibleTab = document.querySelector('#detailTabs .detail-tab-btn')?.dataset.tab || 'profile';
	renderTabContent(post, firstVisibleTab);
}

function renderTabContent(post, tabName) {
    document.getElementById('detailContentArea').innerHTML = renderTabContentFromSchema(post, tabName);
}

function editPostById(id) {
    const p = getPosts().find(x => String(x.id) === String(id));
    if (p) openWriteView(p);
}
function copyPostById(id) {
    const p = getPosts().find(x => String(x.id) === String(id));
    if (p) openWriteView(p, true);
}

// ---- TXT 다운로드 ----
function downloadTxt(postId) {
    const post = getPosts().find(p => String(p.id) === String(postId));
    if (!post) return;

    let content = '';
    TAB_ORDER.forEach(tabKey => {
        const group = FIELD_SCHEMA[tabKey];
        if (!group) return;
        content += `\n========== [${group.label}] ==========\n`;
        group.fields.forEach(field => {
            if (field.type === 'stats') {
                const stats = post.stats || {};
                content += `\n[스테이터스]\n`;
                field.subFields.forEach(sf => {
                    content += `${sf.label}: ${stats[sf.key] || '-'}\n`;
                });
                return;
            }
            const value = getByPath(post, field.key);
            if (field.type === 'tags') {
                content += `${field.label}: ${(value || []).join(', ') || '-'}\n`;
                return;
            }
            let displayValue = value;
            if (displayValue === undefined || displayValue === null || displayValue === '') displayValue = '-';
            if (field.type === 'image' && displayValue !== '-') displayValue = normalizeImageUrl(displayValue);
            content += `${field.label}: ${displayValue}\n`;
        });
    });

    if (post.tags && post.tags.length) content += `\n[전체 태그]\n${post.tags.join(', ')}\n`;
    if (typeof EQUIPMENT_BY_DOJONG !== 'undefined' && EQUIPMENT_BY_DOJONG[post.dojong]) {
        content += `\n[장착 가능 장비]\n${EQUIPMENT_BY_DOJONG[post.dojong].join(', ')}\n`;
    }

    const blob = new Blob([content.trim()], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${post.name || '게시글'}_정보.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

// ---- 삭제 ----
function deletePost(postId) {
    if (!confirm('정말로 이 게시물을 삭제하시겠습니까?')) return;
    savePosts(getPosts().filter(p => String(p.id) !== String(postId)));
    alert('삭제되었습니다.');
    history.back();
}

// ==========================================
// ★ 내번 리스트 렌더링 (정렬 기능 포함)
// ==========================================
function renderInnerList(type, pushHistory = true, page = 1) {
    currentListState = { type: 'inner', value: type };
    previousViewState = null;
    if (pushHistory) history.pushState({ view: 'inner-list', value: type }, '', `#inner-${encodeURIComponent(type)}`);

    const posts = getInnerPosts();
    const isBookmarkFilter = /북마크/.test(String(type));
    let filtered, title;
    if (isBookmarkFilter) {
        const bmIds = _getBookmarks(BOOKMARK_KEYS.inner).map(String);
        filtered = posts.filter(p => bmIds.includes(String(p.id)));
        title = '★ 북마크한 내번';
    } else if (type === '모두 보기') {
        filtered = posts; title = '모든 내번';
    } else {
        filtered = posts.filter(p => (p.innerType || '').trim() === type);
        title = `내번 - ${type}`;
    }

    const sorted = sortInnerPosts(filtered, currentInnerSortType);
    const pageItems = paginate(sorted, page);
    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

    mainContent.innerHTML = `<div class="list-container">
        <div class="list-display">
            <h2 class="h2">${title} (${sorted.length}개) - ${page}/${totalPages}</h2>
            <div style="display:flex;gap:10px;align-items:center;">
                ${getInnerSortDropdownHTML()}
                <button class="btn-bmk" id="btn-inner-bookmark-only">★ 북마크만</button>
                <button class="btn-inner-new">+ 새글쓰기</button>
            </div>
        </div>
        ${buildInnerCardGrid(pageItems)}
        ${buildPaginationHTML(sorted.length, page)}
    </div>`;

    mainContent.querySelector('.btn-inner-new').addEventListener('click', () => openInnerWriteView());
    mainContent.querySelector('#btn-inner-bookmark-only').addEventListener('click', () => renderInnerList('★ 북마크만'));
    attachInnerSortEvent(() => renderInnerList(type, false, 1));
    attachPaginationEvent((p) => renderInnerList(type, false, p));
}

function renderFlashbackList(rangeOrValue, pushHistory = true, page = 1) {
    currentListState = { type: 'flashback', value: rangeOrValue };
    previousViewState = null;
    if (pushHistory) history.pushState({ view: 'list', type: 'flashback', value: rangeOrValue }, '', `#flashback-${encodeURIComponent(rangeOrValue)}`);

    const posts = getFlashbackPosts();
    const isBookmarkFilter = /북마크/.test(String(rangeOrValue));
    let filtered = posts, title = '모든 회상';

    if (isBookmarkFilter) {
        const bmIds = _getBookmarks(BOOKMARK_KEYS.flashback).map(String);
        filtered = posts.filter(p => bmIds.includes(String(p.id)));
        title = '★ 북마크한 회상';
    } else if (rangeOrValue && rangeOrValue !== '모두 보기') {
        /* 기존 범위/지역 로직 유지 */
        const rangeMatch = rangeOrValue.match(/^(\d+)\s*-\s*(\d+)$/);
        if (rangeMatch) {
            const start = parseInt(rangeMatch[1], 10), end = parseInt(rangeMatch[2], 10);
            filtered = posts.filter(p => {
                const n = parseInt(String(p.flashbackNumber || '').trim(), 10);
                return !isNaN(n) && n >= start && n <= end;
            });
            title = `회상 ${start}-${end}`;
        } else {
            const target = String(rangeOrValue).trim();
            filtered = posts.filter(p =>
                (p.flashbackRegion || '').trim() === target
                || (p.flashbackNumber || '').trim() === target);
            title = `회상 - ${target}`;
        }
    }

    const sorted = sortFlashbackPosts(filtered, currentFlashbackSortType);
    const pageItems = paginate(sorted, page);
    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

    mainContent.innerHTML = `<div class="list-container">
        <div class="list-display">
            <h2 class="h2">${title} (${sorted.length}개) - ${page}/${totalPages}</h2>
            <div style="display:flex;gap:10px;align-items:center;">
                ${getFlashbackSortDropdownHTML()}
                <button class="btn-bmk" id="btn-flashback-bookmark-only">★ 북마크만</button>
                <button class="btn-flashback-new">+ 새글쓰기</button>
            </div>
        </div>
        ${buildFlashbackCardGrid(pageItems)}
        ${buildPaginationHTML(sorted.length, page)}
    </div>`;

    mainContent.querySelector('.btn-flashback-new').addEventListener('click', () => openFlashbackWriteView());
    mainContent.querySelector('#btn-flashback-bookmark-only').addEventListener('click', () => renderFlashbackList('★ 북마크만'));
    attachFlashbackSortEvent(() => renderFlashbackList(rangeOrValue, false, 1));
    attachPaginationEvent((p) => renderFlashbackList(rangeOrValue, false, p));
}

// ==========================================
// ★ 회상 지역 리스트 (지역명 정확 매칭)
// ==========================================
function renderFlashbackRegionList(region, pushHistory = true, page = 1) {
    currentListState = { type: 'flashback-region', value: region };
    previousViewState = null;
    if (pushHistory) history.pushState({ view: 'list', type: 'flashback-region', value: region }, '', `#flashback-region-${encodeURIComponent(region)}`);

    const posts = getFlashbackPosts();
    let filtered, title;
    
    if (region === '모두 보기') { filtered = posts; title = '모든 회상'; }
    else { 
        filtered = posts.filter(p => (p.flashbackRegion || '').trim() === region); 
        title = `회상 지역 - ${region}`; 
    }

    // ★ 정렬 적용
    const sorted = sortFlashbackPosts(filtered, currentFlashbackSortType);

    const pageItems = paginate(sorted, page);
    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

    mainContent.innerHTML = `<div class="list-container">
        <div class="list-display">
            <h2 class="h2">${title} (${sorted.length}개) - ${page}/${totalPages}</h2>
            <div style="display:flex;gap:10px;align-items:center;">
                ${getFlashbackSortDropdownHTML()}
                <button class="btn-bmk" id="btn-flashback-bookmark-only">★ 북마크만</button>
                <button class="btn-flashback-new">+ 새글쓰기</button>
            </div>
        </div>
        ${buildFlashbackCardGrid(pageItems)}
        ${buildPaginationHTML(sorted.length, page)}
    </div>`;

    mainContent.querySelector('.btn-flashback-new').addEventListener('click', () => openFlashbackWriteView());
    mainContent.querySelector('#btn-flashback-bookmark-only').addEventListener('click', () => renderFlashbackList('★ 북마크만'));
    attachFlashbackSortEvent(() => renderFlashbackRegionList(region, false, 1));
    attachPaginationEvent((p) => renderFlashbackRegionList(region, false, p));
}
// ==========================================
// ★ 회상 지역맵 리스트 (prefix 매칭: "1맵" → "1-...")
// ==========================================
function renderFlashbackRegion(mapValue, pushHistory = true, page = 1) {
    currentListState = { type: 'flashbackRegion', value: mapValue };
    previousViewState = null;
    if (pushHistory) history.pushState({ view: 'list', type: 'flashbackRegion', value: mapValue }, '', `#flashbackRegion-${encodeURIComponent(mapValue)}`);

    const posts = getFlashbackPosts();
    let filtered = posts;
    let title = '모든 회상';

    if (mapValue && mapValue !== '모두 보기') {
        // ★ "1맵" → prefix "1-"  /  "제한 없음" → prefix "제한"
        let prefix = '';
        const mapMatch = String(mapValue).trim().match(/^(\d+)맵$/);
        if (mapMatch) {
            prefix = mapMatch[1] + '-';
        } else if (String(mapValue).trim() === '제한 없음') {
            prefix = '제한';
        } else {
            // 그 외는 원본 값 그대로 prefix
            prefix = String(mapValue).trim();
        }

        filtered = posts.filter(p => {
            const region = String(p.flashbackRegion || '').trim();
            return region.startsWith(prefix);
        });

        title = `회상 지역 - ${mapValue}`;
    }

    // ★ 정렬 적용
    const sorted = sortFlashbackPosts(filtered, currentFlashbackSortType);

    const pageItems = paginate(sorted, page);
    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

    mainContent.innerHTML = `<div class="list-container">
        <div class="list-display">
            <h2 class="h2">${title} (${sorted.length}개) - ${page}/${totalPages}</h2>
            <div style="display:flex;gap:10px;align-items:center;">
                ${getFlashbackSortDropdownHTML()}
                <button class="btn-bmk" id="btn-flashback-bookmark-only">★ 북마크만</button>
                <button class="btn-flashback-new">+ 새글쓰기</button>
            </div>
        </div>
        ${buildFlashbackCardGrid(pageItems)}
        ${buildPaginationHTML(sorted.length, page)}
    </div>`;

    mainContent.querySelector('.btn-flashback-new').addEventListener('click', () => openFlashbackWriteView());
    mainContent.querySelector('#btn-flashback-bookmark-only').addEventListener('click', () => renderFlashbackList('★ 북마크만'));
    attachFlashbackSortEvent(() => renderFlashbackRegion(mapValue, false, 1));
    attachPaginationEvent((p) => renderFlashbackRegion(mapValue, false, p));
}
// ==========================================
// ★ 스토리 리스트 렌더링 (메뉴에서 필터)
// ==========================================
function renderStoryList(filterValue, pushHistory = true, page = 1) {
    currentListState = { type: 'story', value: filterValue };
    previousViewState = null;
    if (pushHistory) history.pushState({ view: 'list', type: 'story', value: filterValue }, '', `#story-${encodeURIComponent(filterValue)}`);

    const allPosts = (typeof getStoryPosts === 'function') ? getStoryPosts() : [];
    const isBookmarkFilter = /북마크/.test(String(filterValue));
    let filtered = allPosts, title = '모든 스토리';

    if (isBookmarkFilter) {
        const bmIds = _getBookmarks(BOOKMARK_KEYS.story).map(String);
        filtered = allPosts.filter(p => bmIds.includes(String(p.id)));
        title = '★ 북마크한 스토리';
    } else if (filterValue && filterValue !== '모두 보기' && filterValue !== '특명조사·기타 통합') {
        filtered = allPosts.filter(p => (p.mainCategory || '').trim() === String(filterValue).trim());
        title = `스토리 - ${filterValue}`;
    }

    const sorted = sortStoryPosts(filtered, currentStorySortType);
    const pageItems = paginate(sorted, page);
    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

    mainContent.innerHTML = `<div class="list-container">
        <div class="list-display">
            <h2 class="h2">${title} (${sorted.length}개) - ${page}/${totalPages}</h2>
            <div style="display:flex;gap:10px;align-items:center;">
                ${getStorySortDropdownHTML()}
                <button class="btn-bmk" id="btn-story-bookmark-only">★ 북마크만</button>
                <button class="btn-story-new">+ 새글쓰기</button>
            </div>
        </div>
        ${(typeof buildStoryCardGrid === 'function') ? buildStoryCardGrid(pageItems) : '<div class="no-data">스토리 렌더러를 찾을 수 없습니다.</div>'}
        ${buildPaginationHTML(sorted.length, page)}
    </div>`;

    mainContent.querySelector('.btn-story-new').addEventListener('click', () => openStoryWriteView());
    mainContent.querySelector('#btn-story-bookmark-only').addEventListener('click', () => renderStoryList('★ 북마크만'));
    attachStorySortEvent(() => renderStoryList(filterValue, false, 1));
    attachPaginationEvent((p) => renderStoryList(filterValue, false, p));
}

// ==========================================
// ★ 스토리 상세보기
// ==========================================
function renderStoryDetailView(postId, pushHistory = true) {
    const posts = getStoryPosts();
    const post = posts.find(p => String(p.id) === String(postId));
    if (!post) { alert('스토리를 찾을 수 없습니다.'); return; }

    // ★ 이전/다음 계산: 분류순 정렬 (대분류 → 번호 → 제목)
    const allSorted = [...posts].sort((a, b) =>
        String(a.mainCategory || '').localeCompare(String(b.mainCategory || ''), 'ko')
        || String(a.Numbers || '').localeCompare(String(b.Numbers || ''), 'ko')
        || String(a.title || '').localeCompare(String(b.title || ''), 'ko')
    );

    const currentIdx = allSorted.findIndex(p => String(p.id) === String(post.id));
    const prevPost = currentIdx > 0 ? allSorted[currentIdx - 1] : null;
    const nextPost = currentIdx < allSorted.length - 1 ? allSorted[currentIdx + 1] : null;

    const prevBtnHtml = prevPost
        ? `<button class="btn-nav-prev" onclick="renderStoryDetailView(${prevPost.id})">◀ 이전 (${escapeHtml(prevPost.mainCategory)} : ${escapeHtml(prevPost.title || '제목 없음')})</button>`
        : `<button disabled class="btn-nav-disabled">◀ 이전</button>`;

    const nextBtnHtml = nextPost
        ? `<button class="btn-nav-next" onclick="renderStoryDetailView(${nextPost.id})">다음 (${escapeHtml(nextPost.mainCategory)} : ${escapeHtml(nextPost.title || '제목 없음')}) ▶</button>`
        : `<button disabled class="btn-nav-disabled">다음 ▶</button>`;

    if (pushHistory) {
        history.pushState({ view: 'story-detail', postId: post.id }, '', `#story-detail-${post.id}`);
    }

    // 태그 뱃지: 대분류(노랑), 입력 태그(회색)
    const safeTag = (v) => escapeHtml(String(v)).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    let tagsHtml = '';
    if (post.mainCategory) {
        tagsHtml += `<span class="tag tag-yellow" onclick="renderStoryList('${safeTag(post.mainCategory)}')">${escapeHtml(post.mainCategory)}</span>`;
    }
    (post.tags || []).forEach(t => {
        tagsHtml += `<span class="tag tag-gray" onclick="renderStoryTagList('${safeTag(t)}')">${escapeHtml(t)}</span>`;
    });
	
	const isBm = isStoryBookmarked(post.id);

    mainContent.innerHTML = `
        <div class="detail-view">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:15px;flex-wrap:wrap;">
                <button id="btn-story-detail-back" class="back-btn">← 뒤로</button>
                <div style="display:flex;gap:8px;">
                    ${prevBtnHtml}
                    ${nextBtnHtml}
                </div>
            </div>
            <div class="detail-tag-row">
                <span class="label">태그:</span>
                ${tagsHtml || '<span style="color:#aaa;">태그 없음</span>'}
            </div>
            ${renderStoryDetail(post)}
            <div class="detail-actions" id="storyBookmarkWrap">
			  <div class="detail-actions-left">
				<button class="btn-bmk" onclick="toggleStoryBookmark(${Number(post.id)})">${isBm ? '★ 북마크 해제' : '☆ 북마크'}</button>
                <button id="btn-story-detail-all" class="btn-none">목록 보기</button>
			  </div>
			  <div class="detail-actions-right">
                <button class="btn-txt" onclick="downloadStoryTxt(${Number(post.id)})">txt다운</button>
                <button class="btn-edit" onclick="openStoryWriteViewById(${Number(post.id)})">수정</button>
                <button class="btn-none" onclick="copyStoryPostById(${Number(post.id)})">복제</button>
                <button class="btn-delete" onclick="deleteStoryPost(${Number(post.id)})">삭제</button>
			  </div>
            </div>
        </div>
    `;

    document.getElementById('btn-story-detail-back').addEventListener('click', () => history.back());
    document.getElementById('btn-story-detail-all').addEventListener('click', () => renderStoryList('모두 보기'));
}

function openStoryWriteViewById(id) {
    const p = getStoryPosts().find(x => String(x.id) === String(id));
    if (p) openStoryWriteView(p);
}
function copyStoryPostById(id) {
    const p = getStoryPosts().find(x => String(x.id) === String(id));
    if (p) openStoryWriteView(p, true);
}

// ==========================================
// ★ 스토리 도검 번호 필터
// ==========================================
function renderStorySwordList(num) {
    const posts = getStoryPosts().filter(p => (p.swordNumbers || []).some(n => String(n) === String(num)));
    const sorted = sortStoryPosts(posts, currentStorySortType);
    mainContent.innerHTML = `<div class="list-container">
        <div class="tag-search-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <h2>도검 번호: <span style="color:var(--color-delete);">${escapeHtml(num)}</span> (${sorted.length}개)</h2>
            <button class="back-btn" onclick="renderStoryList('모두 보기')">← 뒤로</button>
        </div>
        ${buildStoryCardGrid(sorted)}
    </div>`;
}

// ==========================================
// ★ 스토리 태그 필터
// ==========================================
function renderStoryTagList(tag) {
    const target = tag.trim().toLowerCase();
    const posts = getStoryPosts().filter(p => (p.tags || []).some(t => t.trim().toLowerCase() === target));
    const sorted = sortStoryPosts(posts, currentStorySortType);
    mainContent.innerHTML = `<div class="list-container">
        <div class="tag-search-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <h2>스토리 태그: <span style="color:var(--color-delete);">${escapeHtml(tag)}</span> (${sorted.length}개)</h2>
            <button class="back-btn" onclick="renderStoryList('모두 보기')">← 뒤로</button>
        </div>
        ${buildStoryCardGrid(sorted)}
    </div>`;
}

// ==========================================
// ★ 스토리 TXT 다운로드
// ==========================================
function downloadStoryTxt(postId) {
    const post = getStoryPosts().find(p => String(p.id) === String(postId));
    if (!post) return;
    const nums = (post.swordNumbers || []).map(num => {
        const profile = getPosts().find(p => String(p.number) === String(num));
        return profile ? `${num}. ${profile.name} (${profile.namejp || '-'})` : `${num}.`;
    }).join('\n');
    const content = `
[스토리]
분류: ${post.mainCategory || '-'}
이벤트명: ${post.title || '-'}
최초 발생일: ${post.region || '-'}

[도검 번호]
${nums || '-'}

[태그]
${(post.tags || []).join(', ') || '-'}

[내용]
${post.content || ''}
    `.trim();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `스토리_${post.title || '제목없음'}_정보.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

// ==========================================
// ★ 스토리 삭제
// ==========================================
function deleteStoryPost(postId) {
    if (!confirm('정말로 이 스토리를 삭제하시겠습니까?')) return;
    const posts = getStoryPosts().filter(p => String(p.id) !== String(postId));
    saveStoryPosts(posts);
    alert('삭제되었습니다.');
    renderStoryList('모두 보기');
}
// ==========================================
// ★ 내번 상세보기
// ==========================================
function renderInnerDetailView(postId, pushHistory = true) {
    const posts = getInnerPosts();
    const post = posts.find(p => String(p.id) === String(postId));
    if (!post) { alert('내번을 찾을 수 없습니다.'); return; }

    if (pushHistory) {
        history.pushState({ view: 'inner-detail', postId: post.id }, '', `#inner-detail-${post.id}`);
    }

    // ★ 태그 뱃지 구성 (프로필 방식)
    let tagsHtml = '';
    // 내번타입 → 노란색 태그
    if (post.innerType) {
        tagsHtml += `<span class="tag tag-yellow" onclick="renderInnerList('${post.innerType}')">${post.innerType}</span>`;
    }
    // 입력 태그 → 회색 태그
    (post.tags || []).forEach(t => {
        tagsHtml += `<span class="tag tag-gray" onclick="renderInnerTagList('${t}')">${t}</span>`;
    });

	const isBm = isInnerBookmarked(post.id);
    mainContent.innerHTML = `
        <div class="detail-view">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                <button id="btn-detail-back" class="back-btn">← 뒤로</button>
            </div>
            <div class="detail-tag-row">
                <span class="label">태그:</span>
                ${tagsHtml || '<span style="color:#aaa;">태그 없음</span>'}
            </div>
            ${renderInnerDetail(post)}
            <div class="detail-actions" id="innerBookmarkWrap">
			  <div class="detail-actions-left">
				<button class="btn-bmk" onclick="toggleInnerBookmark(${Number(post.id)})">${isBm ? '★ 북마크 해제' : '☆ 북마크'}</button>
                <button id="btn-inner-detail-back" class="btn-none">목록 보기</button>
			  </div>
			  <div class="detail-actions-right">
                <button class="btn-txt" onclick="downloadInnerTxt(${post.id})">txt다운</button>
                <button class="btn-edit" onclick='openInnerWriteView(${JSON.stringify(post).replace(/'/g, "&#39;")})'>수정</button>
                <button class="btn-none" onclick='copyInnerPost(${JSON.stringify(post).replace(/'/g, "&#39;")})'>복제</button>
                <button class="btn-delete" onclick="deleteInnerPost(${post.id})">삭제</button>
			  </div>
            </div>
        </div>
    `;

    document.getElementById('btn-detail-back').addEventListener('click', () => {
		history.back();
    });
    document.getElementById('btn-inner-detail-back').addEventListener('click', () => {
        renderInnerList('모두 보기');
    });
}

// ==========================================
// ★ 내번 도검 번호 리스트
// ==========================================
function renderInnerSwordList(num) {
    const posts = getInnerPosts();
    const filtered = posts.filter(p => (p.swordNumbers || []).some(n => String(n) === String(num)));
    mainContent.innerHTML = `<div class="list-container">
        <div class="tag-search-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <h2>도검 번호: <span style="color:var(--color-delete);">${num}</span> (${filtered.length}개)</h2>
            <button class="back-btn" onclick="renderInnerList('모두 보기')">← 뒤로</button>
        </div>
        ${buildInnerCardGrid(filtered)}
    </div>`;
}

// ==========================================
// ★ 내번 태그 리스트
// ==========================================
function renderInnerTagList(tag) {
    const posts = getInnerPosts();
    const target = tag.trim().toLowerCase();
    const filtered = posts.filter(post => (post.tags || []).some(t => t.trim().toLowerCase() === target));

    mainContent.innerHTML = `<div class="list-container">
        <div class="tag-search-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <h2>내번 태그: <span style="color:var(--color-delete);">${tag}</span> (${filtered.length}개)</h2>
            <button class="back-btn" onclick="renderInnerList('모두 보기')">← 뒤로</button>
        </div>
        ${buildInnerCardGrid(filtered)}
    </div>`;
}

// ==========================================
// ★ 내번 TXT 다운로드
// ==========================================
function downloadInnerTxt(postId) {
    const post = getInnerPosts().find(p => String(p.id) === String(postId));
    if (!post) return;

    const nums = (post.swordNumbers || []).map(num => {
        const profile = getPosts().find(p => String(p.number) === String(num));
        return profile ? `${num}. ${profile.name} (${profile.namejp || '-'})` : `${num}.`;
    }).join('\n');

    const content = `
[내번]
내번타입: ${post.innerType || '-'}

[도검 번호]
${nums || '-'}

[태그]
${(post.tags || []).join(', ') || '-'}

[상호대사]
${post.mutualLines || ''}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `내번_${post.innerType}_정보.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

// ==========================================
// ★ 내번 삭제
// ==========================================
function deleteInnerPost(postId) {
    if (!confirm('정말로 이 내번을 삭제하시겠습니까?')) return;
    const posts = getInnerPosts().filter(p => String(p.id) !== String(postId));
    saveInnerPosts(posts);
    alert('삭제되었습니다.');
    renderInnerList('모두 보기');
}

// ==========================================
// ★ 회상 상세보기
// ==========================================
function renderFlashbackDetailView(postId, pushHistory = true) {
    const posts = getFlashbackPosts();
    const post = posts.find(p => String(p.id) === String(postId));
    if (!post) { alert('회상을 찾을 수 없습니다.'); return; }

    // ★ 이전/다음 계산: flashbackNumber 오름차순 정렬
    const allSorted = [...posts]
        .filter(p => !isNaN(parseInt(p.flashbackNumber, 10)))
        .sort((a, b) => parseInt(a.flashbackNumber, 10) - parseInt(b.flashbackNumber, 10));

    const currentIdx = allSorted.findIndex(p => String(p.id) === String(post.id));
    const prevPost = currentIdx > 0 ? allSorted[currentIdx - 1] : null;
    const nextPost = currentIdx < allSorted.length - 1 ? allSorted[currentIdx + 1] : null;

    const prevBtnHtml = prevPost
        ? `<button class="btn-nav-prev" onclick="renderFlashbackDetailView(${prevPost.id})">◀ 이전 (${prevPost.flashbackNumber || '?'}. ${prevPost.flashbackTitle})</button>`
        : `<button disabled class="btn-nav-disabled">◀ 이전</button>`;

    const nextBtnHtml = nextPost
        ? `<button class="btn-nav-next" onclick="renderFlashbackDetailView(${nextPost.id})">다음 (${nextPost.flashbackNumber || '?'}. ${nextPost.flashbackTitle}) ▶</button>`
        : `<button disabled class="btn-nav-disabled">다음 ▶</button>`;

    if (pushHistory) {
        history.pushState({ view: 'flashback-detail', postId: post.id }, '', `#flashback-detail-${post.id}`);
    }

// 태그 뱃지
let tagsHtml = '';
    if (post.flashbackRegion) {
        tagsHtml += `<span class="tag tag-yellow" onclick="renderFlashbackRegionList('${post.flashbackRegion}')">${post.flashbackRegion}</span>`;   // ★ 변경
    }
    (post.tags || []).forEach(t => {
        tagsHtml += `<span class="tag tag-gray" onclick="renderFlashbackTagList('${t}')">${t}</span>`;
    });

	const isBm = isFlashbackBookmarked(post.id);
    mainContent.innerHTML = `
        <div class="detail-view">
            <!-- ★ 이전/다음 버튼 영역 추가 -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                <button id="btn-flashback-detail-back" class="back-btn">← 뒤로</button>
                <div style="display: flex; gap: 8px;">
                    ${prevBtnHtml}
                    ${nextBtnHtml}
                </div>
            </div>

            <div class="detail-tag-row">
                <span class="label">태그:</span>
                ${tagsHtml || '<span style="color:#aaa;">태그 없음</span>'}
            </div>
            ${renderFlashbackDetail(post)}
            <div class="detail-actions" id="flashbackBookmarkWrap">
			  <div class="detail-actions-left">
                <button class="btn-bmk" onclick="toggleFlashbackBookmark(${Number(post.id)})">${isBm ? '★ 북마크 해제' : '☆ 북마크'}</button>
                <button id="btn-flashback-detail-all" class="btn-none">목록 보기</button>
			  </div>
			  <div class="detail-actions-right">
                <button class="btn-txt" onclick="downloadFlashbackTxt(${post.id})">txt다운</button>
                <button class="btn-edit" onclick='openFlashbackWriteView(${JSON.stringify(post).replace(/'/g, "&#39;")})'>수정</button>
                <button class="btn-none" onclick='copyFlashbackPost(${JSON.stringify(post).replace(/'/g, "&#39;")})'>복제</button>
                <button class="btn-delete" onclick="deleteFlashbackPost(${post.id})">삭제</button>
			  </div>
            </div>
        </div>
    `;

    document.getElementById('btn-flashback-detail-back').addEventListener('click', () => history.back());
    document.getElementById('btn-flashback-detail-all').addEventListener('click', () => renderFlashbackList('모두 보기'));
}

// ==========================================
// ★ 회상 도검 번호 리스트
// ==========================================
function renderFlashbackSwordList(num) {
    const posts = getFlashbackPosts();
    const filtered = posts.filter(p => (p.swordNumbers || []).some(n => String(n) === String(num)));
    const sorted = sortFlashbackPosts(filtered, currentFlashbackSortType);
    mainContent.innerHTML = `<div class="list-container">
        <div class="tag-search-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <h2>도검 번호: <span style="color:var(--color-delete);">${num}</span> (${filtered.length}개)</h2>
            <button class="back-btn" onclick="renderFlashbackList('모두 보기')">← 뒤로</button>
        </div>
        ${buildFlashbackCardGrid(filtered)}
    </div>`;
}

// ==========================================
// ★ 회상 태그 리스트
// ==========================================
function renderFlashbackTagList(tag) {
    const posts = getFlashbackPosts();
    const target = tag.trim().toLowerCase();
    const filtered = posts.filter(post => (post.tags || []).some(t => t.trim().toLowerCase() === target));
    const sorted = sortFlashbackPosts(filtered, currentFlashbackSortType);

    mainContent.innerHTML = `<div class="list-container">
        <div class="tag-search-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <h2>회상 태그: <span style="color:var(--color-delete);">${tag}</span> (${filtered.length}개)</h2>
            <button class="back-btn" onclick="renderFlashbackList('모두 보기')">← 뒤로</button>
        </div>
        ${buildFlashbackCardGrid(filtered)}
    </div>`;
}

// ==========================================
// ★ 회상 TXT 다운로드
// ==========================================
function downloadFlashbackTxt(postId) {
    const post = getFlashbackPosts().find(p => String(p.id) === String(postId));
    if (!post) return;

    const nums = (post.swordNumbers || []).map(num => {
        const profile = getPosts().find(p => String(p.number) === String(num));
        return profile ? `${num}. ${profile.name} (${profile.namejp || '-'})` : `${num}.`;
    }).join('\n');

    const content = `
[회상]
회상번호: ${post.flashbackNumber || '-'}
회상지역: ${post.flashbackRegion || '-'}

[도검 번호]
${nums || '-'}

[태그]
${(post.tags || []).join(', ') || '-'}

[대사]
${post.flashbackLines || ''}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `회상_${post.flashbackNumber}_정보.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

// ==========================================
// ★ 회상 삭제
// ==========================================
function deleteFlashbackPost(postId) {
    if (!confirm('정말로 이 회상을 삭제하시겠습니까?')) return;
    const posts = getFlashbackPosts().filter(p => String(p.id) !== String(postId));
    saveFlashbackPosts(posts);
    alert('삭제되었습니다.');
    renderFlashbackList('모두 보기');
}



// ---- 브라우저 뒤로가기 (레지스트리 기반) ----
window.addEventListener('popstate', (event) => {
    const s = event.state;
    if (!s) {
        renderAllPostsList(false);
        document.querySelectorAll('.sub-menu li').forEach(el => el.classList.remove('active'));
        return;
    }

    if (s.view === 'convert') return renderConvertView(false);   // ★ 대사변환 도구
    if (s.view === 'textvs') return renderTextvsView(false);   // ★ 문자대조 도구
	
	if (s.view === 'detail') return renderDetailView(s.postId, false);
    if (s.view === 'inner-detail') return renderInnerDetailView(s.postId, false);
    if (s.view === 'story-detail') return renderStoryDetailView(s.postId, false);
    if (s.view === 'inner-list') return renderInnerList(s.value, false);
    if (s.view === 'story-detail') return renderStoryDetailView(s.postId, false);
	if (s.view === 'info-detail') return renderInfoDetailView(s.postId, false);

    if (s.view === 'list') {
        if (s.type === 'flashback-region') return renderFlashbackRegionList(s.value, false);
        if (s.type === 'flashbackRegion') return renderFlashbackRegion(s.value, false);
        if (s.type === 'story') return renderStoryList(s.value, false);
        if (s.type === 'tag') return renderTagPostList(s.value, false);
        if (s.type === 'flashback') return renderFlashbackList(s.value, false);
		if (s.type === 'info') return renderInfoList(s.value, false);
        if (s.type === 'all') return renderAllPostsList(false);

        // MENU_REGISTRY 기반
        const entry = Object.values(MENU_REGISTRY).find(cfg => cfg.historyType === s.type);
        if (entry) {
            const rendererName = (entry.specialSubs && entry.specialSubs[s.value]) || entry.renderer;
            const fn = window[rendererName];
            if (typeof fn === 'function') {
                fn(s.value, false);
                return;
            }
        }
        return renderAllPostsList(false);
    }
});

// ---- 라이트박스 ----
function initLightbox() {
    if (document.getElementById('imageLightbox')) return;
    const lb = document.createElement('div');
    lb.id = 'imageLightbox';
    lb.className = 'image-lightbox';
    lb.innerHTML = `<span class="close-lightbox" onclick="closeLightbox()">×</span><img id="lightboxImg" src="" alt="원본 이미지">`;
    lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
    document.body.appendChild(lb);
}
function openLightbox(url) {
    initLightbox();
    const lb = document.getElementById('imageLightbox');
    document.getElementById('lightboxImg').src = url;
    lb.classList.add('show');
    document.body.style.overflow = 'hidden';
}
function closeLightbox() {
    const lb = document.getElementById('imageLightbox');
    if (lb) { lb.classList.remove('show'); document.getElementById('lightboxImg').src = ''; document.body.style.overflow = ''; }
}

// ---- 키보드 ----
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'Backspace') {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) return;
        if (document.querySelector('.detail-view')) { e.preventDefault(); history.back(); }
    }
});

// ---- 초기화 ----
document.addEventListener('DOMContentLoaded', () => {
    const allMenu = Array.from(document.querySelectorAll('.sub-menu li')).find(li => li.textContent === '모두 보기');
    if (allMenu) allMenu.classList.add('active');
    renderAllPostsList(false);

    // ★ 대사변환 버튼 → 메인 콘텐츠에 iframe 삽입
    const convertBtn = document.getElementById('btn-convert-tool');
    if (convertBtn) {
        convertBtn.addEventListener('click', () => {
            // 사이드바 활성 메뉴 해제 (다른 리스트로 돌아갈 때 혼란 방지)
            document.querySelectorAll('.sub-menu li').forEach(el => el.classList.remove('active'));
            renderConvertView(true);
        });
    }

    // ★ 문자대조 버튼 (추가)
    const textvsBtn = document.getElementById('btn-textvs-tool');
    if (textvsBtn) {
        textvsBtn.addEventListener('click', () => {
            document.querySelectorAll('.sub-menu li').forEach(el => el.classList.remove('active'));
            renderTextvsView(true);
        });
    }
});
// ==========================================
// ★ 도검남사 리스트 공통 렌더러 (북마크 필터 포함)
// ==========================================
function _renderOuterList({ posts, title, historyType, historyValue, filterValue, pushHistory, page = 1 }) {
    currentListState = { type: historyType, value: historyValue };
    previousViewState = null;
    if (pushHistory) {
        history.pushState(
            { view: 'list', type: historyType, value: historyValue },
            '', `#${historyType}-${encodeURIComponent(String(historyValue))}`
        );
    }

    const isBookmarkFilter = /북마크/.test(String(filterValue || ''));
    let filtered = posts;
    let realTitle = title;

    if (isBookmarkFilter) {
        const bmIds = _getBookmarks(BOOKMARK_KEYS.outer).map(String);
        filtered = posts.filter(p => bmIds.includes(String(p.id)));
        realTitle = '★ 북마크한 도검남사';
    }

    const sorted = sortPosts(filtered, currentSortType);
    const pageItems = paginate(sorted, page);
    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

    mainContent.innerHTML = `<div class="list-container">
        <div class="list-display">
            <h2 class="h2">${realTitle} (${sorted.length}개) - ${page}/${totalPages}</h2>
            <div style="display:flex;gap:10px;align-items:center;">
                ${getSortDropdownHTML()}
                <button class="btn-bmk" id="btn-outer-bookmark-only">★ 북마크만</button>
                <button class="btn-new-post-inline">+ 새글쓰기</button>
            </div>
        </div>
        ${buildCardGrid(pageItems)}
        ${buildPaginationHTML(sorted.length, page)}
    </div>`;

    mainContent.querySelector('.btn-new-post-inline')
        .addEventListener('click', () => openWriteView(null, false, '도검남사'));

    mainContent.querySelector('#btn-outer-bookmark-only')
        .addEventListener('click', () => {
            _renderOuterList({
                posts: getPosts(),
                title: '모든 게시물 목록',
                historyType: 'outer-bookmark', historyValue: '★ 북마크만',
                filterValue: '★ 북마크만',
                pushHistory: true, page: 1
            });
        });

    attachSortEvent(() => _renderOuterList({
        posts, title, historyType, historyValue, filterValue, pushHistory: false, page: 1
    }));
    attachPaginationEvent((p) => _renderOuterList({
        posts, title, historyType, historyValue, filterValue, pushHistory: false, page: p
    }));
}
// ==========================================
// ★ 게임 정보 리스트
// ==========================================
function renderInfoList(filterValue = '모두 보기', pushHistory = true, page = 1) {
    currentListState = { type: 'info', value: filterValue };
    previousViewState = null;

    const isBookmarkFilter = /북마크/.test(String(filterValue || ''));

    if (pushHistory) history.pushState({ view: 'list', type: 'info', value: filterValue }, '', `#info-${encodeURIComponent(filterValue)}`);

    const allPosts = (typeof getInfoPosts === 'function') ? getInfoPosts() : [];
    let filtered = allPosts;
    let title = '모든 게임 정보';

    if (isBookmarkFilter) {
        const bmIds = _getBookmarks(BOOKMARK_KEYS.info).map(String);
        filtered = allPosts.filter(p => bmIds.includes(String(p.id)));
        title = '★ 북마크한 게임 정보';
    } else if (filterValue && filterValue !== '모두 보기') {
        filtered = allPosts.filter(p => (p.mainCategory || '').trim() === String(filterValue).trim());
        title = `게임 정보 - ${filterValue}`;
    }

    // ★ 수정: 정렬 헬퍼 사용
    const sorted = sortInfoPosts(filtered, currentInfoSortType);
    const pageItems = paginate(sorted, page);
    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

    mainContent.innerHTML = `<div class="list-container">
        <div class="list-display">
            <h2 class="h2">${title} (${sorted.length}개) - ${page}/${totalPages}</h2>
            <div style="display:flex;gap:10px;align-items:center;">
                ${getInfoSortDropdownHTML()} <!-- ★ 추가 -->
                <button class="btn-bmk" id="btn-info-bookmark-only">★ 북마크만</button>
                <button class="btn-story-new" id="btn-info-new">+ 새글쓰기</button>
            </div>
        </div>
        ${(typeof buildInfoCardGrid === 'function') ? buildInfoCardGrid(pageItems) : '<div class="no-data">렌더러를 찾을 수 없습니다.</div>'}
        ${buildPaginationHTML(sorted.length, page)}
    </div>`;

    document.getElementById('btn-info-new').addEventListener('click', () => openInfoWriteView());
    document.getElementById('btn-info-bookmark-only').addEventListener('click', () => {
        renderInfoList('★ 북마크만');
    });
    attachInfoSortEvent(() => renderInfoList(filterValue, false, 1)); // ★ 추가
    attachPaginationEvent((p) => renderInfoList(filterValue, false, p));
}

// ==========================================
// ★ 게임 정보 상세보기
// ==========================================
function renderInfoDetailView(postId, pushHistory = true) {
    const posts = getInfoPosts();
    const post = posts.find(p => String(p.id) === String(postId));
    if (!post) { alert('게임 정보를 찾을 수 없습니다.'); return; }

    const allSorted = [...posts].sort((a, b) =>
        new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
    );
    const idx = allSorted.findIndex(p => String(p.id) === String(post.id));
    const prevPost = idx > 0 ? allSorted[idx - 1] : null;
    const nextPost = idx < allSorted.length - 1 ? allSorted[idx + 1] : null;

    const prevBtnHtml = prevPost
        ? `<button class="btn-nav-prev" onclick="renderInfoDetailView(${prevPost.id})">◀ 이전 (${escapeHtml(prevPost.title || '제목 없음')})</button>`
        : `<button disabled class="btn-nav-disabled">◀ 이전</button>`;
    const nextBtnHtml = nextPost
        ? `<button class="btn-nav-next" onclick="renderInfoDetailView(${nextPost.id})">다음 (${escapeHtml(nextPost.title || '제목 없음')}) ▶</button>`
        : `<button disabled class="btn-nav-disabled">다음 ▶</button>`;

    if (pushHistory) {
        history.pushState({ view: 'info-detail', postId: post.id }, '', `#info-detail-${post.id}`);
    }

    // 태그 뱃지: 분류(노랑) + 태그(회색)
    const safeTag = (v) => escapeHtml(String(v)).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    let tagsHtml = '';
	const isBm = isInfoBookmarked(post.id);
    if (post.mainCategory) {
        tagsHtml += `<span class="tag tag-yellow" onclick="renderInfoList('${safeTag(post.mainCategory)}')">${escapeHtml(post.mainCategory)}</span>`;
    }
    (post.tags || []).forEach(t => {
        tagsHtml += `<span class="tag tag-gray" onclick="renderInfoTagList('${safeTag(t)}')">${escapeHtml(t)}</span>`;
    });

    mainContent.innerHTML = `
        <div class="detail-view">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:15px;flex-wrap:wrap;">
                <button id="btn-info-detail-back" class="back-btn">← 뒤로</button>
                <div style="display:flex;gap:8px;">${prevBtnHtml}${nextBtnHtml}</div>
            </div>
            <div class="detail-tag-row">
                <span class="label">태그:</span>
                ${tagsHtml || '<span style="color:#aaa;">태그 없음</span>'}
            </div>
            ${renderInfoDetail(post)}
            <div class="detail-actions" id="infoBookmarkWrap">
			  <div class="detail-actions-left">
				<button class="btn-bmk" onclick="toggleInfoBookmark(${Number(post.id)})">${isBm ? '★ 북마크 해제' : '☆ 북마크'}</button>
                <button id="btn-info-detail-all" class="btn-none">목록 보기</button>
			  </div>
			  <div class="detail-actions-right">
                <button class="btn-none" onclick="copyInfoPostById(${Number(post.id)})">복제</button>
                <button class="btn-edit" onclick="openInfoWriteViewById(${Number(post.id)})">수정</button>
                <button class="btn-delete" onclick="deleteInfoPost(${Number(post.id)})">삭제</button>
			  </div>
            </div>
        </div>
    `;

    document.getElementById('btn-info-detail-back').addEventListener('click', () => history.back());
    document.getElementById('btn-info-detail-all').addEventListener('click', () => renderInfoList('모두 보기'));
}

function openInfoWriteViewById(id) {
    const p = getInfoPosts().find(x => String(x.id) === String(id));
    if (p) openInfoWriteView(p);
}
function copyInfoPostById(id) {
    const p = getInfoPosts().find(x => String(x.id) === String(id));
    if (p) openInfoWriteView(p, true);
}

function renderInfoTagList(tag) {
    const target = tag.trim().toLowerCase();
    const posts = getInfoPosts().filter(p => (p.tags || []).some(t => t.trim().toLowerCase() === target));
    const sorted = [...posts].sort((a, b) =>
        new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
    );
    mainContent.innerHTML = `<div class="list-container">
        <div class="tag-search-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <h2>게임 정보 태그: <span style="color:var(--color-delete);">${escapeHtml(tag)}</span> (${sorted.length}개)</h2>
            <button class="back-btn" onclick="renderInfoList('모두 보기')">← 뒤로</button>
        </div>
        ${buildInfoCardGrid(sorted)}
    </div>`;
}

function deleteInfoPost(postId) {
    if (!confirm('정말로 이 게임 정보를 삭제하시겠습니까?')) return;
    const posts = getInfoPosts().filter(p => String(p.id) !== String(postId));
    saveInfoPosts(posts);
    // 북마크에서도 제거
    saveInfoBookmarks(getInfoBookmarks().filter(id => String(id) !== String(postId)));
    alert('삭제되었습니다.');
    renderInfoList('모두 보기');
}

// ==========================================
// ★ 대사변환 도구 뷰 (메인 콘텐츠 내 iframe)
// ==========================================
function renderConvertView(pushHistory = true) {
    currentListState = { type: 'convert', value: '' };
    previousViewState = null;

    if (pushHistory) {
        history.pushState({ view: 'convert' }, '', '#convert');
    }

    mainContent.innerHTML = `
        <div class="list-container" style="height: calc(100vh - 120px);">
            <div class="list-display">
                <h2 class="h2">대사변환</h2>
                <button class="back-btn" id="btn-convert-back">← 뒤로</button>
            </div>
            <iframe
                src="t_convert.html"
                style="width:100%; height:calc(100% - 60px); border:0px;"
                title="대사변환 도구">
            </iframe>
        </div>
    `;

    document.getElementById('btn-convert-back').addEventListener('click', () => history.back());
}
// ==========================================
// ★ 문자대조 도구 뷰 (메인 콘텐츠 내 iframe)
// ==========================================
function renderTextvsView(pushHistory = true) {
    currentListState = { type: 'textvs', value: '' };
    previousViewState = null;

    if (pushHistory) {
        history.pushState({ view: 'textvs' }, '', '#textvs');
    }

    mainContent.innerHTML = `
        <div class="list-container" style="height: calc(100vh - 120px);">
            <div class="list-display">
                <h2 class="h2">문자대조</h2>
                <button class="back-btn" id="btn-textvs-back">← 뒤로</button>
            </div>
            <iframe
                src="t_textvs.html"
                style="width:100%; height:calc(100% - 60px); border:0px;"
                title="문자대조 도구">
            </iframe>
        </div>
    `;

    document.getElementById('btn-textvs-back').addEventListener('click', () => history.back());
}