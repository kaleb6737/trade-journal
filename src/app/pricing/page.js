import PricingExperience from '@/components/marketing/PricingExperience'
import { launchWindow } from '@/lib/essenceOffer'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pricing — TradeXEssence', description: 'One trading journal. $15 monthly or $99 annually. Founding launch offer: $59 for the first year, then $99/year. USD.' }

export default function PricingPage() {
  return <PricingExperience launch={launchWindow()} />
}
