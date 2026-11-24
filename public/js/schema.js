// ==========================================
// schema.js : 필드 정의 (이 파일만 수정하면 폼/상세 자동 반영)
// ==========================================
// - key: 데이터 키 (중첩 경로 지원: 'images.normal')
// - type: 'text'|'select'|'number'|'textarea'|'image'|'tags'|'stats'
// - required: 필수 여부
// - copy: true이면 복사 시 이 필드를 복사
// - markdown: true이면 상세보기에서 마크다운 렌더링

// ==========================================
// ★ 도종별 범위 매핑
// ==========================================
const RANGE_BY_DOJONG = {
    '단도':   ['협'],
    '협차':   ['협'],
    '타도':   ['협'],
    '태도':   ['협'],
    '대태도': ['광'],
    '창':     ['종'],
    '치도':   ['횡'],
    '츠루기': ['협'],
};
// ==========================================
// ★ 도종별 장착 가능 장비 매핑
// ==========================================
const EQUIPMENT_BY_DOJONG = {
    '단도':   ['투석병', '궁병', '총병', '경보병', '중보병'],
    '협차':   ['투석병', '궁병', '경보병', '중보병', '방패병'],
    '타도':   ['투석병', '경보병', '중보병', '방패병', '경기병'],
    '태도':   ['경보병', '중보병', '방패병', '경기병', '중기병'],
    '대태도': ['경보병', '중보병', '방패병', '경기병', '중기병', '정예병'],
    '창':     ['경보병', '중보병', '창병'],
    '치도':   ['경보병', '중보병', '창병'],
    '츠루기': ['경보병', '중보병', '방패병', '정예병', '궁병', '총병'],
};

