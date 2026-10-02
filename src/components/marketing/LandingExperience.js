'use client'

import Hero from './landing/Hero'
import ProductTour from './landing/ProductTour'
import Features from './landing/Features'
import SocialProof from './landing/SocialProof'
import Conversion from './landing/Conversion'

export default function LandingPage({ launch }) {
  return (
    <div className="landing">
      <Hero />
      <ProductTour />
      <Features />
      <SocialProof />
      <Conversion launch={launch} />
    </div>
  )
}
