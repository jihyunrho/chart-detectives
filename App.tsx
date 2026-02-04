import React, { useState, useEffect, useCallback } from 'react';
import { 
  createGame, findActiveGame, subscribeToGame, 
  addDetectiveToGame, updateDetectiveTraining, addAnnotationToGame,
  updateGameStatus, updateGameReport, resetGameData
} from './services/gameService';
import { generateInspectionReport, evaluateInspection, getTrainingFeedback } from './services/geminiService';
import { Role, MisleadingComponent, GameStatus, GameState, User } from './types';
import { MisleadingChart } from './components/MisleadingCharts';
import { 
  User as UserIcon, Users, CheckCircle, Lock, Play, 
  FileText, MessageSquare, AlertTriangle, RefreshCw, LogOut, ArrowLeft, Trash2, Loader2
} from 'lucide-react';

// --- TYPES FOR NAVIGATION ---
type View = 'LANDING' | 'DASHBOARD' | 'ROOM';

// --- COMPONENTS ---

// 1. Landing / Login
const Landing = ({ onLogin, loading }: { onLogin: (email: string, isFacilitator: boolean) => void, loading: boolean }) => {
  const [email, setEmail] = useState('');
  const [isFacilitator, setIsFacilitator] = useState(true);

  const handleLogin = () => {
    if (!email) return;
    onLogin(email, isFacilitator);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Chart Detectives</h1>
          <p className="text-slate-500 mt-2">Uncover the truth behind the data.</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Identity</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="agent@detective.com"
            />
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => setIsFacilitator(true)}
              className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 ${isFacilitator ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200'}`}
            >
              <UserIcon size={18} /> Facilitator
            </button>
            <button 
              onClick={() => setIsFacilitator(false)}
              className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 ${!isFacilitator ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200'}`}
            >
              <Users size={18} /> Detective
            </button>
          </div>

          <button 
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors flex justify-center items-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Enter Operations"}
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. Facilitator Dashboard
const FacilitatorDashboard = ({ game, email, onEnterRoom, onLogout }: { game: GameState, email: string, onEnterRoom: () => void, onLogout: () => void }) => {
  const [detectiveEmail, setDetectiveEmail] = useState('');
  const [selectedComponents, setSelectedComponents] = useState<MisleadingComponent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleAddDetective = async () => {
    if(!detectiveEmail) return;
    if(game.detectives.length >= 3) return alert("Max 3 detectives.");
    
    setIsProcessing(true);
    const assignment = selectedComponents.length > 0 ? selectedComponents : [MisleadingComponent.INVERTED_Y]; // Default
    await addDetectiveToGame(game.id, detectiveEmail, assignment);
    setDetectiveEmail('');
    setSelectedComponents([]);
    setIsProcessing(false);
  };

  const toggleComponent = (c: MisleadingComponent) => {
    if(selectedComponents.includes(c)) setSelectedComponents(selectedComponents.filter(x => x !== c));
    else setSelectedComponents([...selectedComponents, c]);
  };

  const startGame = async () => {
    await updateGameStatus(game.id, GameStatus.ACTIVE);
  };

  const handleReset = async () => {
      if (confirm("Are you sure you want to RESET the game? This will remove all detectives and data.")) {
          await resetGameData(game.id, email);
      }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Mission Control</h1>
        <div className="flex gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${game.status === GameStatus.ACTIVE ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                Status: {game.status}
            </span>
            <button title="Reset Game" onClick={handleReset} className="p-2 bg-red-100 rounded-full hover:bg-red-200 text-red-700 border border-red-200"><Trash2 size={16}/></button>
            <button title="Logout" onClick={onLogout} className="p-2 bg-slate-200 rounded-full hover:bg-red-100 text-red-600"><LogOut size={16}/></button>
        </div>
      </div>

      {game.status === GameStatus.SETUP && (
        <div className="bg-white p-6 rounded-xl shadow-md mb-6">
          <h2 className="text-lg font-semibold mb-4">Recruit Detectives</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Detective Email</label>
              <input 
                value={detectiveEmail} 
                onChange={(e) => setDetectiveEmail(e.target.value)}
                className="w-full border p-2 rounded" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Assign Training Modules</label>
              <div className="space-y-2">
                {Object.values(MisleadingComponent).map(c => (
                  <label key={c} className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={selectedComponents.includes(c)}
                        onChange={() => toggleComponent(c)}
                        className="rounded text-blue-600"
                    />
                    <span className="text-sm">{c}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <button onClick={handleAddDetective} disabled={isProcessing} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
            {isProcessing ? 'Adding...' : '+ Add Detective'}
          </button>
        </div>
      )}

      <div className="grid gap-4 mb-8">
        {game.detectives.length === 0 && <div className="text-slate-400 italic">No detectives recruited yet.</div>}
        {game.detectives.map((d, i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500 flex justify-between items-center">
            <div>
              <h3 className="font-bold">{d.email}</h3>
              <p className="text-xs text-slate-500">Assigned: {d.assignedComponents?.join(', ')}</p>
            </div>
            <div className="text-right">
               <div className="text-sm font-semibold text-slate-600">Training Progress</div>
               <div className="flex gap-1 mt-1">
                 {d.assignedComponents?.map(ac => (
                    <div key={ac} className={`w-3 h-3 rounded-full ${d.trainingProgress?.[ac] ? 'bg-green-500' : 'bg-slate-300'}`} title={ac}></div>
                 ))}
               </div>
            </div>
          </div>
        ))}
      </div>

      {game.status === GameStatus.SETUP && game.detectives.length > 0 && (
         <button onClick={startGame} className="w-full py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 flex justify-center items-center gap-2">
            <Play /> Activate Game Mode
         </button>
      )}

      {game.status === GameStatus.ACTIVE && (
          <div className="text-center p-8 bg-slate-100 rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-600 mb-4">Game is active. Join the Game Room to facilitate.</p>
              <button 
                onClick={onEnterRoom}
                className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700"
              >
                  Enter Game Room
              </button>
          </div>
      )}
       {game.status === GameStatus.FINISHED && (
          <div className="text-center p-8 bg-slate-100 rounded-xl">
             <h2 className="text-2xl font-bold mb-4">Mission Debrief</h2>
             {game.evaluationResult && (
                 <div className="bg-white p-6 rounded shadow max-w-lg mx-auto">
                     <div className="text-4xl font-bold mb-2 text-indigo-600">{game.evaluationResult.score}/100</div>
                     <p className="text-lg font-semibold">{game.evaluationResult.success ? "Mission Success" : "Mission Failed"}</p>
                     <p className="text-slate-600 mt-2">{game.evaluationResult.feedback}</p>
                 </div>
             )}
          </div>
      )}
    </div>
  );
};

// 3. Training Module
const TrainingModule = ({ 
    component, 
    onComplete 
}: { component: MisleadingComponent, onComplete: () => void }) => {
    const [step, setStep] = useState(1);
    const [userReason, setUserReason] = useState('');
    const [feedback, setFeedback] = useState('');

    const handleStep3Submit = async () => {
        if (!userReason) return;
        setFeedback('Analyzing...');
        const result = await getTrainingFeedback(component, userReason);
        setFeedback(result.feedback);
        if (result.correct) {
            setTimeout(() => {
                onComplete();
            }, 2000);
        }
    };

    return (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
            <div className="max-w-5xl mx-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">Training: {component}</h2>
                    <div className="text-sm text-slate-500">Step {step} of 3</div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-slate-50 p-4 rounded-xl shadow-inner">
                        <MisleadingChart type={component} variant={step === 3 ? 'B' : 'A'} />
                        <div className="mt-4 p-4 bg-white rounded border border-slate-200">
                            <h4 className="font-bold text-sm text-slate-500 uppercase">Brief</h4>
                            <p className="text-slate-800 text-sm mt-1">
                                {step === 3 
                                    ? "This is a NEW graph collected from another suspect department."
                                    : "\"Look at our amazing performance this quarter! The graph clearly shows we are dominating.\""
                                }
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col justify-center">
                        {step === 1 && (
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold">Detect Deception</h3>
                                <p className="text-slate-600">Observe the graph carefully. Does the visual match the reality of the data?</p>
                                <button 
                                    onClick={() => setStep(2)}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Reveal The Trick
                                </button>
                            </div>
                        )}
                        {step === 2 && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                                    <h3 className="font-bold text-yellow-800">The Trick: {component}</h3>
                                    <p className="text-sm text-yellow-700 mt-1">
                                        {component === MisleadingComponent.INVERTED_Y && "The Y-axis is flipped. Lower bars actually mean HIGHER numbers, or vice versa. It tricks you into seeing a trend that is opposite to reality."}
                                        {component === MisleadingComponent.TRUNCATED_Y && "The Y-axis doesn't start at zero. This exaggerates small differences, making a 1% change look like a 50% change."}
                                        {component === MisleadingComponent.IRREGULAR_X && "The time intervals on the X-axis are not equal. Some years or months are skipped to hide bad performance periods."}
                                        {component === MisleadingComponent.AGGREGATED && "Data is grouped (e.g., yearly instead of monthly) to smooth out volatility and hide crash periods."}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setStep(3)}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Practice Identification
                                </button>
                            </div>
                        )}
                        {step === 3 && (
                            <div className="space-y-4">
                                <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 mb-4">
                                    <h3 className="text-lg font-bold text-indigo-900">Final Test</h3>
                                    <p className="text-sm text-indigo-700">
                                        Analyze this <strong>new</strong> chart on the left. It uses the same trick. Explain what is happening.
                                    </p>
                                </div>
                                <h3 className="text-xl font-bold">Your Turn</h3>
                                <p className="text-slate-600 text-sm">Describe specifically why this graph is misleading and its impact.</p>
                                <textarea 
                                    className="w-full border p-3 rounded-lg h-32"
                                    placeholder="This graph is misleading because..."
                                    value={userReason}
                                    onChange={(e) => setUserReason(e.target.value)}
                                />
                                {feedback && (
                                    <div className={`p-3 rounded text-sm ${feedback.includes('Correct') || feedback.includes('passed') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {feedback}
                                    </div>
                                )}
                                <button 
                                    onClick={handleStep3Submit}
                                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    Submit Analysis
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// 4. Detective Dashboard
const DetectiveDashboard = ({ game, email, onEnterRoom, onLogout }: { game: GameState, email: string, onEnterRoom: () => void, onLogout: () => void }) => {
  const [activeTraining, setActiveTraining] = useState<MisleadingComponent | null>(null);
  const me = game.detectives.find(d => d.email === email);
  
  if (!me) return <div>Access Denied or Loading...</div>;

  const isTrainingComplete = me.assignedComponents?.every(c => me.trainingProgress?.[c]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
        {activeTraining && (
            <TrainingModule 
                component={activeTraining} 
                onComplete={() => {
                    updateDetectiveTraining(game.id, email, activeTraining, game);
                    setActiveTraining(null);
                }} 
            />
        )}

        <div className="mb-8 flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Detective Workspace</h1>
                <p className="text-slate-500">Welcome, Agent {email.split('@')[0]}.</p>
            </div>
            <button title="Logout" onClick={onLogout} className="p-2 bg-slate-200 rounded-full hover:bg-red-100 text-red-600"><LogOut size={16}/></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <CheckCircle className="text-blue-500" /> Training Status
                </h2>
                <div className="space-y-3">
                    {me.assignedComponents?.map(comp => (
                        <div key={comp} className="flex justify-between items-center p-3 bg-slate-50 rounded">
                            <span className="text-sm font-medium">{comp}</span>
                            {me.trainingProgress?.[comp] ? (
                                <span className="text-green-600 text-xs font-bold px-2 py-1 bg-green-100 rounded">COMPLETED</span>
                            ) : (
                                <button 
                                    onClick={() => setActiveTraining(comp)}
                                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                                >
                                    START
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md flex flex-col justify-center items-center text-center">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                     Mission Status
                </h2>
                {game.status === GameStatus.ACTIVE ? (
                    <div className="w-full">
                         <div className="mb-4 text-green-600 font-bold bg-green-50 p-2 rounded">
                            MISSION ACTIVE
                         </div>
                         <button 
                            onClick={onEnterRoom}
                            className="block w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg transform transition hover:scale-105"
                         >
                            ENTER GAME ROOM
                         </button>
                    </div>
                ) : (
                    <div className="text-slate-400">
                        <Lock className="mx-auto mb-2 h-8 w-8" />
                        <p>Waiting for Facilitator activation...</p>
                        {!isTrainingComplete && <p className="text-xs text-red-400 mt-2">Complete training first!</p>}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

// 5. Game Room (Shared)
const GameRoom = ({ game, email, onLeave }: { game: GameState, email: string, onLeave: () => void }) => {
    const isFacilitator = game.facilitatorEmail === email;
    const [selectedSpot, setSelectedSpot] = useState<{x: number, y: number} | null>(null);
    const [reason, setReason] = useState('');
    const [impact, setImpact] = useState('');
    const [reportDraft, setReportDraft] = useState(game.inspectionReport);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGraphClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if(isFacilitator || game.status === GameStatus.FINISHED) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setSelectedSpot({ x, y });
    };

    const submitAnnotation = async () => {
        if(!selectedSpot || !reason) return;
        await addAnnotationToGame(game.id, {
            id: Date.now().toString(),
            x: selectedSpot.x,
            y: selectedSpot.y,
            authorEmail: email,
            reason,
            impact,
            timestamp: Date.now()
        });
        setSelectedSpot(null);
        setReason('');
        setImpact('');
    };

    const handleGenerateReport = async () => {
        setIsGenerating(true);
        const text = await generateInspectionReport(game.annotations);
        await updateGameReport(game.id, text);
        setIsGenerating(false);
    };

    const handleSubmitReport = async () => {
        setIsGenerating(true);
        const allComponents = Array.from(new Set(game.detectives.flatMap(d => d.assignedComponents || [])));
        const result = await evaluateInspection(reportDraft || game.inspectionReport, allComponents);
        await updateGameReport(game.id, reportDraft || game.inspectionReport, result);
        setIsGenerating(false);
    };

    if (game.status === GameStatus.FINISHED && game.evaluationResult) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
                <div className="bg-slate-800 p-8 rounded-xl max-w-2xl text-center">
                    <div className="text-6xl mb-4">🕵️‍♂️</div>
                    <h1 className="text-3xl font-bold mb-2">Mission Debrief</h1>
                    <div className={`text-5xl font-black mb-6 ${game.evaluationResult.success ? 'text-green-400' : 'text-red-400'}`}>
                        {game.evaluationResult.score}/100
                    </div>
                    <div className="bg-slate-700 p-6 rounded-lg text-left mb-6">
                        <h3 className="font-bold text-slate-300 uppercase text-xs mb-2">HQ Feedback</h3>
                        <p className="text-lg">{game.evaluationResult.feedback}</p>
                    </div>
                    <button onClick={onLeave} className="px-6 py-2 bg-slate-600 hover:bg-slate-500 rounded">Return to HQ</button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col h-screen overflow-hidden">
             {/* Header */}
            <div className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                     <button onClick={onLeave} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <ArrowLeft size={20} />
                     </button>
                    <h1 className="font-bold text-slate-800 flex items-center gap-2">
                        <AlertTriangle className="text-red-500" /> Case File #8821: "Marketing Growth"
                    </h1>
                </div>
                <div className="flex items-center gap-4 text-sm">
                    <span className="font-mono text-slate-500">{email}</span>
                    {isFacilitator && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">FACILITATOR</span>}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Graph */}
                <div className="flex-1 p-6 overflow-y-auto bg-slate-50 relative">
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 relative mb-4">
                        <h2 className="text-center font-bold text-xl mb-4 text-indigo-900">Annual Growth & Revenue Overview</h2>
                        <div 
                            className="relative cursor-crosshair border-2 border-transparent hover:border-slate-300 rounded transition-colors"
                            onClick={handleGraphClick}
                        >
                            <MisleadingChart type="FINAL_BOSS" />
                            
                            {/* Annotations Overlay */}
                            {game.annotations.map(a => (
                                <div 
                                    key={a.id}
                                    className="absolute w-6 h-6 -ml-3 -mt-3 bg-red-500/20 border-2 border-red-500 rounded-full flex items-center justify-center text-xs font-bold text-red-700 shadow-sm cursor-pointer hover:scale-125 transition-transform group"
                                    style={{ left: `${a.x}%`, top: `${a.y}%` }}
                                >
                                    !
                                    <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900 text-white p-2 rounded text-xs z-10 pointer-events-none">
                                        <div className="font-bold border-b border-slate-700 pb-1 mb-1">{a.authorEmail}</div>
                                        {a.reason}
                                    </div>
                                </div>
                            ))}

                            {/* Pending Annotation Pin */}
                            {selectedSpot && (
                                <div 
                                    className="absolute w-4 h-4 -ml-2 -mt-2 bg-blue-500 rounded-full animate-ping"
                                    style={{ left: `${selectedSpot.x}%`, top: `${selectedSpot.y}%` }}
                                />
                            )}
                        </div>
                        <p className="text-xs text-center text-slate-400 mt-2 italic">Source: Internal Marketing Dept.</p>
                    </div>

                    {/* Annotation Input */}
                    {selectedSpot && !isFacilitator && (
                        <div className="bg-white p-4 rounded-xl shadow-lg border border-blue-200 animate-slide-up">
                            <h3 className="font-bold text-sm mb-2 text-blue-800">New Observation</h3>
                            <div className="grid gap-3">
                                <input 
                                    className="w-full border p-2 rounded text-sm" 
                                    placeholder="Why is this misleading?" 
                                    value={reason} onChange={e => setReason(e.target.value)}
                                />
                                <input 
                                    className="w-full border p-2 rounded text-sm" 
                                    placeholder="What is the impact?" 
                                    value={impact} onChange={e => setImpact(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <button onClick={submitAnnotation} className="flex-1 bg-blue-600 text-white py-1 rounded text-sm hover:bg-blue-700">Save Note</button>
                                    <button onClick={() => setSelectedSpot(null)} className="px-3 bg-slate-200 rounded text-sm hover:bg-slate-300">Cancel</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Collaboration Panel */}
                <div className="w-96 bg-white border-l flex flex-col shadow-xl z-10">
                    <div className="p-4 border-b bg-slate-50">
                        <h2 className="font-bold flex items-center gap-2">
                            <MessageSquare size={18}/> Detective Notes
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {game.annotations.length === 0 && (
                            <div className="text-center text-slate-400 text-sm mt-10">
                                Click on the graph to identify misleading elements.
                            </div>
                        )}
                        {game.annotations.map(a => (
                            <div key={a.id} className="bg-slate-50 p-3 rounded border border-slate-200 text-sm">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-slate-700 text-xs">{a.authorEmail}</span>
                                    <span className="text-slate-400 text-[10px]">{new Date(a.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-slate-800 mb-1">{a.reason}</p>
                                <p className="text-red-600 text-xs italic">Impact: {a.impact}</p>
                            </div>
                        ))}
                    </div>

                    {/* Report Section */}
                    <div className="p-4 border-t bg-slate-50">
                         <h2 className="font-bold text-sm mb-2 flex items-center gap-2">
                             <FileText size={16}/> Inspection Report
                         </h2>
                         {isFacilitator && !game.inspectionReport && (
                             <button 
                                onClick={handleGenerateReport}
                                disabled={game.annotations.length === 0 || isGenerating}
                                className="w-full bg-indigo-600 text-white py-2 rounded text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed mb-2"
                             >
                                 {isGenerating ? 'Generating...' : 'Generate AI Report'}
                             </button>
                         )}

                         {(game.inspectionReport || reportDraft) && (
                             <div className="space-y-2">
                                 <textarea 
                                    className="w-full h-32 p-2 text-xs border rounded bg-white"
                                    value={reportDraft || game.inspectionReport}
                                    onChange={e => {
                                        setReportDraft(e.target.value);
                                        // Update Firestore with draft typing (debounce could be added, but sending raw is fine for prototype)
                                        updateGameReport(game.id, e.target.value); 
                                    }}
                                    readOnly={game.status === GameStatus.FINISHED}
                                 />
                                 {isFacilitator && game.status !== GameStatus.FINISHED && (
                                     <button 
                                        onClick={handleSubmitReport}
                                        disabled={isGenerating}
                                        className="w-full bg-green-600 text-white py-2 rounded text-sm font-bold hover:bg-green-700"
                                     >
                                        {isGenerating ? 'Evaluating...' : 'Submit Final Report'}
                                     </button>
                                 )}
                             </div>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN APP ---

const App = () => {
  const [view, setView] = useState<View>('LANDING');
  const [email, setEmail] = useState('');
  const [gameId, setGameId] = useState<string | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);

  // 1. Initial Load: Check local storage for session
  useEffect(() => {
    const restoreSession = async () => {
        const savedEmail = localStorage.getItem('chart_detectives_email');
        if (savedEmail) {
            setLoading(true);
            const foundId = await findActiveGame(savedEmail);
            if (foundId) {
                setEmail(savedEmail);
                setGameId(foundId);
                setView('DASHBOARD');
            } else {
                localStorage.removeItem('chart_detectives_email');
            }
            setLoading(false);
        }
    };
    restoreSession();
  }, []);

  // 2. Real-time Subscription: Connect to Firestore when gameId is set
  useEffect(() => {
    if (!gameId) return;

    // Use the Real-time listener service
    const unsubscribe = subscribeToGame(gameId, (updatedGame) => {
        if (updatedGame) {
            setGame(updatedGame);
        } else {
            // Game deleted or error
            setGame(null);
            setView('LANDING');
            setGameId(null);
        }
    });

    return () => unsubscribe();
  }, [gameId]);

  const handleLogin = async (userEmail: string, isFacilitator: boolean) => {
    setLoading(true);
    let id = await findActiveGame(userEmail);
    
    if (!id && isFacilitator) {
        id = await createGame(userEmail);
    } else if (!id && !isFacilitator) {
        alert("No active game found. Ask your Facilitator to add you!");
        setLoading(false);
        return;
    }

    if (id) {
        localStorage.setItem('chart_detectives_email', userEmail);
        setEmail(userEmail);
        setGameId(id);
        setView('DASHBOARD');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('chart_detectives_email');
    setEmail('');
    setGame(null);
    setGameId(null);
    setView('LANDING');
  };

  if (view === 'LANDING' || !game) {
    return <Landing onLogin={handleLogin} loading={loading} />;
  }

  const isFacilitator = game.facilitatorEmail === email;

  if (view === 'ROOM') {
    return <GameRoom game={game} email={email} onLeave={() => setView('DASHBOARD')} />;
  }

  return isFacilitator 
    ? <FacilitatorDashboard game={game} email={email} onEnterRoom={() => setView('ROOM')} onLogout={handleLogout} />
    : <DetectiveDashboard game={game} email={email} onEnterRoom={() => setView('ROOM')} onLogout={handleLogout} />;
};

export default App;