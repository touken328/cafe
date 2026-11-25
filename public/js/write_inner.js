// ==========================================
// ★ 북마크
// ==========================================
function isInnerBookmarked(id)    { return isBookmarked(BOOKMARK_KEYS.inner, id); }
function toggleInnerBookmark(id) {
    const added = toggleBookmarkGeneric(BOOKMARK_KEYS.inner, id);
    if (document.getElementById('innerBookmarkWrap')) {
        renderInnerDetailView(id, false);
    }
    return added;
}
function isFlashbackBookmarked(id)    { return isBookmarked(BOOKMARK_KEYS.flashback, id); }
function toggleFlashbackBookmark(id) {
    const added = toggleBookmarkGeneric(BOOKMARK_KEYS.flashback, id);
    if (document.getElementById('flashbackBookmarkWrap')) {
        renderFlashbackDetailView(id, false);
    }
    return added;
}

// ==========================================
// write_flashback.js : 회상 글쓰기/수정/복사
// ==========================================
function getFlashbackPosts() {
    try { return JSON.parse(localStorage.getItem(FLASHBACK_STORAGE_KEY)) || []; }
    catch (e) { return []; }
}
function saveFlashbackPosts(posts) {
    localStorage.setItem(FLASHBACK_STORAGE_KEY, JSON.stringify(posts));
}

// 회상 글쓰기/수정/복사 화면
function openFlashbackWriteView(post = null, isCopy = false) {
    if (!requireWriter()) return;
    const isEdit = post !== null && !isCopy;
    const title = isEdit ? '회상 수정' : (isCopy ? '회상 복사' : '회상 새글쓰기');
    const formHTML = renderFlashbackWriteFormHTML(post, isCopy);

    mainContent.innerHTML = `
        <div class="write-view">
            <div class="write-header">
                <h2>${title}</h2>
                <button class="back-btn" id="btn-flashback-back">← 뒤로</button>
            </div>
            <form id="flashbackWriteForm">
                ${formHTML}
                <div class="form-actions">
                    <button type="submit" class="btn-submit">${isEdit ? '수정 완료' : '등록하기'}</button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('btn-flashback-back').addEventListener('click', () => {
        if (isEdit) renderFlashbackDetailView(post.id);
        else renderFlashbackList('모두 보기');
    });

    document.getElementById('flashbackWriteForm').addEventListener('submit', (e) => {
        e.preventDefault();

        // 필수 검증
        const missing = [];
        FLASHBACK_SCHEMA.flashback.fields.forEach(f => {
            if (!f.required) return;
            const inputId = `input_flashback_${f.key.replace(/\./g, '_')}`;
            if (!document.getElementById(inputId)?.value?.trim()) missing.push(f.label);
        });
        if (missing.length) { alert(`필수 항목: ${missing.join(', ')}`); return; }

        const postData = collectFlashbackFormData();
        let posts = getFlashbackPosts();

        if (isEdit) {
            const idx = posts.findIndex(p => String(p.id) === String(post.id));
            if (idx !== -1) {
                posts[idx] = { ...posts[idx], ...postData, updatedAt: new Date().toISOString() };
                saveFlashbackPosts(posts);
                renderFlashbackDetailView(post.id);
            } else {
                alert('수정할 회상을 찾을 수 없습니다.');
            }
        } else {
            const newPost = {
                id: Date.now(),
                category: '회상',
                ...postData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            posts.push(newPost);
            saveFlashbackPosts(posts);
            renderFlashbackList('모두 보기');
        }
    });
}

function copyFlashbackPost(post) { openFlashbackWriteView(post, true); }

// ==========================================
// write_inner.js : 내번 글쓰기/수정/복사
// ==========================================

// 내번 데이터 관리
function getInnerPosts() {
    try { return JSON.parse(localStorage.getItem(INNER_STORAGE_KEY)) || []; }
    catch (e) { return []; }
}
function saveInnerPosts(posts) {
    localStorage.setItem(INNER_STORAGE_KEY, JSON.stringify(posts));
}

// 내번 글쓰기/수정/복사 화면
function openInnerWriteView(post = null, isCopy = false) {
    if (!requireWriter()) return;
    const isEdit = post !== null && !isCopy;
    const title = isEdit ? '내번 수정' : (isCopy ? '내번 복사' : '내번 새글쓰기');

    const formHTML = renderInnerWriteFormHTML(post, isCopy);

    mainContent.innerHTML = `
        <div class="write-view">
            <div class="write-header">
                <h2>${title}</h2>
                <button class="back-btn" id="btn-inner-back">← 뒤로</button>
            </div>
            <form id="innerWriteForm">
                ${formHTML}
                <div class="form-actions">
                    <button type="submit" class="btn-submit">${isEdit ? '수정 완료' : '등록하기'}</button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('btn-inner-back').addEventListener('click', () => {
        if (isEdit) renderInnerDetailView(post.id);
        else renderInnerList('모두 보기');
    });

    document.getElementById('innerWriteForm').addEventListener('submit', (e) => {
        e.preventDefault();

        // 필수 검증
        const missing = [];
        INNER_SCHEMA.inner.fields.forEach(f => {
            if (!f.required) return;
            const inputId = `input_inner_${f.key.replace(/\./g, '_')}`;
            if (!document.getElementById(inputId)?.value?.trim()) missing.push(f.label);
        });
        if (missing.length) { alert(`필수 항목: ${missing.join(', ')}`); return; }

        const postData = collectInnerFormData();

        let posts = getInnerPosts();
        if (isEdit) {
            const idx = posts.findIndex(p => String(p.id) === String(post.id));
            if (idx !== -1) {
                posts[idx] = { ...posts[idx], ...postData, updatedAt: new Date().toISOString() };
                saveInnerPosts(posts);
                renderInnerDetailView(post.id);
            }
        } else {
            const newPost = {
                id: Date.now(),
                category: '내번',
                ...postData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            posts.push(newPost);
            saveInnerPosts(posts);
            renderInnerList(postData.innerType || '모두 보기');
        }
    });
}

function copyInnerPost(post) { openInnerWriteView(post, true); }