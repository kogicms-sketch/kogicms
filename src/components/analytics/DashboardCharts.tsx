"use client";
import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    PieChart,
    Pie,
} from 'recharts';

interface TrendChartProps {
    data: any[];
    color?: string;
    height?: number;
}

export const RegistrationTrendChart = ({ data, color = "#006600", height = 250 }: TrendChartProps) => {
    return (
        <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorMembers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis 
                        dataKey="period" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#6B7280' }}
                        dy={10}
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#6B7280' }}
                    />
                    <Tooltip 
                        contentStyle={{ 
                            borderRadius: '8px', 
                            border: 'none', 
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            fontSize: '12px'
                        }} 
                    />
                    <Area 
                        type="monotone" 
                        dataKey="members" 
                        stroke={color} 
                        fillOpacity={1} 
                        fill="url(#colorMembers)" 
                        strokeWidth={3}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

interface VictoryGaugeProps {
    percentage: number;
    target: number;
    current: number;
    verified?: number;
    label?: string;
    description?: string;
}

export const VictoryGauge = ({ percentage, target, current, verified, label = "Victory Projection", description }: VictoryGaugeProps) => {
    const clampedPct = Math.min(Math.max(percentage, 0), 100);
    const gaugeColor = clampedPct >= 70 ? '#16a34a' : clampedPct >= 40 ? '#2563eb' : '#dc2626';
    const gaugeBg   = '#E5E7EB';

    const gaugeData = [
        { name: 'Progress',  value: clampedPct,           fill: gaugeColor },
        { name: 'Remaining', value: 100 - clampedPct,     fill: gaugeBg   },
    ];

    const statusLabel = clampedPct >= 70 ? 'Stronghold' : clampedPct >= 40 ? 'Growth Phase' : 'Building';
    const verifiedCount = verified ?? current;

    return (
        <div className="flex flex-col items-center gap-0 w-full">
            {/* Gauge arc */}
            <div className="relative w-full" style={{ height: 154 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={gaugeData}
                            cx="50%"
                            cy="100%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius="62%"
                            outerRadius="92%"
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                            isAnimationActive={true}
                            animationBegin={0}
                            animationDuration={900}
                        />
                    </PieChart>
                </ResponsiveContainer>

                {/* Centre overlay */}
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-1">
                    <span
                        className="font-black leading-none tracking-tight"
                        style={{ fontSize: 42, color: gaugeColor, letterSpacing: '-0.03em' }}
                    >
                        {clampedPct.toFixed(0)}%
                    </span>
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-gray-400 mt-0.5">
                        {description || 'Coverage'}
                    </span>
                </div>
            </div>

            {/* Title */}
            <div className="text-center mt-1 px-2">
                <p className="text-[13px] font-bold text-gray-800 leading-tight tracking-tight">
                    {label}
                </p>
            </div>

            {/* Divider */}
            <div className="w-full border-t border-gray-100 my-2 mx-4" />

            {/* Breakdown rows */}
            <div className="w-full grid grid-cols-2 gap-x-3 gap-y-1 px-1">
                <div className="flex flex-col items-center rounded-lg bg-gray-50 py-2">
                    <span className="text-[18px] font-black leading-none" style={{ color: gaugeColor }}>
                        {verifiedCount.toLocaleString()}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">
                        Verified
                    </span>
                </div>
                <div className="flex flex-col items-center rounded-lg bg-gray-50 py-2">
                    <span className="text-[18px] font-black leading-none text-gray-700">
                        {target.toLocaleString()}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">
                        Target
                    </span>
                </div>
            </div>

            {/* Status pill */}
            <div
                className="mt-2 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest"
                style={{ background: `${gaugeColor}18`, color: gaugeColor }}
            >
                {statusLabel}
            </div>
        </div>
    );
};

interface PerformanceBarProps {
    data: { name: string; value: number; color?: string }[];
    height?: number;
}

export const PerformanceBarChart = ({ data, height = 300 }: PerformanceBarProps) => {
    return (
        <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
                <BarChart data={data} layout="vertical" margin={{ left: 40, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                    <XAxis type="number" hide />
                    <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 11, fontWeight: 600, fill: '#374151' }}
                        width={100}
                    />
                    <Tooltip 
                         cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                         contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || '#006600'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
