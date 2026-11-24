// ==========================================
// schema_info.js : 게임 정보 필드 정의
// ==========================================

const INFO_SCHEMA = {
    info: {
        label: '게임 정보',
        fields: [
            { key: 'mainCategory', label: '분류', type: 'select', required: true, copy: true,
              options: ['게임 시스템', '공략/정보', '이벤트/일정', '미디어믹스', '굿즈', '기타'],
              buttonGroup: true },
            { key: 'title',    label: '제목',   type: 'text',     required: true, copy: true,
              placeholder: '제목을 입력하세요' },
            { key: 'image',    label: '이미지', type: 'image',    copy: false,
              placeholder: 'http url 주소 입력' },
            { key: 'content',  label: '본문',   type: 'textarea', copy: false,
              markdown: true, rows: 15, placeholder: '여러 줄 입력. 마크다운 사용 가능' },
            { key: 'tags',     label: '태그',   type: 'tags',     copy: true,
              placeholder: '쉼표(,)로 구분' },
            { key: 'link',     label: '링크',   type: 'link',     copy: true,
              placeholder: 'http url 주소 입력' },
        ]
    },
};

const INFO_STORAGE_KEY = 'wikiInfoPosts';