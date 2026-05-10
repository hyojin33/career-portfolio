/**
 * 직업적성검사(q=21) 7점 척도 문항별 점수 설명
 * 1=전혀 그렇지 않다 ~ 7=매우 그렇다
 */
export const APTITUDE_SCALE_MIN = 1;
export const APTITUDE_SCALE_MAX = 7;
export const APTITUDE_SCALE_LABEL_LOW = "< 전혀 그렇지 않다";
export const APTITUDE_SCALE_LABEL_HIGH = "> 매우 그렇다";

/** 문항번호 → { 점수: 설명 } */
export const APTITUDE_POINT_DESCRIPTIONS: Record<string, Record<number, string>> = {
  "1": {
    2: "서서 몸을 앞으로 숙였을 때, 손끝이 발목까지만 닿는다.",
    6: "서서 몸을 앞으로 숙였을 때, 손바닥이 쉽게 땅에 닿는다.",
  },
  "2": {
    2: "무릎 대고 팔굽혀펴기를 5회 이상 하기 어렵다.",
    6: "팔굽혀 펴기를 쉬지 않고 (남자: 50, 여자: 20)회 이상 할 수 있다.",
  },
  "3": {
    2: "운동기구를 사용하여 공을 잘 맞추지 못한다.",
    5: "운동기구를 사용하여 공을 원하는 곳에 잘 보낸다.",
  },
};

/** 4-6번 형식: 좌(낮은 점수) / 우(높은 점수) 설명 */
export const APTITUDE_LEFT_RIGHT_DESCRIPTIONS: Record<
  string,
  { left: string; leftPoint: number; right: string; rightPoint: number }
