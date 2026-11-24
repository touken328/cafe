// ==========================================
// ★ 도검남사 북마크
// ==========================================
function isOuterBookmarked(id)    { return isBookmarked(BOOKMARK_KEYS.outer, id); }
function toggleOuterBookmark(id) {
    const added = toggleBookmarkGeneric(BOOKMARK_KEYS.outer, id);
    // 상세보기 중이면 즉시 리렌더
    if (document.getElementById('outerBookmarkWrap')) {
        renderDetailView(id, false);
    }
    return added;
}
// ==========================================
// write.js : 글쓰기/수정/복사 오케스트레이션
// ==========================================
function openWriteView(post = null, isCopy = false, presetCategory = null) {
    const isEdit = post !== null && !isCopy;
    // ★ presetCategory가 있으면 카테고리 선택 단계를 건너뜀
    const hasPreset = !isEdit && !isCopy && !!presetCategory;

    if (post !== null) {
        document.querySelectorAll('.sub-menu li').forEach(el => el.classList.remove('active'));
    }

    const title = isEdit ? '글 수정' : (isCopy ? '복사해서 글쓰기' : '새 글쓰기');
    const showCategory = !(isEdit || isCopy) && !hasPreset;   // ★ hasPreset이면 카테고리 숨김
    const showForm = (isEdit || isCopy) || hasPreset;          // ★ hasPreset이면 폼 표시
    const formHTML = renderWriteFormHTML(post, isCopy);

    mainContent.innerHTML = `
        <div class="write-view">
            <div class="write-header">
                <h2>${title}</h2>
                <button class="back-btn" id="btn-write-back">← 뒤로</button>
            </div>
            <div id="step-category" style="display:${showCategory ? 'block' : 'none'};">
                <p>카테고리를 선택해주세요.</p>
                <div class="category-select-list">
                    <button data-cat="도검남사">도검남사</button>
                    <button data-cat="내번">내번</button>
                    <button data-cat="회상">회상</button>
                    <button data-cat="스토리">아벤트 스토리</button>
                    <button data-cat="게임 정보">게임 정보</button>
                </div>
            </div>
            <div id="step-form" style="display:${showForm ? 'block' : 'none'};">
                <form id="writeForm">
                    <input type="hidden" id="inputCategory" value="${post?.category || presetCategory || ''}">
                    <input type="hidden" id="inputPostId" value="${isEdit ? post.id : ''}">
                    ${formHTML}
                    <div class="form-actions">
                        <button type="button" class="btn-cancel" id="btn-back-category" style="display:${isEdit || isCopy || hasPreset ? 'none' : 'inline-block'};">이전</button>
                        <button type="submit" class="btn-submit">${isEdit ? '수정 완료' : '등록하기'}</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    // ★ 카테고리 바로가기 탭: 클릭 시 해당 섹션으로 스크롤
    const writeNav = document.getElementById('writeCategoryNav');
    if (writeNav) {
        const navButtons = writeNav.querySelectorAll('.write-category-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                const targetEl = document.getElementById(targetId);
                if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                // active 상태 갱신
                navButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // ★ 스크롤 위치에 따라 active 자동 갱신 (IntersectionObserver)
        const sections = Array.from(writeNav.querySelectorAll('.write-category-btn'))
            .map(b => document.getElementById(b.dataset.target))
            .filter(Boolean);

        if ('IntersectionObserver' in window && sections.length > 0) {
            const observer = new IntersectionObserver((entries) => {
                // 화면 상단 근처에 들어온 섹션을 active로
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const id = entry.target.id;
                        navButtons.forEach(b => {
                            b.classList.toggle('active', b.dataset.target === id);
                        });
                    }
                });
            }, {
                root: mainContent,          // ★ mainContent가 스크롤 컨테이너
                rootMargin: '-10% 0px -70% 0px',  // 상단 10~30% 구간에서 감지
                threshold: 0
            });
            sections.forEach(sec => observer.observe(sec));
        }
    }
    // ---- 수정 모드 데이터 채우기 ----
    if (isEdit) {
        TAB_ORDER.forEach(tabKey => {
            const group = FIELD_SCHEMA[tabKey];
            if (!group) return;
            group.fields.forEach(field => {
                const inputId = `input_${field.key.replace(/\./g, '_')}`;
                const el = document.getElementById(inputId);
                if (!el) return;
                if (field.type === 'tags') {
                    const extras = (post.tags || []).filter(t => t !== post.dojong && t !== post.dopa);
                    el.value = extras.join(', ');
                } else if (field.type === 'stats') {
                    const st = post.stats || {};
                    field.subFields.forEach(sf => {
                        const statEl = document.getElementById(`stat_${sf.key}`);
                        if (statEl) statEl.value = st[sf.key] ?? '';
                    });
                } else if (field.type === 'image') {
                    el.value = normalizeImageUrl(getByPath(post, field.key) ?? '');
                } else if (field.type === 'textarea' || field.type === 'text') {
                    const raw = getByPath(post, field.key) ?? '';
                    el.value = normalizeImageUrlsInText(raw);
                } else {
                    el.value = getByPath(post, field.key) ?? '';
                }
            });
        });
    } else if (isCopy && typeof applyCopyData === 'function') {
        applyCopyData(post);
    }

    // ---- 돌아가기 ----
    document.getElementById('btn-write-back').addEventListener('click', () => {
        if (isEdit) renderDetailView(post.id);
        else {
            document.querySelectorAll('.sub-menu li').forEach(el => el.classList.remove('active'));
            const allMenu = Array.from(document.querySelectorAll('.sub-menu li')).find(li => li.textContent === '모두 보기');
            if (allMenu) allMenu.classList.add('active');
            renderAllPostsList(false);
        }
    });

    // ---- 카테고리 선택 (도검남사 / 내번 / 회상 / 스토리) ----
    document.querySelectorAll('#step-category button').forEach(btn => {
        btn.addEventListener('click', () => {
            const cat = btn.dataset.cat;
            if (cat === '도검남사') {
                document.getElementById('inputCategory').value = '도검남사';
                document.getElementById('step-category').style.display = 'none';
                document.getElementById('step-form').style.display = 'block';
            } else if (cat === '내번') {
                if (typeof openInnerWriteView === 'function') openInnerWriteView();
                else alert('내번 글쓰기 렌더러를 찾을 수 없습니다.');
            } else if (cat === '회상') {
                if (typeof openFlashbackWriteView === 'function') openFlashbackWriteView();
                else alert('회상 글쓰기 렌더러를 찾을 수 없습니다.');
            } else if (cat === '스토리') {
                if (typeof openStoryWriteView === 'function') openStoryWriteView();
                else alert('스토리 글쓰기 렌더러를 찾을 수 없습니다.');
            } else if (cat === '게임 정보') {
                if (typeof openInfoWriteView === 'function') openInfoWriteView();
                else alert('게임 정보 글쓰기 렌더러를 찾을 수 없습니다.');
            } else {
                alert(`'${cat}' 카테고리는 준비 중입니다.`);
            }
        });
    });

    const backBtn = document.getElementById('btn-back-category');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            document.getElementById('step-form').style.display = 'none';
            document.getElementById('step-category').style.display = 'block';
            document.getElementById('writeForm').reset();
        });
    }

    // ---- submit (도검남사 전용) ----
    document.getElementById('writeForm').addEventListener('submit', (e) => {
        e.preventDefault();
        try {
            const missing = [];
            TAB_ORDER.forEach(tabKey => {
                const group = FIELD_SCHEMA[tabKey];
                if (!group) return;
                group.fields.forEach(f => {
                    if (!f.required) return;
                    const inputId = `input_${f.key.replace(/\./g, '_')}`;
                    if (!document.getElementById(inputId)?.value?.trim()) missing.push(f.label);
                });
            });
            if (missing.length) { alert(`필수 항목: ${missing.join(', ')}`); return; }

            const postData = collectFormData();
            const extraTags = (postData.tags || []).filter(t => t !== postData.dojong && t !== postData.dopa);
            postData.tags = [postData.dojong, postData.dopa, ...extraTags].filter(Boolean);

            let posts = getPosts();

            if (isEdit) {
                const idx = posts.findIndex(p => String(p.id) === String(post.id));
                if (idx !== -1) {
                    posts[idx] = { ...posts[idx], ...postData, updatedAt: new Date().toISOString() };
                    savePosts(posts);
                    renderDetailView(post.id);
                } else {
                    alert('수정할 게시글을 찾을 수 없습니다.');
                }
            } else {
                const newPost = {
                    id: Date.now(),
                    category: '도검남사',
                    ...postData,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                posts.push(newPost);
                savePosts(posts);
                document.querySelectorAll('.sub-menu li').forEach(el => {
                    el.classList.toggle('active', el.dataset.dojong === postData.dojong);
                });
                renderPostList(postData.dojong);
            }
        } catch (err) {
            console.error('[submit] 오류:', err);
            alert(`오류가 발생했습니다: ${err.message}`);
        }
    });
}

function copyPost(post) { openWriteView(post, true); }
// ==========================================
// ★ 하단 툴바 [새글쓰기] 버튼 이벤트 연결
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const newPostBtn = document.getElementById('btn-new-post');
    if (newPostBtn) {
        newPostBtn.addEventListener('click', () => openWriteView());
    } else {
        console.warn('[write.js] #btn-new-post 버튼을 찾을 수 없습니다.');
    }
});