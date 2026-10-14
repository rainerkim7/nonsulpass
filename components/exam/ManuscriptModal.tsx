'use client'

/**
 * @file components/exam/ManuscriptModal.tsx
 * @description 대학 논술 실전 원고지(400자 / 800자 / 1,000자 선택형) 한 칸 정밀 입력 팝업 모달
 */

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { X, Check, Copy, Sparkles, SlidersHorizontal } from 'lucide-react'

export type ManuscriptCapacity = 400 | 800 | 1000

interface ManuscriptModalProps {
  isOpen: boolean
  onClose: () => void
  value: string
  onChange: (val: string) => void
  questionLabel?: string
  targetLimit?: string
}

/** 원고지 한 칸의 데이터 규격 */
interface ManuscriptCell {
  char: string          // 칸에 들어갈 글자
  textIndex: number     // 원본 텍스트에서의 인덱스 (-1이면 빈칸)
  isCarat: boolean      // 현재 커서가 위치한 칸인지 여부
  isLineBreak: boolean  // 줄바꿈(Enter)으로 인해 공백으로 남겨진 칸인지 여부
}

export default function ManuscriptModal({
  isOpen,
  onClose,
  value,
  onChange,
  questionLabel = '문제 1',
  targetLimit = '800±100자'
}: ManuscriptModalProps) {
  // 백그라운드 실제 입력용 textarea 참조
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 현재 커서 위치
  const [cursorPos, setCursorPos] = useState<number>(value.length)
  const [copiedNotice, setCopiedNotice] = useState<boolean>(false)

  // 문항 요구조건 분석하여 초기 원고 규격 자동 추천 (400자 / 800자 / 1000자)
  const initialCapacity = useMemo<ManuscriptCapacity>(() => {
    const limitLower = (targetLimit || '').toLowerCase()
    if (limitLower.includes('400') || limitLower.includes('500')) return 400
    if (limitLower.includes('1000') || limitLower.includes('1,000') || limitLower.includes('1200')) return 1000
    return 800 // 기본 대학 논술 표준 규격
  }, [targetLimit])

  // 사용자가 선택한 원고지 규격 (400자 | 800자 | 1000자)
  const [capacity, setCapacity] = useState<ManuscriptCapacity>(initialCapacity)

  // targetLimit 변경 시 초기값 갱신
  useEffect(() => {
    setCapacity(initialCapacity)
  }, [initialCapacity])

  // 모달 오픈 시 포커스
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(value.length, value.length)
          setCursorPos(value.length)
        }
      }, 100)
    }
  }, [isOpen])

  // 커서 이동 동기화
  const handleSelect = () => {
    if (textareaRef.current) {
      setCursorPos(textareaRef.current.selectionStart || 0)
    }
  }

  // 텍스트 변경
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value
    onChange(newVal)
    setCursorPos(e.target.selectionStart || 0)
  }

  /**
   * 텍스트를 선택된 규격(400자=20줄, 800자=40줄, 1000자=50줄)에 맞춰 원고지 매트릭스로 변환
   * - 한 줄 20칸 규격
   */
  const { allRows, totalRowsNeeded } = useMemo(() => {
    const COLS_PER_ROW = 20
    const targetRows = capacity / COLS_PER_ROW // 400: 20줄, 800: 40줄, 1000: 50줄

    type RowType = ManuscriptCell[]
    const rows: RowType[] = []
    let currentRow: RowType = []

    let i = 0
    const len = value.length

    while (i < len) {
      const char = value[i]

      if (char === '\n') {
        // 줄바꿈 문자: 현재 줄의 남은 칸을 개행 공백으로 채움
        const remainingCols = COLS_PER_ROW - currentRow.length
        for (let c = 0; c < remainingCols; c++) {
          currentRow.push({
            char: '',
            textIndex: i,
            isCarat: i === cursorPos && c === 0,
            isLineBreak: true
          })
        }
        rows.push(currentRow)
        currentRow = []
        i++
        continue
      }

      // 일반 글자
      currentRow.push({
        char: char,
        textIndex: i,
        isCarat: i === cursorPos,
        isLineBreak: false
      })

      if (currentRow.length === COLS_PER_ROW) {
        rows.push(currentRow)
        currentRow = []
      }

      i++
    }

    // 마지막 커서 칸 표시
    if (currentRow.length < COLS_PER_ROW) {
      currentRow.push({
        char: '',
        textIndex: len,
        isCarat: cursorPos === len,
        isLineBreak: false
      })
    }

    // 최소 목표 줄 수(capacity 기준)까지 빈 행 채우기 (초과 시 글자 수에 맞춰 자동 확장)
    const requiredRows = Math.max(targetRows, rows.length + (currentRow.length > 0 ? 1 : 0))

    while (rows.length < requiredRows || currentRow.length > 0) {
      if (currentRow.length > 0) {
        while (currentRow.length < COLS_PER_ROW) {
          currentRow.push({ char: '', textIndex: -1, isCarat: false, isLineBreak: false })
        }
        rows.push(currentRow)
        currentRow = []
      } else {
        const emptyRow: RowType = []
        for (let c = 0; c < COLS_PER_ROW; c++) {
          emptyRow.push({ char: '', textIndex: -1, isCarat: false, isLineBreak: false })
        }
        rows.push(emptyRow)
      }
    }

    return { allRows: rows, totalRowsNeeded: targetRows }
  }, [value, cursorPos, capacity])

  // 특정 칸 클릭 시 커서 이동
  const handleCellClick = (cell: ManuscriptCell) => {
    if (textareaRef.current) {
      textareaRef.current.focus()
      const targetPos = cell.textIndex >= 0 ? cell.textIndex : value.length
      textareaRef.current.setSelectionRange(targetPos, targetPos)
      setCursorPos(targetPos)
    }
  }

  // 복사 핸들러
  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopiedNotice(true)
    setTimeout(() => setCopiedNotice(false), 2000)
  }

  if (!isOpen) return null

  const totalLength = value.length
  const noSpaceLength = value.replace(/\s/g, '').length
  const progressPercent = Math.min(Math.round((totalLength / capacity) * 100), 100)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl h-[92vh] max-h-[960px] bg-[#fbf9f4] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[#d6cebf]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. 상단 툴바 & 규격 선택 바 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-3.5 bg-white border-b border-[#e5dec9] shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-sm">
              ▦
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  실전 원고지 답안 작성기
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100/70 text-emerald-800 border border-emerald-200">
                  {questionLabel}
                </span>
                <span className="text-xs font-semibold text-slate-500 hidden md:inline">
                  규정: {targetLimit}
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500">
                한 줄 20칸 규격 · 사각 칸 정중앙에 한 글자씩 정밀 입력됩니다.
              </p>
            </div>
          </div>

          {/* 400자 / 800자 / 1000자 규격 선택 세그먼트 버튼 */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            <div className="flex items-center p-1 bg-slate-100 border border-slate-200 rounded-xl gap-1">
              <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1 hidden lg:flex">
                <SlidersHorizontal size={12} />
                규격:
              </span>
              <button
                type="button"
                onClick={() => setCapacity(400)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  capacity === 400
                    ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                400자 원고
              </button>
              <button
                type="button"
                onClick={() => setCapacity(800)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  capacity === 800
                    ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                800자 원고 <span className="text-[10px] text-emerald-600 font-normal">(표준)</span>
              </button>
              <button
                type="button"
                onClick={() => setCapacity(1000)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  capacity === 1000
                    ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1,000자 원고
              </button>
            </div>

            {/* 답안 복사 버튼 */}
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
              title="답안 클립보드 복사"
            >
              {copiedNotice ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span className="hidden sm:inline">{copiedNotice ? '복사됨' : '복사'}</span>
            </button>

            {/* 적용 및 닫기 버튼 */}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>적용 및 닫기</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. 글자 수 달성률 인디케이터 바 */}
        <div className="px-6 py-2.5 bg-[#f4efe4] border-b border-[#e5dec9] flex items-center justify-between text-xs text-slate-700 font-semibold flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span>
              선택 규격: <strong className="text-emerald-800 font-extrabold">{capacity}자</strong> (20칸 × {capacity / 20}줄)
            </span>
            <span className="text-slate-300">|</span>
            <span>
              작성 분량: <strong className="text-emerald-700 font-bold">{totalLength}</strong>자 / {capacity}자
              <span className="text-slate-500 font-normal ml-1">({progressPercent}%)</span>
            </span>
            <span className="text-slate-300">|</span>
            <span>공백 제외: {noSpaceLength}자</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11.5px] text-slate-500">목표 달성도</span>
            <div className="w-28 sm:w-36 h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-200"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3. 원고지 본문 스크롤 영역 */}
        <div
          ref={containerRef}
          onClick={() => textareaRef.current?.focus()}
          className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#fbf9f4] cursor-text"
        >
          <div className="max-w-[760px] mx-auto bg-[#fffdfa] rounded-xl shadow-md border-2 border-[#2e7d32] p-5 sm:p-7 relative transition-all">
            {/* 원고지 상단 헤더 */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#c8e6c9] text-xs text-[#2e7d32] font-semibold">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wide">
                  {capacity}자 원고지 답안지
                </span>
                <span className="text-[#81c784]">|</span>
                <span>한 줄 20칸 규격 (총 {capacity / 20}줄)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-[#e8f5e9] text-[#1b5e20] px-2.5 py-0.5 rounded text-[11px] font-bold">
                  대학 논술 공식 답안지 양식
                </span>
              </div>
            </div>

            {/* 원고지 행/열 매트릭스 테이블 */}
            <div className="border border-[#81c784] bg-white rounded shadow-xs overflow-hidden">
              {allRows.map((row, rowIdx) => {
                const rowNumber = rowIdx + 1
                const isTargetCapacityLine = rowNumber === capacity / 20
                return (
                  <div
                    key={rowIdx}
                    className={`flex border-b border-[#a5d6a7] last:border-b-0 relative group ${
                      isTargetCapacityLine ? 'border-b-2 border-b-emerald-600' : ''
                    }`}
                  >
                    {/* 좌측 줄 번호 */}
                    <div className="w-8 shrink-0 flex items-center justify-center bg-[#f1f8e9] border-r border-[#a5d6a7] text-[10.5px] font-bold text-[#33691e] font-mono select-none">
                      {rowNumber}
                    </div>

                    {/* 20개 칸 렌더링 */}
                    <div className="flex-1 flex">
                      {row.map((cell, colIdx) => {
                        return (
                          <div
                            key={colIdx}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCellClick(cell)
                            }}
                            className={`flex-1 h-9 sm:h-10 border-r border-[#c8e6c9] last:border-r-0 flex items-center justify-center relative select-none cursor-pointer transition-colors ${
                              cell.isCarat ? 'bg-emerald-100/60 ring-2 ring-emerald-500 z-10' : 'hover:bg-emerald-50/40'
                            }`}
                          >
                            {/* 글자 표시 */}
                            <span
                              className="text-base sm:text-lg font-semibold text-slate-900 leading-none"
                              style={{
                                fontFamily: "'D2Coding', 'Nanum Gothic Coding', 'Noto Serif KR', monospace"
                              }}
                            >
                              {cell.char}
                            </span>

                            {/* 깜빡이는 커서 */}
                            {cell.isCarat && (
                              <span className="absolute inset-y-1 left-1/2 -translate-x-1/2 w-0.5 bg-emerald-600 animate-pulse pointer-events-none" />
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* 우측 누적 글자 수 안내 (5줄마다 글자 수 마커 표시) */}
                    <div className="w-14 shrink-0 flex items-center justify-center bg-[#f9fbe7] border-l border-[#c8e6c9] text-[10px] font-semibold text-[#558b2f] select-none">
                      {rowNumber % 5 === 0 ? (
                        <span className={isTargetCapacityLine ? 'font-bold text-emerald-800' : ''}>
                          {rowNumber * 20}자
                        </span>
                      ) : ''}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 하단 각주 및 원고지 작성 요령 */}
            <div className="mt-3.5 flex items-center justify-between text-[11px] text-[#558b2f] font-medium flex-wrap gap-2">
              <span>* 문단 첫 칸은 비우고 둘째 칸부터 서술하며, 문장부호(.,!?)는 한 칸을 차지합니다.</span>
              <span className="font-bold text-emerald-800">
                [ 목표선: {capacity}자 ({capacity / 20}줄) ]
              </span>
            </div>
          </div>

          {/* 하단 동기화 안내 바 */}
          <div className="max-w-[760px] mx-auto mt-6 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <p className="text-xs font-bold text-emerald-950">
                원고지 팝업에서 작성한 모든 글은 메인 답안 작성창에 실시간으로 100% 동기화 저장됩니다.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors shadow-xs shrink-0"
            >
              답안 반영 완료
            </button>
          </div>
        </div>

        {/* 4. 백그라운드 실제 텍스트 입력 textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextChange}
          onSelect={handleSelect}
          onKeyUp={handleSelect}
          onClick={handleSelect}
          aria-label="원고지 실제 입력기"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '1px',
            height: '1px',
            opacity: 0.01,
            pointerEvents: 'none',
            zIndex: -1
          }}
        />
      </div>
    </div>
  )
}
