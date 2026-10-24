// 日本の祝日を計算する（祝日法にもとづく。2019〜2099年）。
// 春分・秋分の日は、国立天文台の暦要項を待たずに使える近似式で求める（1980〜2099年で一致）。
// ⚠ 法律が変われば変わる。将来の改正や、その年だけの特例（2020・2021年の五輪の移動など）は
// ここに書いたものしか反映されない。
// 日付はすべて UTC の 0 時として扱い、タイムゾーンの影響を受けないようにする。

const key = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/** その月の第 n 月曜日 */
function nthMonday(y: number, m: number, n: number): number {
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay()
  return 1 + ((8 - first) % 7) + (n - 1) * 7
}

function vernal(y: number) {
  return Math.floor(20.8431 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4))
}
function autumnal(y: number) {
  return Math.floor(23.2488 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4))
}

const cache = new Map<number, Map<string, string>>()

export function holidaysOf(y: number): Map<string, string> {
  const hit = cache.get(y)
  if (hit) return hit
  const h = new Map<string, string>()
  if (y < 2019 || y > 2099) {
    cache.set(y, h)
    return h
  }
  const add = (m: number, d: number, name: string) => h.set(key(y, m, d), name)

  add(1, 1, '元日')
  add(1, nthMonday(y, 1, 2), '成人の日')
  add(2, 11, '建国記念の日')
  if (y >= 2020) add(2, 23, '天皇誕生日')
  add(3, vernal(y), '春分の日')
  add(4, 29, '昭和の日')
  add(5, 3, '憲法記念日')
  add(5, 4, 'みどりの日')
  add(5, 5, 'こどもの日')
  if (y === 2020) add(7, 23, '海の日')
  else if (y === 2021) add(7, 22, '海の日')
  else add(7, nthMonday(y, 7, 3), '海の日')
  if (y === 2020) add(8, 10, '山の日')
  else if (y === 2021) add(8, 8, '山の日')
  else add(8, 11, '山の日')
  add(9, nthMonday(y, 9, 3), '敬老の日')
  add(9, autumnal(y), '秋分の日')
  const sportsName = y >= 2020 ? 'スポーツの日' : '体育の日'
  if (y === 2020) add(7, 24, sportsName)
  else if (y === 2021) add(7, 23, sportsName)
  else add(10, nthMonday(y, 10, 2), sportsName)
  add(11, 3, '文化の日')
  add(11, 23, '勤労感謝の日')
  if (y === 2019) {
    add(4, 30, '国民の休日')
    add(5, 1, '天皇の即位の日')
    add(5, 2, '国民の休日')
    add(10, 22, '即位礼正殿の儀の行われる日')
  }

  // 国民の休日：前日と翌日が祝日に挟まれた平日
  for (let t = Date.UTC(y, 0, 2); t < Date.UTC(y, 11, 31); t += 86400000) {
    const d = new Date(t)
    const k = key(y, d.getUTCMonth() + 1, d.getUTCDate())
    if (h.has(k) || d.getUTCDay() === 0) continue
    const prev = new Date(t - 86400000)
    const next = new Date(t + 86400000)
    if (h.has(key(y, prev.getUTCMonth() + 1, prev.getUTCDate())) && h.has(key(y, next.getUTCMonth() + 1, next.getUTCDate())))
      h.set(k, '国民の休日')
  }

  // 振替休日：祝日が日曜なら、その後の最初の祝日でない日
  for (const k of [...h.keys()].sort()) {
    const [yy, mm, dd] = k.split('-').map(Number)
    const t0 = Date.UTC(yy, mm - 1, dd)
    if (new Date(t0).getUTCDay() !== 0) continue
    let t = t0 + 86400000
    for (;;) {
      const d = new Date(t)
      const kk = key(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
      if (!h.has(kk)) {
        if (d.getUTCFullYear() === y) h.set(kk, '振替休日')
        break
      }
      t += 86400000
    }
  }

  cache.set(y, h)
  return h
}

/** 'YYYY-MM-DD' が日本の祝日ならその名前 */
export function holidayName(dateStr: string): string | undefined {
  return holidaysOf(Number(dateStr.slice(0, 4))).get(dateStr)
}
