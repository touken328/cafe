// ==========================================
// db_backup.js : Supabase DB 연동 백업/복원 및 데이터 동기화
// ==========================================

// [중요] 본인의 Supabase 프로젝트 URL과 ANON KEY를 입력하세요.
const SUPABASE_URL = 'https://xsxbqjeifdsqbuhkvzqk.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_6xyRTKLLNX8Abr3CxG7QPg_SsLky_4y';

// Supabase 클라이언트 초기화 (CDN 방식)
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// 전역 캐시 변수 (DB 데이터를 메모리에 유지하여 동기식 함수 호환)
const dbCache = {
    outer: [],
    inner: [],
    flashback: [],
    story: [],
    info: []
};

// DB 데이터 로드 함수
async function fetchWikiDataFromDB(categoryName) {
    if (!supabaseClient) return [];
    const { data, error } = await supabaseClient
        .from('wiki_posts')
        .select('data')
        .eq('category', categoryName);

    if (error) {
        console.error(`[DB Error] ${categoryName} 로드 실패:`, error.message);
        return [];
    }
    return data.map(item => item.data);
}

// DB 데이터 저장(업서트) 함수
async function saveWikiDataToDB(categoryName, postsArray) {
    if (!supabaseClient) return;
    for (const post of postsArray) {
        const { error } = await supabaseClient
            .from('wiki_posts')
            .upsert({
                id: String(post.id),
                category: categoryName,
                data: post,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
            
        if (error) console.error(`[DB Error] ${categoryName} 저장 실패 (ID: ${post.id}):`, error.message);
    }
}

// DB 데이터 전체 삭제 함수
async function deleteAllWikiDataFromDB() {
    if (!supabaseClient) return;
    // Supabase에서 전체 삭제를 위해 neq (not equal) 조건을 활용하여 모든 행 삭제
    const { error } = await supabaseClient
        .from('wiki_posts')
        .delete()
        .neq('id', '0'); // id가 '0'이 아닌 모든 데이터 삭제 (전체 삭제 효과)

    if (error) console.error('[DB Error] 전체 데이터 삭제 실패:', error.message);
}

// 동기식 인터페이스 호환용 래퍼 함수 (다른 스크립트에서 getPosts() 등을 호출할 때 사용)
// ★ 복사본을 돌려준다: 호출한 쪽이 배열을 수정(push/대입)해도 캐시가 먼저 바뀌지 않아야
//   저장 시점에 "무엇이 바뀌었는지"를 비교해서 DB에 반영할 수 있다.
function getPosts() { return dbCache.outer.slice(); }
function getInnerPosts() { return dbCache.inner.slice(); }
function getFlashbackPosts() { return dbCache.flashback.slice(); }
function getStoryPosts() { return dbCache.story.slice(); }
function getInfoPosts() { return dbCache.info.slice(); }

// ==========================================
// ★ 로그인 상태 / 권한 (표시용. 실제 권한은 Supabase RLS가 강제)
//   Next.js 로그인 페이지와 같은 출처 → 같은 localStorage 세션을 공유한다.
// ==========================================
const wikiAuth = { role: 'guest', username: null };
function canWrite() { return wikiAuth.role === 'editor' || wikiAuth.role === 'admin'; }
function isAdmin() { return wikiAuth.role === 'admin'; }

async function loadWikiRole() {
    let role = 'guest', username = null;
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            const { data } = await supabaseClient
                .from('profiles').select('username, role')
                .eq('id', session.user.id).maybeSingle();
            role = (data && data.role) || 'member';
            username = (data && data.username) || null;
        }
    } catch (e) {
        console.error('[Auth] 권한 확인 실패:', e);
    }
    wikiAuth.role = role;
    wikiAuth.username = username;
    document.body.dataset.role = role;
}

// ==========================================
// ★ DB 저장 (변경된 글만 upsert, 사라진 글만 delete)
// ==========================================
function _makeSaver(key, category) {
    return function (nextPosts) {
        const prev = dbCache[key];
        const prevJson = new Map(prev.map(p => [String(p.id), JSON.stringify(p)]));
        const nextIds = new Set(nextPosts.map(p => String(p.id)));
        const changed = nextPosts.filter(p => prevJson.get(String(p.id)) !== JSON.stringify(p));
        const removedIds = prev.filter(p => !nextIds.has(String(p.id))).map(p => String(p.id));

        dbCache[key] = nextPosts.slice();   // 화면은 즉시 갱신
        if (changed.length === 0 && removedIds.length === 0) return;
        _persistChanges(category, changed, removedIds);
    };
}

