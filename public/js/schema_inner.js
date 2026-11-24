// ==========================================
// schema_flashback.js : 회상 필드 정의
// ==========================================

const FLASHBACK_SCHEMA = {
    flashback: {
        label: '회상',
        fields: [
            { key: 'flashbackNumber', label: '회상 번호', type: 'text', required: true, copy: true,
              placeholder: '숫자만 입력' },
            { key: 'swordNumbers',    label: '도검 번호', type: 'tags', required: true, copy: true,
              placeholder: '번호만 작성. 쉼표(,)로 구분 (예: 3, 5)' },
            { key: 'flashbackTitle', label: '회상 제목', type: 'text', copy: true,
              placeholder: '예: 히지카타 이야기' },
            { key: 'flashbackTitlejp', label: '원문 제목', type: 'text', copy: true,
              placeholder: '예: 土方の話' },
            { key: 'flashbackRegion', label: '회상 맵', type: 'text', copy: true,
              placeholder: '예: 1-1' },
            { key: 'flashbackName', label: '지역 이름', type: 'text', copy: true,
              placeholder: '예: 유신의 기억 - 하코다테 (維新の記憶 - 函館)' },
            { key: 'image',           label: '이미지',   type: 'image', copy: false,
              placeholder: 'http url 주소 입력' },
            { key: 'flashbackLines',  label: '회상 대사', type: 'textarea', copy: false,
              markdown: true, rows: 12, placeholder: '여러 줄 입력. 마크다운 사용 가능' },
            { key: 'tags',            label: '태그',     type: 'tags', copy: true,
              placeholder: '쉼표(,)로 구분' },
        ]
    },
};

const FLASHBACK_STORAGE_KEY = 'wikiFlashbackPosts';

// ==========================================
// schema_inner.js : 내번 필드 정의
// ==========================================

const INNER_SCHEMA = {
    inner: {
        label: '내번',
        fields: [
            { key: 'innerType', label: '내번타입', type: 'select', required: true, copy: true,
              options: ['말당번','밭당번','대련'],
			  buttonGroup: true,
			},
            { key: 'swordNumbers', label: '도검 번호', type: 'tags', required: true, copy: true,
              placeholder: '번호만 작성. 쉼표(,)로 구분 (예: 3, 5)' },
            { key: 'image1', label: '이미지', type: 'image', copy: false, placeholder: 'http url 주소 입력' },
            { key: 'mutualLines1', label: '시작 대사', type: 'textarea', copy: false, markdown: true, rows: 12, placeholder: '내번 시작 시 상호대사' },
            { key: 'mutualLines2', label: '종료 대사', type: 'textarea', copy: false, markdown: true, rows: 12, placeholder: '내번 종료 시 상호대사' },
            { key: 'tags', label: '태그', type: 'tags', copy: true, placeholder: '쉼표(,)로 구분' },
        ]
    },
};

const INNER_STORAGE_KEY = 'wikiInnerPosts';
const INNER_MENU_DATA = {
    '내번': ['말당번', '밭당번', '대련', '모두 보기']
};