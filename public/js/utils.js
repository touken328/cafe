// ==========================================
// ★ 북마크 인프라 (모든 카테고리 공통)
// ==========================================
const BOOKMARK_KEYS = {
    outer:     'wikiBookmarks',
    inner:     'wikiInnerBookmarks',
    flashback: 'wikiFlashbackBookmarks',
    story:     'wikiStoryBookmarks',
    info:      'wikiInfoBookmarks',
};

function _getBookmarks(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch (e) { return []; }
}
function _saveBookmarks(key, ids) {
    localStorage.setItem(key, JSON.stringify(ids));
}
function isBookmarked(key, id) {
    return _getBookmarks(key).some(x => String(x) === String(id));
}
function toggleBookmarkGeneric(key, id) {
    const ids = _getBookmarks(key);
    const exists = ids.some(x => String(x) === String(id));
    const next = exists
        ? ids.filter(x => String(x) !== String(id))
        : [...ids, id];
    _saveBookmarks(key, next);
    return !exists;
}

// 카테고리별 래퍼
function isOuterBookmarked(id)     { return isBookmarked(BOOKMARK_KEYS.outer, id); }
function isInnerBookmarked(id)     { return isBookmarked(BOOKMARK_KEYS.inner, id); }
function isFlashbackBookmarked(id) { return isBookmarked(BOOKMARK_KEYS.flashback, id); }
function isStoryBookmarked(id)     { return isBookmarked(BOOKMARK_KEYS.story, id); }
function isInfoBookmarked(id)      { return isBookmarked(BOOKMARK_KEYS.info, id); }

function toggleOuterBookmark(id) {
    toggleBookmarkGeneric(BOOKMARK_KEYS.outer, id);
    if (document.getElementById('outerBookmarkWrap')) renderDetailView(id, false);
}
function toggleInnerBookmark(id) {
    toggleBookmarkGeneric(BOOKMARK_KEYS.inner, id);
    if (document.getElementById('innerBookmarkWrap')) renderInnerDetailView(id, false);
}
function toggleFlashbackBookmark(id) {
    toggleBookmarkGeneric(BOOKMARK_KEYS.flashback, id);
    if (document.getElementById('flashbackBookmarkWrap')) renderFlashbackDetailView(id, false);
}
function toggleStoryBookmark(id) {
    toggleBookmarkGeneric(BOOKMARK_KEYS.story, id);
    if (document.getElementById('storyBookmarkWrap')) renderStoryDetailView(id, false);
}
function toggleInfoBookmark(id) {
    toggleBookmarkGeneric(BOOKMARK_KEYS.info, id);
    if (document.getElementById('infoBookmarkWrap')) renderInfoDetailView(id, false);
}

// ==========================================
// utils.js : 데이터 관리 및 공통 함수
// ==========================================

const STORAGE_KEY = 'wikiPosts';
const CURRENT_VERSION = 2;

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ★ 마이그레이션 파이프라인 (버전별 데이터 변환)
function migratePost(post) {
    if (!post._v || post._v < 2) {
        // v1 → v2: lines 문자열 → 객체
        if (post.lines && typeof post.lines === 'string') {
            post.lines = { text: post.lines, ranbu: '', time: '' };
        } else if (post.lines && typeof post.lines === 'object' && !post.lines.text) {
            post.lines.text = post.lines.text || '';
        }
        // v1 → v2: stats 값 정규화 (함수/객체 제거)
        if (post.stats) {
            ['life','strike','command','mobility','charge','critical','scout','hide'].forEach(k => {
                const v = post.stats[k];
                if (v !== undefined && typeof v !== 'string' && typeof v !== 'number') {
                    post.stats[k] = '';
                }
            });
        }
        post._v = 2;
    }
    return post;
}

// 데이터 불러오기 (마이그레이션 자동 적용)
function getPosts() {
    try {
        const posts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        return posts.map(migratePost);
    } catch (e) { return []; }
}

