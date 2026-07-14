import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "./DashboardShell"
import { ToastProvider } from "./ToastProvider"
import DemoBanner from "@/components/DemoBanner"

const DAILY_GREETINGS = [
  "Have a great day today!",
  "Start your day with energy!",
  "Let's do our best today!",
  "May today be full of good things!",
  "You've got this today!",
  "Wishing you a day full of smiles!",
  "Stay healthy and happy today!",
  "Hope you have an amazing day!",
  "Recharge with good energy today!",
  "Have a fun day!",
  "Thanks for your hard work today!",
  "May positivity fill your day!",
  "Keep up the winning streak today!",
  "Start a happy day!",
  "Shine bright today!",
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