async function _persistChanges(category, changed, removedIds) {
    if (!supabaseClient) return;
    try {
        if (changed.length) {
            const rows = changed.map(post => ({
                id: String(post.id), category, data: post, updated_at: new Date().toISOString()
            }));
            const { error } = await supabaseClient.from('wiki_posts').upsert(rows, { onConflict: 'id' });
            if (error) throw error;
        }
        if (removedIds.length) {
            // RLS로 거부된 삭제는 오류 없이 0행이 반환되므로 개수를 직접 확인한다.
            const { data, error } = await supabaseClient
                .from('wiki_posts').delete().in('id', removedIds).select('id');
            if (error) throw error;
            if ((data || []).length !== removedIds.length) throw new Error('삭제 권한이 없습니다.');
        }
    } catch (err) {
        console.error('[DB] 저장 실패:', err);
        alert('서버에 저장하지 못했습니다. 권한이 없거나 로그인이 만료되었을 수 있습니다.\n(' + (err.message || err) + ')');
        await refreshAllCache();   // 서버 상태로 되돌림
        if (typeof renderAllPostsList === 'function') renderAllPostsList(false);
    }
}

const _savers = {
    outer:     _makeSaver('outer', 'outer'),
    inner:     _makeSaver('inner', 'inner'),
    flashback: _makeSaver('flashback', 'flashback'),
    story:     _makeSaver('story', 'story'),
    info:      _makeSaver('info', 'info'),
};
// 기존(localStorage 저장) 함수들을 DB 저장으로 대체
function savePosts(posts)          { _savers.outer(posts); }
function saveInnerPosts(posts)     { _savers.inner(posts); }
function saveFlashbackPosts(posts) { _savers.flashback(posts); }
function saveStoryPosts(posts)     { _savers.story(posts); }
function saveInfoPosts(posts)      { _savers.info(posts); }

// DB에서 최신 데이터를 다시 불러와 캐시를 갱신하는 함수
async function refreshAllCache() {
    if (!supabaseClient) return;
    dbCache.outer = await fetchWikiDataFromDB('outer');
    dbCache.inner = await fetchWikiDataFromDB('inner');
    dbCache.flashback = await fetchWikiDataFromDB('flashback');
    dbCache.story = await fetchWikiDataFromDB('story');
    dbCache.info = await fetchWikiDataFromDB('info');
}

