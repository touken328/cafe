// ==========================================
// renderers.js : 폼/상세/카드 렌더링 (레이아웃 변경 시)
// ==========================================
// ---- 중첩 경로 헬퍼 ----
function getByPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setByPath(obj, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => (o[k] = o[k] || {}, o[k]), obj);
    target[last] = value;
}

// ---- 필드 1개 입력 HTML ----
function renderFieldInput(field, value) {
    const req = field.required ? '<span class="required">*</span>' : '';
    const ph = field.placeholder ? `placeholder="${field.placeholder}"` : '';
    const v = value ?? '';

if (field.type === 'stats') {
    const subs = field.subFields.map(sf => {
        let rawVal = value?.[sf.key];
        if (rawVal === undefined || rawVal === null) rawVal = '';
        else if (typeof rawVal !== 'string' && typeof rawVal !== 'number') rawVal = '';
        const safeVal = String(rawVal);
        
        return `
            <div class="status-item">
                <label>${sf.label}</label>
                <input type="text" id="stat_${sf.key}" class="form-control" value="${safeVal}">
            </div>
        `;
    }).join('');
    return `<div class="form-group"><label>${field.label}</label><div class="status-grid">${subs}</div></div>`;
}

    const inputId = `input_${field.key.replace(/\./g, '_')}`;

    switch (field.type) {
        case 'textarea':
            return `<div class="form-group"><label>${field.label}${req}</label>
                <textarea id="${inputId}" class="form-control" rows="${field.rows || 4}" ${ph}>${v}</textarea></div>`;
        case 'select': {
    // ★ buttonGroup: true 이면 버튼 그룹으로 렌더링
    if (field.buttonGroup) {
        const defaultVal = (v === undefined || v === null || v === '') 
            ? field.options[0] 
            : v;
        const btns = field.options.map(o => {
            const isActive = o === defaultVal;
            return `<button type="button" 
                        class="radio-btn ${isActive ? 'active' : ''}" 
                        data-value="${o}" 
                        onclick="selectRadioBtn(this, '${inputId}', '${o}')"
                        style="padding: 8px 20px; border: 1px solid ${isActive ? '#6b9bd2' : '#ccc'}; 
                               background: ${isActive ? '#6b9bd2' : '#fff'}; 
                               color: ${isActive ? '#fff' : '#333'}; 
                               border-radius: 4px; cursor: pointer; font-weight: ${isActive ? 'bold' : 'normal'};">
                        ${o}
                    </button>`;
        }).join(' ');
        return `<div class="form-group"><label>${field.label}${req}</label>
            <div style="display: flex; gap: 8px; flex: 1;">
                <input type="hidden" id="${inputId}" value="${defaultVal}">
                ${btns}
            </div></div>`;
    }

    // 기존 select 방식
    const defaultVal = (v === undefined || v === null || v === '') 
        ? field.options[0] 
        : v;
    const opts = field.options.map(o => 
        `<option value="${o}" ${o === defaultVal ? 'selected' : ''}>${o}</option>`
    ).join('');
    return `<div class="form-group"><label>${field.label}${req}</label>
        <select id="${inputId}" class="form-control" ${field.required ? 'required' : ''}>
            ${opts}
        </select></div>`;
}
        case 'number':
            return `<div class="form-group"><label>${field.label}${req}</label>
                <input type="number" id="${inputId}" class="form-control" value="${v}" ${ph}></div>`;
        default:
            return `<div class="form-group"><label>${field.label}${req}</label>
                <input type="text" id="${inputId}" class="form-control" value="${v}" ${ph}></div>`;
    }
}

