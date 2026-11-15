'use client'

/**
 * @file app/qna/page.tsx
 * @description 논술패스 Lab 자주 묻는 질문(FAQ) 및 DB 기반 사용자 질문·건의 게시판 페이지
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Coins,
  Target,
  Camera,
  FileText,
  Sparkles,
  MessageSquarePlus,
  Send,
  Lock,
  Trash2,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  MessageCircle,
  Pencil,
} from 'lucide-react'
import Brand from '@/components/common/Brand'
import SiteHeader from '@/components/common/SiteHeader'
import { useAuth } from '@/components/AuthGate'
import { supabase } from '@/lib/supabase'

type QnaCategory = 'all' | 'credit' | 'target' | 'ocr' | 'grading' | 'board'
type PostCategory = '질문' | '건의' | '오류신고' | '기타'

interface QnaItem {
  id: string
  category: Exclude<QnaCategory, 'all' | 'board'>
  categoryLabel: string
  question: string
  answer: string[]
}

interface QnaPost {
  id: string
  user_id: string | null
  author_name: string
  category: PostCategory
  title: string
  content: string
  is_private: boolean
  status: 'WAIT' | 'ANSWERED'
  admin_reply: string | null
  replied_at: string | null
  created_at: string
}

// 논술패스 Lab 최신 정책 기준 자주 묻는 질문 데이터
const QNA_ITEMS: QnaItem[] = [
  {
    id: 'credit-1',
    category: 'credit',
    categoryLabel: '패스 크래딧 · 결제',
    question: '패스 크래딧은 어떤 대학에서 사용할 수 있나요?',
    answer: [
      '구매하신 패스 크래딧은 특정 대학에 묶이지 않고 논술패스 Lab에서 지원하는 18개 전 대학의 기출·모의논술 시험에서 자유롭게 사용할 수 있습니다.',
      '목표 대학으로 지정하지 않은 타 대학 문항도 동일하게 크래딧을 사용해 응시하고 AI 정밀 첨삭을 받을 수 있습니다.',
    ],
  },
  {
    id: 'credit-2',
    category: 'credit',
    categoryLabel: '패스 크래딧 · 결제',
    question: '크래딧 패키지 가격과 유효기간은 어떻게 되나요?',
    answer: [
      '패스 크래딧은 학습량에 맞춰 10회(3,300원), 30회(9,900원), 60회(19,800원), 90회(29,700원) 중 원하는 패키지를 선택해 충전할 수 있습니다.',
      '충전된 크래딧은 결제일로부터 기본 365일(또는 관리자 정책 기준) 동안 여유롭게 사용 가능합니다.',
    ],
  },
  {
    id: 'target-1',
    category: 'target',
    categoryLabel: '목표 대학 설정',
    question: '목표 대학은 왜 최대 6개까지만 선택할 수 있나요?',
    answer: [
      '현행 대입 수시 전형에서 학생 1인당 최대 6개 대학까지 지원할 수 있는 기준에 맞춰, 실제 지원 예정인 목표 대학을 최대 6곳까지 등록하도록 구성되어 있습니다.',
      '홈 화면 상단의 [목표 대학 설정] 버튼에서 언제든지 목표 대학을 추가하거나 변경할 수 있으며, 크래딧 사용 제한과는 무관합니다.',
    ],
  },
  {
    id: 'ocr-1',
    category: 'ocr',
    categoryLabel: '사진 입력 (OCR)',
    question: '자필 원고지나 노트를 찍어 올리는 "사진 입력"도 크래딧이 차감되나요?',
    answer: [
      '네, 손글씨 사진을 Gemini Vision AI로 정밀 인식해 원고지 교정 부호까지 텍스트로 변환하는 기능은 고비용 비전 AI API를 사용하므로, 변환에 성공한 경우 패스 크래딧 1회가 차감됩니다.',
      '단, 네트워크 오류나 판독 실패 시에는 크래딧이 차감되지 않으며, AI 채점의 문항당 최대 응시 한도(5회)나 재제출 쿨다운(3분)에도 영향을 주지 않습니다.',
    ],
  },
  {
    id: 'grading-1',
    category: 'grading',
    categoryLabel: 'AI 채점 · PDF 리포트',
    question: 'AI 정밀 채점이 중간에 실패하거나 취소하면 크래딧이 차감되나요?',
    answer: [
      '아니요. 채점 리포트 생성이 완전히 성공한 직후에만 크래딧 1회가 차감됩니다.',
      '채점 도중 오류가 발생하거나 사용자가 취소한 경우에는 크래딧이 차감되지 않으며, 혹시 차감되었더라도 자동으로 복구됩니다.',
    ],
  },
  {
    id: 'grading-2',
    category: 'grading',
    categoryLabel: 'AI 채점 · PDF 리포트',
    question: '채점 리포트를 PDF로 저장하거나 과거 답안을 다시 볼 수 있나요?',
    answer: [
      '네, 채점 리포트 화면 상단의 [PDF 저장] 버튼을 클릭하고 인쇄 대상에서 "PDF로 저장"을 선택하시면 모든 평가 기준별 상세 분석과 첨삭 내용이 깔끔한 문서 형태로 저장됩니다.',
      '또한 로그인 후 우측 상단 [내 첨삭 보관함]에서 이전에 제출했던 모든 답안과 리포트를 언제든 다시 열람하실 수 있습니다.',
    ],
  },
]

const CATEGORY_TABS: { id: QnaCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: '전체 보기', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'credit', label: '패스 크래딧', icon: <Coins className="w-3.5 h-3.5" /> },
  { id: 'target', label: '목표 대학', icon: <Target className="w-3.5 h-3.5" /> },
  { id: 'ocr', label: '사진 입력 (OCR)', icon: <Camera className="w-3.5 h-3.5" /> },
  { id: 'grading', label: 'AI 채점 · PDF', icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'board', label: '질문 및 건의', icon: <MessageSquarePlus className="w-3.5 h-3.5" /> },
]

// 작성자 이름 마스킹 헬퍼 (예: 홍길동 -> 홍*동)
function maskAuthorName(name: string): string {
  const trimmed = (name || '수험생').trim()
  if (trimmed.length <= 1) return trimmed
  if (trimmed.length === 2) return `${trimmed[0]}*`
  return `${trimmed[0]}${'*'.repeat(trimmed.length - 2)}${trimmed[trimmed.length - 1]}`
}

// 게시판 무한 스크롤 페이지당 불러올 게시글 수
const POSTS_PAGE_SIZE = 10

export default function QnaPage() {
  const { isAuthenticated, isAdmin, user, userDisplayName, openAuthModal } = useAuth()

  const [selectedCategory, setSelectedCategory] = useState<QnaCategory>('all')
  const [openIds, setOpenIds] = useState<string[]>(['credit-1', 'ocr-1'])

  // DB 게시판 상태 및 무한 스크롤 상태
  const [posts, setPosts] = useState<QnaPost[]>([])
  const [isLoadingPosts, setIsLoadingPosts] = useState<boolean>(false)
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState<boolean>(false)
  const [hasMorePosts, setHasMorePosts] = useState<boolean>(true)
  const [boardError, setBoardError] = useState<string | null>(null)
  const [openPostId, setOpenPostId] = useState<string | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  // 새 글 작성 폼 상태
  const [isWriteOpen, setIsWriteOpen] = useState<boolean>(false)
  const [postCategory, setPostCategory] = useState<PostCategory>('질문')
  const [postTitle, setPostTitle] = useState<string>('')
  const [postContent, setPostContent] = useState<string>('')
  const [isPrivate, setIsPrivate] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // 관리자 답변 작성 상태
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [replySavingId, setReplySavingId] = useState<string | null>(null)

  // 본인 글 수정 폼 상태
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [editCategory, setEditCategory] = useState<PostCategory>('질문')
  const [editTitle, setEditTitle] = useState<string>('')
  const [editContent, setEditContent] = useState<string>('')
  const [editIsPrivate, setEditIsPrivate] = useState<boolean>(false)
  const [isUpdating, setIsUpdating] = useState<boolean>(false)

  const filteredItems =
    selectedCategory === 'all'
      ? QNA_ITEMS
      : QNA_ITEMS.filter((item) => item.category === selectedCategory)

  // FAQ 아코디언 토글
  const toggleItem = (id: string) => {
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  // DB에서 질문 및 건의 게시글 목록 10개 단위 분할 조회 (초기 로드 및 무한 스크롤 겸용)
  const fetchPosts = useCallback(async (offset = 0, append = false) => {
    if (append) {
      setIsLoadingMorePosts(true)
    } else {
      setIsLoadingPosts(true)
    }
    setBoardError(null)

    try {
      const from = offset
      const to = offset + POSTS_PAGE_SIZE - 1
      const { data, error } = await supabase
        .from('qna_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        throw error
      }

      const batch = (data as QnaPost[]) || []
      setHasMorePosts(batch.length === POSTS_PAGE_SIZE)

      if (append) {
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id))
          const uniqueNext = batch.filter((p) => !existingIds.has(p.id))
          return [...prev, ...uniqueNext]
        })
      } else {
        setPosts(batch)
      }
    } catch (err: any) {
      console.warn('[QnA 게시판] 목록 조회 오류:', err?.message)
      setBoardError('질문 및 건의 게시판을 불러오는 중 문제가 발생했습니다. (DB 테이블 생성 여부를 확인해 주세요.)')
    } finally {
      if (append) {
        setIsLoadingMorePosts(false)
      } else {
        setIsLoadingPosts(false)
      }
    }
  }, [])

  // '질문 및 건의' 탭 진입 시 첫 10개 목록 로드
  useEffect(() => {
    if (selectedCategory === 'board') {
      fetchPosts(0, false)
    }
  }, [selectedCategory, fetchPosts])

  // 하단 센티넬 감지 시 다음 10개 게시글 자동 추가 로드 (모바일/데스크탑 공통 무한 스크롤)
  useEffect(() => {
    if (selectedCategory !== 'board' || !hasMorePosts || isLoadingPosts || isLoadingMorePosts) {
      return
    }
    const target = loadMoreRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchPosts(posts.length, true)
        }
      },
      { rootMargin: '160px' }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [selectedCategory, hasMorePosts, isLoadingPosts, isLoadingMorePosts, posts.length, fetchPosts])

  // 새 질문 및 건의 등록
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated || !user) {
      openAuthModal('login')
      return
    }
    if (!postTitle.trim() || !postContent.trim()) {
      setBoardError('제목과 내용을 모두 입력해 주세요.')
      return
    }

    setIsSubmitting(true)
    setBoardError(null)
    try {
      const { error } = await supabase.from('qna_posts').insert({
        user_id: user.id,
        author_name: userDisplayName || '수험생',
        category: postCategory,
        title: postTitle.trim(),
        content: postContent.trim(),
        is_private: isPrivate,
        status: 'WAIT',
      })

      if (error) throw error

      setPostTitle('')
      setPostContent('')
      setIsPrivate(false)
      setIsWriteOpen(false)
      await fetchPosts()
    } catch (err: any) {
      console.error('[QnA 게시판] 글 등록 실패:', err)
      setBoardError(err?.message || '게시글 등록 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 본인 또는 관리자 게시글 삭제
  const handleDeletePost = async (postId: string) => {
    if (!confirm('이 게시글을 삭제하시겠습니까?')) return
    try {
      const { error } = await supabase.from('qna_posts').delete().eq('id', postId)
      if (error) throw error
      if (openPostId === postId) setOpenPostId(null)
      if (editingPostId === postId) setEditingPostId(null)
      await fetchPosts()
    } catch (err: any) {
      alert(err?.message || '게시글 삭제 중 오류가 발생했습니다.')
    }
  }

  // 본인 글 수정 모드 진입
  const handleStartEdit = (post: QnaPost) => {
    setEditingPostId(post.id)
    setEditCategory(post.category)
    setEditTitle(post.title)
    setEditContent(post.content)
    setEditIsPrivate(post.is_private)
    setBoardError(null)
  }

  // 본인 글 수정 저장
  const handleUpdatePost = async (e: React.FormEvent, postId: string) => {
    e.preventDefault()
    if (!editTitle.trim() || !editContent.trim()) {
      setBoardError('제목과 내용을 모두 입력해 주세요.')
      return
    }

    setIsUpdating(true)
    setBoardError(null)
    try {
      const { error } = await supabase
        .from('qna_posts')
        .update({
          category: editCategory,
          title: editTitle.trim(),
          content: editContent.trim(),
          is_private: editIsPrivate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)

      if (error) throw error
      setEditingPostId(null)
      await fetchPosts()
    } catch (err: any) {
      console.error('[QnA 게시판] 글 수정 실패:', err)
      setBoardError(err?.message || '게시글 수정 중 오류가 발생했습니다.')
    } finally {
      setIsUpdating(false)
    }
  }

  // 관리자 답변 등록/수정
  const handleSaveReply = async (postId: string) => {
    const draft = (replyDrafts[postId] ?? '').trim()
    if (!draft) {
      alert('답변 내용을 입력해 주세요.')
      return
    }

    setReplySavingId(postId)
    try {
      const { error } = await supabase
        .from('qna_posts')
        .update({
          admin_reply: draft,
          status: 'ANSWERED',
          replied_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)

      if (error) throw error
      await fetchPosts()
    } catch (err: any) {
      alert(err?.message || '답변 저장 중 오류가 발생했습니다.')
    } finally {
      setReplySavingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* 상단 공통 헤더 */}
      <SiteHeader />

      {/* 본문 영역 */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-5 py-10 md:py-14 space-y-8">
        {/* 인트로 배너 */}
        <section className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>FREQUENTLY ASKED QUESTIONS & FEEDBACK</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            자주 묻는 질문 & 질문·건의 게시판
          </h1>
          <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            서비스 이용 안내를 확인하시거나, <strong>질문 및 건의</strong> 탭에서 궁금한 점과 개선 의견을 직접 남겨주세요.
          </p>
        </section>

        {/* 카테고리 필터 탭 ("AI 채점 · PDF" 우측에 "질문 및 건의" 배치) */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {CATEGORY_TABS.map((tab) => {
            const isActive = selectedCategory === tab.id
            const isBoardTab = tab.id === 'board'
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border transition cursor-pointer ${
                  isActive
                    ? isBoardTab
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : isBoardTab
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* 조건부 렌더링: FAQ 목록 vs 질문 및 건의 DB 게시판 */}
        {selectedCategory !== 'board' ? (
          <section className="space-y-3">
            {filteredItems.map((item) => {
              const isOpen = openIds.includes(item.id)
              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                    isOpen
                      ? 'border-blue-400 shadow-md shadow-blue-950/5'
                      : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className="w-full px-5 py-4 md:px-6 md:py-5 flex items-center justify-between gap-4 text-left cursor-pointer"
                  >
                    <div className="space-y-1.5">
                      <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                        {item.categoryLabel}
                      </span>
                      <h2 className="text-sm md:text-base font-bold text-slate-900 leading-snug">
                        Q. {item.question}
                      </h2>
                    </div>
                    <span className="text-slate-400 shrink-0">
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-blue-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 md:px-6 md:pb-6 pt-1 border-t border-slate-100 bg-slate-50/50 space-y-2">
                      {item.answer.map((paragraph, idx) => (
                        <p key={idx} className="text-sm text-slate-700 leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        ) : (
          <section className="space-y-5">
            {/* 상단 게시판 컨트롤 바 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-indigo-200 shadow-2xs">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-indigo-600" />
                  <span>질문 및 건의 게시판</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  서비스 이용 질문, 기능 건의, 오류 제보를 남겨주시면 운영팀이 확인 후 정성껏 답변드립니다.
                </p>
              </div>
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => setIsWriteOpen((prev) => !prev)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition cursor-pointer"
                >
                  <MessageSquarePlus className="w-4 h-4" />
                  <span>{isWriteOpen ? '작성 닫기' : '새 질문 / 건의 작성'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>로그인 후 글쓰기</span>
                </button>
              )}
            </div>

            {/* 에러 안내 */}
            {boardError && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{boardError}</span>
              </div>
            )}

            {/* 글 작성 폼 */}
            {isWriteOpen && isAuthenticated && (
              <form
                onSubmit={handleCreatePost}
                className="bg-white p-6 rounded-2xl border-2 border-indigo-300 shadow-sm space-y-4 animate-in fade-in duration-200"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {(['질문', '건의', '오류신고', '기타'] as PostCategory[]).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setPostCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          postCategory === cat
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>비밀글 (작성자와 관리자만 열람)</span>
                  </label>
                </div>

                <div>
                  <input
                    type="text"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    placeholder="제목을 입력해 주세요 (예: 경희대 2026 모의논술 문항 관련 건의)"
                    maxLength={120}
                    required
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <textarea
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="질문이나 개선 건의 내용을 자세히 적어주세요."
                    rows={4}
                    maxLength={2000}
                    required
                    className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition resize-y"
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWriteOpen(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>등록 중...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>등록하기</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* 게시글 목록 */}
            {isLoadingPosts ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                <span className="text-xs font-medium">게시글을 불러오는 중입니다...</span>
              </div>
            ) : posts.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
                아직 등록된 질문 및 건의가 없습니다. 첫 번째 의견을 남겨보세요!
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => {
                  const isOpen = openPostId === post.id
                  const isOwner = !!user && post.user_id === user.id
                  const canManage = isOwner || isAdmin
                  const isAnswered = post.status === 'ANSWERED' && !!post.admin_reply

                  return (
                    <div
                      key={post.id}
                      className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                        isOpen
                          ? 'border-indigo-400 shadow-md shadow-indigo-950/5'
                          : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setOpenPostId(isOpen ? null : post.id)
                          if (!isOpen && isAdmin && replyDrafts[post.id] === undefined) {
                            setReplyDrafts((prev) => ({
                              ...prev,
                              [post.id]: post.admin_reply || '',
                            }))
                          }
                        }}
                        className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left cursor-pointer"
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                                isAnswered
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {isAnswered ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>답변 완료</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3" />
                                  <span>답변 대기</span>
                                </>
                              )}
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {post.category}
                            </span>
                            {post.is_private && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                <Lock className="w-3 h-3" /> 비밀글
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400">
                              {isOwner || isAdmin ? post.author_name : maskAuthorName(post.author_name)} ·{' '}
                              {new Date(post.created_at).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                          <h3 className="text-sm md:text-base font-bold text-slate-900 truncate">
                            {post.title}
                          </h3>
                        </div>
                        <span className="text-slate-400 shrink-0">
                          {isOpen ? (
                            <ChevronUp className="w-5 h-5 text-indigo-600" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-5 pt-3 border-t border-slate-100 bg-slate-50/50 space-y-4">
                          {/* 질문/건의 본문 또는 작성자 인라인 수정 폼 */}
                          {editingPostId === post.id ? (
                            <form
                              onSubmit={(e) => handleUpdatePost(e, post.id)}
                              className="bg-white p-4 rounded-xl border-2 border-indigo-300 space-y-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  {(['질문', '건의', '오류신고', '기타'] as PostCategory[]).map((cat) => (
                                    <button
                                      key={cat}
                                      type="button"
                                      onClick={() => setEditCategory(cat)}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                                        editCategory === cat
                                          ? 'bg-indigo-600 text-white border-indigo-600'
                                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      {cat}
                                    </button>
                                  ))}
                                </div>
                                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={editIsPrivate}
                                    onChange={(e) => setEditIsPrivate(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>비밀글</span>
                                </label>
                              </div>

                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                maxLength={120}
                                required
                                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white"
                              />

                              <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                rows={4}
                                maxLength={2000}
                                required
                                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white resize-y"
                              />

                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingPostId(null)}
                                  disabled={isUpdating}
                                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                                >
                                  취소
                                </button>
                                <button
                                  type="submit"
                                  disabled={isUpdating}
                                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition cursor-pointer"
                                >
                                  {isUpdating ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      <span>저장 중...</span>
                                    </>
                                  ) : (
                                    <span>수정 저장</span>
                                  )}
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed bg-white p-4 rounded-xl border border-slate-200/80">
                              {post.content}
                            </div>
                          )}

                          {/* 관리자 답변 영역 */}
                          {post.admin_reply && (
                            <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200 space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-bold text-indigo-800">
                                <span>💬 논술패스 Lab 운영팀 답변</span>
                                {post.replied_at && (
                                  <span className="text-[11px] font-medium text-indigo-600">
                                    {new Date(post.replied_at).toLocaleDateString('ko-KR')}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                                {post.admin_reply}
                              </p>
                            </div>
                          )}

                          {/* 관리자 전용 인라인 답변 등록/수정 폼 */}
                          {isAdmin && (
                            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 space-y-2.5">
                              <label className="block text-xs font-bold text-slate-700">
                                관리자 답변 {post.admin_reply ? '수정' : '등록'}
                              </label>
                              <textarea
                                rows={3}
                                value={replyDrafts[post.id] ?? post.admin_reply ?? ''}
                                onChange={(e) =>
                                  setReplyDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                                }
                                placeholder="사용자에게 전달할 답변을 입력하세요."
                                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                              />
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleSaveReply(post.id)}
                                  disabled={replySavingId === post.id}
                                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition cursor-pointer"
                                >
                                  {replySavingId === post.id ? '저장 중...' : '답변 저장'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 작성자 본인 수정 버튼 및 본인/관리자 삭제 버튼 */}
                          {canManage && (
                            <div className="flex justify-end gap-2">
                              {isOwner && editingPostId !== post.id && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(post)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span>수정</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeletePost(post.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>삭제</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* 무한 스크롤 감지 센티넬 및 추가 로드 상태 표시 */}
                <div ref={loadMoreRef} className="pt-2 pb-1 flex flex-col items-center justify-center gap-2">
                  {isLoadingMorePosts ? (
                    <div className="py-3 flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      <span>이전 게시글을 불러오는 중...</span>
                    </div>
                  ) : hasMorePosts ? (
                    <button
                      type="button"
                      onClick={() => fetchPosts(posts.length, true)}
                      className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-full transition cursor-pointer"
                    >
                      더 불러오기
                    </button>
                  ) : (
                    <p className="py-2 text-[11px] text-slate-400 font-medium">
                      모든 게시글을 불러왔습니다.
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* 하단 바로가기 안내 */}
        <section className="p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm md:text-base font-bold text-slate-900">
              실전 논술 문제를 바로 풀어보시겠어요?
            </h3>
            <p className="text-xs md:text-sm text-slate-600 mt-0.5">
              목표 대학 6곳을 설정하고 AI 정밀 채점 리포트로 합격 가능성을 점검해 보세요.
            </p>
          </div>
          <Link
            href="/"
            className="shrink-0 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition"
          >
            대학별 논술 시작하기
          </Link>
        </section>
      </main>
    </div>
  )
}
