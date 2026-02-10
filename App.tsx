import React, { useState, useEffect, useMemo } from 'react';
import { 
  createGame, findActiveGame, subscribeToGame, 
  createGroup, addDetectiveToGroup, updateDetectiveTraining, addAnnotationToGroup,
  updateGroupStatus, updateGroupReport, resetGroupData, resetGameData, advanceToNextRound
} from './services/gameService';
import { generateInspectionReport, evaluateInspection, getTrainingFeedback } from './services/geminiService';
import { Role, MisleadingComponent, GameStatus, GameState, User, Group, CaseScenario, RoundHistory } from './types';
import { MisleadingChart } from './components/MisleadingCharts';
import { 
  User as UserIcon, Users, CheckCircle, Lock, Play, 
  FileText, MessageSquare, AlertTriangle, LogOut, ArrowLeft, Trash2, Loader2, Plus, Ban, RotateCcw,
  ArrowRight, Quote, Maximize2, X, History, Check, Eye
} from 'lucide-react';

// --- TYPES FOR NAVIGATION ---
type View = 'LANDING' | 'DASHBOARD' | 'ROOM';

// --- CONSTANTS: GAME SCENARIOS ---
const CASES: CaseScenario[] = [
    {
        id: 'CASE_POLICY',
        title: "The Safe City Initiative",
        description: "The Mayor's office is pushing for a budget increase based on this safety data.",
        // UPDATED: Text explicitly references the visual exaggeration caused by the truncated axis.
        persuasiveReport: "The graph clearly demonstrates a dramatic surge in the Public Safety Index, climbing significantly year over year. This steep upward trend proves the immediate success of our 'Smart Surveillance' pilot. Therefore, we must secure the full budget for Phase 2 to prevent any reversal of these safety gains.",
        chartType: 'CASE_POLICY',
    },
    {
        id: 'CASE_MARKETING',
        title: "Project Viral Boom",
        description: "The Marketing Agency is demanding a contract renewal based on campaign performance.",
        // UPDATED: Text explicitly references "Skyrocketing Buzz" (due to bad order) and dismisses Revenue (inverted/crashed) as "lagging".
        persuasiveReport: "Although revenue shows some visual volatility, the orange line reveals the true story: our 'Brand Buzz' is skyrocketing exponentially! This leading indicator proves our viral strategy is working. We must double our ad spend immediately to capture this momentum before it fades.",
        chartType: 'CASE_MARKETING',
    }
];

// --- COMPONENTS ---

// 1. Landing / Login (Unchanged logic, just UI check)
const Landing = ({ 
    onLogin, 
    loading, 
    forcedRole 
}: { 
    onLogin: (email: string, isFacilitator: boolean) => void, 
    loading: boolean,
    forcedRole?: Role
}) => {
  const [email, setEmail] = useState('');
  const [isFacilitator, setIsFacilitator] = useState(forcedRole !== Role.DETECTIVE);

  useEffect(() => {
    if (forcedRole === Role.DETECTIVE) {
        setIsFacilitator(false);
    }
  }, [forcedRole]);

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
              onClick={() => !forcedRole && setIsFacilitator(true)}
              disabled={forcedRole === Role.DETECTIVE}
              className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 transition-colors
                ${isFacilitator 
                    ? 'bg-blue-50 border-blue-500 text-blue-700' 
                    : forcedRole === Role.DETECTIVE 
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-50' 
                        : 'border-slate-200 hover:bg-slate-50'
                }`}
            >
              <UserIcon size={18} /> Facilitator
            </button>
            <button 
              onClick={() => setIsFacilitator(false)}
              className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 transition-colors
                ${!isFacilitator 
                    ? 'bg-blue-50 border-blue-500 text-blue-700' 
                    : 'border-slate-200 hover:bg-slate-50'}`}
            >
              <Users size={18} /> Detective
            </button>
          </div>
          
          {forcedRole === Role.DETECTIVE && (
              <div className="text-xs text-center text-blue-600 bg-blue-50 p-2 rounded">
                  Invited as Detective via Link
              </div>
          )}

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

// 2. Group Management Card
interface GroupCardProps {
    game: GameState;
    group: Group;
    onEnterRoom: (groupId: string) => void; 
}