// ---- 폼 전체 HTML (모든 탭) ----
function renderWriteFormHTML(post = null, isCopy = false) {
    // ★ FIELD_SCHEMA에 실제 그룹이 있는 탭만 사용 (네비/섹션 불일치 방지)
    const visibleTabKeys = TAB_ORDER.filter(k => !!FIELD_SCHEMA[k]);

    // ★ 상단 카테고리 바로가기 탭 (스키마에 있는 탭만 자동 생성)
    const navHtml = `
        <div class="write-category-nav" id="writeCategoryNav">
            ${visibleTabKeys.map((tabKey, idx) => {
                const group = FIELD_SCHEMA[tabKey];
                return `<button type="button" class="write-category-btn ${idx === 0 ? 'active' : ''}"
                                data-target="write-section-${tabKey}">${group.label}</button>`;
            }).join('')}
        </div>
    `;

    // ★ 각 탭 섹션에 id 부여
    const sectionsHtml = visibleTabKeys.map(tabKey => {
        const group = FIELD_SCHEMA[tabKey];
        const fields = group.fields.map(f => {
            const value = (isCopy && !f.copy) ? '' : getByPath(post || {}, f.key);
            return renderFieldInput(f, value);
        }).join('');
        return `
            <div class="write-section" id="write-section-${tabKey}">
                <h3 class="h3">[${group.label}]</h3>
                ${fields}
            </div>`;
    }).join('');

    return navHtml + sectionsHtml;
}

// ---- 폼 입력값 수집 ----
function collectFormData() {
    const data = {};
    TAB_ORDER.forEach(tabKey => {
        const group = FIELD_SCHEMA[tabKey];
        if (!group) return;   // ★ 스키마 없는 탭 skip ('inner' 등)

        group.fields.forEach(field => {
            const inputId = `input_${field.key.replace(/\./g, '_')}`;
            if (field.type === 'stats') {
                const stats = {};
                field.subFields.forEach(sf => {
                    stats[sf.key] = document.getElementById(`stat_${sf.key}`)?.value || '';
                });
                data.stats = stats;
            } else if (field.type === 'tags') {
                const raw = document.getElementById(inputId)?.value || '';
                data.tags = raw.split(',').map(t => t.trim()).filter(Boolean);
            } else if (field.type === 'textarea') {
                const raw = document.getElementById(inputId)?.value || '';
                setByPath(data, field.key, normalizeImageUrlsInText(raw));
            } else if (field.type === 'image') {
                const el = document.getElementById(inputId);
                setByPath(data, field.key, normalizeImageUrl(el?.value || ''));
            } else {
                const el = document.getElementById(inputId);
                const raw = el?.value || '';
                setByPath(data, field.key, normalizeImageUrlsInText(raw.trim ? raw.trim() : raw));
            }
        });
    });
    return data;
}

// ---- 복사 데이터 채우기 (copy:true 인 필드만) ----
function applyCopyData(post) {
    TAB_ORDER.forEach(tabKey => {
        const group = FIELD_SCHEMA[tabKey];
        if (!group) return;   // ★ 스키마 없는 탭 skip ('inner' 등)

        group.fields.forEach(field => {
            if (!field.copy) return;
            const inputId = `input_${field.key.replace(/\./g, '_')}`;
            const el = document.getElementById(inputId);
            if (!el) return;
            if (field.type === 'tags') {
                const extras = (post.tags || []).filter(t => t !== post.dojong && t !== post.dopa);
                el.value = extras.join(', ');
            } else {
                el.value = getByPath(post, field.key) ?? '';
            }
        });
    });
}

