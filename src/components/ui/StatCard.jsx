import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', trend, trendLabel }) {
  const colorMap = {
    blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',     icon: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',   val: 'text-blue-700 dark:text-blue-300' },
    green:  { bg: 'bg-green-50 dark:bg-green-900/20',   icon: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400', val: 'text-green-700 dark:text-green-300' },
    yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', icon: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400', val: 'text-yellow-700 dark:text-yellow-300' },
    red:    { bg: 'bg-red-50 dark:bg-red-900/20',       icon: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',       val: 'text-red-700 dark:text-red-300' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400', val: 'text-purple-700 dark:text-purple-300' },
  }
  const c = colorMap[color] || colorMap.blue

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus
  const trendColor = trend > 0 ? 'text-green-600 dark:text-green-400' : trend < 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-400'

  return (
    <div className={`${c.bg} rounded-xl p-5 border border-white/50 dark:border-slate-700/50 shadow-sm`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.icon}`}>
          {Icon && <Icon size={18} />}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon size={12} />
            {trendLabel || (trend > 0 ? `+${trend}%` : `${trend}%`)}
          </div>
        )}
      </div>
      <div className={`text-2xl font-bold ${c.val} leading-tight`}>{value}</div>
      <div className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-1">{title}</div>
      {subtitle && <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</div>}
    </div>
  )
}
