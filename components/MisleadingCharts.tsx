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

// 1. Inappropriate Order
const orderDataA = [ { name: 'Feb', val: 80 }, { name: 'Apr', val: 90 }, { name: 'Jan', val: 40 }, { name: 'Mar', val: 60 } ];
const orderDataB = [ { name: 'Dec', sales: 500 }, { name: 'Oct', sales: 400 }, { name: 'Nov', sales: 300 }, { name: 'Sep', sales: 200 } ]; 
const orderDataC = [ { name: 'Step 3', time: 10 }, { name: 'Step 1', time: 5 }, { name: 'Step 4', time: 12 }, { name: 'Step 2', time: 8 } ];

// 2. Inappropriate Scale Range
const rangeDataA = [ { name: 'Q1', sat: 98.1 }, { name: 'Q2', sat: 98.2 }, { name: 'Q3', sat: 98.4 } ];
const rangeDataB = [ { name: 'A', perf: 4.1 }, { name: 'B', perf: 4.15 }, { name: 'C', perf: 4.2 } ];
const rangeDataC = [ { name: '2020', tax: 10050 }, { name: '2021', tax: 10100 }, { name: '2022', tax: 10150 } ];

// 3. Inappropriate Scale Function
const funcDataA = [ { year: '2010', val: 10 }, { year: '2011', val: 12 }, { year: '2018', val: 14 }, { year: '2019', val: 16 } ];
const funcDataB = [ { val: '1', score: 10 }, { val: '2', score: 20 }, { val: '10', score: 30 }, { val: '100', score: 40 } ]; 
const funcDataC = [ { date: 'Jan 1', price: 100 }, { date: 'Jan 2', price: 101 }, { date: 'Dec 31', price: 102 } ];

// 4. Unconventional Scale Directions
const dirDataA = [ { name: 'A', rank: 1 }, { name: 'B', rank: 5 }, { name: 'C', rank: 10 } ]; 
const dirDataB = [ { name: 'Year 1', defects: 50 }, { name: 'Year 2', defects: 20 }, { name: 'Year 3', defects: 5 } ];
const dirDataC = [ { name: 'Q1', loss: -100 }, { name: 'Q2', loss: -50 }, { name: 'Q3', loss: -10 } ];

// 5. Missing Normalization
const normDataA = [ { name: 'City A (Pop 1M)', crimes: 1000 }, { name: 'City B (Pop 10k)', crimes: 500 } ];
const normDataB = [ { name: 'China', gdp: 18 }, { name: 'Luxembourg', gdp: 0.08 } ]; 
const normDataC = [ { name: 'Campaign A (1M views)', clicks: 1000 }, { name: 'Campaign B (1k views)', clicks: 500 } ];

// 6. Inappropriate Aggregation
const aggDataA = [ { group: 'All Depts', avg: 75 }, { group: 'Special Team', avg: 80 } ]; 
const aggDataB = [ { year: '2020-2023', growth: 5 }, { year: '2024', growth: -2 } ]; 
const aggDataC = [ { region: 'Global', sentiment: 60 }, { region: 'Local', sentiment: 90 } ];

// 7. Cherry Picking
const pickDataA = [ { name: 'June', val: 100 }, { name: 'July', val: 110 } ]; 
const pickDataB = [ { name: 'Day 15', temp: 30 }, { name: 'Day 16', temp: 31 }, { name: 'Day 17', temp: 32 } ]; 
const pickDataC = [ { name: 'Success Stories', count: 5 } ]; 

// 8. Misleading Annotations
const annoDataA = [ { name: '2020', val: 100 }, { name: '2021', val: 90 }, { name: '2022', val: 80 } ]; 
const annoDataB = [ { name: 'A', val: 50 }, { name: 'B', val: 52 } ]; 
const annoDataC = [ { name: 'Start', val: 10 }, { name: 'End', val: 10 } ]; 

// --- CASES (Base Data) ---
const casePolicyData = [
  { year: '2020', score: 98.1, budget: 12 },
  { year: '2021', score: 98.2, budget: 15 },
  { year: '2022', score: 98.3, budget: 20 },
  { year: '2023', score: 98.9, budget: 35 },
  { year: '2024', score: 99.1, budget: 42 },
];

// DATA STRATEGY FOR CASE MARKETING:
const caseMarketingData = [
    { month: 'Jan', sales: 105, buzz: 28 }, 
    { month: 'Feb', sales: 120, buzz: 95 },
    { month: 'Mar', sales: 102, buzz: 26 },
    { month: 'Apr', sales: 110, buzz: 45 },
];


