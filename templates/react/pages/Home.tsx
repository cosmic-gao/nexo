import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Wallet, BarChart3, PieChart, ArrowRight } from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart as RechartsPieChart, XAxis, YAxis } from 'recharts'

// 统计数据
const stats = [
  {
    title: 'My Wallet',
    value: '$865.2k',
    change: '+$20.9k',
    changeType: 'positive' as const,
    icon: Wallet,
  },
  {
    title: 'Number of Trades',
    value: '6258',
    change: '-29',
    changeType: 'negative' as const,
    icon: BarChart3,
  },
  {
    title: 'Invested Amount',
    value: '$4.32M',
    change: '+$2.8k',
    changeType: 'positive' as const,
    icon: TrendingUp,
  },
  {
    title: 'Profit Ratio',
    value: '12.57%',
    change: '+2.95%',
    changeType: 'positive' as const,
    icon: PieChart,
  },
]

// 图表数据
const walletDataByTimeRange: Record<string, Array<{ name: string; value: number; amount: string; usd: string; color: string }>> = {
  ALL: [
    { name: 'Bitcoin', value: 58.3, amount: '0.4412 BTC', usd: '$4025.32', color: '#17b3a3' },
    { name: 'Ethereum', value: 29.2, amount: '4.5701 ETH', usd: '$1123.64', color: '#4a90e2' },
    { name: 'Litecoin', value: 12.5, amount: '35.3811 LTC', usd: '$2263.09', color: '#7b68ee' },
  ],
  '1M': [
    { name: 'Bitcoin', value: 52.1, amount: '0.3850 BTC', usd: '$3650.20', color: '#17b3a3' },
    { name: 'Ethereum', value: 32.8, amount: '5.1200 ETH', usd: '$1420.50', color: '#4a90e2' },
    { name: 'Litecoin', value: 15.1, amount: '38.5000 LTC', usd: '$2450.30', color: '#7b68ee' },
  ],
  '6M': [
    { name: 'Bitcoin', value: 48.5, amount: '0.3520 BTC', usd: '$3420.10', color: '#17b3a3' },
    { name: 'Ethereum', value: 35.2, amount: '5.5000 ETH', usd: '$1680.40', color: '#4a90e2' },
    { name: 'Litecoin', value: 16.3, amount: '40.2000 LTC', usd: '$2580.50', color: '#7b68ee' },
  ],
  '1Y': [
    { name: 'Bitcoin', value: 45.2, amount: '0.3200 BTC', usd: '$3100.00', color: '#17b3a3' },
    { name: 'Ethereum', value: 38.4, amount: '6.0000 ETH', usd: '$1850.20', color: '#4a90e2' },
    { name: 'Litecoin', value: 16.4, amount: '42.0000 LTC', usd: '$2680.80', color: '#7b68ee' },
  ],
}

const walletPresets = {
  base: walletDataByTimeRange.ALL,
  alt: [
    { name: 'Bitcoin', value: 42.1, amount: '0.3210 BTC', usd: '$3100.10', color: '#17b3a3' },
    { name: 'Ethereum', value: 38.4, amount: '5.1200 ETH', usd: '$1560.20', color: '#4a90e2' },
    { name: 'Litecoin', value: 19.5, amount: '40.0000 LTC', usd: '$2500.00', color: '#7b68ee' },
  ],
}

