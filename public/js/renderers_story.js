// ==========================================
// renderers_story.js : 스토리 폼/상세 렌더링
// ==========================================

// ---- 필드 입력 HTML (동적 옵션 + 버튼 그룹 지원) ----
function renderStoryFieldInput(field, value, allValues = {}) {
    const req = field.required ? '<span class="required">*</span>' : '';
    const ph = field.placeholder ? `placeholder="${field.placeholder}"` : '';
    const v = value ?? '';
    const inputId = `input_story_${field.key.replace(/\./g, '_')}`;

    switch (field.type) {
        case 'textarea':
            return `<div class="form-group"><label>${field.label}${req}</label>
                <textarea id="${inputId}" class="form-control" rows="${field.rows || 4}" ${ph}>${escapeHtml(v)}</textarea></div>`;
        case 'select': {
            // ★ 동적 옵션: 대분류에 따라 소분류 옵션 변경
            let options = field.options || [];
            if (field.dynamicOptions) {
                const mainCat = allValues.mainCategory || '';
                options = field.dynamicOptions[mainCat] || [];
            }

            // ★ 버튼 그룹
            if (field.buttonGroup) {
                const defaultVal = (v === undefined || v === null || v === '') 
                    ? (options[0] || '') 
                    : v;
                const btns = options.map(o => {
                    const isActive = o === defaultVal;
                    return `<button type="button" 
                                class="radio-btn ${isActive ? 'active' : ''}" 
                                data-value="${escapeHtml(o)}" 
                                onclick="selectRadioBtn(this, '${inputId}', ${jsArg(o)})"
                                style="padding: 8px 20px; border: 1px solid ${isActive ? '#6b9bd2' : '#ccc'}; 
                                       background: ${isActive ? '#6b9bd2' : '#fff'}; 
                                       color: ${isActive ? '#fff' : '#333'}; 
                                       border-radius: 4px; cursor: pointer; font-weight: ${isActive ? 'bold' : 'normal'};">
                                ${escapeHtml(o)}
                            </button>`;
                }).join(' ');
                return `<div class="form-group"><label>${field.label}${req}</label>
                    <div style="display: flex; gap: 8px; flex: 1; flex-wrap: wrap;">
                        <input type="hidden" id="${inputId}" value="${escapeHtml(defaultVal)}">
                        ${btns || '<span style="color:#aaa;">대분류를 먼저 선택하세요</span>'}
                    </div></div>`;
            }

            // 일반 select
            const defaultVal = (v === undefined || v === null || v === '') 
                ? (options[0] || '') 
                : v;
            const opts = options.map(o => 
                `<option value="${escapeHtml(o)}" ${o === defaultVal ? 'selected' : ''}>${escapeHtml(o)}</option>`
            ).join('');
            return `<div class="form-group"><label>${field.label}${req}</label>
                <select id="${inputId}" class="form-control" ${field.required ? 'required' : ''}>
                    ${opts}
                </select></div>`;
        }
        case 'image':
        case 'tags':
        default:
            return `<div class="form-group"><label>${field.label}${req}</label>
                <input type="text" id="${inputId}" class="form-control" value="${escapeHtml(v)}" ${ph}></div>`;
    }
}

// ---- 폼 전체 HTML (대분류 선택 시 소분류 옵션 동적 갱신) ----
function renderStoryWriteFormHTML(post = null, isCopy = false) {
    const group = STORY_SCHEMA.story;
    const allValues = {};
    // 현재 값 수집 (동적 옵션용)
    group.fields.forEach(f => {
        allValues[f.key] = (isCopy && !f.copy) ? '' : getByPath(post || {}, f.key);
    });

    return group.fields.map(f => {
        const value = allValues[f.key];
        return renderStoryFieldInput(f, value, allValues);
    }).join('');
}

