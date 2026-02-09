import React from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, ReferenceLine, Label
} from 'recharts';
import { MisleadingComponent } from '../types';

interface ChartProps {
  type: MisleadingComponent | 'CASE_POLICY' | 'CASE_MARKETING';
  variant?: 'A' | 'B' | 'C'; // A = Learn, B = Identify, C = Analyze
  activeIssues?: MisleadingComponent[]; // Dynamic issues to apply for Game Cases
  width?: string | number;
  height?: string | number;
}

// --- HELPER DATA GENERATORS ---

// 1. Inappropriate Order (축 순서 조작, 시간순이 아니라 값기준 정렬)
const orderDataA = [ { name: 'Feb', val: 80 }, { name: 'Apr', val: 90 }, { name: 'Jan', val: 40 }, { name: 'Mar', val: 60 } ];
const orderDataB = [ { name: 'Dec', sales: 500 }, { name: 'Oct', sales: 400 }, { name: 'Nov', sales: 300 }, { name: 'Sep', sales: 200 } ]; 
const orderDataC = [ { name: 'Step 3', time: 10 }, { name: 'Step 1', time: 5 }, { name: 'Step 4', time: 12 }, { name: 'Step 2', time: 8 } ];

// 2. Inappropriate Scale Range (축 범위 왜곡, truncated)
const rangeDataA = [ { name: 'Q1', sat: 98.1 }, { name: 'Q2', sat: 98.2 }, { name: 'Q3', sat: 98.4 } ];
const rangeDataB = [ { name: 'A', perf: 4.1 }, { name: 'B', perf: 4.15 }, { name: 'C', perf: 4.2 } ];
const rangeDataC = [ { name: '2020', tax: 10050 }, { name: '2021', tax: 10100 }, { name: '2022', tax: 10150 } ];

// 3. Inappropriate Scale Function (부적절한 scale, tick spacing 불일치)
const funcDataA = [ { year: '2010', val: 10 }, { year: '2011', val: 12 }, { year: '2018', val: 14 }, { year: '2019', val: 16 } ];
const funcDataB = [ { val: '1', score: 10 }, { val: '2', score: 20 }, { val: '10', score: 30 }, { val: '100', score: 40 } ]; 
const funcDataC = [ { date: 'Jan 1', price: 100 }, { date: 'Jan 2', price: 101 }, { date: 'Dec 31', price: 102 } ];

// 4. Unconventional Scale Directions (축 방향 조작, inverted)
const dirDataA = [ { name: 'A', rank: 1 }, { name: 'B', rank: 5 }, { name: 'C', rank: 10 } ]; 
const dirDataB = [ { name: 'Year 1', defects: 50 }, { name: 'Year 2', defects: 20 }, { name: 'Year 3', defects: 5 } ];
const dirDataC = [ { name: 'Q1', loss: -100 }, { name: 'Q2', loss: -50 }, { name: 'Q3', loss: -10 } ];

// 5. Missing Normalization 
const normDataA = [ { name: 'City A (Pop 1M)', crimes: 1000 }, { name: 'City B (Pop 10k)', crimes: 500 } ];
const normDataB = [ { name: 'China', gdp: 18 }, { name: 'Luxembourg', gdp: 0.08 } ]; 
const normDataC = [ { name: 'Campaign A (1M views)', clicks: 1000 }, { name: 'Campaign B (1k views)', clicks: 500 } ];

// 6. Inappropriate Aggregation (서로 다른 그룹 평균을 단순 평균, 비율 대신 합계 비교)
const aggDataA = [ { group: 'All Depts', avg: 75 }, { group: 'Special Team', avg: 80 } ]; 
const aggDataB = [ { year: '2020-2023', growth: 5 }, { year: '2024', growth: -2 } ]; 
const aggDataC = [ { region: 'Global', sentiment: 60 }, { region: 'Local', sentiment: 90 } ];