// ---- 상세보기 탭 네비게이션 HTML ----
function renderTabsNavHTML(post) {
    const tabLabels = {
        profile: '프로필',
        illust: '일러스트',
        lines: '대사',
        flashback: '회상',
        inner: '내번',
        etc: '수행편지',
        story: '이벤트 스토리',
    };

    // ★ 탭에 값이 하나라도 있는지 검사
    const hasTabContent = (tabKey) => {
        // profile은 항상 표시
        if (tabKey === 'profile') return true;

        // ★★★ 커스텀 렌더러 탭: 연관 데이터 존재 여부로 판정 ★★★
        const myNum = String(post?.number || '').trim();

        if (tabKey === 'inner') {
            if (!myNum) return false;
            const list = (typeof getInnerPosts === 'function') ? getInnerPosts() : [];
            return list.some(ip =>
                (ip.swordNumbers || []).some(n => String(n).trim() === myNum)
            );
        }

        if (tabKey === 'flashback') {
            if (!myNum) return false;
            const list = (typeof getFlashbackPosts === 'function') ? getFlashbackPosts() : [];
            return list.some(fp =>
                (fp.swordNumbers || []).some(n => String(n).trim() === myNum)
            );
        }

        if (tabKey === 'story') {
            if (!myNum) return false;
            const list = (typeof getStoryPosts === 'function') ? getStoryPosts() : [];
            return list.some(sp =>
                (sp.swordNumbers || []).some(n => String(n).trim() === myNum)
            );
        }

        if (tabKey === 'illust') {
            const imgs = post?.images || {};
            const hasImg = Object.values(imgs).some(u => u && String(u).trim() !== '');
            const hasMemo = post?.illustMemo && String(post.illustMemo).trim() !== '';
            return hasImg || hasMemo;
        }

        // ★ 스키마 기반 탭 (lines, etc 등)
        const group = FIELD_SCHEMA[tabKey];
        if (!group) return false;

        return group.fields.some(field => {
            if (field.type === 'stats') {
                const stats = post?.stats || {};
                return field.subFields.some(sf => {
                    const v = stats[sf.key];
                    return v !== undefined && v !== null && String(v).trim() !== '';
                });
            }
            const value = getByPath(post || {}, field.key);
            if (value === undefined || value === null) return false;
            if (Array.isArray(value)) return value.length > 0;
            return String(value).trim() !== '';
        });
    };

    // ★ 첫 번째로 표시되는 탭이 active
    const visibleTabs = TAB_ORDER.filter(k => hasTabContent(k));
    const firstVisible = visibleTabs[0];

    return visibleTabs.map((k) => {
        const label = FIELD_SCHEMA[k]?.label || tabLabels[k] || k;
        const isActive = k === firstVisible;
        return `<button class="detail-tab-btn ${isActive ? 'active' : ''}" data-tab="${k}">${label}</button>`;
    }).join('');
}

// ---- 상세보기 탭 콘텐츠 (스키마 기반) ----
function renderTabContentFromSchema(post, tabKey) {
    // ★ TAB_RENDERERS에 등록된 특수 렌더러 우선
    if (typeof TAB_RENDERERS !== 'undefined') {
        const customRendererName = TAB_RENDERERS[tabKey];
        if (customRendererName) {
            const fn = window[customRendererName];
            if (typeof fn === 'function') {
                try {
                    return fn(post);
                } catch (e) {
                    console.error(`[renderTabContentFromSchema] '${customRendererName}' 실행 오류:`, e);
                    return `<div class="no-data">렌더링 오류: ${e.message}</div>`;
                }
            }
        }
    }

    // 스키마 기반 자동 렌더링
    const group = FIELD_SCHEMA[tabKey];
    if (!group) return '<div>스키마 없음</div>';

return group.fields
    .filter(field => {
        const value = getByPath(post, field.key);
        return value !== undefined && value !== null && String(value).trim() !== '';
    })
    .map(field => {
        const value = getByPath(post, field.key);
        const content = field.markdown ? renderMarkdown(value) : value;
        return `<div class="detail-section">
            <div class="detail-section-title">${field.label}</div>
            <div class="detail-section-content">${content}</div>
        </div>`;
    }).join('');
}