// ---- 폼 값 수집 ----
function collectStoryFormData() {
    const data = {};
    STORY_SCHEMA.story.fields.forEach(field => {
        const inputId = `input_story_${field.key.replace(/\./g, '_')}`;
        const el = document.getElementById(inputId);
        if (!el) return;
        if (field.type === 'tags') {
            data[field.key] = el.value.split(',').map(t => t.trim()).filter(Boolean);
        } else if (field.type === 'image') {
            data[field.key] = normalizeImageUrl(el.value);
        } else if (field.type === 'textarea') {
            data[field.key] = normalizeImageUrlsInText(el.value);
        } else {
            data[field.key] = el.value.trim ? el.value.trim() : el.value;
        }
    });
    return data;
}

// ---- 상세보기 렌더링 ----
function renderStoryDetail(post) {
    // 도검 번호 → 프로필 조회
    const numbers = Array.isArray(post.swordNumbers) ? post.swordNumbers : [];
    const swordListHtml = numbers.map(num => {
    const profile = getPosts().find(p => String(p.number) === String(num));
    const display = profile
        ? `${escapeHtml(num)}. ${escapeHtml(profile.name || '-')} (${escapeHtml(profile.namejp || '-')})`
        : `${escapeHtml(num)}.`;
    // ★ 도검남사 번호 클릭 시, 해당 도검남사의 프로필로 이동
    const clickAction = profile
        ? `onclick="renderDetailView(${Number(profile.id)})"`
        : `style="color:#aaa;"`;
    return `<div class="inner-sword-line" style="cursor:${profile ? 'pointer' : 'default'}; padding:4px; border-bottom:1px dashed #ccc;" 
                 ${clickAction}>${display}</div>`;
}).join('');

    const imgSrc = normalizeImageUrl(post.image);
    const imageHtml = imgSrc
        ? `<div style="text-align:center;">
             <img src="${escapeHtml(imgSrc)}" style="max-width:100%;">
           </div><br>`
        : ``;

    return `
        <div class="detail-section">
            <table class="status-table">
                <tr><th>이벤트명</th><td>${escapeHtml(post.Numbers || '-')}. ${escapeHtml(post.title || '-')} (${escapeHtml(post.titlejp || '-')})</td></tr>
                <tr><th>최초 발생일</th><td>${escapeHtml(post.region || '-')}</td></tr>
            </table>
        </div>
        <div class="detail-section">
            <div class="detail-section-content">
			${imageHtml}
			${renderMarkdown(post.content)}</div>
        </div>
        <div class="detail-section">
            <div class="detail-section-title">관련 도검남사</div>
            <div class="detail-section-content">${swordListHtml || '-'}</div>
        </div>
    `;
}

// ---- 스토리 카드 그리드 ----
function buildStoryCardGrid(posts) {
    if (posts.length === 0) return `<div class="no-data">등록된 스토리가 없습니다.</div>`;
    let html = `<div class="card-grid">`;
    posts.forEach(post => {
        const imgUrl = normalizeImageUrl(post.image);
        const imageHtml = imgUrl
            ? `<img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(post.title)}" class="card-imagew" loading="lazy" onerror="this.outerHTML='<div class=\\'card-image\\'>이미지 로드 실패</div>'">`
            : ``;

        const numbers = Array.isArray(post.swordNumbers) ? post.swordNumbers : [];
        const swordLines = numbers.map(num => {
            const profile = getPosts().find(p => String(p.number) === String(num));
            return profile ? `${escapeHtml(profile.name)}` : `${escapeHtml(num)}.`;
        }).join('<br>');

        const star = isStoryBookmarked(post.id) ? '⭐' : '';
        html += `<div class="card" onclick="renderStoryDetailView(${Number(post.id)})">
		<div class="item-label">${star} ${escapeHtml(post.mainCategory || '-')}</div>
            ${imageHtml}
            <div class="card-body">
                <div class="card-title">${escapeHtml(post.Numbers || '-')}. ${escapeHtml(post.title || '제목 없음')}</div>
                <div class="card-info"><span class="label">개시:</span> ${escapeHtml(post.region || '-')}</div>
            </div></div>`;
    });
    html += `</div>`;
    return html;
}