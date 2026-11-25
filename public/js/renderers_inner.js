// ==========================================
// renderers_flashback.js : 회상 폼/상세 렌더링
// ==========================================

// ---- 필드 입력 HTML ----
function renderFlashbackFieldInput(field, value) {
    const req = field.required ? '<span class="required">*</span>' : '';
    const ph = field.placeholder ? `placeholder="${field.placeholder}"` : '';
    const v = value ?? '';
    const inputId = `input_flashback_${field.key.replace(/\./g, '_')}`;

    switch (field.type) {
        case 'textarea':
            return `<div class="form-group"><label>${field.label}${req}</label>
                <textarea id="${inputId}" class="form-control" rows="${field.rows || 4}" ${ph}>${escapeHtml(v)}</textarea></div>`;
        case 'select': {
            const defaultVal = (v === undefined || v === null || v === '') ? field.options[0] : v;
            const opts = field.options.map(o => `<option value="${o}" ${o === defaultVal ? 'selected' : ''}>${o}</option>`).join('');
            return `<div class="form-group"><label>${field.label}${req}</label>
                <select id="${inputId}" class="form-control" ${field.required ? 'required' : ''}>${opts}</select></div>`;
        }
        case 'image':
        case 'tags':
        default:
            return `<div class="form-group"><label>${field.label}${req}</label>
                <input type="text" id="${inputId}" class="form-control" value="${escapeHtml(v)}" ${ph}></div>`;
    }
}

// ---- 폼 전체 HTML ----
function renderFlashbackWriteFormHTML(post = null, isCopy = false) {
    const group = FLASHBACK_SCHEMA.flashback;
    return group.fields.map(f => {
        const value = (isCopy && !f.copy) ? '' : getByPath(post || {}, f.key);
        return renderFlashbackFieldInput(f, value);
    }).join('');
}