export const MisleadingChart: React.FC<ChartProps> = ({ type, variant = 'A', activeIssues = [] }) => {
  
  // TRAINING MODULE RENDERERS (Static)
  if (type === MisleadingComponent.INAPPROPRIATE_ORDER) {
    const data = variant === 'A' ? orderDataA : variant === 'B' ? orderDataB : orderDataC;
    const xKey = 'name';
    const yKey = variant === 'A' ? 'val' : variant === 'B' ? 'sales' : 'time';
    
    const title = variant === 'A' ? "Monthly Performance" : variant === 'B' ? "Sales History" : "Process Duration";
    const xLabel = variant === 'A' ? "Month" : variant === 'B' ? "Month" : "Step";
    const yLabel = variant === 'A' ? "Performance Index" : variant === 'B' ? "Revenue ($)" : "Time (min)";
    const color = variant === 'A' ? "#8884d8" : variant === 'B' ? "#82ca9d" : "#ffc658";

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, bottom: 20, left: 10, right: 10 }}>
          <text x="50%" y={10} fill="#666" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '14px', fontWeight: 'bold' }}>{title}</text>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} label={{ value: xLabel, position: 'insideBottom', offset: -10 }} />
          <YAxis label={{ value: yLabel, angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Bar dataKey={yKey} fill={color} name="Value" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === MisleadingComponent.INAPPROPRIATE_SCALE_RANGE) {
    const data = variant === 'A' ? rangeDataA : variant === 'B' ? rangeDataB : rangeDataC;
    const key = variant === 'A' ? 'sat' : variant === 'B' ? 'perf' : 'tax';
    const domain: [number, number] = variant === 'A' ? [98, 98.5] : variant === 'B' ? [4.0, 4.25] : [10000, 10200];
    
    const title = variant === 'A' ? "Customer Satisfaction" : variant === 'B' ? "Performance Score" : "Tax Contributions";
    const xLabel = variant === 'A' ? "Quarter" : variant === 'B' ? "Group" : "Year";
    
    // UPDATED: Removed range info (e.g. "Score (0-100)" -> "Score")
    const yLabel = variant === 'A' ? "Score" : variant === 'B' ? "Rating" : "Amount ($)";
    
    const color = variant === 'A' ? "#82ca9d" : variant === 'B' ? "#8884d8" : "#ff7300";

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, bottom: 20, left: 10, right: 10 }}>
          <text x="50%" y={10} fill="#666" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '14px', fontWeight: 'bold' }}>{title}</text>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" label={{ value: xLabel, position: 'insideBottom', offset: -10 }} />
          <YAxis domain={domain} label={{ value: yLabel, angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Bar dataKey={key} fill={color} name="Performance" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === MisleadingComponent.INAPPROPRIATE_SCALE_FUNC) {
    const data = variant === 'A' ? funcDataA : variant === 'B' ? funcDataB : funcDataC;
    const xKey = variant === 'A' ? 'year' : variant === 'B' ? 'val' : 'date';
    const yKey = variant === 'A' ? 'val' : variant === 'B' ? 'score' : 'price';
    
    const title = variant === 'A' ? "Long Term Growth" : variant === 'B' ? "Score Distribution" : "Stock Price";
    const xLabel = variant === 'A' ? "Year" : variant === 'B' ? "Input Value" : "Date";
    const yLabel = variant === 'A' ? "Growth %" : variant === 'B' ? "Score" : "Price ($)";
    const color = variant === 'A' ? "#ff7300" : variant === 'B' ? "#413ea0" : "#d62728";

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 20, bottom: 20, left: 10, right: 10 }}>
          <text x="50%" y={10} fill="#666" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '14px', fontWeight: 'bold' }}>{title}</text>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} label={{ value: xLabel, position: 'insideBottom', offset: -10 }} /> 
          <YAxis label={{ value: yLabel, angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === MisleadingComponent.UNCONVENTIONAL_SCALE_DIR) {
    const data = variant === 'A' ? dirDataA : variant === 'B' ? dirDataB : dirDataC;
    const yKey = variant === 'A' ? 'rank' : variant === 'B' ? 'defects' : 'loss';
    
    const title = variant === 'A' ? "Competition Rankings" : variant === 'B' ? "Defect Rate" : "Quarterly Loss";
    const xLabel = variant === 'A' ? "Team" : variant === 'B' ? "Year" : "Quarter";
    const yLabel = variant === 'A' ? "Rank" : variant === 'B' ? "Defects" : "Loss ($)";
    const color = variant === 'A' ? "#d62728" : variant === 'B' ? "#0088FE" : "#00C49F";

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 20, bottom: 20, left: 10, right: 10 }}>
          <text x="50%" y={10} fill="#666" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '14px', fontWeight: 'bold' }}>{title}</text>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" label={{ value: xLabel, position: 'insideBottom', offset: -10 }} />
          <YAxis reversed={true} label={{ value: yLabel, angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === MisleadingComponent.MISSING_NORMALIZATION) {
    const data = variant === 'A' ? normDataA : variant === 'B' ? normDataB : normDataC;
    const key = variant === 'A' ? 'crimes' : variant === 'B' ? 'gdp' : 'clicks';
    
    const title = variant === 'A' ? "Total Crimes" : variant === 'B' ? "National GDP" : "Campaign Clicks";
    const xLabel = variant === 'A' ? "Count" : variant === 'B' ? "GDP ($)" : "Clicks";
    const yLabel = variant === 'A' ? "City" : variant === 'B' ? "Country" : "Campaign";
    const color = variant === 'A' ? "#1f77b4" : variant === 'B' ? "#d62728" : "#9467bd";

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ top: 20, bottom: 20, left: 20, right: 10 }}>
          <text x="50%" y={10} fill="#666" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '14px', fontWeight: 'bold' }}>{title}</text>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" label={{ value: xLabel, position: 'insideBottom', offset: -10 }} />
          <YAxis dataKey="name" type="category" width={120} label={{ value: yLabel, angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Bar dataKey={key} fill={color} name="Absolute Value" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === MisleadingComponent.INAPPROPRIATE_AGGREGATION) {
    const data = variant === 'A' ? aggDataA : variant === 'B' ? aggDataB : aggDataC;
    const xKey = variant === 'A' ? 'group' : variant === 'B' ? 'year' : 'region';
    const yKey = variant === 'A' ? 'avg' : variant === 'B' ? 'growth' : 'sentiment';
    
    const title = variant === 'A' ? "Departmental Performance" : variant === 'B' ? "Yearly Growth" : "Regional Sentiment";
    const xLabel = variant === 'A' ? "Department" : variant === 'B' ? "Period" : "Region";
    const yLabel = variant === 'A' ? "Average Score" : variant === 'B' ? "Growth %" : "Sentiment Index";
    const color = variant === 'A' ? "#9467bd" : variant === 'B' ? "#ff7300" : "#82ca9d";

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, bottom: 20, left: 10, right: 10 }}>
          <text x="50%" y={10} fill="#666" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '14px', fontWeight: 'bold' }}>{title}</text>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} label={{ value: xLabel, position: 'insideBottom', offset: -10 }} />
          <YAxis label={{ value: yLabel, angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Bar dataKey={yKey} fill={color} name="Aggregated Average" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === MisleadingComponent.CHERRY_PICKING) {
    const data = variant === 'A' ? pickDataA : variant === 'B' ? pickDataB : pickDataC;
    const xKey = 'name';
    const yKey = variant === 'A' ? 'val' : variant === 'B' ? 'temp' : 'count';
    
    const title = variant === 'A' ? "Monthly Trends" : variant === 'B' ? "Temperature Log" : "Success Metrics";
    const xLabel = variant === 'A' ? "Month" : variant === 'B' ? "Day" : "Category";
    const yLabel = variant === 'A' ? "Value" : variant === 'B' ? "Temp (°C)" : "Count";
    const color = variant === 'A' ? "#2ca02c" : variant === 'B' ? "#d62728" : "#1f77b4";

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 20, bottom: 20, left: 10, right: 10 }}>
          <text x="50%" y={10} fill="#666" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '14px', fontWeight: 'bold' }}>{title}</text>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} label={{ value: xLabel, position: 'insideBottom', offset: -10 }} />
          <YAxis label={{ value: yLabel, angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <ReferenceLine y={1000} stroke="red" label="Hidden Data Point" />
          <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={3} dot={{r: 6}} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === MisleadingComponent.MISLEADING_ANNOTATION) {
    const data = variant === 'A' ? annoDataA : variant === 'B' ? annoDataB : annoDataC;
    const yKey = 'val';
    
    const chartTitle = variant === 'A' ? "Projected Growth" : variant === 'B' ? "Market Impact" : "Journey Progress";
    const xLabel = variant === 'A' ? "Year" : variant === 'B' ? "Scenario" : "Stage";
    const yLabel = variant === 'A' ? "Revenue" : variant === 'B' ? "Impact" : "Progress";
    const color = variant === 'A' ? "#e377c2" : variant === 'B' ? "#8884d8" : "#ffc658";
    
    const lineName = variant === 'A' ? "Growth is Steady!" : variant === 'B' ? "Massive Surge!" : "Volatile Journey!";

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 20, bottom: 20, left: 10, right: 10 }}>
          <text x="50%" y={10} fill="#666" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '14px', fontWeight: 'bold' }}>{chartTitle}</text>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" label={{ value: xLabel, position: 'insideBottom', offset: -10 }} />
          <YAxis label={{ value: yLabel, angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={3} name={lineName} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // --- DYNAMIC GAME CASES ---

  if (type === 'CASE_POLICY') {
      const isTruncated = activeIssues.includes(MisleadingComponent.INAPPROPRIATE_SCALE_RANGE);
      const isReversed = activeIssues.includes(MisleadingComponent.UNCONVENTIONAL_SCALE_DIR);
      const isCherryPicked = activeIssues.includes(MisleadingComponent.CHERRY_PICKING);
      const isBadOrder = activeIssues.includes(MisleadingComponent.INAPPROPRIATE_ORDER);
      const isMisleadingAnnotation = activeIssues.includes(MisleadingComponent.MISLEADING_ANNOTATION);
      
      const budgetDomain: [number, number | 'auto'] = isTruncated ? [10, 'auto'] : [0, 'auto'];
      const scoreDomain: [number, number] = [98, 100]; 
      
      let finalData = [...casePolicyData];
      if (isCherryPicked) {
          finalData = finalData.filter(d => d.year !== '2022');
      }
      if (isBadOrder) {
          finalData.sort((a, b) => a.score - b.score);
      }

      return (
        <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={finalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                
                <YAxis 
                    yAxisId="left"
                    label={{ value: 'Budget ($M)', angle: -90, position: 'insideLeft' }}
                    domain={budgetDomain}
                />
                
                <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    domain={scoreDomain} 
                    reversed={isReversed}
                    label={{ value: 'Public Safety Index', angle: 90, position: 'insideRight' }} 
                />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="budget" fill="#8884d8" name="Budget Spent ($M)" />
                <Line yAxisId="right" dataKey="score" stroke="#413ea0" strokeWidth={3} name="Public Safety Index" />
                
                {isMisleadingAnnotation && (
                    <ReferenceLine yAxisId="right" y={98.8} stroke="transparent">
                         <Label 
                            value="SAFETY GOALS SURPASSED! 🚀" 
                            position="center" 
                            fill="red" 
                            fontWeight="bold"
                            fontSize={16}
                        />
                    </ReferenceLine>
                )}
            </ComposedChart>
        </ResponsiveContainer>
      );
  }

  if (type === 'CASE_MARKETING') {
      const isTruncated = activeIssues.includes(MisleadingComponent.INAPPROPRIATE_SCALE_RANGE);
      const isReversed = activeIssues.includes(MisleadingComponent.UNCONVENTIONAL_SCALE_DIR);
      const isCherryPicked = activeIssues.includes(MisleadingComponent.CHERRY_PICKING);
      const isBadOrder = activeIssues.includes(MisleadingComponent.INAPPROPRIATE_ORDER);

      // 1. Sales Domain
      const salesDomain: [number, number] = [0, 200];

      // 2. Buzz Domain
      const buzzDomain: [number, number | 'auto'] = isTruncated ? [25, 'auto'] : [0, 100];
      
      let finalData = [...caseMarketingData];
      
      if (isCherryPicked) {
          finalData = finalData.filter(d => d.month !== 'Feb'); 
      }

      // EXPLICIT SORTING for Inappropriate Order
      // This forces the order to be: Mar (26) -> Jan (28) -> Apr (45) -> Feb (95)
      // Effect: Month axis is jumbled, Buzz is rising, Sales (inverted) looks crashing.
      if (isBadOrder) {
          finalData.sort((a, b) => a.buzz - b.buzz);
      }

      return (
        <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={finalData}>
                <CartesianGrid strokeDasharray="3 3" />
                {/* 
                   IMPORTANT: type="category" ensures Recharts respects the array order (Jumbled) 
                   instead of trying to sort the month strings chronologically. 
                */}
                <XAxis dataKey="month" type="category" />
                
                <YAxis 
                    yAxisId="left" 
                    label={{ value: 'Sales Revenue ($k)', angle: -90, position: 'insideLeft' }} 
                    domain={salesDomain}
                    reversed={isReversed} 
                />

                <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    label={{ value: 'Social Buzz Score', angle: 90, position: 'insideRight' }} 
                    domain={buzzDomain}
                />
                
                <Tooltip />
                <Legend />
                
                <Line yAxisId="left" dataKey="sales" stroke="#82ca9d" strokeWidth={3} name="Revenue" />
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