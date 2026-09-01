'use client'

import { FormEvent, useState } from 'react'

function Brand() {
  return <div className="auth-brand"><div className="brand-name"><span>an</span><b>na</b></div><div className="brand-subtitle">MUSIC WEB PLAYER</div></div>
}

function LoginScreen({ onConnect }: { onConnect: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!/^\d{6}$/.test(pin)) { setError('Mã PIN cần đủ 6 chữ số.'); return }
    onConnect()
  }
  return <main className="auth-shell"><Brand /><form className="auth-card" onSubmit={submit}><div className="card-kicker">KẾT NỐI TÀI KHOẢN</div><h1>Nhập mã PIN</h1><p className="card-copy">Dùng lệnh /web trong Discord để nhận mã 6 số</p><label className="pin-label" htmlFor="pin">MÃ PIN</label><input id="pin" autoFocus inputMode="numeric" maxLength={6} value={pin} onChange={(event) => { setPin(event.target.value.replace(/\D/g, '')); setError('') }} placeholder="Nhập PIN 6 số..." /><div className="pin-digits" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <span key={index} className={pin[index] ? 'filled' : ''}>{pin[index] || '·'}</span>)}</div>{error && <p className="form-error">{error}</p>}<button className="primary-button" type="submit">Kết Nối</button><p className="card-footnote">Mã PIN chỉ có hiệu lực trong phiên hiện tại.</p></form><footer className="auth-footer">ANNA MUSIC · 2024</footer></main>
}

function VoiceScreen({ onRetry, onLogout }: { onRetry: () => void; onLogout: () => void }) {
  return <main className="auth-shell"><Brand /><section className="auth-card voice-card"><div className="quiet-shape" aria-hidden="true"><i /><i /><i /><i /><i /></div><div className="card-kicker">PHIÊN KẾT NỐI</div><h1>Chưa ở trong kênh Voice</h1><p className="card-copy">Để sử dụng web player, bạn cần tham gia một kênh thoại (Voice Channel) trên Discord trước. Bot và bạn phải ở cùng kênh.</p><div className="server-badge">SERVER NAME</div><div className="voice-actions"><button className="primary-button" onClick={onRetry}>Thử Lại</button><button className="ghost-button" onClick={onLogout}>Đăng Xuất</button></div><p className="hint">Sau khi vào kênh Voice, nhấn Thử Lại để đồng bộ.</p></section><footer className="auth-footer">ANNA MUSIC · 2024</footer></main>
}

export default function Page() {
  const [connected, setConnected] = useState(false)
  return connected ? <VoiceScreen onRetry={() => undefined} onLogout={() => setConnected(false)} /> : <LoginScreen onConnect={() => setConnected(true)} />
}