// ---- 프로필 탭 (스키마 기반 자동 렌더링) ----
function renderProfileTab(post) {
    const fields = FIELD_SCHEMA.profile.fields;

    // ★ 왼쪽 이미지
    const imageSrc = normalizeImageUrl(post.image);
const imageHtml = imageSrc
    ? `<img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(post.name)}" onerror="this.outerHTML='<div style=\\'color:#888;\\'>이미지 로드 실패</div>'">`
    : `<div style="color:#888;">이미지 없음</div>`;

    // ★ 상단 정보 그리드 (render: 'skip' 제외, row 지정 없는 것만)
    const topFields = fields.filter(f =>
        f.render !== 'skip' &&
        !f.row &&
        f.type !== 'stats' &&
        f.type !== 'tags' &&
		f.key !== 'slot'
    );
    const CLICKABLE_FIELDS = ['art'];
const infoGridHtml = topFields.map(f => {
    const raw = getByPath(post, f.key);
    const display = (typeof f.formatter === 'function')
        ? f.formatter(raw, post)
        : (raw === undefined || raw === null || raw === '' ? '-' : raw);
    
    // ★ art만 클릭 가능 (safe escape)
    if (CLICKABLE_FIELDS.includes(f.key) && raw && String(raw).trim() !== '' && String(raw).trim() !== '-') {
        const safeRaw = String(raw).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return `<div class="label">${escapeHtml(f.label)}</div>
                <div class="value"><span class="tag tag-gray" style="cursor:pointer;" 
                     onclick="renderTagPostList('${safeRaw}')">${escapeHtml(display)}</span></div>`;
    }
    return `<div class="label">${escapeHtml(f.label)}</div><div class="value">${escapeHtml(display)}</div>`;
}).join('');

// ★ 스테이터스 표 (stats 필드)
const statsField = fields.find(f => f.type === 'stats');
const stats = post.stats || {};
const statVal = (v) => (v !== undefined && v !== '' && v !== null) ? v : '-';
let statsHtml = '';

// ★ subFields 폴백: 스키마에 없으면 하드코딩 기본값 사용
const DEFAULT_STAT_FIELDS = [
    { key: 'life', label: '생존' }, { key: 'strike', label: '타격' },
    { key: 'command', label: '통솔' }, { key: 'mobility', label: '기동' },
    { key: 'charge', label: '충력' }, { key: 'critical', label: '필살' },
    { key: 'scout', label: '정찰' }, { key: 'hide', label: '은폐' },
];

const subFields = (statsField && Array.isArray(statsField.subFields) && statsField.subFields.length > 0)
    ? statsField.subFields
    : DEFAULT_STAT_FIELDS;

const statLabel = (statsField && statsField.label) ? statsField.label : '스테이터스';

const row1Headers = subFields.slice(0, 4).map(x => `<th>${escapeHtml(x.label)}</th>`).join('');
const row1Values  = subFields.slice(0, 4).map(x => `<td>${statVal(stats[x.key])}</td>`).join('');
const row2Headers = subFields.slice(4, 8).map(x => `<th>${escapeHtml(x.label)}</th>`).join('');
const row2Values  = subFields.slice(4, 8).map(x => `<td>${statVal(stats[x.key])}</td>`).join('');

statsHtml = `
    <span class="status-title">${statLabel} (최대치)</span>
    <table class="status-table">
        <tr>${row1Headers}</tr>
        <tr>${row1Values}</tr>
        <tr>${row2Headers}</tr>
        <tr>${row2Values}</tr>
    </table>
`;

    // ★ 하단 row (art, act 등)
    const footerFields = fields.filter(f => f.row === 'footer');
    const footerHtml = footerFields.map(f => {
    const raw = getByPath(post, f.key);
    const display = (typeof f.formatter === 'function') ? f.formatter(raw, post) : (raw || '-');
    return `<div class="label">${escapeHtml(f.label)}</div><div class="value">${escapeHtml(display)}</div>`;
}).join('');

// ★ 개별 섹션 (intro, memo 등) — 값이 비어있으면 블록 자체를 생략
const sectionFields = fields.filter(f => f.row === 'section');
const sectionsHtml = sectionFields
    .filter(f => {
        const raw = getByPath(post, f.key);
        return raw !== undefined && raw !== null && String(raw).trim() !== '';
    })
    .map(f => {
        const raw = getByPath(post, f.key);
        const content = f.markdown ? renderMarkdown(raw) : raw;
        return `<div class="detail-section">
<div class="detail-section-title">${escapeHtml(f.label)}</div>
<div class="detail-section-content">${content}</div>
</div>`;
    }).join('');

    // ★ 도종 기반 자동 필드 (범위, 장비) — 스키마에 없지만 유지
    const slotHtml = (post.slot && String(post.slot).trim() !== '' && String(post.slot).trim() !== '-')
    ? `<span class="tag tag-null" style="cursor:pointer;" 
         onclick="renderTagPostList('${String(post.slot).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')">${escapeHtml(post.slot)}</span>`
    : '-';

const rangeExtraHtml = `
    <div class="status-extra">
        <div class="label">범위</div><div class="value">${escapeHtml((RANGE_BY_DOJONG[post.dojong] || []).join(', ') || '-')}</div>
        <div class="label">도장슬롯</div><div class="value">${slotHtml}</div>
    </div>
    <div class="status-extra-full">
        <div class="label">장착 가능 장비</div><div class="value">${escapeHtml((EQUIPMENT_BY_DOJONG[post.dojong] || []).join(', ') || '-')}</div>
    </div>
`;

    return `
        <div class="detail-content-box">
            <div class="detail-image-area">${imageHtml}</div>
            <div class="detail-info-area">
                <div class="detail-info-top">${infoGridHtml}</div>
                <div class="detail-status-area">
                    ${statsHtml}
                    ${rangeExtraHtml}
                </div>
            </div>
        </div>
        ${sectionsHtml}
        ${footerHtml ? `<div class="status-extra">${footerHtml}</div>` : ''}
    `;
}

