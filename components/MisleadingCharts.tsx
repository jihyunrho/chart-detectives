import React from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart
} from 'recharts';
import { MisleadingComponent } from '../types';

interface ChartProps {
  type: MisleadingComponent | 'FINAL_BOSS';
  variant?: 'A' | 'B'; // A = Learning/Example, B = Testing/New Scenario
  width?: string | number;
  height?: string | number;
}

// --- DATASET A (Learning) ---

const invertedDataA = [
  { name: 'Jan', rank: 10 },
  { name: 'Feb', rank: 8 },
  { name: 'Mar', rank: 5 },
  { name: 'Apr', rank: 2 },
  { name: 'May', rank: 1 },
];

const truncatedDataA = [
  { name: 'Q1', satisfaction: 95.1 },
  { name: 'Q2', satisfaction: 95.2 },
  { name: 'Q3', satisfaction: 95.8 },
  { name: 'Q4', satisfaction: 96.0 },
];

const irregularDataA = [
  { year: '2010', profit: 50 },
  { year: '2011', profit: 55 },
  { year: '2018', profit: 60 },
  { year: '2019', profit: 70 },
];

const aggregatedDataA = [
  { year: 'Year 1', avg: 50 },
  { year: 'Year 2', avg: 52 },
  { year: 'Year 3', avg: 54 },
];

// --- DATASET B (Testing - New scenarios for Step 3) ---

// Inverted Y: Bug Count (Lower is usually better, but here it looks like "Growth" visually)
const invertedDataB = [
  { name: 'Wk 1', bugs: 50 },
  { name: 'Wk 2', bugs: 40 },
  { name: 'Wk 3', bugs: 30 },
  { name: 'Wk 4', bugs: 20 },
  { name: 'Wk 5', bugs: 5 }, 
];

// Truncated Y: Exchange Rate (Tiny fluctuations look massive)
const truncatedDataB = [
  { name: 'Mon', rate: 1.051 },
  { name: 'Tue', rate: 1.052 },
  { name: 'Wed', rate: 1.051 },
  { name: 'Thu', rate: 1.058 },
  { name: 'Fri', rate: 1.059 },
];

// Irregular X: Skipping low traffic hours/days to show constant growth
const irregularDataB = [
  { time: '10:00', visitors: 100 },
  { time: '11:00', visitors: 150 },
  { time: '18:00', visitors: 300 }, // Skipped the afternoon slump
  { time: '20:00', visitors: 400 },
];

// Aggregated: Average Monthly Temperature (Hiding extreme heat waves)
const aggregatedDataB = [
  { month: 'June', avgTemp: 75 },
  { month: 'July', avgTemp: 78 }, // Hides the 3 days it was 105 degrees
  { month: 'Aug', avgTemp: 76 },
];


// Final Boss
const finalBossData = [
  { name: '2018', revenue: 1000, growth: 2.1 },
  { name: '2019', revenue: 1020, growth: 2.2 },
  { name: '2023', revenue: 1100, growth: 2.8 },
  { name: '2024', revenue: 1150, growth: 4.5 },
];

export const MisleadingChart: React.FC<ChartProps> = ({ type, variant = 'A' }) => {
  
  if (type === MisleadingComponent.INVERTED_Y) {
    const data = variant === 'A' ? invertedDataA : invertedDataB;
    const yLabel = variant === 'A' ? 'Rank (Lower is Better)' : 'Critical Bugs Found';
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          {/* Always reversed to demonstrate the trick */}
          <YAxis reversed={true} label={{ value: yLabel, angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={variant === 'A' ? 'rank' : 'bugs'} stroke="#8884d8" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === MisleadingComponent.TRUNCATED_Y) {
    const data = variant === 'A' ? truncatedDataA : truncatedDataB;
    const domain: [number, number] = variant === 'A' ? [94, 97] : [1.050, 1.060];
    const dataKey = variant === 'A' ? 'satisfaction' : 'rate';
    const label = variant === 'A' ? 'Satisfaction %' : 'Exchange Rate';

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis domain={domain} label={{ value: label, angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Bar dataKey={dataKey} fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === MisleadingComponent.IRREGULAR_X) {
    const data = variant === 'A' ? irregularDataA : irregularDataB;
    const xKey = variant === 'A' ? 'year' : 'time';
    const yKey = variant === 'A' ? 'profit' : 'visitors';

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={yKey} stroke="#ff7300" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === MisleadingComponent.AGGREGATED) {
    const data = variant === 'A' ? aggregatedDataA : aggregatedDataB;
    const xKey = variant === 'A' ? 'year' : 'month';
    const yKey = variant === 'A' ? 'avg' : 'avgTemp';
    const name = variant === 'A' ? 'Average Performance' : 'Avg Temp (F)';

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey={yKey} fill="#0088FE" name={name} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'FINAL_BOSS') {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={finalBossData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis yAxisId="left" orientation="left" domain={[900, 1200]} label={{ value: 'Revenue ($M)', angle: -90, position: 'insideLeft' }} />
          <YAxis yAxisId="right" orientation="right" domain={[0, 10]} label={{ value: 'User Growth %', angle: 90, position: 'insideRight' }} />
          <Tooltip />
          <Legend />
          <Bar yAxisId="left" dataKey="revenue" barSize={20} fill="#413ea0" />
          <Line yAxisId="right" type="monotone" dataKey="growth" stroke="#ff7300" strokeWidth={4} />
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  return <div>Unknown Chart Type</div>;
};
