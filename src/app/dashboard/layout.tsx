import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "./DashboardShell"
import { ToastProvider } from "./ToastProvider"
import DemoBanner from "@/components/DemoBanner"

const DAILY_GREETINGS = [
  "오늘도 좋은 하루 되세요!",
  "활기찬 하루 시작하세요!",
  "오늘도 최선을 다해 봐요!",
  "좋은 일만 가득한 하루 되세요!",
  "오늘 하루도 파이팅!",
  "웃음 가득한 하루 보내세요!",
  "오늘도 건강하고 행복하세요!",
  "멋진 하루가 되길 바랍니다!",
  "오늘도 좋은 에너지 충전하세요!",
  "즐거운 하루 되세요!",
  "오늘 하루도 수고 많으세요!",
  "긍정의 기운이 넘치는 하루 되세요!",
  "오늘도 승승장구하세요!",
  "행복한 하루 시작하세요!",
  "오늘도 빛나는 하루 되세요!",
]

function getDailyGreeting(): string {
  const now = new Date()
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
  return DAILY_GREETINGS[dayOfYear % DAILY_GREETINGS.length]
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const role = (session.user as any)?.role as string | undefined

  return (
    <>
      <DemoBanner />
      <DashboardShell
        role={role}
        userName={session.user?.name ?? ''}
        userEmail={session.user?.email ?? ''}
        greeting={getDailyGreeting()}
        year={new Date().getFullYear()}
      >
        {children}
      </DashboardShell>
      <ToastProvider />
    </>
  )
}