const FIELD_SCHEMA = {
    profile: {
    label: '프로필',
    fields: [
        { key: 'number',  label: '도검 번호',   type: 'text',  required: true, copy: false },
        { key: 'name',    label: '이름',   type: 'text',  required: true, copy: true,
          formatter: (v, post) => `${v || '-'} (${post.namejp || '-'})` },   // ★ 다른 필드 참조
        { key: 'namejp',  label: '이름(원문)', type: 'text', copy: true, render: 'skip', placeholder: '괄호 없이 한자만' },
        { key: 'dojong',  label: '도종',   type: 'select', required: true, copy: true,
          options: ['단도','협차','타도','태도','대태도','창','치도','츠루기'],
			buttonGroup: true },
        { key: 'dopa',    label: '도파',   type: 'select', required: true, copy: true,
          options: ['미분류','산죠','미이케','아오에','아와타구치','고비젠','라이','무라마사','사다무네','오사후네','사몬지','카네사다','호리카와','코테츠','코테츠…?','마사무네','고우','후쿠오카 이치몬지','분고노쿠니 유키히라','히로미츠','우카이','나미노히라'] },
        { key: 'status',  label: '상태',   type: 'select', required: true, copy: true,
			options: ['통상', '특1', '특2', '특3','극'],
			buttonGroup: true,
			formatter: (v, post) => `${v || '-'} (레어도: ${post.rare || '-'})` },
        { key: 'rare',    label: '레어도', type: 'select',   copy: true, render: 'skip',
          options: ['1','2','3','4','5','6'],
			buttonGroup: true },
        { key: 'slot',    label: '도장슬롯', type: 'select', copy: true, options: ['1칸','2칸','3칸'],
			buttonGroup: true },
{ key: 'stats', label: '스테이터스', type: 'stats', copy: false, render: 'skip', subFields: [
    { key: 'life', label: '생존' },
    { key: 'strike', label: '타격' },
    { key: 'command', label: '통솔' },
    { key: 'mobility', label: '기동' },
    { key: 'charge', label: '충력' },
    { key: 'critical', label: '필살' },
    { key: 'scout', label: '정찰' },
    { key: 'hide', label: '은폐' },
]},
        { key: 'height',  label: '신장',   type: 'text',   copy: true, placeholder: 'cm 없이 숫자만',
          formatter: (v) => v ? `${v}cm` : '-' },
        { key: 'chara1',  label: '1인칭',  type: 'text',   copy: true },
        { key: 'chara2',  label: '주인 호칭', type: 'text', copy: true },
        { key: 'image',   label: '이미지', type: 'image',  copy: false, render: 'skip', placeholder: 'http url' },
        { key: 'tags',    label: '태그',    type: 'tags',   copy: true, render: 'skip' },
        { key: 'voice',   label: '성우',   type: 'text',   copy: true, placeholder: 'cv. 없이 이름만' },
        { key: 'art',     label: '일러스트', type: 'text', copy: true, row: 'footer' },
        { key: 'act',     label: '배우',   type: 'text',   copy: true, row: 'footer', placeholder: '무대판, 뮤지컬 등' },
        { key: 'intro',   label: '도첩소개', type: 'textarea', copy: false, markdown: true, rows: 3, row: 'section', placeholder: '도첩 소개글' },
        { key: 'memo',    label: '공식설명', type: 'textarea', copy: false, markdown: true, rows: 3, row: 'section', placeholder: '공홈 소개글' },
    ]
},
    illust: {
        label: '일러스트',
        fields: [
            { key: 'images.normal',  label: '통상',     type: 'image', copy: false, placeholder: 'http url' },
            { key: 'images.battle',  label: '전투',     type: 'image', copy: false, placeholder: 'http url' },
            { key: 'images.damaged', label: '중상',     type: 'image', copy: false, placeholder: 'http url' },
            { key: 'images.kill',    label: '진검필살', type: 'image', copy: false, placeholder: 'http url' },
            { key: 'images.sit',     label: '궤좌',     type: 'image', copy: false, placeholder: 'http url' },
            { key: 'images.inner',   label: '내번',     type: 'image', copy: true,  placeholder: 'http url' },
            { key: 'images.light',   label: '경장',     type: 'image', copy: true,  placeholder: 'http url' },
            { key: 'images.celeb',   label: '축장',     type: 'image', copy: true,  placeholder: 'http url' },
            { key: 'images.etc',     label: '산책',     type: 'image', copy: false, placeholder: 'http url' },
            { key: 'illustMemo',     label: '기타 공식',     type: 'textarea', copy: true, markdown: true, rows: 12, placeholder: '공식 일러스트만. ![이름](http url) 형식' },
        ]
    },
    lines:     { label: '대사', fields: [
	{ key: 'lines.text',     label: '대사', type: 'textarea', copy: false, markdown: true, rows: 12, placeholder: '표 형식. | 상황 | 일본어 원문 | 한글 번역 |' },
	{ key: 'lines.ranbu',     label: '난무대사', type: 'textarea', copy: false, markdown: true, rows: 12 },
	{ key: 'lines.time',     label: '한정대사', type: 'textarea', copy: false, markdown: true, rows: 12 }
	] },
    etc:       { label: '수행편지', fields: [
	{ key: 'etc1',       label: '1일차', type: 'textarea', copy: true,  markdown: true, rows: 12 },
	{ key: 'etc2',       label: '2일차', type: 'textarea', copy: true,  markdown: true, rows: 12 },
	{ key: 'etc3',       label: '3일차', type: 'textarea', copy: true,  markdown: true, rows: 12 }
	] },
};

// ==========================================
// ★ 탭별 커스텀 렌더러 (없으면 스키마 자동 렌더)
// ==========================================
const TAB_RENDERERS = {
    profile: 'renderProfileTab',        // 레이아웃 특수
    illust:  'renderIllustTab',         // 그리드
    inner:   'renderProfileInnerTab',   // 같은 번호 내번 리스트
    flashback: 'renderProfileFlashbackTab',
    story:     'renderProfileStoryTab',
};

// TAB_ORDER는 그대로
const TAB_ORDER = ['profile', 'illust', 'lines', 'flashback', 'inner', 'story', 'etc'];