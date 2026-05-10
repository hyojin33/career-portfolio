# Supabase Auth 설정 가이드

## 1. Supabase 대시보드에서 Google OAuth 설정

1. [Supabase 대시보드](https://supabase.com/dashboard)에 로그인
2. 프로젝트 선택
3. 좌측 메뉴에서 **Authentication** → **Providers** 클릭
4. **Google** 제공자를 찾아 **Enable Google** 토글 활성화
5. 다음 정보 입력:
   - **Client ID (for OAuth)**: Google Cloud Console에서 발급받은 Client ID
   - **Client Secret (for OAuth)**: Google Cloud Console에서 발급받은 Client Secret
6. **Redirect URL** 확인:
   - Supabase가 자동으로 생성한 Redirect URL을 복사해두세요
   - 예: `https://xqijfyekwjgljyqcaeqj.supabase.co/auth/v1/callback`

## 2. Google Cloud Console 설정

### 2.1 OAuth 동의 화면 구성 (처음 한 번만)

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택 또는 새 프로젝트 생성
3. **API 및 서비스** → **OAuth 동의 화면** 메뉴
4. **외부** 선택 후 **만들기**
5. 앱 정보 입력:
   - 앱 이름: "진로 학습플랫폼" (또는 원하는 이름)
   - 사용자 지원 이메일: 본인 이메일
   - 개발자 연락처 정보: 본인 이메일
6. **저장 후 계속** 클릭
7. **범위** 단계에서 **저장 후 계속** (기본 범위로 충분)
8. **테스트 사용자** 단계에서 본인 이메일 추가 (테스트용)
9. **대시보드로 돌아가기**

### 2.2 OAuth 2.0 클라이언트 ID 생성

1. **API 및 서비스** → **사용자 인증 정보** 메뉴
2. 상단 **+ 사용자 인증 정보 만들기** → **OAuth 클라이언트 ID** 선택
3. 애플리케이션 유형: **웹 애플리케이션**
4. 이름: "진로 학습플랫폼 Web Client" (또는 원하는 이름)
5. **승인된 리디렉션 URI**에 Supabase Redirect URL 추가:
   ```
   https://xqijfyekwjgljyqcaeqj.supabase.co/auth/v1/callback
   ```
   (위의 Supabase Redirect URL을 그대로 입력)
6. **만들기** 클릭
7. 생성된 **클라이언트 ID**와 **클라이언트 보안 비밀번호**를 복사

## 3. .env.local 파일 설정

`.env.local` 파일에 다음 변수들이 이미 설정되어 있는지 확인하세요:

```env
# Supabase (이미 설정되어 있음)
NEXT_PUBLIC_SUPABASE_URL=https://xqijfyekwjgljyqcaeqj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google OAuth (Supabase Auth용 - Supabase 대시보드에서 설정)
# 이 변수들은 더 이상 필요 없습니다 (Supabase 대시보드에서 직접 설정)
# GOOGLE_CLIENT_ID=...
# GOOGLE_CLIENT_SECRET=...

# NextAuth 관련 (더 이상 필요 없음 - 삭제 가능)
# NEXTAUTH_SECRET=...
# NEXTAUTH_URL=...
```

**중요**: Google OAuth 설정은 Supabase 대시보드에서 직접 입력하므로, `.env.local`에 `GOOGLE_CLIENT_ID`와 `GOOGLE_CLIENT_SECRET`을 추가할 필요가 없습니다.

## 4. 테스트

1. 개발 서버 실행:
   ```bash
   npm run dev
   ```

2. 브라우저에서 `http://localhost:3000` 접속

3. **Google 로그인으로 시작하기** 버튼 클릭

4. Google 계정 선택 및 로그인

5. 로그인 성공 후:
   - 최초 로그인: `/onboarding` 페이지로 이동 (정보 입력)
   - 이미 온보딩 완료: `/career-design` 페이지로 이동

## 5. 문제 해결

### 로그인 후 리다이렉트가 안 되는 경우
- Supabase 대시보드의 **Authentication** → **URL Configuration**에서 **Site URL**이 `http://localhost:3000`으로 설정되어 있는지 확인
- **Redirect URLs**에 `http://localhost:3000/**` 추가 (0.0.0.0이 아닌 localhost 사용)
- Chrome/Edge에서 `http://0.0.0.0:3000`으로 접속한 뒤 로그인하면 "사이트에 연결할 수 없음(ERR_ADDRESS_INVALID)"이 날 수 있습니다. **반드시 `http://localhost:3000`으로 접속**한 뒤 로그인하세요. (앱에서 0.0.0.0 → localhost 자동 치환 처리되어 있으나, 가능하면 처음부터 localhost로 접속하는 것을 권장합니다.)

### "redirect_uri_mismatch" 오류
- Google Cloud Console의 **승인된 리디렉션 URI**에 Supabase Redirect URL이 정확히 입력되어 있는지 확인
- Supabase Redirect URL은 대시보드의 **Authentication** → **Providers** → **Google** 섹션에서 확인 가능

### 프로필이 생성되지 않는 경우
- Supabase 대시보드의 **SQL Editor**에서 마이그레이션 파일 실행 확인:
  - `001_create_profiles_and_activity_logs.sql`
  - `002_profiles_add_grade_class_number.sql`
- `handle_new_user()` 트리거가 정상 작동하는지 확인

### 관리자 계정으로 로그인해도 "승인 대기" 화면만 나오는 경우
- 관리자 이메일의 `profiles` 행에 `role = 'admin'`이 설정되어 있어야 합니다.
- **Supabase 대시보드** → **SQL Editor**에서 아래 SQL을 실행하세요 (이메일을 본인 관리자 계정으로 바꿀 수 있음):

```sql
UPDATE public.profiles
SET role = 'admin', is_approved = true, updated_at = now()
WHERE id = (SELECT id FROM auth.users WHERE email = 'jeunmong03@gmail.com');
```

- 또는 프로젝트의 `supabase/scripts/set_admin_by_email.sql` 파일 내용을 SQL Editor에 붙여넣어 실행해도 됩니다.
- 실행 후 로그아웃했다가 다시 로그인하면 메인 페이지·관리자 페이지에 접근할 수 있습니다.