> = {
  "4": {
    left: "새로운 동작을 배우는데 남들보다 오래 걸린다.",
    leftPoint: 2,
    right: "처음 보는 운동 혹은 춤 동작을 한두 번 만에 따라할 수 있다.",
    rightPoint: 6,
  },
  "5": {
    left: "눈을 감고 한쪽 다리를 앞으로 뻗어 10초 이상 버티기 어렵다.",
    leftPoint: 2,
    right: "눈을 감고 한쪽 다리를 앞으로 뻗어 1분 이상 서 있을 수 있다.",
    rightPoint: 6,
  },
  "6": {
    left: "줄넘기를 시작하면 금방 발에 걸린다.",
    leftPoint: 2,
    right: "이단 줄넘기를 10개 이상 쉽게 할 수 있다.",
    rightPoint: 6,
  },
  "7": {
    left: "운동경기의 흐름을 파악하기 어렵다.",
    leftPoint: 2,
    right: "운동경기의 흐름을 예측하고 상황에 맞게 움직인다.",
    rightPoint: 6,
  },
  "8": {
    left: "운동할 때 몸을 어떻게 움직여야 할지 잘 모르겠다.",
    leftPoint: 2,
    right: "운동의 효과를 높일 수 있는 동작과 자세를 알고 시도한다.",
    rightPoint: 6,
  },
  "9": {
    left: "처음 보는 도구나 측정장비 사용방법을 파악하기 어렵다.",
    leftPoint: 2,
    right: "처음 보는 도구나 측정장비를 정확하게 사용할 수 있다.",
    rightPoint: 6,
  },
  "10": {
    left: "망치로 못을 제대로 치지 못한다.",
    leftPoint: 2,
    right: "망치로 못을 정확히 쳐서 깔끔하게 박을 수 있다.",
    rightPoint: 5,
  },
  "11": {
    left: "헤어스타일을 여러 번 해도 왠지 어색하다.",
    leftPoint: 2,
    right: "나와 다른 사람의 헤어스타일을 원하는 대로 연출할 수 있다.",
    rightPoint: 6,
  },
  "12": {
    left: "사용하기 위한 물건을 만들 자신이 없다.",
    leftPoint: 2,
    right: "필요한 가구/소품을 만들어서 사용해 본 적이 있다.",
    rightPoint: 6,
  },
  "13": {
    left: "내가 만든 점토 모형이 무엇인지 사람들이 알아채지 못한다.",
    leftPoint: 2,
    right: "머릿속에 떠오른 이미지를 정교하게 점토로 표현할 수 있다.",
    rightPoint: 6,
  },
  "14": {
    left: "설명서를 봐도 조립하기 어렵다.",
    leftPoint: 2,
    right: "새로 산 물건을 설명서 없이 완벽하게 조립하여 작동시킬 수 있다.",
    rightPoint: 6,
  },
  "15": {
    left: "시간을 많이 들여도 요리재료를 고르게 자르지 못한다.",
    leftPoint: 2,
    right: "요리 재료를 빠르고 고르게 자를 수 있다.",
    rightPoint: 6,
  },
  "16": {
    left: "물건을 분해하면 다시 조립하기 어렵다.",
    leftPoint: 2,
    right: "처음 보는 물건도 분해한 뒤 완벽하게 조립할 수 있다.",
    rightPoint: 6,
  },
  "17": {
    left: "단순한 퍼즐도 맞추기 어렵다.",
    leftPoint: 2,
    right: "1,000조각 이상의 퍼즐을 맞출 수 있다.",
    rightPoint: 6,
  },
  "18": {
    left: "자주 가는 길을 설명하기 어렵다.",
    leftPoint: 2,
    right: "처음 가본 길을 약도로 그릴 수 있다.",
    rightPoint: 5,
  },
  "19": {
    left: "내가 사용한 물건의 원래 위치를 기억하기 어렵다.",
    leftPoint: 2,
    right: "여러 사물의 원래 위치를 정확하게 기억할 수 있다.",
    rightPoint: 6,
  },
  "20": {
    left: "삼각기둥의 전개도를 그리는 것이 어렵다.",
    leftPoint: 2,
    right: "축구공을 보고 전개도를 그릴 수 있다.",
    rightPoint: 6,
  },
  "21": {
    left: "지도의 등고선을 보고 가장 높은 지점을 찾을 수 있다.",
    leftPoint: 2,
    right: "지도의 등고선을 보고 지형을 파악할 수 있다.",
    rightPoint: 6,
  },
  "22": {
    left: "ㄱ자를 시계방향으로 회전시킨 모양을 알 수 있다.",
    leftPoint: 2,
    right: "입체도형의 회전된 모양을 정확하게 파악할 수 있다.",
    rightPoint: 6,
  },
  "23": {
    left: "피라미드 모양으로 쌓인 블록에서 보이는 면의 블록 개수만 알 수 있다.",
    leftPoint: 2,
    right: "피라미드 모양으로 쌓인 블록 중, 보이지 않는 블록의 개수를 파악할 수 있다.",
    rightPoint: 6,
  },
  "24": {
    left: "북두칠성을 밤하늘에서 찾기가 어렵다.",
    leftPoint: 2,
    right: "별자리 그림을 보고 밤하늘의 별자리를 잘 찾을 수 있다.",
    rightPoint: 6,
  },
  "25": {
    left: "노래를 여러 번 들어도 따라 부르기 어렵다.",
    leftPoint: 2,
    right: "처음 듣는 노래도 정확한 음정으로 부를 수 있다.",
    rightPoint: 6,
  },
  "26": {
    left: "자신 있게 연주할 수 있는 악기가 없다.",
    leftPoint: 2,
    right: "3개 이상의 악기를 잘 다룰 수 있다. (트라이 앵글, 캐스터네츠, 탬버린 제외)",
    rightPoint: 6,
  },
  "27": {
    left: "쉬운 곡을 배우는데도 오랜 시간이 걸린다.",
    leftPoint: 2,
    right: "한두 번 배우면 곡을 연주할 수 있다.",
    rightPoint: 6,
  },
  "28": {
    left: "하나의 음을 들어도 음정을 구별하기 어렵다.",
    leftPoint: 2,
    right: "2-3개 이상의 음을 동시에 듣고 음정을 말할 수 있다.",
    rightPoint: 6,
  },
  "29": {
    left: "연주곡을 들을 때 악기소리를 구별하기 어렵다.",
    leftPoint: 2,
    right: "오케스트라 연주를 듣고 5개 이상의 악기 소리를 구별할 수 있다.",
    rightPoint: 6,
  },
  "30": {
    left: "처음 보는 악보를 읽기 어렵다.",
    leftPoint: 2,
    right: "악보를 보자마자 정확한 음정으로 노래할 수 있다.",
    rightPoint: 6,
  },
  "31": {
    left: "별생각 없이 음악을 듣는다.",
    leftPoint: 2,
    right: "음악의 구성요소와 개념을 이해하며 듣는다.",
    rightPoint: 6,
  },
  "32": {
    left: "나의 생활에서 음악이 차지하는 비중이 적다.",
    leftPoint: 2,
    right: "음악공연을 기획하거나 출연한 적이 있다.",
    rightPoint: 6,
  },
  "33": {
    left: "어떤 주제에 대해 아이디어가 거의 떠오르지 않는다.",
    leftPoint: 2,
    right: "짧은 시간 동안 다양한 아이디어가 떠오른다.",
    rightPoint: 6,
  },
  "34": {
    left: "남들이 하는 대로 따라 하는 편이다.",
    leftPoint: 2,
    right: "항상 독특하고 새로운 것을 만들어 낸다.",
    rightPoint: 6,
  },
  "35": {
    left: "어떤 문제에 대해 새로운 각도로 생각하기 어렵다.",
    leftPoint: 2,
    right: "기존 틀에 벗어나서 다른 시각에서 해결책을 찾으려고 한다.",
    rightPoint: 6,
  },
  "36": {
    left: "실패가 두려워 도전하는 경우가 적다.",
    leftPoint: 2,
    right: "실패를 두려워하지 않고 아이디어를 행동으로 옮긴다.",
    rightPoint: 6,
  },
  "37": {
    left: "아이디어를 정리하기 어렵다.",
    leftPoint: 2,
    right: "아이디어를 실현 가능하게 만들 수 있다.",
    rightPoint: 6,
  },
  "38": {
    left: "어떤 과목이든 다른 과목과 연결하기 어렵다.",
    leftPoint: 2,
    right: "한 과목에서 배운 내용을 다른 과목에 적용하여 활용할 수 있다.",
    rightPoint: 6,
  },
  "39": {
    left: "새로운 콘텐츠를 만드는 데 상상력을 발휘하기 어렵다.",
    leftPoint: 2,
    right: "상상력을 발휘하여 만든 콘텐츠가 많다.",
    rightPoint: 6,
  },
  "40": {
    left: "기존의 방식에서 벗어나서 생각하기 어렵다.",
    leftPoint: 2,
    right: "한가지 물건을 다양한 용도로 활용할 수 있다.",
    rightPoint: 6,
  },
  "41": {
    left: "어떤 단어의 유사어, 동의어를 거의 떠올리지 못한다.",
    leftPoint: 2,
    right: "유사어, 동의어를 이용하여 해당 문장을 다시 표현할 수 있다.",
    rightPoint: 6,
  },
  "42": {
    left: "하나의 완성된 문장으로 표현하기 어렵다.",
    leftPoint: 2,
    right: "2개 이상의 의미가 결합된 문장을 사용할 수 있다.",
    rightPoint: 5,
  },
  "43": {
    left: "맞춤법에 맞게 글을 쓰는 것이 어렵다.",
    leftPoint: 2,
    right: "다른 사람의 글을 문법에 맞게 고쳐줄 수 있다.",
    rightPoint: 6,
  },
  "44": {
    left: "같은 문장이 이해가 안 돼서 반복하여 읽는 편이다.",
    leftPoint: 2,
    right: "300페이지 이상의 책을 하루 만에 읽을 수 있다.",
    rightPoint: 6,
  },
  "45": {
    left: "근거 없이 주장한다는 이야기를 종종 듣는다.",
    leftPoint: 2,
    right: "토론에서 논리적인 근거로 상대방을 설득할 수 있다.",
    rightPoint: 6,
  },
  "46": {
    left: "글을 2-3번 읽어도 내용 파악이 어렵다.",
    leftPoint: 2,
    right: "글의 핵심 내용을 한 문장으로 표현할 수 있다.",
    rightPoint: 6,
  },
  "47": {
    left: "외국어 습득이 매우 느리다.",
    leftPoint: 2,
    right: "외국어 문장의 구조나 문법을 쉽게 이해할 수 있다.",
    rightPoint: 6,
  },
  "48": {
    left: "문학작품을 거의 읽지 않는다.",
    leftPoint: 2,
    right: "문학작품을 읽으면서 카타르시스(감동, 전율)를 경험한 적 있다.",
    rightPoint: 6,
  },
  "49": {
    left: "수학 기호 중 의미를 말할 수 없는 것이 대부분이다.",
    leftPoint: 2,
    right: "수학 기호의 의미를 정확히 설명할 수 있다.",
    rightPoint: 6,
  },
  "50": {
    left: "수학 지식을 실생활과 연관시키기 어렵다.",
    leftPoint: 2,
    right: "은행 이율을 바탕으로 내가 1년간 저금한 돈의 원금과 이자 합계를 구할 수 있다.",
    rightPoint: 6,
  },
  "51": {
    left: "사칙연산도 틀리는 경우가 있다.",
    leftPoint: 2,
    right: "위 문제의 답을 쉽게 구할 수 있다.",
    rightPoint: 5,
  },
  "52": {
    left: "도표나 그래프를 바탕으로 통계자료의 특성을 이해하기 어렵다.",
    leftPoint: 2,
    right: "복잡한 도표나 그래프를 바탕으로 자료의 특성을 설명할 수 있다.",
    rightPoint: 6,
  },
  "53": {
    left: "문제1의 답을 쉽게 구할 수 있다.",
    leftPoint: 2,
    right: "문제2의 답을 찾고 규칙의 특성을 설명할 수 있다.",
    rightPoint: 5,
  },
  "54": {
    left: "문제의 원인을 파악하는 것이 쉽지 않다.",
    leftPoint: 2,
    right: "문제해결과 관련된 일련의 과정을 단계별로 잘 수행할 수 있다.",
    rightPoint: 6,
  },
  "55": {
    left: "과학 실험의 의미를 잘 알지 못한다.",
    leftPoint: 2,
    right: "과학실험의 각 단계별 인과관계를 구체적으로 설명할 수 있다.",
    rightPoint: 6,
  },
  "56": {
    left: "범죄 수사물에서 어떤 것이 단서인지 파악하기 어렵다.",
    leftPoint: 2,
    right: "범죄 수사물을 보고 범인을 잘 찾아내는 편이다.",
    rightPoint: 6,
  },
  "57": {
    left: "깊게 생각하지 않고 행동하는 편이다.",
    leftPoint: 2,
    right: "내 행동이 타인과 주변에 미칠 영향을 신중히 생각해보고 행동한다.",
    rightPoint: 5,
  },
  "58": {
    left: "작은 일에도 쉽게 화를 낸다.",
    leftPoint: 2,
    right: "화가 나더라도 차분함을 잘 유지한다.",
    rightPoint: 6,
  },
  "59": {
    left: "나의 특성을 파악하는 것이 어렵다.",
    leftPoint: 2,
    right: "나의 특성을 명확하게 파악하고 활용할 수 있다.",
    rightPoint: 6,
  },
  "60": {
    left: "계획에 따라 실천하는 것이 어렵다.",
    leftPoint: 2,
    right: "목표와 계획을 세우면 대부분 지킨다.",
    rightPoint: 6,
  },
  "61": {
    left: "가끔 맡은 일에 책임지지 못할 때가 있다.",
    leftPoint: 2,
    right: "어떤 어려움이 있어도 맡은 일은 반드시 해내려고 노력한다.",
    rightPoint: 6,
  },
  "62": {
    left: "시간을 허투루 쓰는 일이 많다.",
    leftPoint: 2,
    right: "주어진 시간을 잘 쪼개서 쓴다.",
    rightPoint: 6,
  },
  "63": {
    left: "규칙적인 생활이 어렵다.",
    leftPoint: 2,
    right: "규칙적인 생활(운동, 식습관, 수면 등)을 잘 유지한다.",
    rightPoint: 6,
  },
  "64": {
    left: "계획성 없이 돈을 쓴다.",
    leftPoint: 2,
    right: "돈을 낭비하지 않고 계획성 있게 쓴다.",
    rightPoint: 6,
  },
  "65": {
    left: "다른 사람의 어려움을 들어도 별 느낌이 없다.",
    leftPoint: 2,
    right: "다른 사람의 어려움을 들으면 내 일처럼 아프다.",
    rightPoint: 5,
  },
  "66": {
    left: "주변 사람들이 나를 어떻게 생각하는지 잘 모르겠다.",
    leftPoint: 2,
    right: "대부분의 사람들이 나를 좋게 평가한다.",
    rightPoint: 6,
  },
  "67": {
    left: "처음 만난 사람에게 말을 걸기가 어렵다.",
    leftPoint: 2,
    right: "처음 만난 사람과도 쉽게 친해진다.",
    rightPoint: 6,
  },
  "68": {
    left: "다른 사람에게 먼저 말을 걸기가 어렵다.",
    leftPoint: 2,
    right: "어떤 갈등 상황도 해결할 자신이 있다.",
    rightPoint: 6,
  },
  "69": {
    left: "모둠활동에 나서는 것이 두렵다.",
    leftPoint: 2,
    right: "내가 리더가 되면 주변 사람들이 만족한다.",
    rightPoint: 6,
  },
  "70": {
    left: "모둠활동에 소극적으로 참여한다.",
    leftPoint: 2,
    right: "모둠활동에서 자신의 역할을 명확히 알고 솔선수범한다.",
    rightPoint: 5,
  },
  "71": {
    left: "내가 어떤 사람인지 표현하는 것이 어렵다.",
    leftPoint: 2,
    right: "내가 어떤 사람인지 자신 있게 보여줄 수 있다.",
    rightPoint: 6,
  },
  "72": {
    left: "눈치 없다는 말을 가끔 듣는다.",
    leftPoint: 2,
    right: "불편한 상황을 잘 파악하고 분위기를 좋게 바꿀 수 있다.",
    rightPoint: 6,
  },
  "73": {
    left: "동물에 대한 관심이 없는 편이다.",
    leftPoint: 2,
    right: "동물과 관련된 전문 정보를 자주 검색한다.",
    rightPoint: 6,
  },
  "74": {
    left: "식물에 대한 관심이 없는 편이다.",
    leftPoint: 2,
    right: "식물과 관련된 전문 정보를 자주 검색한다.",
    rightPoint: 6,
  },
  "75": {
    left: "자연환경은 나와 관련이 거의 없다.",
    leftPoint: 2,
    right: "인간과 자연환경이 서로 깊은 영향을 주고 받는다고 생각한다.",
    rightPoint: 5,
  },
  "76": {
    left: "생김새가 비슷한 동물을 구분하기 어렵다.",
    leftPoint: 2,
    right: "생김새가 비슷한 동물의 차이점을 잘 설명할 수 있다.",
    rightPoint: 6,
  },
  "77": {
    left: "나무들의 차이점을 잘 모르겠다.",
    leftPoint: 2,
    right: "잎, 열매를 통해 식물을 구분해낼 수 있다.",
    rightPoint: 6,
  },
  "78": {
    left: "환경오염 문제에 크게 신경쓰지 않는다.",
    leftPoint: 2,
    right: "환경오염 기사를 주의 깊게 읽으며 문제 해결을 위해 노력한다.",
    rightPoint: 6,
  },
  "79": {
    left: "자연 속에서 거의 활동을 하지 않는다.",
    leftPoint: 2,
    right: "시간이 날 때마다 자연 속에서 활동을 한다.",
    rightPoint: 6,
  },
  "80": {
    left: "자연을 보고 계절의 변화를 잘 느끼지 못한다.",
    leftPoint: 2,
    right: "자연 속에서 남들이 보지 못하는 변화를 찾아낼 수 있다.",
    rightPoint: 6,
  },
  "81": {
    left: "서로 어울리는 색상을 찾아내기 어렵다.",
    leftPoint: 2,
    right: "그림을 그릴 때 다양한 색상으로 조화롭게 표현할 수 있다.",
    rightPoint: 6,
  },
  "82": {
    left: "패션에 상관없이 아무 옷이나 입는다.",
    leftPoint: 2,
    right: "나와 타인에게 어울리는 패션을 연출할 수 있다.",
    rightPoint: 6,
  },
  "83": {
    left: "작품을 봐도 특별한 느낌이 없다.",
    leftPoint: 2,
    right: "작품을 보고 작가의 의도를 고민해본다.",
    rightPoint: 6,
  },
  "84": {
    left: "영화를 볼 때 화면구성을 주의깊게 보지 않는다.",
    leftPoint: 2,
    right: "영화를 볼 때 화면의 구성이나 특징을 말할 수 있다.",
    rightPoint: 6,
  },
  "85": {
    left: "대상의 특징을 파악하기 어렵다.",
    leftPoint: 2,
    right: "움직이는 대상의 특징을 빠르게 묘사할 수 있다.",
    rightPoint: 6,
  },
  "86": {
    left: "생각한 것과 느낀 것을 그리거나 만든 적이 거의 없다.",
    leftPoint: 2,
    right: "생각한 것과 느낀 것을 생생하게 그리거나 만들 수 있다.",
    rightPoint: 6,
  },
  "87": {
    left: "사과나 꽃병을 입체적으로 그리기 어렵다.",
    leftPoint: 2,
    right: "석고상을 입체적으로 그릴 수 있다.",
    rightPoint: 6,
  },
  "88": {
    left: "단순한 입체 조형도 만들기 어렵다.",
    leftPoint: 2,
    right: "점토를 이용하여 두상을 실물처럼 만들 수 있다.",
    rightPoint: 6,
  },
};

