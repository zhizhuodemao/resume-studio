import { describe, it, expect } from 'vitest'
import { createChunkAssembler } from './sse.js'

const frame = obj => `data: ${JSON.stringify(obj)}\n\n`

describe('createChunkAssembler', () => {
  it('accumulates content deltas across frames', () => {
    const asm = createChunkAssembler()
    const d1 = asm.push(frame({ choices: [{ delta: { content: '你好' } }] }))
    const d2 = asm.push(frame({ choices: [{ delta: { content: '，世界' } }] }) + 'data: [DONE]\n\n')
    expect(d1).toEqual(['你好'])
    expect(d2).toEqual(['，世界'])
    expect(asm.result().content).toBe('你好，世界')
  })

  it('survives chunk boundaries splitting a frame mid-JSON', () => {
    const asm = createChunkAssembler()
    const full = frame({ choices: [{ delta: { content: '完整内容' } }] })
    const cut = Math.floor(full.length / 2)
    expect(asm.push(full.slice(0, cut))).toEqual([]) // incomplete line buffered
    expect(asm.push(full.slice(cut))).toEqual(['完整内容'])
  })

  it('reassembles tool_call argument fragments by index', () => {
    const asm = createChunkAssembler()
    asm.push(frame({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'c1', function: { name: 'set_template', arguments: '{"temp' } }] } }] }))
    asm.push(frame({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'late":"timeline"}' } }] } }] }))
    asm.push(frame({ choices: [{ delta: { tool_calls: [{ index: 1, id: 'c2', function: { name: 'set_accent', arguments: '{"color":"#334155"}' } }] } }] }))
    const { toolCalls } = asm.result()
    expect(toolCalls).toHaveLength(2)
    expect(toolCalls[0]).toEqual({ id: 'c1', name: 'set_template', arguments: '{"template":"timeline"}' })
    expect(JSON.parse(toolCalls[0].arguments).template).toBe('timeline')
    expect(toolCalls[1].name).toBe('set_accent')
  })

  it('ignores keep-alive comments, blank lines and malformed frames', () => {
    const asm = createChunkAssembler()
    asm.push(': keep-alive\n\ndata: not-json\n\n' + frame({ choices: [{ delta: { content: 'ok' } }] }))
    expect(asm.result().content).toBe('ok')
  })
})