// ---- 일러스트 탭 (그리드 특수) ----
function renderIllustTab(post) {
    const imgs = post.images || {};
    const imgList = [
        { key: 'normal', label: '통상' }, { key: 'battle', label: '전투' },
        { key: 'damaged', label: '중상' }, { key: 'kill', label: '진검필살' },
        { key: 'sit', label: '궤좌' }, { key: 'inner', label: '내번' },
        { key: 'light', label: '경장' }, { key: 'celeb', label: '축장' },
        { key: 'etc', label: '산책' }
    ];
    let html = `<div class="img-grid">`;
    imgList.forEach(item => {
        const url = normalizeImageUrl(imgs[item.key]);
        if (url) {
            const safeUrl = escapeHtml(url).replace(/'/g, "\\'");
            html += `
                <div class="img-frame"><div class="illust-card">
                    <div class="item-label">${escapeHtml(item.label)}</div>
                    <img src="${escapeHtml(url)}" style="width:100%;height:auto;display:block;" 
                         onclick="openLightbox('${safeUrl}')"
                         onerror="this.outerHTML='<div style=\\'padding:20px;text-align:center;color:#888;\\'>이미지 로드 실패</div>'">
                </div></div>`;
        }
    });
    html += `</div>`;
    const hasImg = imgList.some(i => normalizeImageUrl(imgs[i.key]));
    return (hasImg ? html : `<div class="no-data">등록된 일러스트가 없습니다.</div>`) + `
		<div class="img-frame">
            <div class="item-label">그밖의 공식 일러스트</div>
            <div class="illust-memo-content" style="padding: 10px; text-align: center;">${renderMarkdown(post.illustMemo)}</div>
        </div>`;
}

// ---- 프로필의 [내번] 탭: 같은 번호의 내번 리스트 ----
function renderProfileInnerTab(post) {
    const myNum = String(post.number || '').trim();
    if (!myNum) {
        return `<div class="no-data">이 게시물에 번호가 없어 내번을 조회할 수 없습니다.</div>`;
    }

    // ★ 같은 번호가 swordNumbers에 포함된 내번 글 필터
    const innerPosts = (typeof getInnerPosts === 'function' ? getInnerPosts() : [])
        .filter(ip => (ip.swordNumbers || []).some(n => String(n).trim() === myNum));

    if (innerPosts.length === 0) {
        return `<div class="no-data">이 도검남사(번호 ${myNum})가 포함된 내번 글이 없습니다.</div>`;
    }

    // ★ 내번 카드 그리드 (buildInnerCardGrid 재사용)
    const cardsHtml = (typeof buildInnerCardGrid === 'function')
        ? buildInnerCardGrid(innerPosts)
        : `<div class="no-data">내번 렌더러를 찾을 수 없습니다.</div>`;

    return `
        <div class="detail-section">
                ${cardsHtml}
        </div>
    `;
}

// ---- 프로필의 [회상] 탭: 같은 번호의 회상 리스트 ----
function renderProfileFlashbackTab(post) {
    const myNum = String(post.number || '').trim();
    if (!myNum) {
        return `<div class="no-data">이 게시물에 번호가 없어 회상을 조회할 수 없습니다.</div>`;
    }

    // ★ 같은 번호가 swordNumbers에 포함된 회상 글 필터
    const flashbackPosts = (typeof getFlashbackPosts === 'function' ? getFlashbackPosts() : [])
        .filter(fp => (fp.swordNumbers || []).some(n => String(n).trim() === myNum));

    if (flashbackPosts.length === 0) {
        return `<div class="no-data">이 도검남사(번호 ${myNum})가 포함된 회상 글이 없습니다.</div>`;
    }

    // ★ 회상 카드 그리드 (buildFlashbackCardGrid 재사용)
    const cardsHtml = (typeof buildFlashbackCardGrid === 'function')
        ? buildFlashbackCardGrid(flashbackPosts)
        : `<div class="no-data">회상 렌더러를 찾을 수 없습니다.</div>`;

    return `
        <div class="detail-section">
                ${cardsHtml}
        </div>
    `;
}
// ---- 프로필의 [스토리] 탭: 같은 번호의 스토리 리스트 ----
function renderProfileStoryTab(post) {
    const myNum = String(post.number || '').trim();
    if (!myNum) {
        return `<div class="no-data">이 게시물에 번호가 없어 스토리를 조회할 수 없습니다.</div>`;
    }

    // ★ 같은 번호가 swordNumbers에 포함된 스토리 글 필터
    const storyPosts = (typeof getStoryPosts === 'function' ? getStoryPosts() : [])
        .filter(sp => (sp.swordNumbers || []).some(n => String(n).trim() === myNum));

    if (storyPosts.length === 0) {
        return `<div class="no-data">이 도검남사(번호 ${myNum})가 포함된 이벤트 스토리가 없습니다.</div>`;
    }

    // ★ 스토리 카드 그리드 (buildStoryCardGrid 재사용)
    const cardsHtml = (typeof buildStoryCardGrid === 'function')
        ? buildStoryCardGrid(storyPosts)
        : `<div class="no-data">스토리 렌더러를 찾을 수 없습니다.</div>`;

    return `
        <div class="detail-section">
                ${cardsHtml}
        </div>
    `;
}
// ---- 카드 그리드 (리스트용) ----
function buildCardGrid(posts) {
    if (posts.length === 0) return `<div class="no-data">등록된 게시물이 없습니다.</div>`;
    let html = `<div class="card-grid">`;
    posts.forEach(post => {
        const imgUrl = normalizeImageUrl(post.image);
        const imageHtml = imgUrl
            ? `<img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(post.name)}" class="card-image" loading="lazy" onerror="this.outerHTML='<div class=\\'card-image\\'>이미지 로드 실패</div>'">`
            : `<div class="card-image">이미지 없음</div>`;
        const star = isOuterBookmarked(post.id) ? '⭐' : '';
        html += `<div class="card" onclick="renderDetailView(${Number(post.id)})">
            ${imageHtml}
            <div class="card-body">
                <div class="card-title">${escapeHtml(post.number || '?')} | ${escapeHtml(post.name || '이름 없음')} ${star}</div>
                <div class="card-info"><span class="label">도종 : </span><span class="value">${escapeHtml(post.dojong || '-')} [${escapeHtml(post.status || '-')}]</span><br>
                <span class="label">도파 : </span><span class="value">${escapeHtml(post.dopa || '-')}</span></div>
            </div></div>`;
    });
    html += `</div>`;
    return html;
}
// ==========================================
// ★ 버튼 그룹(라디오) 선택 처리
// ==========================================
function selectRadioBtn(btn, inputId, value) {
    // 숨겨진 input 값 변경
    const hiddenInput = document.getElementById(inputId);
    if (hiddenInput) hiddenInput.value = value;

    // 같은 부모 내의 버튼들 active 스타일 갱신
    const parent = btn.parentElement;
    parent.querySelectorAll('.radio-btn').forEach(b => {
        const isActive = b === btn;
        b.classList.toggle('active', isActive);
        b.style.background = isActive ? '#6b9bd2' : '#fff';
        b.style.color = isActive ? '#fff' : '#333';
        b.style.borderColor = isActive ? '#6b9bd2' : '#ccc';
        b.style.fontWeight = isActive ? 'bold' : 'normal';
    });
}