// 7. Cherry Picking (일부 데이터만 선택적으로 사용)
const pickDataA = [ { name: 'June', val: 100 }, { name: 'July', val: 110 } ]; 
const pickDataB = [ { name: 'Day 15', temp: 30 }, { name: 'Day 16', temp: 31 }, { name: 'Day 17', temp: 32 } ]; 
const pickDataC = [ { name: 'Success Stories', count: 5 } ]; 

// 8. Misleading Annotations (오해의 소지가 있는 주석, 강조)
const annoDataA = [ { name: '2020', val: 100 }, { name: '2021', val: 90 }, { name: '2022', val: 80 } ]; 
const annoDataB = [ { name: 'A', val: 50 }, { name: 'B', val: 52 } ]; 
const annoDataC = [ { name: 'Start', val: 10 }, { name: 'End', val: 10 } ]; 

// --- CASES (Base Data) ---
const casePolicyData = [
  { year: '2020', score: 98.1 },
  { year: '2021', score: 98.2 },
  { year: '2022', score: 98.3 },
  { year: '2023', score: 98.9 },
  { year: '2024', score: 99.1 },
];

const caseMarketingData = [
    { month: 'Jan', sales: 100, buzz: 10 },
    { month: 'Feb', sales: 98, buzz: 20 },
    { month: 'Mar', sales: 101, buzz: 50 },
    { month: 'Apr', sales: 99, buzz: 100 },
];


