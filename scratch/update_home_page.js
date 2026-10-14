const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('d:/aaPass/nonsulpasslab/components/home/HomePage.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Award import 및 useState 추가, MySubmissionsModal import 추가
const targetImport = `import React from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Sliders,`;

const replacementImport = `import React, { useState } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Sliders,
  Award,`;

content = content.replace(targetImport, replacementImport);

const targetImportAuth = `import { useAuth } from '@/components/AuthGate'`;
const replacementImportAuth = `import { useAuth } from '@/components/AuthGate'
import MySubmissionsModal from '@/components/mypage/MySubmissionsModal'`;

content = content.replace(targetImportAuth, replacementImportAuth);

// 2. onReport 타입 수정
const targetProps = `interface HomePageProps {
  onExam: (univ?: string) => void
  onReport: () => void
  onSelectUniv?: (univId: string, univName: string) => void
}`;

const replacementProps = `interface HomePageProps {
  onExam: (univ?: string) => void
  onReport: (reportData?: any) => void
  onSelectUniv?: (univId: string, univName: string) => void
}`;

content = content.replace(targetProps, replacementProps);

// 3. state 및 useAuth 추가
const targetHook = `  // 인증 정보 및 관리자 권한 확인 (admin 계정 여부 및 로그아웃 함수)
  const { isAdmin, user, logout } = useAuth()`;

const replacementHook = `  // 인증 정보 및 권한 확인
  const { isAuthenticated, isAdmin, userDisplayName, logout, openAuthModal } = useAuth()
  const [isMySubmissionsOpen, setIsMySubmissionsOpen] = useState(false)`;

content = content.replace(targetHook, replacementHook);

// 4. home-top-actions 교체
const targetActions = `        <div className="home-top-actions">
          {/* 관리자(admin) 계정으로 로그인한 경우에만 관리자 콘솔 바로가기 버튼 노출 */}
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition"
            >
              <Sliders className="w-3.5 h-3.5" />
              관리자 콘솔
            </Link>
          )}

          {/* 현재 로그인 계정 표시 및 로그아웃(계정 전환) 버튼 */}
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded-lg transition cursor-pointer"
            title={\`\${user} 계정 세션 종료 및 계정 전환\`}
          >
            <span className={\`w-1.5 h-1.5 rounded-full \${isAdmin ? 'bg-amber-400' : 'bg-emerald-400'}\`} />
            <span className="font-semibold text-slate-200">
              {isAdmin ? '관리자 (admin)' : \`\${user || 'kmc'}\`}
            </span>
            <span className="text-slate-400 text-[11px]">로그아웃</span>
          </button>
        </div>`;

const replacementActions = `        <div className="home-top-actions">
          {isAuthenticated ? (
            <>
              {/* 내 첨삭 보관함 버튼 */}
              <button
                type="button"
                onClick={() => setIsMySubmissionsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition cursor-pointer"
                title="내가 제출한 답안과 AI 정밀 채점 리포트 이력 조회"
              >
                <Award className="w-3.5 h-3.5" />
                내 첨삭 보관함
              </button>

              {/* 관리자 콘솔 바로가기 (admin 전용) */}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  관리자 콘솔
                </Link>
              )}

              {/* 사용자 이름 및 로그아웃 버튼 */}
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded-lg transition cursor-pointer"
                title="로그아웃"
              >
                <span className={\`w-1.5 h-1.5 rounded-full \${isAdmin ? 'bg-amber-400' : 'bg-emerald-400'}\`} />
                <span className="font-semibold text-slate-200">
                  {isAdmin ? \`관리자 (\${userDisplayName})\` : \`\${userDisplayName} 학생\`}
                </span>
                <span className="text-slate-400 text-[11px]">로그아웃</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800/70 hover:bg-slate-700/70 border border-slate-700/60 rounded-lg transition cursor-pointer"
              >
                로그인
              </button>
              <button
                type="button"
                onClick={() => openAuthModal('signup')}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg shadow-sm transition cursor-pointer"
              >
                무료 회원가입
              </button>
            </div>
          )}
        </div>`;

content = content.replace(targetActions, replacementActions);

// 5. 모달 컴포넌트 마운트
const targetFooter = `      <footer className="home-footer">
        <Brand />
        <span>© 2027 Nonsul Pass Lab. 모든 학습 데이터는 안전하게 보호됩니다.</span>
      </footer>
    </main>`;

const replacementFooter = `      <footer className="home-footer">
        <Brand />
        <span>© 2027 Nonsul Pass Lab. 모든 학습 데이터는 안전하게 보호됩니다.</span>
      </footer>

      {/* 🏆 마이페이지: 내 첨삭 리포트 보관함 모달 */}
      <MySubmissionsModal
        isOpen={isMySubmissionsOpen}
        onClose={() => setIsMySubmissionsOpen(false)}
        onSelectReport={(report) => onReport(report)}
      />
    </main>`;

content = content.replace(targetFooter, replacementFooter);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('SUCCESS: HomePage.tsx updated.');
