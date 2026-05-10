import { NextRequest, NextResponse } from "next/server";

/**
 * 커리어넷 직업백과 Open API 프록시
 * https://www.career.go.kr/cnet/front/openapi/jobs.json
 */
const JOBS_API_URL = "https://www.career.go.kr/cnet/front/openapi/jobs.json";

export async function GET(request: NextRequest) {
  const apiKey = process.env.NEXT_PUBLIC_CAREER_NET_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_CAREER_NET_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const { searchParams } = request.nextUrl;
  const searchJobNm = searchParams.get("searchJobNm")?.trim() ?? "";
  const pageIndex = Math.max(1, Number(searchParams.get("pageIndex")) || 1);

  const params = new URLSearchParams({
    apiKey,
    pageIndex: String(pageIndex),
  });
  if (searchJobNm) params.set("searchJobNm", searchJobNm);

  const url = `${JOBS_API_URL}?${params.toString()}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "CareerPortfolio/1.0" },
      next: { revalidate: 300 },
    });
    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { error: "직업 검색 API 오류", statusCode: res.status, detail: text.slice(0, 500) },
        { status: 502 }
      );
    }

    const json = JSON.parse(text) as { jobs?: { job_cd?: string; job_nm?: string; jobNm?: string; aptit_name?: string; aptitName?: string }[]; job?: unknown[] };
    const jobs = json.jobs ?? json.job ?? [];
    const list = Array.isArray(jobs) ? jobs : [];

    return NextResponse.json({
      jobs: list.map((j) => ({
        job_cd: j.job_cd,
        job_nm: j.job_nm ?? j.jobNm ?? "",
        aptit_name: j.aptit_name ?? j.aptitName,
      })),
    });
  } catch (e) {
    console.error("[career-net/jobs] fetch error:", e);
    return NextResponse.json(
      { error: "직업 검색 중 오류가 발생했습니다." },
      { status: 502 }
    );
  }
}