// ==========================================
// ★ 메인 로직 시작
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {

    // 1. 초기 데이터 로드 (DB 연동)
    if (supabaseClient) {
        await Promise.all([refreshAllCache(), loadWikiRole()]);
        console.log('[DB] 모든 위키 데이터 초기 로드 완료:', dbCache);

        // 다른 탭/페이지에서 로그인·로그아웃하면 권한 표시를 갱신
        supabaseClient.auth.onAuthStateChange(() => { setTimeout(loadWikiRole, 0); });
        
        // 데이터 로드 후 화면 갱신 (다른 스크립트의 렌더링 함수 호출)
        if (typeof renderAllPostsList === 'function') renderAllPostsList(false);
    } else {
        console.warn('Supabase 클라이언트가 초기화되지 않았습니다. URL과 KEY를 확인하세요.');
    }

    // ==========================================
    // ★ 악성 데이터 검증
    // ==========================================
    function sanitizeImportedPost(post) {
        if (!post || typeof post !== 'object') return null;
        const safe = Object.assign({}, post);
        delete safe.__proto__;
        delete safe.constructor;
        delete safe.prototype;

        const LIMIT = 500000;
        const sanitizeStr = (s) => (typeof s === 'string' && s.length > LIMIT) ? s.slice(0, LIMIT) : s;
        ['name','namejp','dopa','dojong','status','rare','height','chara1','chara2','image','voice','art','act','intro','memo','category','innerType','flashbackNumber','flashbackTitle','flashbackTitlejp','flashbackRegion','flashbackName','flashbackLines','mutualLines1','mutualLines2','illustMemo','mainCategory','title','titlejp','region','content','Numbers'].forEach(k => {
            if (k in safe) safe[k] = sanitizeStr(safe[k]);
        });

        if (Array.isArray(safe.tags)) safe.tags = safe.tags.filter(t => typeof t === 'string').map(t => t.slice(0, 200));
        if (Array.isArray(safe.swordNumbers)) safe.swordNumbers = safe.swordNumbers.filter(n => typeof n === 'string' || typeof n === 'number');

        if (safe.stats && typeof safe.stats === 'object') {
            const keys = ['life','strike','command','mobility','charge','critical','scout','hide'];
            const ns = {};
            keys.forEach(k => {
                const v = safe.stats[k];
                ns[k] = (typeof v === 'string' || typeof v === 'number') ? String(v).slice(0, 50) : '';
            });
            safe.stats = ns;
        }
        return safe;
    }

    // ==========================================
    // ★ 백업 분할 저장 로직
    // ==========================================
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    const getByteLength = (str) => new TextEncoder().encode(str).length;

    function splitIntoChunks(posts, metaBase, indent = 2) {
        const chunks = [];
        let currentChunk = [];
        let currentSize = 0;

        const metaStr = JSON.stringify({ _meta: metaBase, posts: [] }, null, indent);
        const metaSize = getByteLength(metaStr);

        for (const post of posts) {
            const postStr = JSON.stringify(post, null, indent);
            const postSize = getByteLength(postStr) + 1;

            if (postSize + metaSize > MAX_FILE_SIZE) {
                if (currentChunk.length > 0) {
                    chunks.push(currentChunk);
                    currentChunk = [];
                    currentSize = 0;
                }
                chunks.push([post]);
                continue;
            }

            if (currentChunk.length > 0 && currentSize + postSize + metaSize > MAX_FILE_SIZE) {
                chunks.push(currentChunk);
                currentChunk = [];
                currentSize = 0;
            }
            currentChunk.push(post);
            currentSize += postSize;
        }
        if (currentChunk.length > 0) chunks.push(currentChunk);
        return chunks;
    }

    // ==========================================
    // ★ 백업 버튼 이벤트
    // ==========================================
    const backupBtn = document.getElementById('btn-json-backup');
    if (backupBtn) {
        backupBtn.addEventListener('click', async () => {
            // 백업 전 최신 DB 상태를 한 번 더 동기화
            await refreshAllCache();

            const outerPosts = dbCache.outer;
            const innerPosts = dbCache.inner;
            const flashbackPosts = dbCache.flashback;
            const storyPosts = dbCache.story;
            const infoPosts = dbCache.info;

            if (outerPosts.length === 0 && innerPosts.length === 0 && flashbackPosts.length === 0 && storyPosts.length === 0 && infoPosts.length === 0) {
                alert('백업할 데이터가 없습니다.');
                return;
            }

            const version = typeof CURRENT_VERSION !== 'undefined' ? CURRENT_VERSION : 2;
            const exportedAt = new Date().toISOString();
            const downloadQueue = [];

            const addToQueue = (posts, storageName, category, filenameBase) => {
                if (posts.length === 0) return;
                const chunks = splitIntoChunks(posts, { version, storage: storageName, category, exportedAt });
                chunks.forEach((chunk, i) => {
                    const suffix = chunks.length > 1 ? `_part${i + 1}` : '';
                    downloadQueue.push({
                        filename: `wiki_backup_${filenameBase}${suffix}.json`,
                        payload: { _meta: { version, storage: storageName, category, exportedAt, count: chunk.length, chunkIndex: i + 1, totalChunks: chunks.length }, posts: chunk }
                    });
                });
            };

            addToQueue(storyPosts, 'wikiStoryPosts', '스토리', '스토리');
            addToQueue(infoPosts, 'wikiInfoPosts', '게임 정보', '게임 정보');
            addToQueue(innerPosts, 'wikiInnerPosts', '내번', '내번');
            addToQueue(flashbackPosts, 'wikiFlashbackPosts', '회상', '회상');

            // 도검남사(outer)는 카테고리별로 나누어 백업
            if (outerPosts.length > 0) {
                const backupData = {};
                outerPosts.forEach(post => {
                    const cat = post.category || '도검남사';
                    if (!backupData[cat]) backupData[cat] = [];
                    backupData[cat].push(post);
                });
                Object.entries(backupData).forEach(([cat, data]) => {
                    addToQueue(data, 'wikiPosts', cat, cat);
                });
            }

            if (downloadQueue.length === 0) {
                alert('백업할 데이터가 없습니다.');
                return;
            }

            const DOWNLOAD_DELAY = 500;
            downloadQueue.forEach((item, index) => {
                setTimeout(() => {
                    try {
                        const blob = new Blob([JSON.stringify(item.payload, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = item.filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                    } catch (err) {
                        console.error(`[backup] ${item.filename} 다운로드 실패:`, err);
                    }
                }, index * DOWNLOAD_DELAY);
            });
        });
    }

    // ==========================================
    // ★ 복원 기능 (DB 동기화 지원)
    // ==========================================
    const jsonUpload = document.getElementById('jsonUpload');
    if (jsonUpload) {
        jsonUpload.addEventListener('change', (event) => {
            if (!requireWriter()) { event.target.value = ''; return; }
            const files = event.target.files;
            if (files.length === 0) return;

            let outerAdded = 0, innerAdded = 0, flashbackAdded = 0, storyAdded = 0, infoAdded = 0;
            let fileCount = 0;

            // 복원 시에도 기존 데이터와의 중복 검사를 위해 현재 캐시를 복사해 사용
            let existingOuter = [...dbCache.outer];
            let existingInner = [...dbCache.inner];
            let existingFlashback = [...dbCache.flashback];
            let existingStory = [...dbCache.story];
            let existingInfo = [...dbCache.info];

            Array.from(files).forEach((file) => {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const parsedData = JSON.parse(e.target.result);
                        let importedList = [];
                        let target = 'outer';

                        // 파일 구조 분석
                        if (parsedData && Array.isArray(parsedData.posts)) {
                            importedList = parsedData.posts;
                            const storage = parsedData._meta?.storage;
                            if (storage === 'wikiInnerPosts') target = 'inner';
                            else if (storage === 'wikiFlashbackPosts') target = 'flashback';
                            else if (storage === 'wikiStoryPosts') target = 'story';
                            else if (storage === 'wikiInfoPosts') target = 'info';
                            else if (parsedData._meta?.category === '내번') target = 'inner';
                            else if (parsedData._meta?.category === '회상') target = 'flashback';
                            else if (parsedData._meta?.category === '스토리') target = 'story';
                            else if (parsedData._meta?.category === '게임 정보') target = 'info';
                        } else if (Array.isArray(parsedData)) {
                            importedList = parsedData;
                            if (importedList.some(p => p.innerType)) target = 'inner';
                            else if (importedList.some(p => p.flashbackNumber)) target = 'flashback';
                            else if (importedList.some(p => p.mainCategory)) target = 'story';
                            else if (importedList.some(p => p.link !== undefined || p.infoType !== undefined)) target = 'info';
                        } else {
                            throw new Error('지원하지 않는 형식');
                        }

                        // 파일명 기반 타겟 보정
                        if (/회상/.test(file.name)) target = 'flashback';
                        else if (/내번/.test(file.name)) target = 'inner';
                        else if (/스토리/.test(file.name)) target = 'story';
                        else if (/도검남사/.test(file.name)) target = 'outer';
                        else if (/게임 정보/.test(file.name)) target = 'info';

                        const existing = (target === 'inner') ? existingInner : 
                                       (target === 'flashback') ? existingFlashback : 
                                       (target === 'story') ? existingStory : 
                                       (target === 'info') ? existingInfo : existingOuter;

                        const sanitizedList = importedList.map(sanitizeImportedPost).filter(Boolean);

                        sanitizedList.forEach(newPost => {
                            if (!newPost.id) newPost.id = Date.now() + Math.random();

                            const isDup = existing.some(p => {
                                if (String(p.id) === String(newPost.id)) return true;
                                if (target === 'outer' && p.name === newPost.name && p.number === newPost.number) return true;
                                if (target === 'inner' && p.innerType === newPost.innerType) {
                                    const aNums = (p.swordNumbers || []).join(',');
                                    const bNums = (newPost.swordNumbers || []).join(',');
                                    if (aNums === bNums) return true;
                                }
                                if (target === 'flashback' && p.flashbackNumber === newPost.flashbackNumber && p.flashbackRegion === newPost.flashbackRegion) return true;
                                if (target === 'story' && p.title === newPost.title && p.mainCategory === newPost.mainCategory) return true;
                                if (target === 'info' && p.title === newPost.title) return true;
                                return false;
                            });

                            if (!isDup) {
                                existing.push(newPost);
                                if (target === 'inner') innerAdded++;
                                else if (target === 'flashback') flashbackAdded++;
                                else if (target === 'story') storyAdded++;
                                else if (target === 'info') infoAdded++;
                                else outerAdded++;
                            }
                        });

                        fileCount++;
                        if (fileCount === files.length) {
                            // DB에 최종 저장
                            if (outerAdded > 0) await saveWikiDataToDB('outer', existingOuter);
                            if (innerAdded > 0) await saveWikiDataToDB('inner', existingInner);
                            if (flashbackAdded > 0) await saveWikiDataToDB('flashback', existingFlashback);
                            if (storyAdded > 0) await saveWikiDataToDB('story', existingStory);
                            if (infoAdded > 0) await saveWikiDataToDB('info', existingInfo);

                            // 캐시 갱신
                            await refreshAllCache();

                            alert(`DB 복원 완료!\n` + 
                                  `- 도검남사: ${outerAdded}개\n` +
                                  `- 내번: ${innerAdded}개\n` +
                                  `- 회상: ${flashbackAdded}개\n` +
                                  `- 스토리: ${storyAdded}개\n` +
                                  `- 게임 정보: ${infoAdded}개`
                            );
                            event.target.value = '';

                            // 화면 갱신
                            if (typeof currentListState !== 'undefined') {
                                if (currentListState.type === 'inner') renderInnerList(currentListState.value || '모두 보기', false);
                                else if (currentListState.type === 'flashback') renderFlashbackList(currentListState.value || '모두 보기', false);
                                else if (currentListState.type === 'story') renderStoryList(currentListState.value || '모두 보기', false);
                                else if (currentListState.type === 'info') renderInfoList(currentListState.value || '모두 보기', false);
                                else renderAllPostsList(false);
                            }
                        }
                    } catch (err) {
                        alert(`${file.name} 복원 오류: ${err.message}`);
                        fileCount++; // 오류 발생 시에도 카운트하여 무한 대기 방지
                    }
                };
                reader.readAsText(file);
            });
        });
    }

    // ==========================================
    // ★ 전체 리셋 (DB 연동 지원)
    // ==========================================
    const resetBtn = document.getElementById('btn-reset-all');
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            if (!requireAdmin()) return;
            await refreshAllCache();
            const total = dbCache.outer.length + dbCache.inner.length + dbCache.flashback.length + dbCache.story.length + dbCache.info.length;
            
            if (total === 0) { alert('삭제할 데이터가 없습니다.'); return; }

            const step1 = confirm(
                `⚠️ 모든 데이터를 DB에서 삭제하시겠습니까?\n` +
                `- 도검남사: ${dbCache.outer.length}개\n` + `- 내번: ${dbCache.inner.length}개\n` +
                `- 회상: ${dbCache.flashback.length}개\n` + `- 스토리: ${dbCache.story.length}개\n` +
                `- 게임 정보: ${dbCache.info.length}개`
            );
            
            if (!step1) return;

            // DB 데이터 전체 삭제 처리
            await deleteAllWikiDataFromDB();

            // 캐시 초기화 및 화면 갱신
            await refreshAllCache();
            const remaining = dbCache.outer.length + dbCache.inner.length + dbCache.flashback.length + dbCache.story.length + dbCache.info.length;
            alert(remaining === 0 ? '모든 데이터가 DB에서 삭제되었습니다.' : '삭제하지 못했습니다. 관리자 권한을 확인하세요.');
            
            if (typeof currentListState !== 'undefined') {
                if (currentListState.type === 'inner') renderInnerList('모두 보기', false);
                else if (currentListState.type === 'flashback') renderFlashbackList('모두 보기', false);
                else if (currentListState.type === 'story') renderStoryList('모두 보기', false);
                else if (currentListState.type === 'info') renderInfoList('모두 보기', false);
                else renderAllPostsList(false);
            }
        });
    }
});