export const MisleadingChart: React.FC<ChartProps> = ({ type, variant = 'A', activeIssues = [] }) => {
  
  // TRAINING MODULE RENDERERS (Static)
  if (type === MisleadingComponent.INAPPROPRIATE_ORDER) {
    const data = variant === 'A' ? orderDataA : variant === 'B' ? orderDataB : orderDataC;
    const xKey = 'name';
    const yKey = variant === 'A' ? 'val' : variant === 'B' ? 'sales' : 'time';
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey={yKey} fill="#8884d8" name="Value" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === MisleadingComponent.INAPPROPRIATE_SCALE_RANGE) {
    const data = variant === 'A' ? rangeDataA : variant === 'B' ? rangeDataB : rangeDataC;
    const key = variant === 'A' ? 'sat' : variant === 'B' ? 'perf' : 'tax';
    const domain: [number, number] = variant === 'A' ? [98, 98.5] : variant === 'B' ? [4.0, 4.25] : [10000, 10200];
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis domain={domain} />
          <Tooltip />
          <Legend />
          <Bar dataKey={key} fill="#82ca9d" name="Performance" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === MisleadingComponent.INAPPROPRIATE_SCALE_FUNC) {
    const data = variant === 'A' ? funcDataA : variant === 'B' ? funcDataB : funcDataC;
    const xKey = variant === 'A' ? 'year' : variant === 'B' ? 'val' : 'date';
    const yKey = variant === 'A' ? 'val' : variant === 'B' ? 'score' : 'price';
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

  if (type === MisleadingComponent.UNCONVENTIONAL_SCALE_DIR) {
    const data = variant === 'A' ? dirDataA : variant === 'B' ? dirDataB : dirDataC;
    const yKey = variant === 'A' ? 'rank' : variant === 'B' ? 'defects' : 'loss';
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis reversed={true} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={yKey} stroke="#d62728" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === MisleadingComponent.MISSING_NORMALIZATION) {
    const data = variant === 'A' ? normDataA : variant === 'B' ? normDataB : normDataC;
    const key = variant === 'A' ? 'crimes' : variant === 'B' ? 'gdp' : 'clicks';
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" width={120} />
          <Tooltip />
          <Legend />
          <Bar dataKey={key} fill="#1f77b4" name="Absolute Value" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === MisleadingComponent.INAPPROPRIATE_AGGREGATION) {
    const data = variant === 'A' ? aggDataA : variant === 'B' ? aggDataB : aggDataC;
    const xKey = variant === 'A' ? 'group' : variant === 'B' ? 'year' : 'region';
    const yKey = variant === 'A' ? 'avg' : variant === 'B' ? 'growth' : 'sentiment';
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey={yKey} fill="#9467bd" name="Aggregated Average" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === MisleadingComponent.CHERRY_PICKING) {
    const data = variant === 'A' ? pickDataA : variant === 'B' ? pickDataB : pickDataC;
    const xKey = 'name';
    const yKey = variant === 'A' ? 'val' : variant === 'B' ? 'temp' : 'count';
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          <ReferenceLine y={1000} stroke="red" label="Hidden Data Point" />
          <Line type="monotone" dataKey={yKey} stroke="#2ca02c" strokeWidth={3} dot={{r: 6}} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === MisleadingComponent.MISLEADING_ANNOTATION) {
    const data = variant === 'A' ? annoDataA : variant === 'B' ? annoDataB : annoDataC;
    const yKey = 'val';
    const title = variant === 'A' ? "Growth is Steady!" : variant === 'B' ? "Massive Surge!" : "Volatile Journey!";
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={yKey} stroke="#e377c2" strokeWidth={3} name={title} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // --- DYNAMIC GAME CASES ---

  if (type === 'CASE_POLICY') {
      const isTruncated = activeIssues.includes(MisleadingComponent.INAPPROPRIATE_SCALE_RANGE);
      const isReversed = activeIssues.includes(MisleadingComponent.UNCONVENTIONAL_SCALE_DIR);
      const isCherryPicked = activeIssues.includes(MisleadingComponent.CHERRY_PICKING);
      
      // If truncated, zoom in to make small changes look big. If not, show full 0-100 range.
      const domain: [number, number] = isTruncated ? [98, 99.5] : [0, 100];
      
      // If cherry picking, remove the middle year '2022'
      let finalData = casePolicyData;
      if (isCherryPicked) {
          finalData = casePolicyData.filter(d => d.year !== '2022');
      }

      const label = activeIssues.includes(MisleadingComponent.MISLEADING_ANNOTATION) 
        ? "MASSIVE SPIKE IN SAFETY!" 
        : "Safety Score (0-100)";

      return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={finalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis 
                    domain={domain} 
                    reversed={isReversed}
                    label={{ value: 'Public Safety Index', angle: -90, position: 'insideLeft' }} 
                />
                <Tooltip />
                <Legend />
                <Bar dataKey="score" fill="#413ea0" name={label} />
                {activeIssues.includes(MisleadingComponent.MISLEADING_ANNOTATION) && (
                    <ReferenceLine y={99} label="Success!" stroke="red" strokeDasharray="3 3" />
                )}
            </BarChart>
        </ResponsiveContainer>
      );
  }

  if (type === 'CASE_MARKETING') {
      const isTruncated = activeIssues.includes(MisleadingComponent.INAPPROPRIATE_SCALE_RANGE);
      const isReversed = activeIssues.includes(MisleadingComponent.UNCONVENTIONAL_SCALE_DIR);
      const isCherryPicked = activeIssues.includes(MisleadingComponent.CHERRY_PICKING);

      // Truncate the Sales axis if active
      const salesDomain: [number, number] = isTruncated ? [90, 110] : [0, 200];
      
      let finalData = caseMarketingData;
      // If Cherry Picking, hide data to support the narrative
      if (isCherryPicked) {
          finalData = caseMarketingData.filter(d => d.month !== 'Feb'); // Hide the dip
      }

      return (
        <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={finalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis 
                    yAxisId="left" 
                    label={{ value: 'Sales Revenue ($k)', angle: -90, position: 'insideLeft' }} 
                    domain={salesDomain}
                    reversed={isReversed} 
                />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Social Buzz Score', angle: 90, position: 'insideRight' }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="sales" fill="#82ca9d" name="Revenue" />
                <Line yAxisId="right" type="monotone" dataKey="buzz" stroke="#ff7300" strokeWidth={4} name="Brand Buzz" />
                {activeIssues.includes(MisleadingComponent.MISLEADING_ANNOTATION) && (
                    <ReferenceLine yAxisId="right" y={80} label="EXPONENTIAL GROWTH!" stroke="red" />
                )}
            </ComposedChart>
        </ResponsiveContainer>
      );
  }

  return <div>Unknown Chart Type</div>;
};