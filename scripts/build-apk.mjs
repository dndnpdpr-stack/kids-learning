// 테스트용(debug) APK 빌드: 웹 빌드 → Capacitor 동기화 → Gradle assembleDebug. (JDK 21 필요)
// Capacitor가 Java 21 이상을 요구하므로 Android Studio에 들어 있는 JDK(jbr)를 찾아 이번 빌드에만 쓴다.
// (사용자 전역 ~/.gradle/gradle.properties 의 org.gradle.java.home 은 건드리지 않고 명령줄로 덮어쓴다.)
// 다른 위치라면 환경 변수 ANDROID_STUDIO_JBR 로 지정한다.
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Gradle 8.14는 Java 25에서 돌지 않으므로 JDK 21을 가장 먼저 찾는다.
const candidates = [
  process.env.ANDROID_STUDIO_JBR,
  process.env.JDK21_HOME,
  'D:/java/temurin-21',
  'D:/Android/Android Studio/jbr',
  'C:/Program Files/Android/Android Studio/jbr',
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Programs/Android Studio/jbr'),
].filter(Boolean);

const jbr = candidates.find((p) => existsSync(join(p, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')));
if (!jbr) {
  console.error('Android Studio JDK(jbr)를 찾지 못했어요. ANDROID_STUDIO_JBR 환경 변수로 경로를 알려 주세요.');
  process.exit(1);
}

const run = (cmd, cwd) => execSync(cmd, { stdio: 'inherit', cwd });
run('npm run build:android');
// cmd가 현재 폴더를 실행 경로로 찾지 않는 설정일 수 있어 경로를 명시한다.
const gradlew = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
run(`${gradlew} assembleDebug --no-daemon "-Dorg.gradle.java.home=${jbr.replace(/\\/g, '/')}"`, 'android');
console.log('\n✅ APK: android/app/build/outputs/apk/debug/app-debug.apk');
