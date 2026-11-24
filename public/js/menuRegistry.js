// ==========================================
// menuRegistry.js : 메뉴 정의 (새 메뉴는 여기만 추가)
// ==========================================

const MENU_REGISTRY = {
    'dojong': {
        label: '도검남사 : 도종별',
        defaultOpen: true,
        subs: ['단도', '협차', '타도', '태도', '대태도', '창', '치도', '츠루기','모두 보기'],
        renderer: 'renderPostList',
        historyType: 'dojong',
        specialSubs: {
            '모두 보기': 'renderAllPostsList',
			'★ 북마크만': 'renderAllPostsList'
        }
    },
    'dopa': {
        label: '도검남사 : 도파별',
        subs: ['산죠','미이케','아오에','아와타구치','고비젠','라이','무라마사','사다무네','오사후네','사몬지','카네사다','호리카와','코테츠','코테츠…?','마사무네','고우','후쿠오카 이치몬지','분고노쿠니 유키히라','히로미츠','우카이','나미노히라','미분류'],
        renderer: 'renderDopaList',
        historyType: 'dopa'
    },
    'rare': {
        label: '도검남사 : 레어도',
        subs: ['1','2','3','4','5','6'],
        renderer: 'renderRareList',
        historyType: 'rare'
    },
    'inner': {
        label: '내번',
        subs: ['말당번', '밭당번', '대련','모두 보기'],
        renderer: 'renderInnerList',
        historyType: 'inner-list'
    },
    'flashback': {
        label: '회상 : 번호순',
        subs: ['1-30', '31-60', '61-90', '91-120', '121-150', '151-180', '181-210','모두 보기'],
        renderer: 'renderFlashbackList',
        historyType: 'flashback'
    },
    'flashbackRegion': {
        label: '회상 : 지역순',
        subs: ['1맵','2맵','3맵','4맵','5맵','6맵','7맵','8맵', '제한 없음'],
        renderer: 'renderFlashbackRegion',
        historyType: 'flashbackRegion'
    },
    'etc': {
        label: '이벤트 스토리',
        subs: ['특명조사','대침구', '이거', '백귀야행', '모두 보기'],
        renderer: 'renderStoryList',
		historyType: 'story'
    },
    'info': {
        label: '게임 정보',
        subs: ['게임 시스템', '공략/정보', '이벤트/일정', '미디어믹스', '굿즈', '기타', '모두 보기'],
        renderer: 'renderInfoList',
        historyType: 'info'
    },
};