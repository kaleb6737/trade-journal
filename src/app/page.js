import LandingExperience from '@/components/marketing/LandingExperience'
import { launchWindow } from '@/lib/essenceOffer'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'TradeXEssence — Your edge lives in the data you admit.',
  description: 'A clearer trading journal for your trades, setups and mindset. Explore analytics, playbooks, guided CSV imports and weekly reviews. One simple plan.',
}

export default function LandingPage() {
  return <LandingExperience launch={launchWindow()} />
}
