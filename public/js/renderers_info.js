// ==========================================
// renderers_info.js : 게임 정보 폼/상세 렌더링
// ==========================================

// ---- 필드 입력 HTML ----
function renderInfoFieldInput(field, value) {
    const req = field.required ? '<span class="required">*</span>' : '';
    const ph  = field.placeholder ? `placeholder="${field.placeholder}"` : '';
    const v   = value ?? '';
    const inputId = `input_info_${field.key.replace(/\./g, '_')}`;

    switch (field.type) {
        case 'textarea':
            return `<div class="form-group"><label>${field.label}${req}</label>
                <textarea id="${inputId}" class="form-control" rows="${field.rows || 4}" ${ph}>${v}</textarea></div>`;
        case 'select': {
            if (field.buttonGroup) {
                const defaultVal = (v === undefined || v === null || v === '')
                    ? field.options[0] : v;
                const btns = field.options.map(o => {
                    const isActive = o === defaultVal;
                    return `<button type="button" class="radio-btn ${isActive ? 'active' : ''}"
                                data-value="${escapeHtml(o)}"
                                onclick="selectRadioBtn(this, '${inputId}', '${escapeHtml(o).replace(/'/g, "\\'")}')"
                                style="padding:8px 20px;border:1px solid ${isActive ? '#6b9bd2' : '#ccc'};
                                       background:${isActive ? '#6b9bd2' : '#fff'};
                                       color:${isActive ? '#fff' : '#333'};
                                       border-radius:4px;cursor:pointer;font-weight:${isActive ? 'bold' : 'normal'};">
                                ${escapeHtml(o)}</button>`;
                }).join(' ');
                return `<div class="form-group"><label>${field.label}${req}</label>
                    <div style="display:flex;gap:8px;flex:1;flex-wrap:wrap;">
                        <input type="hidden" id="${inputId}" value="${escapeHtml(defaultVal)}">
                        ${btns}
                    </div></div>`;
            }
            const defaultVal = (v === undefined || v === null || v === '')
                ? field.options[0] : v;
            const opts = field.options.map(o =>
                `<option value="${escapeHtml(o)}" ${o === defaultVal ? 'selected' : ''}>${escapeHtml(o)}</option>`
            ).join('');
            return `<div class="form-group"><label>${field.label}${req}</label>
                <select id="${inputId}" class="form-control" ${field.required ? 'required' : ''}>${opts}</select></div>`;
        }
		case 'link':
        return `<div class="form-group"><label>${field.label}${req}</label>
            <input type="url" id="${inputId}" class="form-control" value="${escapeHtml(v)}" ${ph}></div>`;
        case 'image':
        case 'tags':
        default:
            return `<div class="form-group"><label>${field.label}${req}</label>
                <input type="text" id="${inputId}" class="form-control" value="${escapeHtml(v)}" ${ph}></div>`;
    }
}

// ---- 폼 전체 HTML ----
function renderInfoWriteFormHTML(post = null, isCopy = false) {
    const group = INFO_SCHEMA.info;
    return group.fields.map(f => {
        const value = (isCopy && !f.copy) ? '' : getByPath(post || {}, f.key);
        return renderInfoFieldInput(f, value);
    }).join('');
}

// ---- 폼 값 수집 ----
function collectInfoFormData() {
    const data = {};
    INFO_SCHEMA.info.fields.forEach(field => {
        const inputId = `input_info_${field.key.replace(/\./g, '_')}`;
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

// ---- 상세보기 ----
function renderInfoDetail(post) {
    const imgSrc = normalizeImageUrl(post.image);
    const imageHtml = imgSrc
        ? `<div style="text-align:center;">
             <img src="${escapeHtml(imgSrc)}" style="max-width:100%;">
           </div><br>`
        : '';

    // ★ 링크 블록: url이 있을 때만 표시
    const rawLink = (post.link || '').trim();
    let linkHtml = '';
    if (rawLink) {
        const normalized = /^https?:\/\//i.test(rawLink) ? rawLink : `https://${rawLink}`;
        const safeUrl = escapeHtml(normalized);
        const safeText = escapeHtml(rawLink);
        linkHtml = `
            <div class="detail-section">
            <table class="status-table">
                <tr><th>링크</th><td>
                    <a href="${safeUrl}" target="_blank" rel="noopener noreferrer"
                       style="color:var(--color-blue-text);word-break:break-all;">
                        ${safeText}
                    </a></td></tr>
            </table>
            </div>`;
    }

    return `
        <div class="detail-section">
            <table class="status-table">
                <tr><th>${escapeHtml(post.title || '-')}</th></tr>
            </table>
        </div>
        <div class="detail-section">
            <div class="detail-section-content">
			${imageHtml}
			${renderMarkdown(post.content)}</div>
        </div>
        ${linkHtml}
    `;
}

// ---- 카드 그리드 ----
function buildInfoCardGrid(posts) {
    if (posts.length === 0) return `<div class="no-data">등록된 게임 정보가 없습니다.</div>`;
    let html = `<div class="card-grid">`;
    posts.forEach(post => {
        const imgUrl = normalizeImageUrl(post.image);
        const imageHtml = imgUrl
            ? `<img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(post.title)}" class="card-imagew" loading="lazy" onerror="this.outerHTML='<div class=\\'card-image\\'>이미지 로드 실패</div>'">`
            : '';
        const star = isInfoBookmarked(post.id) ? '⭐' : '';
        html += `<div class="card" onclick="renderInfoDetailView(${Number(post.id)})">
            <div class="item-label">${star} ${escapeHtml(post.mainCategory || '-')}</div>
            ${imageHtml}
            <div class="card-body">
                <div class="card-title">${escapeHtml(post.title || '제목 없음')}</div>
            </div></div>`;
    });
    html += `</div>`;
    return html;
}