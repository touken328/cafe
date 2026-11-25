function isStoryBookmarked(id)    { return isBookmarked(BOOKMARK_KEYS.story, id); }
function toggleStoryBookmark(id) {
    const added = toggleBookmarkGeneric(BOOKMARK_KEYS.story, id);
    if (document.getElementById('storyBookmarkWrap')) {
        renderStoryDetailView(id, false);
    }
    return added;
}

// ==========================================
// write_story.js : 스토리 글쓰기/수정/복사
// ==========================================

function getStoryPosts() {
    try { return JSON.parse(localStorage.getItem(STORY_STORAGE_KEY)) || []; }
    catch (e) { return []; }
}
function saveStoryPosts(posts) {
    localStorage.setItem(STORY_STORAGE_KEY, JSON.stringify(posts));
}

function openStoryWriteView(post = null, isCopy = false) {
    if (!requireWriter()) return;
    const isEdit = post !== null && !isCopy;
    const title = isEdit ? '스토리 수정' : (isCopy ? '스토리 복사' : '스토리 새글쓰기');
    const formHTML = renderStoryWriteFormHTML(post, isCopy);

    mainContent.innerHTML = `
        <div class="write-view">
            <div class="write-header">
                <h2>${title}</h2>
                <button class="back-btn" id="btn-story-back">← 뒤로</button>
            </div>
            <form id="storyWriteForm">
                ${formHTML}
                <div class="form-actions">
                    <button type="submit" class="btn-submit">${isEdit ? '수정 완료' : '등록하기'}</button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('btn-story-back').addEventListener('click', () => {
        if (isEdit) renderStoryDetailView(post.id);
        else renderStoryList('모두 보기');
    });

    // ★ 대분류 버튼 클릭 시 소분류 옵션 갱신
    document.querySelectorAll('#input_story_mainCategory ~ .radio-btn, .radio-btn[data-value]').forEach(btn => {
        // 대분류 버튼에만 반응 (id로 구분 불가하므로 부모 그룹 확인)
    });
    // 대분류 부모 div에 이벤트 위임
    const mainCatInput = document.getElementById('input_story_mainCategory');
    if (mainCatInput) {
        const mainCatGroup = mainCatInput.closest('.form-group');
        if (mainCatGroup) {
            mainCatGroup.querySelectorAll('.radio-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    // selectRadioBtn에서 처리 후 소분류 갱신
                    setTimeout(refreshStorySubCategory, 10);
                });
            });
        }
    }

    document.getElementById('storyWriteForm').addEventListener('submit', (e) => {
        e.preventDefault();

        const missing = [];
        STORY_SCHEMA.story.fields.forEach(f => {
            if (!f.required) return;
            const inputId = `input_story_${f.key.replace(/\./g, '_')}`;
            if (!document.getElementById(inputId)?.value?.trim()) missing.push(f.label);
        });
        if (missing.length) { alert(`필수 항목: ${missing.join(', ')}`); return; }

        const postData = collectStoryFormData();
        let posts = getStoryPosts();

        if (isEdit) {
            const idx = posts.findIndex(p => String(p.id) === String(post.id));
            if (idx !== -1) {
                posts[idx] = { ...posts[idx], ...postData, updatedAt: new Date().toISOString() };
                saveStoryPosts(posts);
                renderStoryDetailView(post.id);
            } else alert('수정할 스토리를 찾을 수 없습니다.');
        } else {
            const newPost = {
                id: Date.now(),
                category: '스토리',
                ...postData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            posts.push(newPost);
            saveStoryPosts(posts);
            renderStoryList('모두 보기');
        }
    });
}

function copyStoryPost(post) { openStoryWriteView(post, true); }