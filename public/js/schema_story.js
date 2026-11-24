// ==========================================
// schema_story.js : 스토리(특명조사/기타) 필드 정의
// ==========================================

const STORY_SCHEMA = {
    story: {
        label: '스토리',
        fields: [
            { key: 'mainCategory', label: '분류', type: 'select', required: true, copy: true,
              options: ['특명조사', '백귀야행', '대침구', '이거', '기타'],
              buttonGroup: true },
            { key: 'Numbers', label: '번호', type: 'tags', copy: true,
              placeholder: '스토리별 순서' },
            { key: 'title',        label: '이벤트명',     type: 'text', required: true, copy: true,
              placeholder: '예: 쥬라쿠테이' },
            { key: 'titlejp',       label: '이벤트 원문',     type: 'text', copy: true,
              placeholder: '예: 聚楽第' },
            { key: 'region',       label: '최초 발생일',     type: 'text', copy: true,
              placeholder: '예: 2019.4.24' },
            { key: 'image',        label: '이미지',   type: 'image', copy: false,
              placeholder: 'http url 주소 입력' },
            { key: 'content',      label: '내용',     type: 'textarea', copy: false,
              markdown: true, rows: 15, placeholder: '여러 줄 입력. 마크다운 사용 가능' },
            { key: 'swordNumbers', label: '도검 번호', type: 'tags', copy: true,
              placeholder: '번호만 작성. 쉼표(,)로 구분 (예: 3, 5)' },
            { key: 'tags',         label: '태그',     type: 'tags', copy: true,
              placeholder: '쉼표(,)로 구분' },
        ]
    },
};

const STORY_STORAGE_KEY = 'wikiStoryPosts';