const marketDataByTimeRange: Record<string, Array<{ month: string; value: number; negative: number }>> = {
  ALL: [
    { month: 'Jan', value: 12, negative: -8 },
    { month: 'Feb', value: 19, negative: -5 },
    { month: 'Mar', value: 15, negative: -12 },
    { month: 'Apr', value: 22, negative: -3 },
    { month: 'May', value: 18, negative: -9 },
    { month: 'Jun', value: 25, negative: -2 },
    { month: 'Jul', value: 20, negative: -7 },
    { month: 'Aug', value: 27, negative: -1 },
    { month: 'Sep', value: 23, negative: -6 },
    { month: 'Oct', value: 19, negative: -10 },
    { month: 'Nov', value: 24, negative: -4 },
    { month: 'Dec', value: 21, negative: -8 },
  ],
  '1M': [
    { month: 'Jan', value: 10, negative: -6 },
    { month: 'Feb', value: 15, negative: -4 },
    { month: 'Mar', value: 18, negative: -8 },
    { month: 'Apr', value: 20, negative: -5 },
  ],
  '6M': [
    { month: 'Jul', value: 20, negative: -7 },
    { month: 'Aug', value: 27, negative: -1 },
    { month: 'Sep', value: 23, negative: -6 },
    { month: 'Oct', value: 19, negative: -10 },
    { month: 'Nov', value: 24, negative: -4 },
    { month: 'Dec', value: 21, negative: -8 },
  ],
  '1Y': [
    { month: 'Jan', value: 12, negative: -8 },
    { month: 'Feb', value: 19, negative: -5 },
    { month: 'Mar', value: 15, negative: -12 },
    { month: 'Apr', value: 22, negative: -3 },
    { month: 'May', value: 18, negative: -9 },
    { month: 'Jun', value: 25, negative: -2 },
    { month: 'Jul', value: 20, negative: -7 },
    { month: 'Aug', value: 27, negative: -1 },
    { month: 'Sep', value: 23, negative: -6 },
    { month: 'Oct', value: 19, negative: -10 },
    { month: 'Nov', value: 24, negative: -4 },
    { month: 'Dec', value: 21, negative: -8 },
  ],
}

const marketPresets = {
  base: marketDataByTimeRange.ALL,
  alt: [
    { month: 'Jan', value: 8, negative: -4 },
    { month: 'Feb', value: 14, negative: -6 },
    { month: 'Mar', value: 18, negative: -8 },
    { month: 'Apr', value: 16, negative: -5 },
    { month: 'May', value: 24, negative: -3 },
    { month: 'Jun', value: 28, negative: -2 },
    { month: 'Jul', value: 22, negative: -6 },
    { month: 'Aug', value: 26, negative: -2 },
    { month: 'Sep', value: 20, negative: -7 },
    { month: 'Oct', value: 17, negative: -9 },
    { month: 'Nov', value: 25, negative: -4 },
    { month: 'Dec', value: 23, negative: -6 },
  ],
}

const trendData = [
  { name: 'Week 1', value: 4000 },
  { name: 'Week 2', value: 3000 },
  { name: 'Week 3', value: 5000 },
  { name: 'Week 4', value: 4500 },
]

const balanceList = [
  { name: 'Coinmarketcap', change: '+2.5%', positive: true },
  { name: 'Binance', change: '+8.3%', positive: true },
  { name: 'Coinbase', change: '-3.6%', positive: false },
  { name: 'Yobit', change: '+7.1%', positive: true },
  { name: 'Bitfinex', change: '-0.9%', positive: false },
]

const locationData = [
  { name: 'USA', value: 75 },
  { name: 'Russia', value: 55 },
  { name: 'Australia', value: 85 },
]

const newsItems = [
  {
    title: 'Bitcoin News',
    tag: '₿',
    description:
      'Bitcoin prices fell sharply amid the global sell-off in equities. Negative news over the past week has dampened sentiment for bitcoin.',
    cta: 'View details',
  },
  {
    title: 'ETH Update',
    tag: 'Ξ',
    description:
      'Ethereum network upgrades continue to improve efficiency and reduce gas costs, boosting developer confidence.',
    cta: 'View details',
  },
  {
    title: 'Market Watch',
    tag: '★',
    description:
      'Altcoins see mixed performance as investors rotate between large caps and emerging DeFi tokens.',
    cta: 'View details',
  },
]