// 데이터 저장하기 (저장 시에도 정규화)
function savePosts(posts) {
    const normalized = posts.map(migratePost).map(post => {
        const safe = Object.assign({}, post);
        delete safe.__proto__;
        delete safe.constructor;
        delete safe.prototype;
        return safe;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

// 마크다운 렌더링 함수 (XSS 방어)
function renderMarkdown(text) {
    if (!text) return '<span style="color:#aaa;">내용 없음</span>';
    try {
        const normalized = normalizeImageUrlsInText(text);
        const rawHtml = marked.parse(normalized, { breaks: true });

        // ★ 외부 링크를 새 창에서 열도록 후처리하는 헬퍼
        const applyExternalLinkTarget = (html) => {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = html;
            wrapper.querySelectorAll('a[href]').forEach(a => {
                const href = a.getAttribute('href') || '';
                // http/https 외부 링크만 새 창 (내부 앵커 #, mailto: 등은 현재 창 유지)
                if (/^https?:\/\//i.test(href)) {
                    a.setAttribute('target', '_blank');
                    a.setAttribute('rel', 'noopener noreferrer');
                }
            });
            return wrapper.innerHTML;
        };

        // ★ DOMPurify로 위험한 태그/속성 제거
        if (typeof DOMPurify !== 'undefined') {
            const sanitized = DOMPurify.sanitize(rawHtml, {
                ADD_ATTR: ['target', 'rel'],   // ★ rel도 허용 (noopener noreferrer)
                FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed'],
                FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
            });
            // ★ sanitize 이후에 target/rel 부여 (sanitize가 지우지 않도록 순서 중요)
            return applyExternalLinkTarget(sanitized);
        }
        // DOMPurify가 로드되지 않은 경우 폴백 (위험! 가급적 로드 필수)
        console.warn('[renderMarkdown] DOMPurify가 로드되지 않았습니다.');
        return applyExternalLinkTarget(rawHtml);
    } 
    catch (e) { return escapeHtml(text); }
}

// ==========================================
// ★ 이미지 URL 정규화
// ==========================================
function normalizeImageUrl(url) {
    if (!url || typeof url !== 'string') return '';
    let result = url.trim();
    if (!result) return '';

    // ★ (0-a) 트위터/X: &name=small, &name=large, &name=orig 등 제거
    //         "?format=jpg&name=small" → "?format=jpg"
    //         "=png&name=small" → "=png"
    result = result.replace(/&(?:name|format)=[^&]*/gi, '');

    // ★ (0-b) 트위터/X: =png, =jpg 뒤의 &로 시작하는 모든 쿼리 제거
    //         "=png&foo=bar" → "=png"
    result = result.replace(/(\.(?:png|jpe?g|gif|webp|svg))=([^&?]*)(?:&[^]*)?/gi, '$1=$2');

    // ★ (1) 확장자 뒤의 모든 쿼리/경로 태그 제거
    //         ".png/revision/latest?cb=2024" → ".png"
    //         ".jpg?format=jpg" → ".jpg"
    const match = result.match(/^(.*\.(?:png|jpe?g|gif|webp|svg))(?:[\/?#=].*)?$/i);
    return match ? match[1] : result;
}

// ==========================================
// ★ 마크다운/텍스트 내 이미지 URL 정규화
// ==========================================
function normalizeImageUrlsInText(text) {
    if (!text || typeof text !== 'string') return text;

    // (1) 마크다운 이미지 문법: ![alt](URL)
    let result = text.replace(
        /!\[([^\]]*)\]\(([^)\s]+)(\s+["'][^"']*["'])?\)/g,
        (match, alt, url, title) => {
            const normalized = normalizeImageUrl(url);
            return `![${alt}](${normalized}${title || ''})`;
        }
    );

    // (2) 일반 텍스트 내 URL (마크다운 문법에 속하지 않은 경우)
    //     .png/.jpg/.jpeg/.gif/.webp/.svg 뒤에 /revision/... ?cb=... 등이 붙은 패턴
    result = result.replace(
        /(https?:\/\/[^\s)]+?\.(?:png|jpe?g|gif|webp|svg))(?:\/(?:revision|scale-to-width-down)\/[^\s)]*|\?[^\s)]*)/gi,
        (match, baseUrl) => baseUrl
    );

    return result;
}
