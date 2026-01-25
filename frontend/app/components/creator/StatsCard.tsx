import { CreatorStats, formatCurrency } from "@/app/data/mockCreatorData";

interface StatsCardProps {
  stats: CreatorStats;
}

export default function StatsCard({ stats }: StatsCardProps) {
  return (
    <div className="bg-card-bg-1 rounded-2xl p-6">
      <h2 className="text-white text-xl font-semibold mb-6">Stats</h2>

      <div className="flex gap-6">
        {/* Sales Snapshot */}
        <div className="flex-1">
          <h3 className="text-white font-semibold mb-4">Sales Snapshot</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white/50 text-sm uppercase">This month:</span>
              <span className="text-white font-semibold">
                {formatCurrency(stats.thisMonth)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/50 text-sm uppercase">Lifetime:</span>
              <span className="text-white font-semibold">
                {formatCurrency(stats.lifetime)}
              </span>
            </div>
          </div>
          <p className="text-white/50 text-sm mt-4">
            Combined earnings from subscriptions and ebook sales
          </p>
        </div>

        {/* Divider */}
        <div className="w-px bg-border" />

        {/* Revenue Breakdown */}
        <div className="flex-1">
          <h3 className="text-white font-semibold mb-4">Revenue Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white/50 text-sm uppercase">Subscriptions:</span>
              <span className="text-white font-semibold">
                {formatCurrency(stats.subscriptions)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/50 text-sm uppercase">Ebooks:</span>
              <span className="text-white font-semibold">
                {formatCurrency(stats.ebooks)}
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-border" />

        {/* Subscribers */}
        <div className="flex-1">
          <h3 className="text-white font-semibold mb-4">Subscribers</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white/50 text-sm uppercase">Active:</span>
              <span className="text-white font-semibold">{stats.activeSubscribers}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
