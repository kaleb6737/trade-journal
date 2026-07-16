'use client'

import { motion } from 'framer-motion'

export default function StatCard({ label, value, positive, icon, sub, index = 0 }) {
  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: index * 0.09,
        ease: [0.23, 1, 0.32, 1],
      }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      <div className="stat-icon">{icon}</div>
      <div className="stat-label">{label}</div>
      <motion.div
        className="stat-value"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: index * 0.09 + 0.25 }}
        style={{
          color: positive
            ? 'var(--green)'
            : label === 'Net P&L'
              ? 'var(--red)'
              : 'var(--text-primary)',
        }}
      >
        {value}
      </motion.div>
      {sub && (
        <motion.div
          className="stat-change"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: index * 0.09 + 0.4 }}
          style={{ color: 'var(--text-muted)' }}
        >
          {sub}
        </motion.div>
      )}
    </motion.div>
  )
}
