/**
 * 개발용 테스트 모드. 화면에서 켜는 게 아니라 개발 서버를 띄울 때 옵션으로 켠다:
 *   npm run dev:test   (= vite --mode playtest → .env.playtest 의 VITE_TEST_MODE=true)
 * 배포용 빌드(DEV=false)에서는 절대 켜지지 않는다.
 * 켜지면: 모든 묶음 열림, 🔒 한 번 눌러 부모 메뉴. 실제 진도 기록은 건드리지 않는다.
 */
export function isTestMode(env: { DEV?: boolean; VITE_TEST_MODE?: string }): boolean {
  return env.DEV === true && env.VITE_TEST_MODE === 'true';
}
