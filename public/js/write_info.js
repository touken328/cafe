// ==========================================
// write_info.js : 게임 정보 글쓰기/수정/복사 + 북마크
// ==========================================

function getInfoPosts() {
    try { return JSON.parse(localStorage.getItem(INFO_STORAGE_KEY)) || []; }
    catch (e) { return []; }
}
function saveInfoPosts(posts) {
    localStorage.setItem(INFO_STORAGE_KEY, JSON.stringify(posts));
}

// ---- 글쓰기 ----
function openInfoWriteView(post = null, isCopy = false) {
    if (!requireWriter()) return;
    const isEdit = post !== null && !isCopy;
    const title = isEdit ? '게임 정보 수정' : (isCopy ? '게임 정보 복사' : '게임 정보 새글쓰기');
    const formHTML = renderInfoWriteFormHTML(post, isCopy);

    mainContent.innerHTML = `
        <div class="write-view">
            <div class="write-header">
                <h2>${title}</h2>
                <button class="back-btn" id="btn-info-back">← 뒤로</button>
            </div>
            <form id="infoWriteForm">
                ${formHTML}
                <div class="form-actions">
                    <button type="submit" class="btn-submit">${isEdit ? '수정 완료' : '등록하기'}</button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('btn-info-back').addEventListener('click', () => {
        if (isEdit) renderInfoDetailView(post.id);
        else renderInfoList('모두 보기');
    });

    document.getElementById('infoWriteForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const missing = [];
        INFO_SCHEMA.info.fields.forEach(f => {
            if (!f.required) return;
            const inputId = `input_info_${f.key.replace(/\./g, '_')}`;
            if (!document.getElementById(inputId)?.value?.trim()) missing.push(f.label);
        });
        if (missing.length) { alert(`필수 항목: ${missing.join(', ')}`); return; }

        const postData = collectInfoFormData();
        let posts = getInfoPosts();

        if (isEdit) {
            const idx = posts.findIndex(p => String(p.id) === String(post.id));
            if (idx !== -1) {
                posts[idx] = { ...posts[idx], ...postData, updatedAt: new Date().toISOString() };
                saveInfoPosts(posts);
                renderInfoDetailView(post.id);
            } else alert('수정할 게임 정보를 찾을 수 없습니다.');
        } else {
            const newPost = {
                id: Date.now(),
                category: '게임 정보',
                ...postData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            posts.push(newPost);
            saveInfoPosts(posts);
            renderInfoList('모두 보기');
        }
    });
}