export function Home() {
  const [newsIndex, setNewsIndex] = useState(0)
  const [timeRange, setTimeRange] = useState('ALL')
  const [marketRange, setMarketRange] = useState('ALL')
  const [walletPreset, setWalletPreset] = useState<'base' | 'alt'>('base')
  const [marketPreset, setMarketPreset] = useState<'base' | 'alt'>('base')
  const walletData = walletDataByTimeRange[timeRange] || walletDataByTimeRange.ALL
  const marketData = marketDataByTimeRange[marketRange] || marketDataByTimeRange.ALL
  const currentNews = newsItems[newsIndex]

  // 自动轮播新闻
  useEffect(() => {
    const timer = setInterval(() => {
      setNewsIndex((prev) => (prev + 1) % newsItems.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* 顶部统计卡片 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card
                key={stat.title}
                className="border border-border/70 shadow-sm"
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">{stat.title}</div>
                      <div className="text-2xl font-semibold text-foreground">{stat.value}</div>
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 ${
                            stat.changeType === 'positive'
                              ? 'bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                              : 'bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                          }`}
                        >
                          {stat.changeType === 'positive' ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {stat.change}
                        </span>
                        <span className="text-muted-foreground">Since last week</span>
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  {/* 小型趋势图 */}
                  <div className="mt-4">
                    <ChartContainer
                      className="h-12 aspect-auto"
                      config={{
                        value: {
                          color: '#17b3a3',
                        },
                      }}
                    >
                      <AreaChart data={trendData}>
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#6b6fd1"
                          fill="#6b6fd1"
                          fillOpacity={0.08}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* 中间行：钱包余额、投资概览、新闻 */}
        <div className="grid gap-6 lg:grid-cols-[1.45fr_1.15fr_0.9fr] lg:items-stretch [@media(max-width:1400px)]:grid-cols-1">
          {/* 钱包余额 - 饼图 */}
          <Card className="border-border/50 shadow-sm h-full flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <CardTitle className="text-lg font-semibold">Wallet Balance</CardTitle>
              <div className="flex items-center gap-2 text-xs">
                {['ALL', '1M', '6M', '1Y'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setTimeRange(tag)}
                    className={`cursor-pointer rounded px-3 py-1 transition-colors ${
                      timeRange === tag
                        ? 'bg-foreground text-background shadow-sm'
                        : 'border border-border text-muted-foreground hover:border-primary/50 hover:text-primary'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                {/* 饼图区域 */}
                <div className="flex items-center justify-center overflow-visible">
                  <ChartContainer
                    className="h-64 w-full aspect-auto"
                    config={{
                      bitcoin: { color: '#17b3a3' },
                      ethereum: { color: '#4a90e2' },
                      litecoin: { color: '#7b68ee' },
                    }}
                  >
                    <RechartsPieChart>
                      <Pie
                        data={walletData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        strokeWidth={0}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                          const RADIAN = Math.PI / 180
                          // 将标签放在环的中间位置，稍微偏向内圈以确保不超出
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.45
                          const x = cx + radius * Math.cos(-midAngle * RADIAN)
                          const y = cy + radius * Math.sin(-midAngle * RADIAN)
                          return (
                            <text
                              x={x}
                              y={y}
                              fill="white"
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize={11}
                              fontWeight="bold"
                              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
                            >
                              {`${Math.round(percent * 100)}%`}
                            </text>
                          )
                        }}
                        labelLine={false}
                      >
                        {walletData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    </RechartsPieChart>
                  </ChartContainer>
                </div>
                {/* 列表区域 */}
                <div className="grid gap-2.5">
                  {walletData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[13px] font-medium">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-[13px] font-semibold">{item.amount}</div>
                        <div className="text-[12px] text-muted-foreground">{item.usd}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 投资概览 - 进度条 */}
          <Card className="border-border/50 shadow-sm h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Invested Overview</CardTitle>
              <select className="text-xs border rounded px-2 py-1 bg-card">
                <option>May</option>
              </select>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_minmax(220px,260px)] lg:gap-7 lg:items-stretch flex-1">
                <div className="flex items-center justify-center lg:justify-start">
                  <div className="relative w-30 h-30 lg:w-34 lg:h-34">
                  <svg className="transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="url(#gradient)"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${80 * 3.14159 * 0.8} ${80 * 3.14159 * 0.2}`}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#17b3a3" />
                        <stop offset="100%" stopColor="#4a90e2" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">80%</span>
                  </div>
                  </div>
                </div>
                <div className="space-y-2.5 lg:max-w-[260px] flex flex-col">
                  <div>
                    <div className="text-[13px] text-muted-foreground mb-1">Invested Amount</div>
                    <div className="text-xl font-bold">$6134.39</div>
                    <div className="text-[13px] text-green-600 dark:text-green-400 flex items-center gap-1 mt-0.5">
                      <TrendingUp className="h-3 w-3" />
                      <span>+0.0012.23 (0.2%) ↑</span>
                    </div>
                  </div>
                  <div className="space-y-1 pt-2.5 border-t">
                    <div className="flex justify-between text-[13px]">
                      <span className="text-muted-foreground">INCOME</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">$2632.46</span>
                    </div>
                    <div className="flex justify-between text-[13px]">
                      <span className="text-muted-foreground">EXPENSES</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">-$924.38</span>
                    </div>
                  </div>
                  <button className="mt-auto w-full lg:w-auto px-4 py-2 bg-primary text-white rounded-lg text-[13px] font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                    View more <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 新闻卡片 */}
          <Card className="border-border/50 shadow-sm p-0 overflow-hidden h-full flex">
            <div className="h-full flex-1 bg-[#4b55c4] text-white p-6 flex flex-col gap-4 justify-center rounded-xl items-start text-left lg:items-center lg:text-center">
              <div className="flex items-center gap-2 lg:justify-center w-full">
                <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center text-sm font-bold">
                  {currentNews.tag}
                </div>
                <div className="text-lg font-semibold">{currentNews.title}</div>
              </div>
              <p className="text-sm text-white/80 leading-relaxed">
                {currentNews.description}
              </p>
              <button className="self-start lg:self-center px-4 py-2 bg-white text-[#4b55c4] rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors flex items-center gap-2">
                {currentNews.cta} <ArrowRight className="h-4 w-4" />
              </button>
              <div className="flex gap-1 lg:justify-center w-full">
                {newsItems.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setNewsIndex(idx)}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      idx === newsIndex ? 'bg-white' : 'bg-white/40'
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* 底部行：市场概览 + 销售位置 */}
              <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          {/* 市场概览 + 余额列表 */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <CardTitle className="text-lg font-semibold">Market Overview</CardTitle>
              <div className="flex items-center gap-2 text-xs">
                {['ALL', '1M', '6M', '1Y'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setMarketRange(tag)}
                    className={`cursor-pointer rounded border px-3 py-1 transition-colors ${
                      marketRange === tag
                        ? 'bg-foreground text-background'
                        : 'border-border text-muted-foreground hover:border-primary/50 hover:text-primary'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-[2fr_1fr] items-stretch">
                <ChartContainer
                  className="h-full min-h-[280px] w-full"
                  config={{
                    value: { color: '#17b3a3' },
                    negative: { color: '#ef4444' },
                  }}
                >
                  <BarChart data={marketData}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="#17b3a3" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="negative" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>

                <div className="space-y-3 flex flex-col justify-center">
                  {balanceList.map((item, idx) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{idx + 1}</span>
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          item.positive
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {item.change}
                      </span>
                    </div>
                  ))}

                  <button className="w-full mt-2 px-4 py-2 bg-[#5356e2] text-white rounded-lg text-sm font-medium hover:bg-[#4448d1] transition-colors flex items-center justify-center gap-2">
                    See All Balances <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 销售位置 - 横向条形图 */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Sales by Locations</CardTitle>
                <select className="text-xs border rounded px-2 py-1 bg-background">
                  <option>Sort By: World</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {locationData.map((item) => (
                  <div key={item.name}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-sm font-semibold">{item.value}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