// ---- 폼 값 수집 ----
function collectFlashbackFormData() {
    const data = {};
    FLASHBACK_SCHEMA.flashback.fields.forEach(field => {
        const inputId = `input_flashback_${field.key.replace(/\./g, '_')}`;
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
function renderFlashbackDetail(post) {
    const numbers = Array.isArray(post.swordNumbers) ? post.swordNumbers : [];
    const swordListHtml = numbers.map(num => {
        const profile = getPosts().find(p => String(p.number) === String(num));
        const display = profile
            ? `${escapeHtml(num)}. ${escapeHtml(profile.name || '-')} (${escapeHtml(profile.namejp || '-')}) ${escapeHtml(profile.status || '')}`
            : `${escapeHtml(num)}.`;
    const clickAction = profile
        ? `onclick="renderDetailView(${Number(profile.id)})"`
        : `style="color:#aaa;"`;
    return `<div class="inner-sword-line" style="cursor:${profile ? 'pointer' : 'default'}; padding:4px; border-bottom:1px dashed #ccc;" 
                 ${clickAction}>${display}</div>`;
}).join('');

    const imgSrc = normalizeImageUrl(post.image);
    const imageHtml = imgSrc
        ? `<div style="text-align:center;">
             <img src="${escapeHtml(imgSrc)}" alt="회상 이미지" style="max-width:100%; cursor:zoom-in;" 
                  onclick="openLightbox(${jsArg(imgSrc)})"
                  onerror="this.outerHTML='<div style=\\'color:#888;\\'>이미지 로드 실패</div>'">
           </div>`
        : `<div style="color:#888;">이미지 없음</div>`;

    return `
        <div class="detail-section">
            <table class="status-table">
                <tr>
                    <th>회상 제목</th>
                    <td>${escapeHtml(post.flashbackNumber || '-')}. ${escapeHtml(post.flashbackTitle || '-')} (${escapeHtml(post.flashbackTitlejp || '-')})</td>
                </tr>
                <tr>
                    <th>회상 지역</th>
                    <td>${escapeHtml(post.flashbackRegion || '-')}, ${escapeHtml(post.flashbackName || '-')}</td>
                </tr>
            </table>
        </div>
        <div class="detail-section">${imageHtml}</div>
        <div class="detail-section">
            <div class="detail-section-content">${renderMarkdown(post.flashbackLines)}</div>
        </div>
        <div class="detail-section">
            <div class="detail-section-title">등장 도검남사</div>
            <div class="detail-section-content">${swordListHtml || '-'}</div>
        </div>
    `;
}

// ---- 회상 카드 그리드 ----
function buildFlashbackCardGrid(posts) {
    if (posts.length === 0) return `<div class="no-data">등록된 회상이 없습니다.</div>`;
    let html = `<div class="card-grid">`;
    posts.forEach(post => {
        const imgUrl = normalizeImageUrl(post.image);
        const imageHtml = imgUrl
            ? `<img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(post.flashbackNumber)}" class="card-imagew" loading="lazy" onerror="this.outerHTML='<div class=\\'card-image\\'>이미지 로드 실패</div>'">`
            : ``;

        const numbers = Array.isArray(post.swordNumbers) ? post.swordNumbers : [];
        const swordLines = numbers.map(num => {
            const profile = getPosts().find(p => String(p.number) === String(num));
            return profile ? `${escapeHtml(profile.name)}  ${escapeHtml(profile.status)}` : `${escapeHtml(num)}.`;
        }).join('<br>');

        const star = isFlashbackBookmarked(post.id) ? '⭐' : '';
        html += `<div class="card" onclick="renderFlashbackDetailView(${Number(post.id)})">
		<div class="item-label">${star} 회상 ${escapeHtml(post.flashbackNumber || '?')}</div>
            ${imageHtml}
            <div class="card-body">
                <div class="card-title">${escapeHtml(post.flashbackTitle || '-')}</div>
                <div class="card-info"><span class="label">지역:</span> ${escapeHtml(post.flashbackRegion || '-')}</div>
                <div class="card-info">${swordLines || '-'}</div>
            </div></div>`;
    });
    html += `</div>`;
    return html;
}

// ==========================================
// renderers_inner.js : 내번 폼/상세 렌더링
// ==========================================

// ---- 필드 입력 HTML ----
function renderInnerFieldInput(field, value) {
    const req = field.required ? '<span class="required">*</span>' : '';
    const ph = field.placeholder ? `placeholder="${field.placeholder}"` : '';
    const v = value ?? '';

    const inputId = `input_inner_${field.key.replace(/\./g, '_')}`;

    switch (field.type) {
        case 'textarea':
            return `<div class="form-group"><label>${field.label}${req}</label>
                <textarea id="${inputId}" class="form-control" rows="${field.rows || 4}" ${ph}>${escapeHtml(v)}</textarea></div>`;
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
                    <div style="display: flex; gap: 8px; flex: 1; flex-wrap: wrap;">
                        <input type="hidden" id="${inputId}" value="${escapeHtml(defaultVal)}">
                        ${btns}
                    </div></div>`;
            }

            // 기존 select 방식
            const defaultVal = (v === undefined || v === null || v === '') ? field.options[0] : v;
            const opts = field.options.map(o => `<option value="${o}" ${o === defaultVal ? 'selected' : ''}>${o}</option>`).join('');
            return `<div class="form-group"><label>${field.label}${req}</label>
                <select id="${inputId}" class="form-control" ${field.required ? 'required' : ''}>${opts}</select></div>`;
        }
        case 'image':
        case 'tags':
        default:
            return `<div class="form-group"><label>${field.label}${req}</label>
                <input type="text" id="${inputId}" class="form-control" value="${escapeHtml(v)}" ${ph}></div>`;
    }
}

// ---- 폼 전체 HTML ----
function renderInnerWriteFormHTML(post = null, isCopy = false) {
    const group = INNER_SCHEMA.inner;
    return group.fields.map(f => {
        const value = (isCopy && !f.copy) ? '' : getByPath(post || {}, f.key);
        return renderInnerFieldInput(f, value);
    }).join('');
}

// ---- 폼 값 수집 ----
function collectInnerFormData() {
    const data = {};
    INNER_SCHEMA.inner.fields.forEach(field => {
        const inputId = `input_inner_${field.key.replace(/\./g, '_')}`;
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
function renderInnerDetail(post) {
    // 도검 번호 → 프로필에서 이름/원문 조회
    const numbers = Array.isArray(post.swordNumbers) ? post.swordNumbers : [];
    const swordListHtml = numbers.map(num => {
        const profile = getPosts().find(p => String(p.number) === String(num));
        const display = profile 
            ? `${escapeHtml(num)}. ${escapeHtml(profile.name)} (${escapeHtml(profile.namejp || '-')}) ${escapeHtml(profile.status)}` 
            : `${escapeHtml(num)}.`;
    const clickAction = profile
        ? `onclick="renderDetailView(${Number(profile.id)})"`
        : `style="color:#aaa;"`;
    return `<div class="inner-sword-line" style="cursor:${profile ? 'pointer' : 'default'}; padding:4px; border-bottom:1px dashed #ccc;" 
                 ${clickAction}>${display}</div>`;
}).join('');

    // ★ 이미지 처리 (변수 선언 추가)
    const img1 = normalizeImageUrl(post.image1);
    const img2 = normalizeImageUrl(post.image2);
    let imagesHtml = '';
    
    if (img1 || img2) {
        imagesHtml = `<div style="display: flex; gap: 10px; flex-wrap: wrap;">`;
        if (img1) {
            imagesHtml += `<img src="${escapeHtml(img1)}" alt="이미지1" 
                style="max-width: calc(50% - 5px); border-radius: 8px;" 
                onerror="this.outerHTML='<div style=\\'color:#888;padding:20px;\\'>이미지1 로드 실패</div>'"
                onclick="openLightbox(${jsArg(img1)})">`;
        }
        if (img2) {
            imagesHtml += `<img src="${escapeHtml(img2)}" alt="이미지2" 
                style="max-width: calc(50% - 5px); border-radius: 8px;" 
                onerror="this.outerHTML='<div style=\\'color:#888;padding:20px;\\'>이미지2 로드 실패</div>'"
                onclick="openLightbox(${jsArg(img2)})">`;
        }
        imagesHtml += `</div>`;
    }

    return `
        <div class="inner-detail">
            <div class="detail-section">
                ${imagesHtml}
            </div>
            <div class="detail-section">
                <div class="detail-section-title">상호대사 (시작)</div>
                <div class="detail-section-content">${renderMarkdown(post.mutualLines1)}</div>
            </div>
            <div class="detail-section">
                <div class="detail-section-title">상호대사 (종료)</div>
                <div class="detail-section-content">${renderMarkdown(post.mutualLines2)}</div>
            </div>
            <div class="detail-section">
                <div class="detail-section-title">관련 도검남사</div>
                <div class="detail-section-content">${swordListHtml || '-'}</div>
            </div>
        </div>
    `;
}

// ---- 내번 카드 그리드 ----
function buildInnerCardGrid(posts) {
    if (posts.length === 0) return `<div class="no-data">등록된 내번이 없습니다.</div>`;
    const INNER_TYPE_EMOJI = { '말당번': '🐴', '밭당번': '🌱', '대련': '⚔️' };
    let html = `<div class="card-grid">`;
    posts.forEach(post => {
        const imgUrl = normalizeImageUrl(post.image1 || post.image2 || '');
        const imageHtml = imgUrl
            ? `<img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(post.innerType)}" class="card-imagew" loading="lazy" onerror="this.outerHTML='<div class=\\'card-image\\'>이미지 로드 실패</div>'">`
            : ``;

        const numbers = Array.isArray(post.swordNumbers) ? post.swordNumbers : [];
        const swordLines = numbers.map(num => {
            const profile = getPosts().find(p => String(p.number) === String(num));
            return profile ? `${escapeHtml(profile.name)}  ${escapeHtml(profile.status)}` : `${escapeHtml(num)}.`;
        }).join('<br>');

        const emoji = INNER_TYPE_EMOJI[post.innerType] || '';
        const typeLabel = ` ${escapeHtml(post.innerType || '?')}`;
        const titleWithEmoji = emoji ? `${emoji}${typeLabel}` : typeLabel;

        const star = isInnerBookmarked(post.id) ? '⭐' : '';
        html += `<div class="card" onclick="renderInnerDetailView(${Number(post.id)})">
		<div class="item-label">${star} ${titleWithEmoji}</div>
            ${imageHtml}
            <div class="card-body">
                <div class="card-info">${swordLines || '-'}</div>
            </div></div>`;
    });
    html += `</div>`;
    return html;
}