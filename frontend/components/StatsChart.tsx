
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TranslationStats } from '../types';

interface StatsChartProps {
  stats: TranslationStats;
}

export const StatsChart: React.FC<StatsChartProps> = ({ stats }) => {
  const data = [
    {
      name: '原文',
      chars: stats.originalChars,
    },
    {
      name: '译文',
      chars: stats.translatedChars,
    },
  ];

  return (
    <div className="w-full h-64 bg-gray-800/50 rounded-xl p-4 border border-gray-700">
      <h3 className="text-sm font-medium text-gray-400 mb-4">字符数量实时对比</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{
            top: 5,
            right: 30,
            left: 40,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
          <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
          <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} width={40} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#4B5563', color: '#fff' }}
            cursor={{fill: 'rgba(255,255,255,0.05)'}}
          />
          <Bar dataKey="chars" radius={[0, 4, 4, 0]} barSize={30} animationDuration={500}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index === 0 ? '#6366f1' : '#10b981'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-center text-gray-500 mt-2">
        保持原文和译文长度相近有助于维持 PPT 版面整洁。
      </p>
    </div>
  );
};