const GroupCard: React.FC<GroupCardProps> = ({ 
    game, 
    group, 
    onEnterRoom 
}) => {
    const [detectiveEmail, setDetectiveEmail] = useState('');
    const [selectedComponents, setSelectedComponents] = useState<MisleadingComponent[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleAddDetective = async () => {
        if(!detectiveEmail) return;
        
        // --- CHECK 1: Max Limit ---
        if((group.detectives || []).length >= 3) return alert("Max 3 detectives per group.");
        
        // --- CHECK 2: Duplicate Email in Entire Game ---
        if (game.detectiveEmails && game.detectiveEmails.includes(detectiveEmail)) {
            alert(`Error: Detective "${detectiveEmail}" is already registered in a group.`);
            return;
        }

        setIsProcessing(true);
        const assignment = selectedComponents.length > 0 ? selectedComponents : [MisleadingComponent.INAPPROPRIATE_SCALE_RANGE];
        await addDetectiveToGroup(game.id, group.id, detectiveEmail, assignment, game);
        setDetectiveEmail('');
        setSelectedComponents([]);
        setIsProcessing(false);
    };

    const toggleComponent = (c: MisleadingComponent) => {
        if(selectedComponents.includes(c)) setSelectedComponents(selectedComponents.filter(x => x !== c));
        else setSelectedComponents([...selectedComponents, c]);
    };

    const activateGroup = async () => {
        await updateGroupStatus(game.id, group.id, GameStatus.ACTIVE, game);
    };

    const terminateGroup = async () => {
        if(confirm(`Are you sure you want to TERMINATE the game for ${group.name}?`)) {
            await updateGroupStatus(game.id, group.id, GameStatus.TERMINATED, game);
        }
    };

    const resetGroup = async () => {
        if(confirm(`RESET ${group.name}? Progress will be wiped, but detectives stay.`)) {
            await resetGroupData(game.id, group.id, game);
        }
    };

    // Calculate progress
    const currentLevel = (group.currentCaseIndex || 0) + 1;
    const totalLevels = CASES.length;

    return (
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-lg text-slate-800">{group.name}</h3>
                    <div className="flex gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase
                            ${group.status === GameStatus.ACTIVE ? 'bg-green-100 text-green-800' : 
                              group.status === GameStatus.FINISHED ? 'bg-blue-100 text-blue-800' :
                              group.status === GameStatus.TERMINATED ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-600'}`}>
                            {group.status}
                        </span>
                        {group.status !== GameStatus.SETUP && (
                            <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                                Case {Math.min(currentLevel, totalLevels)}/{totalLevels}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex gap-1">
                    <button onClick={resetGroup} title="Reset Group" className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                        <RotateCcw size={16} />
                    </button>
                    <button onClick={terminateGroup} title="Terminate Group" className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded">
                        <Ban size={16} />
                    </button>
                </div>
            </div>

            <div className="p-4 flex-1 flex flex-col">
                {/* Detectives List */}
                <div className="space-y-3 mb-4">
                    {(group.detectives || []).length === 0 && <div className="text-sm text-slate-400 italic">No detectives added.</div>}
                    {(group.detectives || []).map(d => (
                        <div key={d.email} className="bg-slate-50 p-3 rounded border flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-sm text-slate-800">{d.email}</span>
                            </div>
                            {/* Assigned Components List (Text Tags) */}
                            <div className="flex flex-wrap gap-1.5">
                                {d.assignedComponents?.map(c => (
                                    <span 
                                        key={c} 
                                        className={`text-[10px] px-2 py-1 rounded border flex items-center gap-1
                                            ${d.trainingProgress?.[c] 
                                                ? 'bg-green-100 text-green-800 border-green-200 font-bold' 
                                                : 'bg-white text-slate-600 border-slate-200'}`}
                                    >
                                        {c}
                                        {d.trainingProgress?.[c] && <CheckCircle size={10} />}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Controls */}
                {group.status === GameStatus.SETUP && (
                    <div className="border-t pt-4 mt-auto">
                        <input 
                            value={detectiveEmail}
                            onChange={e => setDetectiveEmail(e.target.value)}
                            placeholder="Detective Email"
                            className="w-full text-sm border p-2 rounded mb-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <div className="mb-2">
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Assign Specialist Training:</label>
                            {/* Enlarged Selection Area */}
                            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto border p-1 rounded bg-slate-50">
                                {Object.values(MisleadingComponent).map(c => (
                                    <button 
                                        key={c}
                                        onClick={() => toggleComponent(c)}
                                        className={`text-xs px-3 py-2 rounded border text-left transition-colors flex items-center justify-between
                                            ${selectedComponents.includes(c) 
                                                ? 'bg-blue-600 text-white border-blue-600' 
                                                : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'}`}
                                    >
                                        {c}
                                        {selectedComponents.includes(c) && <Check size={14} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button 
                            onClick={handleAddDetective} 
                            disabled={isProcessing}
                            className="w-full bg-slate-800 text-white text-xs py-2 rounded hover:bg-slate-700 disabled:opacity-50 mt-2 font-bold"
                        >
                            + Add Detective
                        </button>
                        {(group.detectives || []).length > 0 && (
                            <button 
                                onClick={activateGroup}
                                className="w-full mt-2 bg-green-600 text-white text-xs py-2 rounded font-bold hover:bg-green-700 flex items-center justify-center gap-1"
                            >
                                <Play size={12}/> Activate
                            </button>
                        )}
                    </div>
                )}

                {(group.status === GameStatus.ACTIVE || group.status === GameStatus.FINISHED || group.status === GameStatus.TERMINATED) && (
                    <div className="mt-auto pt-2">
                        <button 
                            onClick={() => onEnterRoom(group.id)}
                            className="w-full bg-indigo-600 text-white text-sm py-2 rounded font-bold hover:bg-indigo-700"
                        >
                            {group.status === GameStatus.ACTIVE ? "Enter Room" : "View Debrief"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// 3. Facilitator Dashboard (Unchanged logic)
const FacilitatorDashboard = ({ game, email, onEnterRoom, onLogout }: { game: GameState, email: string, onEnterRoom: (groupId: string) => void, onLogout: () => void }) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreateGroup = async () => {
      if(!newGroupName) return;
      await createGroup(game.id, newGroupName);
      setNewGroupName('');
  };

  const handleResetAll = async () => {
      if (confirm("DANGER: This will wipe ALL groups and data. Are you sure?")) {
          await resetGameData(game.id, email);
      }
  };

  const copyInviteLink = () => {
      const url = `${window.location.origin}/detectives`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Mission Control</h1>
            <button 
                onClick={copyInviteLink} 
                className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-800 mt-1"
            >
                 {copied ? <CheckCircle size={14} /> : <Users size={14} />} 
                 {copied ? "Copied Invite Link!" : "Copy General Invite Link"}
            </button>
        </div>
        <div className="flex gap-2">
            <button title="Reset Entire Session" onClick={handleResetAll} className="p-2 bg-red-100 rounded-full hover:bg-red-200 text-red-700 border border-red-200"><Trash2 size={16}/></button>
            <button title="Logout" onClick={onLogout} className="p-2 bg-slate-200 rounded-full hover:bg-red-100 text-red-600"><LogOut size={16}/></button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border mb-8 max-w-xl">
          <label className="block text-sm font-bold text-slate-700 mb-2">Create New Team</label>
          <div className="flex gap-2">
              <input 
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder="e.g. Alpha Team"
                  className="flex-1 border p-2 rounded"
              />
              <button onClick={handleCreateGroup} className="bg-slate-900 text-white px-4 py-2 rounded font-bold flex items-center gap-2">
                  <Plus size={16}/> Create
              </button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {(game.groups || []).map(group => (
              <GroupCard key={group.id} game={game} group={group} onEnterRoom={onEnterRoom} />
          ))}
          {(game.groups || []).length === 0 && (
              <div className="col-span-full text-center py-20 text-slate-400 border-2 border-dashed rounded-xl">
                  Create a group to get started.
              </div>
          )}
      </div>
    </div>
  );
};

// 4. Training Module (Unchanged)
const TrainingModule = ({ 
    component, 
    onComplete,
    onClose
}: { 
    component: MisleadingComponent, 
    onComplete: (answer: string) => void,
    onClose: () => void 
}) => {
    // Stage 1: Learn, Stage 2: Identify (B), Stage 3: Analyze (C)
    const [stage, setStage] = useState<1 | 2 | 3>(1);
    const [revealedStep1, setRevealedStep1] = useState(false);
    
    // Inputs
    const [answerStage2, setAnswerStage2] = useState('');
    const [answerStage3Component, setAnswerStage3Component] = useState('');
    const [answerStage3Impact, setAnswerStage3Impact] = useState('');
    
    // Feedback
    const [feedback, setFeedback] = useState<{message: string, isCorrect: boolean} | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const getStaticExplanation = (c: MisleadingComponent) => {
        switch(c) {
            case MisleadingComponent.INAPPROPRIATE_ORDER:
                return {
                    trick: "Data points are sorted by value or randomly instead of logically (e.g., Time).",
                    misinterpretation: "It obscures trends or creates false patterns where none exist."
                };
            case MisleadingComponent.INAPPROPRIATE_SCALE_RANGE:
                return {
                    trick: "The axis does not start at zero (Truncated Y-Axis).",
                    misinterpretation: "It exaggerates small differences, making stable data look volatile."
                };
            case MisleadingComponent.INAPPROPRIATE_SCALE_FUNC:
                return {
                    trick: "Using non-linear scales (like Log) without clear labels, or irregular intervals.",
                    misinterpretation: "It visually distorts the rate of change (e.g., linear growth looks flat on log scale)."
                };
            case MisleadingComponent.UNCONVENTIONAL_SCALE_DIR:
                return {
                    trick: "The axis is inverted (Top is Low, Bottom is High).",
                    misinterpretation: "It flips the visual meaning: a crash looks like a boom."
                };
            case MisleadingComponent.MISSING_NORMALIZATION:
                return {
                    trick: "Comparing absolute numbers instead of rates (e.g., Total Crimes vs Crime Rate).",
                    misinterpretation: "It ignores underlying population or size differences."
                };
            case MisleadingComponent.INAPPROPRIATE_AGGREGATION:
                return {
                    trick: "Grouping distinct datasets into one average (Simpson's Paradox).",
                    misinterpretation: "It hides crucial details or opposing trends within subgroups."
                };
            case MisleadingComponent.CHERRY_PICKING:
                return {
                    trick: "Selectively showing only a specific time range or data subset.",
                    misinterpretation: "It supports a biased narrative by hiding the full context."
                };
            case MisleadingComponent.MISLEADING_ANNOTATION:
                return {
                    trick: "Titles, arrows, or labels that contradict the actual data.",
                    misinterpretation: "It primes the viewer to see what the author wants, not what is there."
                };
            default: return { trick: "", misinterpretation: "" };
        }
    };

    const handleStage2Submit = async () => {
        if (!answerStage2) return;
        setIsLoading(true);
        const result = await getTrainingFeedback(component, answerStage2, 2);
        setIsLoading(false);
        setFeedback({ message: result.feedback, isCorrect: result.correct });
    };

    const handleStage3Submit = async () => {
        if (!answerStage3Component || !answerStage3Impact) return;
        setIsLoading(true);
        const result = await getTrainingFeedback(component, answerStage3Component, 3, answerStage3Impact);
        setIsLoading(false);
        setFeedback({ message: result.feedback, isCorrect: result.correct });
    };

    const nextStage = () => {
        setFeedback(null);
        if (stage === 1) setStage(2);
        else if (stage === 2) setStage(3);
        else {
            onComplete(answerStage3Impact); 
        }
    };

    const explanation = getStaticExplanation(component);

    return (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Training: {component}</h2>
                    <div className="flex gap-2 text-sm mt-1">
                        <span className={`px-2 py-0.5 rounded ${stage >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>1. Learn</span>
                        <span className={`px-2 py-0.5 rounded ${stage >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>2. Practice</span>
                        <span className={`px-2 py-0.5 rounded ${stage >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>3. Analyze</span>
                    </div>
                </div>
                <button onClick={onClose} className="text-slate-500 hover:text-slate-800">Cancel</button>
            </div>

            <div className="flex-1 p-6 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Chart Visualization */}
                <div className="bg-slate-50 p-6 rounded-xl shadow-inner border flex flex-col justify-center">
                    <MisleadingChart 
                        type={component} 
                        variant={stage === 1 ? 'A' : stage === 2 ? 'B' : 'C'} 
                    />
                </div>

                {/* Right: Interactive Area */}
                <div className="flex flex-col justify-center space-y-6">
                    {/* STAGE 1 */}
                    {stage === 1 && (
                        <div className="animate-fade-in space-y-6">
                            <h3 className="text-xl font-bold">Step 1: Observation</h3>
                            {!revealedStep1 ? (
                                <button onClick={() => setRevealedStep1(true)} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold">Detect Deception</button>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                                        <h4 className="font-bold text-yellow-800 mb-2">The Deception: {component}</h4>
                                        <p className="text-sm text-yellow-900"><strong>What is it?</strong> {explanation.trick}</p>
                                    </div>
                                    <button onClick={nextStage} className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold">Next</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STAGE 2 */}
                    {stage === 2 && (
                        <div className="animate-fade-in space-y-6">
                            <h3 className="text-xl font-bold">Step 2: Identification Practice</h3>
                            <textarea value={answerStage2} onChange={e => setAnswerStage2(e.target.value)} placeholder="What is misleading here?" className="w-full border p-3 rounded h-24 mb-2" />
                            {!feedback?.isCorrect && <button onClick={handleStage2Submit} disabled={isLoading || !answerStage2} className="bg-blue-600 text-white px-4 py-2 rounded">Check</button>}
                            {feedback && <div className={`p-4 rounded border-l-4 ${feedback.isCorrect ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>{feedback.message} {feedback.isCorrect && <button onClick={nextStage} className="block mt-2 font-bold underline">Next</button>}</div>}
                        </div>
                    )}

                    {/* STAGE 3 */}
                    {stage === 3 && (
                        <div className="animate-fade-in space-y-6">
                            <h3 className="text-xl font-bold">Step 3: Deep Analysis</h3>
                            <input value={answerStage3Component} onChange={e => setAnswerStage3Component(e.target.value)} className="w-full border p-3 rounded" placeholder="1. Identify the component" />
                            <textarea value={answerStage3Impact} onChange={e => setAnswerStage3Impact(e.target.value)} className="w-full border p-3 rounded h-24" placeholder="2. What is the impact?" />
                            {!feedback?.isCorrect && <button onClick={handleStage3Submit} disabled={isLoading} className="w-full bg-indigo-600 text-white py-3 rounded font-bold">Submit</button>}
                            {feedback && <div className={`p-4 rounded border-l-4 ${feedback.isCorrect ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>{feedback.message} {feedback.isCorrect && <button onClick={nextStage} className="block mt-2 font-bold underline">Finish</button>}</div>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// 5. Detective Dashboard (Unchanged)
const DetectiveDashboard = ({ game, email, onEnterRoom, onLogout }: { game: GameState, email: string, onEnterRoom: (groupId: string) => void, onLogout: () => void }) => {
  const [activeTraining, setActiveTraining] = useState<MisleadingComponent | null>(null);
  const myGroup = (game.groups || []).find(g => (g.detectives || []).some(d => d.email === email));
  
  if (!myGroup) return (
      <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-slate-700">Waiting for assignment...</h2>
          <button onClick={onLogout} className="mt-4 text-red-500 underline">Logout</button>
      </div>
  );

  const me = (myGroup.detectives || []).find(d => d.email === email)!;

  if (myGroup.status === GameStatus.TERMINATED) {
       return (
          <div className="min-h-screen flex items-center justify-center bg-red-50">
              <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-red-200">
                  <Ban className="mx-auto text-red-500 h-12 w-12 mb-4" />
                  <h1 className="text-2xl font-bold text-red-800">Mission Terminated</h1>
                  <button onClick={onLogout} className="mt-6 px-4 py-2 bg-slate-200 rounded hover:bg-slate-300">Logout</button>
              </div>
          </div>
      );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
        {activeTraining && (
            <TrainingModule 
                component={activeTraining} 
                onClose={() => setActiveTraining(null)}
                onComplete={(answer) => {
                    updateDetectiveTraining(game.id, myGroup.id, email, activeTraining, game, answer);
                    setActiveTraining(null);
                }} 
            />
        )}

        <div className="mb-8 flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Detective Workspace</h1>
                <p className="text-slate-500">Agent: {email} | Team: <span className="font-bold text-indigo-600">{myGroup.name}</span></p>
            </div>
            <button title="Logout" onClick={onLogout} className="p-2 bg-slate-200 rounded-full hover:bg-red-100 text-red-600"><LogOut size={16}/></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <CheckCircle className="text-blue-500" /> Training Status
                </h2>
                <div className="space-y-3">
                    {me.assignedComponents?.length === 0 && <p className="text-sm text-slate-400">No training modules assigned yet.</p>}
                    {me.assignedComponents?.map(comp => (
                        <div key={comp} className="flex justify-between items-center p-3 bg-slate-50 rounded">
                            <span className="text-sm font-medium">{comp}</span>
                            {me.trainingProgress?.[comp] ? (
                                <span className="text-green-600 text-xs font-bold px-2 py-1 bg-green-100 rounded flex items-center gap-1">
                                    <CheckCircle size={12}/> COMPLETED
                                </span>
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
                {myGroup.status === GameStatus.ACTIVE ? (
                    <div className="w-full">
                         <div className="mb-4 text-green-600 font-bold bg-green-50 p-2 rounded">
                            MISSION ACTIVE
                         </div>
                         <button 
                            onClick={() => onEnterRoom(myGroup.id)}
                            className="block w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg transform transition hover:scale-105"
                         >
                            ENTER GAME ROOM
                         </button>
                    </div>
                ) : myGroup.status === GameStatus.FINISHED ? (
                    <div className="w-full">
                         <div className="mb-4 text-blue-600 font-bold bg-blue-50 p-2 rounded">
                            MISSION DEBRIEF READY
                         </div>
                         <button 
                            onClick={() => onEnterRoom(myGroup.id)}
                            className="block w-full py-3 bg-slate-600 text-white rounded-lg font-bold hover:bg-slate-700 shadow-lg"
                         >
                            VIEW RESULTS
                         </button>
                    </div>
                ) : (
                    <div className="text-slate-400">
                        <Lock className="mx-auto mb-2 h-8 w-8" />
                        <p>Waiting for Facilitator activation...</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

// 6. Game Room (Shared & Upgraded)
const GameRoom = ({ 
    game, 
    groupId, 
    email, 
    onLeave 
}: { 
    game: GameState, 
    groupId: string, 
    email: string, 
    onLeave: () => void 
}) => {
    const isFacilitator = game.facilitatorEmail === email;
    const group = (game.groups || []).find(g => g.id === groupId);

    const [selectedSpot, setSelectedSpot] = useState<{x: number, y: number} | null>(null);
    const [reason, setReason] = useState('');
    const [impact, setImpact] = useState('');
    const [reportDraft, setReportDraft] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    
    // NEW STATE for Report Modal
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    // NEW STATE for Review Navigation
    const [reviewCaseIndex, setReviewCaseIndex] = useState<number>(0);

    useEffect(() => {
        if (group) {
            setReportDraft(group.inspectionReport || '');
            // When opening room, default review index to the latest possible
            // If finished, show the one we just finished.
            setReviewCaseIndex(group.currentCaseIndex);
        }
    }, [group?.inspectionReport, group?.currentCaseIndex]);

    if (!group) return <div>Group not found</div>;

    // --- NEW LOGIC: Determine current case ---
    const currentIndex = group.currentCaseIndex || 0;
    const currentCase = CASES[currentIndex] || CASES[CASES.length - 1]; // Fallback
    const isLastLevel = currentIndex >= CASES.length - 1;
    
    // Get the DYNAMIC target issues for this group's current round
    const currentActiveIssues = group.currentCaseTargetIssues || [];

    const handleGraphClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if(isFacilitator || group.status === GameStatus.FINISHED || group.status === GameStatus.TERMINATED) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setSelectedSpot({ x, y });
    };

    const submitAnnotation = async () => {
        if(!selectedSpot || !reason) return;
        await addAnnotationToGroup(game.id, group.id, {
            id: Date.now().toString(),
            x: selectedSpot.x,
            y: selectedSpot.y,
            authorEmail: email,
            reason,
            impact,
            timestamp: Date.now()
        }, game);
        setSelectedSpot(null);
        setReason('');
        setImpact('');
    };

    const handleGenerateReport = async () => {
        setIsGenerating(true);
        // UPDATED: Pass the chartType (e.g., CASE_MARKETING) to generate context-aware conclusion
        const text = await generateInspectionReport(group.annotations || [], currentCase.chartType);
        await updateGroupReport(game.id, group.id, text, game);
        setIsGenerating(false);
    };

    const handleSubmitReport = async () => {
        setIsGenerating(true);
        // Use the DYNAMIC target issues for evaluation
        const result = await evaluateInspection(reportDraft || group.inspectionReport, currentActiveIssues);
        await updateGroupReport(game.id, group.id, reportDraft || group.inspectionReport, game, result);
        setIsGenerating(false);
        setIsReportModalOpen(false); // Close modal on submit
    };

    const handleNextLevel = async () => {
        if (!isFacilitator) return;
        setIsGenerating(true);
        await advanceToNextRound(game.id, group.id, currentCase.title, game);
        setIsGenerating(false);
    };

    // --- VIEW: DEBRIEF ---
    if (group.status === GameStatus.FINISHED) {
        // Gather all rounds including history and current
        const allCompletedRounds: (RoundHistory & { isCurrent?: boolean })[] = [...(group.roundHistory || [])];
        
        // If the current status is finished, it means the current round data is valid "history" effectively,
        // but hasn't been archived yet.
        if (group.evaluationResult) {
            allCompletedRounds.push({
                caseIndex: group.currentCaseIndex,
                caseTitle: CASES[group.currentCaseIndex]?.title || "Unknown Case",
                annotations: group.annotations,
                inspectionReport: group.inspectionReport,
                targetIssues: group.currentCaseTargetIssues || [],
                evaluationResult: group.evaluationResult,
                isCurrent: true
            });
        }

        // Determine which round data to display
        const displayRound = allCompletedRounds.find(r => r.caseIndex === reviewCaseIndex) || allCompletedRounds[allCompletedRounds.length - 1];
        const displayCaseConfig = CASES[displayRound?.caseIndex || 0];
        
        // If no data (shouldn't happen in FINISHED state but safety check)
        if (!displayRound || !displayRound.evaluationResult) return <div>Loading Results...</div>;

        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white overflow-y-auto">
                {/* Updated Container Size to max-w-6xl for wider view */}
                <div className="bg-slate-800 p-8 rounded-xl max-w-6xl w-full text-center relative flex flex-col items-center">
                     <div className="absolute top-4 right-4 text-slate-500 text-sm">
                        Total Cases Completed: {allCompletedRounds.length}
                    </div>
                    
                    <h1 className="text-3xl font-bold mb-4">Round Debrief</h1>
                    
                    {/* NAVIGATION TABS */}
                    <div className="flex gap-2 mb-6 justify-center flex-wrap">
                        {allCompletedRounds.map((r, idx) => (
                            <button
                                key={idx}
                                onClick={() => setReviewCaseIndex(r.caseIndex)}
                                className={`px-4 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2
                                    ${reviewCaseIndex === r.caseIndex 
                                        ? 'bg-blue-600 text-white shadow-lg scale-105' 
                                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'}`}
                            >
                                <History size={14} /> Case {r.caseIndex + 1}: {r.caseTitle}
                            </button>
                        ))}
                    </div>

                    <h2 className="text-xl text-blue-300 mb-6">{displayCaseConfig.title}</h2>
                    
                    {/* ENLARGED CHART CONTAINER */}
                    {/* Using w-full and h-[500px] ensures the chart is large and clearly visible */}
                    <div className="w-full bg-white rounded-lg p-4 shadow-2xl border border-slate-600 mb-8">
                         <div className="h-[500px] w-full">
                            <MisleadingChart 
                                type={displayCaseConfig.chartType} 
                                activeIssues={displayRound.targetIssues} 
                            />
                         </div>
                    </div>

                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                         {/* THREAT DETECTION LIST */}
                         <div className="bg-slate-700/50 rounded-xl p-6 text-left border border-slate-600">
                            <h3 className="text-lg font-bold text-slate-300 uppercase mb-4 flex items-center gap-2 border-b border-slate-600 pb-2">
                                 <AlertTriangle className="text-yellow-500" size={20} /> Threat Detection Analysis
                            </h3>
                            <div className="space-y-3">
                                {displayRound.targetIssues.map(issue => {
                                    const isDetected = (displayRound.evaluationResult?.detectedIssues || []).includes(issue);
                                    return (
                                        <div key={issue} className={`flex items-center justify-between p-4 rounded-lg border-l-4 shadow-sm transition-all ${isDetected ? 'bg-green-900/30 border-green-500' : 'bg-red-900/30 border-red-500'}`}>
                                            <span className="font-medium text-slate-100 text-base">{issue}</span>
                                            {isDetected ? (
                                                <span className="flex items-center gap-1 text-green-400 font-bold text-sm bg-green-950/50 px-3 py-1 rounded-full border border-green-800">
                                                    <CheckCircle size={14} /> IDENTIFIED
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-red-400 font-bold text-sm bg-red-950/50 px-3 py-1 rounded-full border border-red-800">
                                                    <X size={14} /> MISSED
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* SCORE & FEEDBACK */}
                        <div className="flex flex-col">
                            <div className="bg-slate-700/50 rounded-xl p-6 mb-4 flex-1 border border-slate-600 flex flex-col items-center justify-center">
                                <div className="text-sm font-bold text-slate-400 uppercase mb-2">Performance Score</div>
                                <div className={`text-7xl font-black ${displayRound.evaluationResult.score >= 80 ? 'text-green-400' : displayRound.evaluationResult.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                    {displayRound.evaluationResult.score}
                                    <span className="text-2xl text-slate-500 font-normal">/100</span>
                                </div>
                                <div className="text-4xl mt-2">
                                    {displayRound.evaluationResult.success ? '🎉' : '⚠️'}
                                </div>
                            </div>

                            <div className="bg-blue-900/20 rounded-xl p-6 text-left border-l-4 border-blue-500">
                                <h3 className="font-bold text-blue-300 uppercase text-xs mb-2 flex items-center gap-2">
                                    <MessageSquare size={14}/> HQ Intelligence Feedback
                                </h3>
                                <p className="text-slate-200 text-lg leading-relaxed italic">
                                    "{displayRound.evaluationResult.feedback}"
                                </p>
                            </div>
                        </div>
                    </div>

                    {isFacilitator ? (
                        <div className="flex gap-4 justify-center mt-4">
                            {!isLastLevel && displayRound.isCurrent ? (
                                <button 
                                    onClick={handleNextLevel} 
                                    disabled={isGenerating}
                                    className="px-8 py-4 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-lg shadow-lg flex items-center gap-3 transition-transform transform hover:scale-105"
                                >
                                    {isGenerating ? <Loader2 className="animate-spin"/> : <><Play size={24}/> Start Next Case</>}
                                </button>
                            ) : isLastLevel && displayRound.isCurrent && (
                                <div className="text-yellow-400 font-bold text-2xl border-2 border-yellow-400 px-8 py-3 rounded-xl bg-yellow-400/10">
                                    🏆 CAMPAIGN COMPLETE 🏆
                                </div>
                            )}
                            <button onClick={onLeave} className="px-6 py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-slate-300">
                                Return to Dashboard
                            </button>
                        </div>
                    ) : (
                        <div className="text-slate-400 italic mt-4">
                            {isLastLevel ? "Campaign Complete! Great work detective." : "Waiting for Facilitator to start next case..."}
                            <button onClick={onLeave} className="block mx-auto mt-4 px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded">
                                Return to Dashboard
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // --- VIEW: GAMEPLAY ---
    return (
        <div className="min-h-screen bg-slate-100 flex flex-col h-screen overflow-hidden relative">
             {/* Header */}
            <div className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                     <button onClick={onLeave} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <ArrowLeft size={20} />
                     </button>
                    <div>
                        <h1 className="font-bold text-slate-800 flex items-center gap-2">
                            <AlertTriangle className="text-red-500" size={20} /> 
                            Case #{currentIndex + 1}: "{currentCase.title}"
                        </h1>
                        <p className="text-xs text-slate-500 hidden md:block">{currentCase.description}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-6">
                    {/* Progress Dots */}
                    <div className="hidden md:flex gap-1">
                        {CASES.map((c, idx) => (
                            <div key={c.id} className={`w-3 h-3 rounded-full ${idx === currentIndex ? 'bg-blue-600 scale-125' : idx < currentIndex ? 'bg-green-500' : 'bg-slate-200'}`} />
                        ))}
                    </div>

                    <div className="text-right">
                        <div className="font-mono text-sm font-bold text-slate-700">{group.name}</div>
                        <div className="text-xs text-slate-500">{email} {isFacilitator && '(HOST)'}</div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Graph */}
                <div className="flex-1 p-6 overflow-y-auto bg-slate-50 relative">
                    
                    {/* FACILITATOR EYES ONLY: Active Misleading Components */}
                    {isFacilitator && (
                        <div className="mb-4 bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg shadow-sm animate-fade-in">
                            <div className="flex items-center gap-2 mb-2">
                                <Eye size={16} className="text-indigo-600" />
                                <h3 className="font-bold text-indigo-900 text-xs uppercase tracking-wider">FACILITATOR INTEL: Active Deceptions</h3>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {currentActiveIssues.length > 0 ? currentActiveIssues.map(issue => (
                                    <span key={issue} className="px-2 py-1 bg-white border border-indigo-200 rounded text-xs font-mono text-indigo-700 shadow-sm">
                                        {issue}
                                    </span>
                                )) : <span className="text-xs text-indigo-400 italic">No active deceptions generated for this round.</span>}
                            </div>
                        </div>
                    )}

                    {/* PERSUASIVE REPORT CONTEXT (NEW) */}
                    <div className="max-w-4xl mx-auto mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-sm">
                        <div className="flex items-start gap-3">
                            <Quote className="text-yellow-600 shrink-0 mt-1" size={24} />
                            <div>
                                <h3 className="font-bold text-yellow-800 text-xs uppercase mb-1 tracking-wider">Incoming Report Conclusion</h3>
                                <p className="text-slate-800 font-serif text-lg leading-relaxed italic">
                                    "{currentCase.persuasiveReport}"
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 relative mb-4 max-w-4xl mx-auto">
                        <h2 className="text-center font-bold text-xl mb-4 text-indigo-900">
                            Evidence Item #A{currentIndex + 101}
                        </h2>
                        <div 
                            className="relative cursor-crosshair border-2 border-transparent hover:border-slate-300 rounded transition-colors"
                            onClick={handleGraphClick}
                        >
                            <MisleadingChart 
                                type={currentCase.chartType} 
                                activeIssues={currentActiveIssues}
                            />
                            
                            {/* Annotations Overlay */}
                            {(group.annotations || []).map(a => (
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
                    </div>

                    {/* Annotation Input */}
                    {selectedSpot && !isFacilitator && (
                        <div className="bg-white p-4 rounded-xl shadow-lg border border-blue-200 animate-slide-up max-w-lg mx-auto">
                            <h3 className="font-bold text-sm mb-2 text-blue-800">Identify Misleading Feature</h3>
                            <div className="grid gap-3">
                                <input 
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                    placeholder="What is misleading here?" 
                                    value={reason} onChange={e => setReason(e.target.value)}
                                    autoFocus
                                />
                                <input 
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                    placeholder="What misinterpretation does this cause?" 
                                    value={impact} onChange={e => setImpact(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <button onClick={submitAnnotation} className="flex-1 bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700 font-medium">Save Observation</button>
                                    <button onClick={() => setSelectedSpot(null)} className="px-4 bg-slate-200 rounded text-sm hover:bg-slate-300">Cancel</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Collaboration Panel */}
                <div className="w-96 bg-white border-l flex flex-col shadow-xl z-10">
                    <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                        <h2 className="font-bold flex items-center gap-2 text-slate-700">
                            <MessageSquare size={18}/> Detective Notes
                        </h2>
                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
                            {(group.annotations || []).length} Found
                        </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                        {(group.annotations || []).length === 0 && (
                            <div className="text-center text-slate-400 text-sm mt-10 p-4 border-2 border-dashed rounded-lg">
                                <p>No evidence collected yet.</p>
                                <p className="text-xs mt-1">Click anywhere on the chart to tag suspicious elements.</p>
                            </div>
                        )}
                        {(group.annotations || []).map(a => (
                            <div key={a.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-sm hover:border-blue-300 transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-slate-700 text-xs flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"/> {a.authorEmail.split('@')[0]}
                                    </span>
                                    <span className="text-slate-400 text-[10px]">{new Date(a.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                <p className="text-slate-800 mb-1 leading-snug">{a.reason}</p>
                                {a.impact && <p className="text-red-600 text-xs bg-red-50 p-1 rounded mt-1">⚠️ {a.impact}</p>}
                            </div>
                        ))}
                    </div>

                    {/* Report Section */}
                    <div className="p-4 border-t bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                         <div className="flex justify-between items-center mb-2">
                             <h2 className="font-bold text-sm flex items-center gap-2 text-slate-800">
                                 <FileText size={16}/> Final Report
                             </h2>
                             {/* Allow everyone to expand */}
                             <button 
                                onClick={() => setIsReportModalOpen(true)}
                                title="Expand Editor"
                                className="p-1 hover:bg-slate-100 rounded text-blue-600 transition-colors"
                             >
                                <Maximize2 size={16} />
                            </button>
                         </div>

                         {isFacilitator && !group.inspectionReport && (
                             <button 
                                onClick={handleGenerateReport}
                                disabled={(group.annotations || []).length === 0 || isGenerating}
                                className="w-full bg-indigo-600 text-white py-2 rounded text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed mb-3 flex justify-center items-center gap-2"
                             >
                                 {isGenerating ? <Loader2 className="animate-spin" size={14} /> : <div className="flex items-center gap-1">✨ Generate Draft with AI</div>}
                             </button>
                         )}

                         {(group.inspectionReport || reportDraft) && (
                             <div className="space-y-3">
                                 <textarea 
                                    className="w-full h-32 p-3 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    value={reportDraft || group.inspectionReport}
                                    onChange={e => {
                                        setReportDraft(e.target.value);
                                        updateGroupReport(game.id, group.id, e.target.value, game); 
                                    }}
                                    placeholder="Write your final analysis here..."
                                    readOnly={isFacilitator}
                                 />
                                 {isFacilitator && group.status !== GameStatus.TERMINATED && (
                                     <button 
                                        onClick={handleSubmitReport}
                                        disabled={isGenerating}
                                        className="w-full bg-green-600 text-white py-3 rounded-lg text-sm font-bold hover:bg-green-700 shadow-md flex justify-center items-center gap-2"
                                     >
                                        {isGenerating ? <Loader2 className="animate-spin" size={16}/> : <>Submit Analysis & Get Score <ArrowRight size={16}/></>}
                                     </button>
                                 )}
                             </div>
                         )}
                    </div>
                </div>
            </div>

            {/* EXPANDED REPORT EDITOR MODAL */}
            {isReportModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Header */}
                        <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                                    <FileText className="text-indigo-600"/> Final Inspection Report Editor
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    {isFacilitator ? "Review the detective's analysis before submission." : "Collaborate with your team to write the final analysis."}
                                </p>
                            </div>
                            <button 
                                onClick={() => setIsReportModalOpen(false)}
                                className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 p-0 flex flex-col md:flex-row">
                             {/* Left: Notes Reference (Optional, but helpful) */}
                             <div className="w-64 bg-slate-50 border-r overflow-y-auto p-4 hidden md:block">
                                <h3 className="font-bold text-xs uppercase text-slate-500 mb-3">Detective Notes Reference</h3>
                                {(group.annotations || []).map(a => (
                                    <div key={a.id} className="mb-3 p-3 bg-white rounded border border-slate-200 text-xs shadow-sm">
                                        <div className="font-bold text-blue-600 mb-1">{a.authorEmail.split('@')[0]}</div>
                                        <div className="text-slate-800">{a.reason}</div>
                                    </div>
                                ))}
                             </div>

                             {/* Right: Editor */}
                             <div className="flex-1 p-6 flex flex-col">
                                <textarea 
                                    className="flex-1 w-full p-6 text-lg leading-relaxed border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-serif text-slate-800"
                                    value={reportDraft || group.inspectionReport}
                                    onChange={e => {
                                        setReportDraft(e.target.value);
                                        updateGroupReport(game.id, group.id, e.target.value, game); 
                                    }}
                                    placeholder="Generate a draft or start typing your analysis..."
                                    readOnly={isFacilitator}
                                    autoFocus={!isFacilitator}
                                />
                             </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t bg-slate-50 flex justify-between items-center shrink-0">
                            <div className="flex gap-3">
                                {/* Allow generating ONLY for Facilitator */}
                                {isFacilitator && (
                                    <button 
                                        onClick={handleGenerateReport}
                                        disabled={isGenerating}
                                        className="px-4 py-2 bg-indigo-100 text-indigo-700 border border-indigo-200 rounded font-bold hover:bg-indigo-200 flex items-center gap-2"
                                    >
                                        {isGenerating ? <Loader2 className="animate-spin" size={16}/> : "✨ Re-Generate Draft"}
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setIsReportModalOpen(false)}
                                    className="px-6 py-2 text-slate-600 font-medium hover:text-slate-800"
                                >
                                    {isFacilitator ? "Close" : "Close & Save"}
                                </button>
                                {isFacilitator && (
                                    <button 
                                        onClick={handleSubmitReport}
                                        disabled={isGenerating}
                                        className="px-6 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 shadow-md flex items-center gap-2"
                                    >
                                        {isGenerating ? <Loader2 className="animate-spin" size={16}/> : <>Submit Analysis <ArrowRight size={16}/></>}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// 7. Main App Component
const App = () => {
    const [user, setUser] = useState<{email: string, role: Role} | null>(null);
    const [game, setGame] = useState<GameState | null>(null);
    const [view, setView] = useState<View>('LANDING');
    const [loading, setLoading] = useState(false);
    const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
    const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);

    // NEW: Check for invite link
    const isInvite = typeof window !== 'undefined' && window.location.pathname.includes('/detectives');

    // Cleanup subscription on unmount
    useEffect(() => {
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [unsubscribe]);

    const handleLogin = async (email: string, isFacilitator: boolean) => {
        setLoading(true);
        try {
            // 1. Find or Create Game
            let gameId = await findActiveGame(email);
            
            if (!gameId) {
                if (isFacilitator) {
                    gameId = await createGame(email);
                } else {
                    alert("No active mission found. Please ask a Facilitator to invite you.");
                    setLoading(false);
                    return;
                }
            }

            // 2. Subscribe to Game Updates
            const unsub = subscribeToGame(gameId, (updatedGame) => {
                if (updatedGame) {
                    setGame(updatedGame);
                } else {
                    // Game was deleted
                    setGame(null);
                    setView('LANDING');
                    setUser(null);
                    alert("Mission aborted (Session ended).");
                }
            });
            setUnsubscribe(() => unsub);

            // 3. Set State
            setUser({ email, role: isFacilitator ? Role.FACILITATOR : Role.DETECTIVE });
            setView('DASHBOARD');

        } catch (error) {
            console.error("Login Error:", error);
            alert("Connection failed. Please try again.");
        }
        setLoading(false);
    };

    const handleLogout = () => {
        if (unsubscribe) {
            unsubscribe();
            setUnsubscribe(null);
        }
        setUser(null);
        setGame(null);
        setView('LANDING');
        setActiveGroupId(null);
    };

    // --- RENDER ROUTER ---

    if (!user) {
        return <Landing 
            onLogin={handleLogin} 
            loading={loading} 
            forcedRole={isInvite ? Role.DETECTIVE : undefined}
        />;
    }

    if (!game) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-100">
                <div className="text-center">
                    <Loader2 className="animate-spin text-indigo-600 mb-4 mx-auto" size={48} />
                    <p className="text-slate-500 font-bold">Establishing Secure Connection...</p>
                </div>
            </div>
        );
    }

    if (view === 'ROOM' && activeGroupId) {
        return (
            <GameRoom 
                game={game} 
                groupId={activeGroupId} 
                email={user.email} 
                onLeave={() => setView('DASHBOARD')} 
            />
        );
    }

    if (user.role === Role.FACILITATOR) {
        return (
            <FacilitatorDashboard 
                game={game} 
                email={user.email} 
                onEnterRoom={(id) => {
                    setActiveGroupId(id);
                    setView('ROOM');
                }}
                onLogout={handleLogout}
            />
        );
    }

    return (
        <DetectiveDashboard 
            game={game} 
            email={user.email} 
            onEnterRoom={(id) => {
                setActiveGroupId(id);
                setView('ROOM');
            }}
            onLogout={handleLogout}
        />
    );
};

export default App;