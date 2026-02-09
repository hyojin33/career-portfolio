import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// 서버 사이드 실행을 강제하여 실시간 응답을 보장합니다.
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { message, userName } = await req.json();
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    // 1. API 키 확인
    if (!apiKey) {
      return NextResponse.json({ 
        text: "시스템 오류: .env.local 파일에 API 키가 설정되지 않았습니다." 
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    /**
     * 2. 모델 설정 (핵심 수정 사항)
     * 박사님의 대시보드에서 확인된 'gemini-2.5-flash' 모델을 사용합니다.
     */
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 3. 박사님 연구 주제를 반영한 시스템 프롬프트
    const systemPrompt = `당신은 특성화고등학교 학생들을 위한 전문 진로 상담사입니다. 
    학생 이름은 ${userName || '학생'}입니다. 
    '직업계고 학생을 위한 AI 기반 자기주도적 진로 설계'라는 연구 목적에 맞게, 
    학생이 자신의 전공 역량을 발견하고 포트폴리오를 스스로 채워나갈 수 있도록 
    따뜻하고 전문적으로 조언해 주세요. 답변은 한국어로 친절하게 핵심 위주로 하세요.`;

    // 4. 답변 생성 실행
    const result = await model.generateContent(`${systemPrompt}\n\n질문: ${message}`);
    const response = await result.response;
    const text = response.text();
    
    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // 에러 발생 시 상세 원인을 화면에 출력합니다.
    return NextResponse.json({ 
      text: `AI 연결 중 오류 발생: ${error.message}. 모델 명칭 'gemini-2.5-flash'가 현재 SDK에서 지원되는지 확인이 필요합니다.` 
    }, { status: 500 });
  }
}