/** 51, 53번 등 척도 설명과 함께 보여줄 예시 문제 박스 */
export const APTITUDE_QUESTION_PROBLEM_BOX: Record<
  string,
  | { title: string; lines: string[]; answer?: string }
  | { problems: Array<{ title: string; lines: string[]; answer?: string }> }
> = {
  "51": {
    title: "문제",
    lines: ["A◎B=A²-AB+B²일 때", "(x²+3x+1)◎(3x+1)을 구하면?"],
    answer: "x⁴+3x³+10x²+6x+1",
  },
  "53": {
    problems: [
      { title: "문제1", lines: ["2, -1, -4, ... 에서 7번째 올 숫자는?"], answer: "-16" },
      { title: "문제2", lines: ["(18, □, -8, □, -34) 에서 □에 각각 들어갈 숫자는?"], answer: "5, -21" },
    ],
  },
};

/** 문항 텍스트로 번호 매칭 (API 응답 구조에 따라 fallback) */
export const APTITUDE_QUESTION_MATCH: Record<string, string> = {
  "몸을 구부리는 동작을 잘 할 수 있다": "1",
  "힘이 드는 동작을 잘 할 수 있다": "2",
  "운동기구(라켓 등)를 능숙하게 사용할 수 있다": "3",
  "새로운 동작을 쉽게 배울 수 있다": "4",
  "몸의 균형을 잘 잡을 수 있다": "5",
  "여러 신체 부위를 동시에 움직이는 동작을 할 수 있다": "6",
  "운동경기(피구, 축구, 발야구 등)를 할 때 상황을 판단하고 대응할 수 있다": "7",
  "운동할 때 효과적인 방법으로 할 수 있다": "8",
  "도구나 측정장비를 사용할 수 있다": "9",
  "망치로 못을 박을 수 있다": "10",
  "헤어스타일을 연출할 수 있다": "11",
  "필요한 물건을 제작하여 사용할 수 있다": "12",
  "점토를 이용하여 입체 모형을 만들 수 있다": "13",
  "부품을 조립하여 완성품을 만들 수 있다": "14",
  "요리 재료를 손질할 수 있다": "15",
  "물건을 분해하고 조립할 수 있다": "16",
  "그림퍼즐을 잘 맞출 수 있다": "17",
  "가본 길을 설명할 수 있다": "18",
  "물건의 위치를 기억할 수 있다": "19",
  "입체도형을 보고 전개도를 떠올릴 수 있다": "20",
  "지도의 등고선을 읽을 수 있다": "21",
  "여러 가지 도형의 회전된 모양을 떠올릴 수 있다": "22",
  "입체도형의 보이지 않는 부분도 파악할 수 있다": "23",
  "밤하늘의 별자리를 찾을 수 있다": "24",
  "노래를 정확한 음정으로 부를 수 있다": "25",
  "다양한 악기를 연주할 수 있다": "26",
  "새로운 악기를 쉽게 익힐 수 있다": "27",
  "음을 듣고 음정을 구별할 수 있다": "28",
  "연주음악을 듣고 악기 소리를 구별할 수 있다": "29",
  "처음 보는 악보를 보고 노래할 수 있다": "30",
  "음악 감상을 할 수 있다": "31",
  "일상생활에서 음악을 활용할 수 있다": "32",
  "많은 양의 아이디어를 낼 수 있다": "33",
  "새로운 것을 만들어 낼 수 있다": "34",
  "어떤 문제에 대한 새로운 해결 방법을 생각할 수 있다": "35",
  "전에 해보지 않았던 새로운 것에 도전할 수 있다": "36",
  "아이디어를 구체화할 수 있다": "37",
  "여러 과목에서 배운 내용을 융합할 수 있다": "38",
  "나만의 상상력으로 콘텐츠(음악, 미술, 문학, 영상 등)를 만들 수 있다": "39",
  "융통성 있게 생각할 수 있다": "40",
  "말과 글에서 적절한 단어를 사용할 수 있다": "41",
  "자신의 생각을 말과 글로 표현할 수 있다": "42",
  "문법을 맞게 사용할 수 있다": "43",
  "책을 빨리 읽을 수 있다": "44",
  "나의 생각을 논리적으로 표현할 수 있다": "45",
  "글의 내용을 이해할 수 있다": "46",
  "외국어를 쉽게 배울 수 있다": "47",
  "문학작품을 감상할 수 있다": "48",
  "수학 기호의 의미를 말할 수 있다": "49",
  "실생활에서 수학적 지식을 적용할 수 있다": "50",
  "수식을 계산할 수 있다": "51",
  "통계자료의 도표나 그래프를 이해할 수 있다": "52",
  "주어진 문제의 규칙을 발견할 수 있다": "53",
  "문제해결의 과정을 단계별로 수행할 수 있다": "54",
  "과학실험 과정의 인과관계를 파악할 수 있다": "55",
  "다양한 정보를 근거로 새로운 결론을 이끌어 낼 수 있다": "56",
  "내 행동의 결과를 생각한다": "57",
  "내 감정을 잘 파악하고 조절할 수 있다": "58",
  "나의 특성(흥미, 적성, 가치관 등)을 알고 있다": "59",
  "목표 달성을 위해 계획을 세우고 지키려고 노력한다": "60",
  "맡은 일을 책임지고 한다": "61",
  "시간 관리를 할 수 있다": "62",
  "건강관리를 잘 할 수 있다": "63",
  "돈 관리를 잘할 수 있다": "64",
  "타인에 대해 공감할 수 있다": "65",
  "주변 사람들은 나를 괜찮은 사람이라고 여긴다": "66",
  "처음 만난 사람과 어울릴 수 있다": "67",
  "나와 주변 사람의 갈등을 해결할 수 있다": "68",
  "사람이나 조직을 이끄는 리더십이 있다": "69",
  "다른 사람들과 협력할 수 있다": "70",
  "자신의 생각과 느낌을 표현할 수 있다": "71",
  "상황이나 분위기를 파악할 수 있다": "72",
  "동물에 대한 관심이 있다": "73",
  "식물에 대한 관심이 있다": "74",
  "자연환경의 중요성에 대한 인식능력이 있다": "75",
  "동물의 특징을 알고 있다": "76",
  "비슷한 식물을 구분할 수 있다": "77",
  "환경오염에 대한 민감성이 있다": "78",
  "자연 속에서 활동을 할 수 있다": "79",
  "자연에 대한 관찰력이 있다": "80",
  "색상의 조화를 알 수 있다": "81",
  "어울리는 패션을 연출할 수 있다": "82",
  "예술작품을 감상할 수 있다": "83",
  "영화를 볼 때 화면구성을 위주로 본다": "84",
  "대상의 형태와 특징을 포착할 수 있다": "85",
  "생각과 느낌을 시각적으로 표현할 수 있다": "86",
  "대상을 입체적으로 그릴 수 있다": "87",
  "대상을 입체조형으로 만들 수 있다": "88",
};

export function getAptitudeLeftRight(qNo: string, questionText: string) {
  const byNo = APTITUDE_LEFT_RIGHT_DESCRIPTIONS[qNo];
  if (byNo) return byNo;
  const matchedNo = Object.entries(APTITUDE_QUESTION_MATCH).find(([txt]) =>
    questionText.includes(txt)
  )?.[1];
  return matchedNo ? APTITUDE_LEFT_RIGHT_DESCRIPTIONS[matchedNo] ?? null : null;
}

export function getAptitudeDescriptionsForQuestion(qNo: string, questionText: string): Record<number, string> | null {
  const byNo = APTITUDE_POINT_DESCRIPTIONS[qNo];
  if (byNo) return byNo;
  const matchedNo = Object.entries(APTITUDE_QUESTION_MATCH).find(([txt]) =>
    questionText.includes(txt)
  )?.[1];
  return matchedNo ? APTITUDE_POINT_DESCRIPTIONS[matchedNo] ?? null : null;
}
