import AccountBalanceOutlined from '@mui/icons-material/AccountBalanceOutlined';
import AddRounded from '@mui/icons-material/AddRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import LocalHospitalOutlined from '@mui/icons-material/LocalHospitalOutlined';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import MenuRounded from '@mui/icons-material/MenuRounded';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import TuneRounded from '@mui/icons-material/TuneRounded';
import { Dialog, DialogContent, IconButton } from '@mui/material';
import type { ChatGenerationStage } from '@rag-advisor-demo/shared/api';
import { DEFAULT_CHAT_MODEL } from '@rag-advisor-demo/shared/config';
import type {
	AssistantDomain,
	ChatTurnCdo,
	ProfileInfo,
	RagEvidenceDto,
	SessionInfo,
	TempChatTurn,
} from '@rag-advisor-demo/shared/domain';
import { createBasicChatTurn } from '@rag-advisor-demo/shared/util';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { EmailPasswordPreBuiltUI } from 'supertokens-auth-react/recipe/emailpassword/prebuiltui.js';
import { AuthPage } from 'supertokens-auth-react/ui/index.js';

import {
	useCharacterApi,
	useOrchestrationApi,
	useProfileApi,
	useSessionApi,
	useTempChatApi,
} from '../../hook/api/index.js';
import { useChatState } from '../../hook/state/useChatState.js';
import { useAuth } from '../../provider/AuthProvider.jsx';
import { parseEntriesToText, parseTextToEntries } from '../../util/chatParseUtils.js';
import {
	buildFinanceDomainProfile,
	buildHealthcareDomainProfile,
	buildProfileCdo,
	countEvidenceKinds,
	DEMO_CHARACTER_IDS,
	EMPTY_FINANCE_PROFILE,
	EMPTY_HEALTHCARE_PROFILE,
	type FinanceProfileDraft,
	getSessionDomain,
	type HealthcareProfileDraft,
	summarizeDomainProfile,
	WORKSPACE_DOMAINS,
} from './workspaceConfig.js';
import { WorkspaceToolsDialog, type WorkspaceToolTab } from './WorkspaceToolsDialog.js';
import './advisorWorkspace.css';

const stageLabels: Record<ChatGenerationStage, string> = {
	preparing: 'Preparing',
	retrieving: 'Finding evidence',
	generating: 'Drafting guidance',
	saving: 'Saving response',
};

const DomainIcon = ({ domain }: { domain: AssistantDomain }) =>
	domain === 'finance' ? <AccountBalanceOutlined /> : <LocalHospitalOutlined />;

const formatSessionDate = (value: string): string => {
	const date = new Date(value);
	if (Number.isNaN(date.valueOf())) return '';
	return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
};

const WorkspaceLogin = ({ onLogin }: { onLogin: () => void }) => (
	<div className="advisor-landing">
		<header className="advisor-landing__nav">
			<a className="advisor-wordmark" href="/" aria-label="Grounded home">
				<span className="advisor-wordmark__mark">G</span>
				<span>grounded</span>
			</a>
			<button className="advisor-button advisor-button--ghost" type="button" onClick={onLogin}>
				Sign in
			</button>
		</header>
		<main className="advisor-landing__main">
			<div className="advisor-landing__copy">
				<p className="advisor-kicker">
					<span />
					Evidence-first guidance
				</p>
				<h1>
					Ask better questions.
					<br />
					See what shaped the answer.
				</h1>
				<p className="advisor-landing__lede">
					A public RAG demonstration for exploring fictional finance products and healthcare
					operations—grounded in inspectable source material.
				</p>
				<div className="advisor-landing__actions">
					<button className="advisor-button advisor-button--primary" type="button" onClick={onLogin}>
						Open the workspace
						<ArrowForwardRounded />
					</button>
					<span>No real financial, patient, or organizational data.</span>
				</div>
			</div>
			<div className="advisor-landing__preview" aria-label="Workspace preview">
				<div className="advisor-preview__header">
					<span>LIVE EVIDENCE PREVIEW</span>
					<span className="advisor-status-dot">Grounded</span>
				</div>
				<div className="advisor-preview__question">
					<span>01</span>
					<p>Which fictional option best fits a moderate risk preference and a three-year horizon?</p>
				</div>
				<div className="advisor-preview__answer">
					<div className="advisor-preview__answer-mark">
						<AutoAwesomeRounded />
					</div>
					<div>
						<span>GUIDANCE</span>
						<p>
							The evidence supports comparing the Harbor Income Note with the Summit Growth Portfolio,
							while keeping their liquidity differences explicit.
						</p>
					</div>
				</div>
				<div className="advisor-preview__sources">
					<div>
						<FactCheckOutlined />
						<span>3 eligible sources</span>
					</div>
					<div>
						<ShieldOutlined />
						<span>2 suitability filters</span>
					</div>
				</div>
			</div>
		</main>
		<footer className="advisor-landing__footer">
			<span>FICTIONAL DEMO</span>
			<span>FINANCE × HEALTHCARE OPERATIONS</span>
			<span>BUILT FOR TRACEABILITY</span>
		</footer>
	</div>
);

type NewSessionPanelProps = {
	domain: AssistantDomain;
	userId: string;
	onDomainChange: (domain: AssistantDomain) => void;
};

const NewSessionPanel = ({ domain, userId, onDomainChange }: NewSessionPanelProps) => {
	const navigate = useNavigate();
	const config = WORKSPACE_DOMAINS[domain];
	const characterId = DEMO_CHARACTER_IDS[domain];
	const { data: characterResponse, isLoading: isCharacterLoading } =
		useCharacterApi().getCharacter(characterId);
	const { createSession, initSessionProfileId } = useSessionApi();
	const { storeProfile } = useProfileApi();
	const [financeDraft, setFinanceDraft] = useState<FinanceProfileDraft>(EMPTY_FINANCE_PROFILE);
	const [healthcareDraft, setHealthcareDraft] =
		useState<HealthcareProfileDraft>(EMPTY_HEALTHCARE_PROFILE);
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState<string>();

	const updateFinance = <K extends keyof FinanceProfileDraft>(
		field: K,
		value: FinanceProfileDraft[K]
	) => setFinanceDraft((current) => ({ ...current, [field]: value }));
	const updateHealthcare = <K extends keyof HealthcareProfileDraft>(
		field: K,
		value: HealthcareProfileDraft[K]
	) => setHealthcareDraft((current) => ({ ...current, [field]: value }));

	const createWorkspace = async () => {
		const character = characterResponse?.characterInfo;
		if (!character || character.domain !== domain) {
			setError('The selected demo assistant is not ready.');
			return;
		}
		setError(undefined);
		setIsCreating(true);
		try {
			const domainProfile =
				domain === 'finance'
					? buildFinanceDomainProfile(financeDraft)
					: buildHealthcareDomainProfile(healthcareDraft);
			const { sessionId } = await createSession({
				userId,
				characterId,
				firstCharMessage: character.firstMessage,
				contentPolicy: 'general',
				title: domain === 'finance' ? 'Finance product exploration' : 'Healthcare operations workflow',
			});
			const { profileId } = await storeProfile(buildProfileCdo({ userId, sessionId, domainProfile }));
			await initSessionProfileId({ sessionId, profileId });
			navigate(`/workspace/${sessionId}`);
		} catch (cause) {
			console.error('Workspace creation failed:', cause);
			setError('The workspace could not be created. Please try again.');
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<section className="advisor-start">
			<div className="advisor-start__intro">
				<p className="advisor-kicker">
					<span />
					New exploration
				</p>
				<h1>Choose a domain, then add only the context that matters.</h1>
				<p>
					Your profile guides evidence filtering. Missing fields stay visible instead of being silently
					invented.
				</p>
			</div>

			<div className="advisor-domain-grid">
				{(Object.keys(WORKSPACE_DOMAINS) as AssistantDomain[]).map((itemDomain) => {
					const item = WORKSPACE_DOMAINS[itemDomain];
					const selected = itemDomain === domain;
					return (
						<button
							className={`advisor-domain-card${selected ? ' is-selected' : ''}`}
							data-domain={itemDomain}
							key={itemDomain}
							type="button"
							onClick={() => onDomainChange(itemDomain)}
							aria-pressed={selected}
						>
							<span className="advisor-domain-card__icon">
								<DomainIcon domain={itemDomain} />
							</span>
							<span className="advisor-domain-card__body">
								<small>{item.eyebrow}</small>
								<strong>{item.shortTitle}</strong>
								<span>{item.description}</span>
							</span>
							<span className="advisor-domain-card__check">
								{selected ? <CheckCircleRounded /> : <ChevronRightRounded />}
							</span>
						</button>
					);
				})}
			</div>

			<div
				className="advisor-profile-builder"
				style={{ '--domain-accent': config.accent } as React.CSSProperties}
			>
				<div className="advisor-profile-builder__heading">
					<div>
						<span>SESSION PROFILE</span>
						<h2>{config.shortTitle} context</h2>
					</div>
					<span className="advisor-optional-badge">
						<TuneRounded />
						Editable per session
					</span>
				</div>

				{domain === 'finance' ? (
					<div className="advisor-form-grid">
						<label className="advisor-field advisor-field--wide">
							<span>What are you trying to accomplish?</span>
							<input
								value={financeDraft.investmentGoal}
								onChange={(event) => updateFinance('investmentGoal', event.target.value)}
								placeholder="e.g. Build a fictional emergency reserve"
							/>
						</label>
						<label className="advisor-field">
							<span>Time horizon</span>
							<div className="advisor-input-suffix">
								<input
									type="number"
									min="1"
									value={financeDraft.investmentHorizonMonths}
									onChange={(event) => updateFinance('investmentHorizonMonths', event.target.value)}
									placeholder="36"
								/>
								<small>months</small>
							</div>
						</label>
						<label className="advisor-field">
							<span>Liquidity need</span>
							<select
								value={financeDraft.liquidityNeed}
								onChange={(event) =>
									updateFinance('liquidityNeed', event.target.value as FinanceProfileDraft['liquidityNeed'])
								}
							>
								<option value="">Not provided</option>
								<option value="high">High</option>
								<option value="medium">Medium</option>
								<option value="low">Low</option>
							</select>
						</label>
						<label className="advisor-field">
							<span>Risk preference</span>
							<select
								value={financeDraft.riskPreference}
								onChange={(event) =>
									updateFinance(
										'riskPreference',
										event.target.value as FinanceProfileDraft['riskPreference']
									)
								}
							>
								<option value="">Not provided</option>
								<option value="conservative">Conservative</option>
								<option value="moderate">Moderate</option>
								<option value="growth">Growth</option>
							</select>
						</label>
						<label className="advisor-field advisor-field--wide">
							<span>Constraints</span>
							<input
								value={financeDraft.constraints}
								onChange={(event) => updateFinance('constraints', event.target.value)}
								placeholder="Comma-separated, optional"
							/>
						</label>
					</div>
				) : (
					<div className="advisor-form-grid">
						<label className="advisor-field advisor-field--wide">
							<span>Workflow topic</span>
							<input
								value={healthcareDraft.workflowTopic}
								onChange={(event) => updateHealthcare('workflowTopic', event.target.value)}
								placeholder="e.g. Billing inquiry"
							/>
						</label>
						<label className="advisor-field">
							<span>Requester role</span>
							<select
								value={healthcareDraft.requesterRole}
								onChange={(event) =>
									updateHealthcare(
										'requesterRole',
										event.target.value as HealthcareProfileDraft['requesterRole']
									)
								}
							>
								<option value="">Not provided</option>
								<option value="patient_support">Patient support</option>
								<option value="admin_staff">Administrative staff</option>
								<option value="nurse">Nurse</option>
								<option value="doctor">Doctor</option>
							</select>
						</label>
						<label className="advisor-field">
							<span>Urgency</span>
							<select
								value={healthcareDraft.urgency}
								onChange={(event) =>
									updateHealthcare('urgency', event.target.value as HealthcareProfileDraft['urgency'])
								}
							>
								<option value="">Not provided</option>
								<option value="routine">Routine</option>
								<option value="time_sensitive">Time-sensitive</option>
							</select>
						</label>
						<label className="advisor-field advisor-field--wide">
							<span>Operational constraints</span>
							<input
								value={healthcareDraft.constraints}
								onChange={(event) => updateHealthcare('constraints', event.target.value)}
								placeholder="Comma-separated, optional"
							/>
						</label>
					</div>
				)}

				<div className="advisor-profile-builder__footer">
					<p>
						<ShieldOutlined />
						Use fictional demo details only.
					</p>
					<div>
						{error && <span className="advisor-inline-error">{error}</span>}
						<button
							className="advisor-button advisor-button--primary"
							type="button"
							onClick={createWorkspace}
							disabled={isCreating || isCharacterLoading}
						>
							{isCreating ? 'Creating workspace…' : 'Start exploration'}
							<ArrowForwardRounded />
						</button>
					</div>
				</div>
			</div>
		</section>
	);
};

const EvidenceInspector = ({
	profile,
	evidence,
	domain,
}: {
	profile?: ProfileInfo;
	evidence?: RagEvidenceDto;
	domain: AssistantDomain;
}) => {
	const config = WORKSPACE_DOMAINS[domain];
	const profileSummary = summarizeDomainProfile(profile?.domainProfile);
	const evidenceKinds = countEvidenceKinds(evidence);
	return (
		<aside className="advisor-inspector">
			<div className="advisor-inspector__top">
				<span>TRACE</span>
				<span className={`advisor-live-state${evidence ? ' is-active' : ''}`}>
					<i />
					{evidence ? 'Evidence ready' : 'Awaiting question'}
				</span>
			</div>

			<section className="advisor-inspector__section">
				<div className="advisor-inspector__title">
					<TuneRounded />
					<h3>Session context</h3>
				</div>
				<div className="advisor-profile-summary">
					{profileSummary.map((item) => (
						<div key={item.label}>
							<span>{item.label}</span>
							<strong className={item.missing ? 'is-missing' : ''}>{item.value}</strong>
						</div>
					))}
				</div>
			</section>

			<section className="advisor-inspector__section">
				<div className="advisor-inspector__title">
					<FactCheckOutlined />
					<h3>Retrieved evidence</h3>
				</div>
				{evidence?.items.length ? (
					<>
						<div className="advisor-evidence-counts">
							{evidenceKinds.map((item) => (
								<div key={item.label}>
									<strong>{item.count.toString().padStart(2, '0')}</strong>
									<span>{item.label}</span>
								</div>
							))}
						</div>
						<ul className="advisor-source-list">
							{evidence.items.map((item) => (
								<li key={`${item.sourceKind}-${item.sourceId}`}>
									<span className="advisor-source-list__dot" style={{ background: config.accent }} />
									<div>
										<strong>{item.label}</strong>
										<small>
											{item.origin ? `${item.origin} document` : item.sourceKind.replaceAll('_', ' ')}
										</small>
									</div>
								</li>
							))}
						</ul>
					</>
				) : (
					<p className="advisor-inspector__empty">
						Sources, exclusions, and assumptions will appear after the first response.
					</p>
				)}
			</section>

			{evidence && (
				<section className="advisor-inspector__section">
					<div className="advisor-inspector__title">
						<ShieldOutlined />
						<h3>Decision notes</h3>
					</div>
					<div className="advisor-note-stack">
						<div>
							<span>Missing information</span>
							<strong>{evidence.missingInformation.length}</strong>
						</div>
						<div>
							<span>Explicit assumptions</span>
							<strong>{evidence.assumptions.length}</strong>
						</div>
						<div>
							<span>Excluded source groups</span>
							<strong>{evidence.excluded.length}</strong>
						</div>
					</div>
				</section>
			)}
		</aside>
	);
};

const ConversationWorkspace = ({
	session,
	profile,
}: {
	session: SessionInfo;
	profile: ProfileInfo;
}) => {
	const domain = getSessionDomain(session) ?? profile.domainProfile?.domain ?? 'finance';
	const config = WORKSPACE_DOMAINS[domain];
	const { userId } = useAuth();
	const {
		chatTurns,
		tempChatTurn: stateTempTurn,
		isLoadingHistory,
		addChatTurn,
		changeTempChatTurn,
		getNextSequence,
	} = useChatState(session.sessionId);
	const { getTempChatTurn } = useTempChatApi();
	const { receiveBotResponse, enqueueFinalization, waitForFinalizationJob } = useOrchestrationApi();
	const { updateSessionOnNewMessage } = useSessionApi();
	const nextPersistedSequence = isLoadingHistory ? -1 : getNextSequence();
	const { data: tempResponse } = getTempChatTurn(session.sessionId, nextPersistedSequence);
	const [input, setInput] = useState('');
	const [streamingText, setStreamingText] = useState('');
	const [stage, setStage] = useState<ChatGenerationStage>();
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState<string>();
	const abortRef = useRef<AbortController | undefined>(undefined);
	const [toolsOpen, setToolsOpen] = useState(false);
	const [toolTab, setToolTab] = useState<WorkspaceToolTab>('profile');

	useEffect(() => {
		if (tempResponse?.tempChatTurn) changeTempChatTurn(tempResponse.tempChatTurn);
	}, [changeTempChatTurn, tempResponse]);

	useEffect(
		() => () => {
			abortRef.current?.abort();
		},
		[]
	);

	const finalizeTurn = async (turn: TempChatTurn) => {
		if (!userId || !turn.chatTurnSets[0]) return;
		const selected = turn.chatTurnSets[turn.fixedSetNo >= 0 ? turn.fixedSetNo : 0];
		if (!selected) return;
		const cdo: ChatTurnCdo = {
			userId,
			sessionId: turn.sessionId,
			sequence: turn.sequence,
			request: selected.request,
			response: selected.response,
		};
		await addChatTurn(createBasicChatTurn(cdo));
		try {
			const { displayTurn, job } = await enqueueFinalization.mutateAsync({ cdo });
			await addChatTurn(displayTurn);
			if (job.status !== 'completed') {
				await addChatTurn(await waitForFinalizationJob(turn.sessionId, turn.sequence));
			}
		} catch (cause) {
			console.error('Conversation finalization failed:', cause);
		}
	};

	const sendMessage = async (prompt = input) => {
		const trimmed = prompt.trim();
		if (!trimmed || !userId || isProcessing) return;
		setError(undefined);
		setInput('');
		setStreamingText('');
		setStage('preparing');
		setIsProcessing(true);
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;
		const currentTemp = stateTempTurn;
		const sequence = currentTemp ? currentTemp.sequence + 1 : getNextSequence();
		try {
			const result = await receiveBotResponse.mutateAsync({
				request: {
					sessionId: session.sessionId,
					sequence,
					entries: parseTextToEntries(trimmed),
					modelName: DEFAULT_CHAT_MODEL,
				},
				onDelta: (text) => setStreamingText((current) => current + text),
				onStatus: setStage,
				signal: controller.signal,
			});
			if (currentTemp) void finalizeTurn(currentTemp);
			changeTempChatTurn(result);
			void updateSessionOnNewMessage({
				sessionId: session.sessionId,
				latestCharMessage: JSON.stringify({
					latestCharMessage: result.chatTurnSets[0]?.response.entries ?? [],
				}),
			});
		} catch (cause) {
			if (!controller.signal.aborted) {
				console.error('Guidance request failed:', cause);
				setInput(trimmed);
				setError(cause instanceof Error ? cause.message : 'The response could not be generated.');
			}
		} finally {
			if (abortRef.current === controller) abortRef.current = undefined;
			setIsProcessing(false);
			setStreamingText('');
			setStage(undefined);
		}
	};

	const displayTurns = [
		...chatTurns.map((turn) => ({
			key: `fixed-${turn.sequence}`,
			request: turn.request,
			response: turn.response,
		})),
		...(stateTempTurn?.chatTurnSets[0]
			? [
					{
						key: `temp-${stateTempTurn.sequence}`,
						request: stateTempTurn.chatTurnSets[0].request,
						response: stateTempTurn.chatTurnSets[0].response,
					},
				]
			: []),
	];
	const latestEvidence = stateTempTurn?.ragEvidence;
	const openTools = (nextTab: WorkspaceToolTab) => {
		setToolTab(nextTab);
		setToolsOpen(true);
	};

	return (
		<>
			<div className="advisor-conversation-layout">
				<main className="advisor-conversation">
					<header className="advisor-conversation__header">
						<div>
							<p className="advisor-kicker">
								<span style={{ background: config.accent }} />
								{config.eyebrow}
							</p>
							<h1>{session.title}</h1>
						</div>
						<div className="advisor-conversation__actions">
							<button type="button" onClick={() => openTools('profile')}>
								<TuneRounded />
								<span>Context</span>
							</button>
							<button type="button" onClick={() => openTools('documents')}>
								<DescriptionOutlined />
								<span>References</span>
							</button>
							{domain === 'finance' && (
								<button type="button" onClick={() => openTools('report')}>
									<FactCheckOutlined />
									<span>Report</span>
								</button>
							)}
							<span className="advisor-demo-badge">Fictional demo</span>
						</div>
					</header>

					<div className="advisor-thread" aria-live="polite">
						{isLoadingHistory ? (
							<div className="advisor-thread__loading">Loading the exploration…</div>
						) : displayTurns.length === 0 && !isProcessing ? (
							<div className="advisor-empty-thread">
								<div
									className="advisor-empty-thread__icon"
									style={{ background: config.softAccent, color: config.accent }}
								>
									<DomainIcon domain={domain} />
								</div>
								<span>START WITH A QUESTION</span>
								<h2>{config.title}</h2>
								<p>{config.description}</p>
								<div className="advisor-prompt-list">
									{config.suggestedPrompts.map((prompt) => (
										<button key={prompt} type="button" onClick={() => void sendMessage(prompt)}>
											<span>{prompt}</span>
											<ArrowUpwardRounded />
										</button>
									))}
								</div>
							</div>
						) : (
							displayTurns.map((turn, index) => (
								<article className="advisor-turn" key={turn.key}>
									<div className="advisor-turn__index">{(index + 1).toString().padStart(2, '0')}</div>
									<div className="advisor-turn__content">
										<div className="advisor-message advisor-message--user">
											<span>YOUR QUESTION</span>
											<p>{parseEntriesToText(turn.request.entries)}</p>
										</div>
										<div className="advisor-message advisor-message--assistant">
											<div className="advisor-message__label">
												<span className="advisor-assistant-mark">
													<AutoAwesomeRounded />
												</span>
												<span>GROUNDED GUIDANCE</span>
											</div>
											<div className="advisor-response-copy">{parseEntriesToText(turn.response.entries)}</div>
										</div>
									</div>
								</article>
							))
						)}

						{isProcessing && (
							<article className="advisor-turn advisor-turn--streaming">
								<div className="advisor-turn__index">··</div>
								<div className="advisor-turn__content">
									<div className="advisor-message advisor-message--user">
										<span>YOUR QUESTION</span>
										<p>{input || 'Request submitted'}</p>
									</div>
									<div className="advisor-message advisor-message--assistant">
										<div className="advisor-message__label">
											<span className="advisor-assistant-mark is-pulsing">
												<AutoAwesomeRounded />
											</span>
											<span>{stage ? stageLabels[stage].toUpperCase() : 'WORKING'}</span>
										</div>
										<div className="advisor-response-copy advisor-response-copy--streaming">
											{streamingText || 'Reviewing the eligible evidence…'}
										</div>
									</div>
								</div>
							</article>
						)}
					</div>

					<div className="advisor-composer-wrap">
						{error && <div className="advisor-composer-error">{error}</div>}
						<div className="advisor-composer">
							<textarea
								aria-label="Ask a grounded question"
								value={input}
								onChange={(event) => setInput(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === 'Enter' && !event.shiftKey) {
										event.preventDefault();
										void sendMessage();
									}
								}}
								placeholder={`Ask about ${config.shortTitle.toLowerCase()}…`}
								rows={2}
							/>
							<div className="advisor-composer__footer">
								<span>
									<ShieldOutlined />
									Fictional demo data only
								</span>
								{isProcessing ? (
									<button
										className="advisor-send-button is-cancel"
										type="button"
										onClick={() => abortRef.current?.abort()}
										aria-label="Cancel response"
									>
										<CloseRounded />
									</button>
								) : (
									<button
										className="advisor-send-button"
										type="button"
										onClick={() => void sendMessage()}
										disabled={!input.trim()}
										aria-label="Send question"
									>
										<ArrowUpwardRounded />
									</button>
								)}
							</div>
						</div>
						<p className="advisor-disclaimer">
							{domain === 'finance'
								? 'Educational demo only—not financial advice. Products and outcomes are fictional.'
								: 'Administrative demo only—not medical advice. Facilities and workflows are fictional.'}
						</p>
					</div>
				</main>
				<EvidenceInspector profile={profile} evidence={latestEvidence} domain={domain} />
			</div>
			<WorkspaceToolsDialog
				open={toolsOpen}
				initialTab={toolTab}
				domain={domain}
				session={session}
				profile={profile}
				onClose={() => setToolsOpen(false)}
			/>
		</>
	);
};

const WorkspaceRoute = ({
	selectedDomain,
	onDomainChange,
}: {
	selectedDomain: AssistantDomain;
	onDomainChange: (domain: AssistantDomain) => void;
}) => {
	const { sessionId = '' } = useParams();
	const { userId } = useAuth();
	const {
		data: sessionResponse,
		isLoading: sessionLoading,
		isError: sessionError,
	} = useSessionApi().getSession(sessionId);
	const {
		data: profileResponse,
		isLoading: profileLoading,
		isError: profileError,
	} = useProfileApi().getProfileBySessionId(sessionId);

	if (!sessionId && userId) {
		return (
			<NewSessionPanel domain={selectedDomain} userId={userId} onDomainChange={onDomainChange} />
		);
	}
	if (sessionLoading || profileLoading) {
		return <div className="advisor-route-state">Loading the workspace…</div>;
	}
	if (
		sessionError ||
		profileError ||
		!sessionResponse?.sessionInfo ||
		!profileResponse?.profileInfo
	) {
		return (
			<div className="advisor-route-state advisor-route-state--error">
				<strong>This exploration could not be loaded.</strong>
				<span>Return to the workspace and choose another session.</span>
			</div>
		);
	}
	return (
		<ConversationWorkspace
			key={sessionId}
			session={sessionResponse.sessionInfo}
			profile={profileResponse.profileInfo}
		/>
	);
};

export function AdvisorWorkspacePage() {
	const navigate = useNavigate();
	const { sessionId } = useParams();
	const {
		isSessionLoading,
		isLoggedIn,
		isLoginModalOpen,
		openLoginModal,
		closeLoginModal,
		logout,
		userId,
		userProfile,
	} = useAuth();
	const [selectedDomain, setSelectedDomain] = useState<AssistantDomain>('finance');
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const sessionQuery = useSessionApi().getSessionsByUserId(userId ?? '');
	const supportedSessions = useMemo(
		() =>
			(sessionQuery.data?.sessionInfos ?? []).filter(
				(session) => getSessionDomain(session) && !session.sessionId.endsWith('_live-smoke')
			),
		[sessionQuery.data]
	);

	useEffect(() => {
		if (!sessionId) return;
		const active = supportedSessions.find((session) => session.sessionId === sessionId);
		const domain = active ? getSessionDomain(active) : undefined;
		if (domain) setSelectedDomain(domain);
	}, [sessionId, supportedSessions]);

	if (isSessionLoading) {
		return <div className="advisor-route-state advisor-route-state--full">Opening Grounded…</div>;
	}
	if (!isLoggedIn) {
		return (
			<>
				<WorkspaceLogin onLogin={openLoginModal} />
				<Dialog
					open={isLoginModalOpen}
					onClose={closeLoginModal}
					maxWidth="xs"
					fullWidth
					slotProps={{ paper: { className: 'advisor-auth-dialog' } }}
				>
					<IconButton
						onClick={closeLoginModal}
						aria-label="Close sign in"
						sx={{ position: 'absolute', right: 10, top: 10, zIndex: 2 }}
					>
						<CloseRounded />
					</IconButton>
					<DialogContent>
						<AuthPage preBuiltUIList={[EmailPasswordPreBuiltUI]} />
					</DialogContent>
				</Dialog>
			</>
		);
	}

	const activeSession = supportedSessions.find((session) => session.sessionId === sessionId);
	const initials = userProfile?.showName?.slice(0, 2).toUpperCase() || 'ME';

	return (
		<div className="advisor-app">
			<aside className={`advisor-sidebar${mobileMenuOpen ? ' is-open' : ''}`}>
				<div className="advisor-sidebar__brand">
					<button className="advisor-wordmark" type="button" onClick={() => navigate('/workspace')}>
						<span className="advisor-wordmark__mark">G</span>
						<span>grounded</span>
					</button>
					<button
						className="advisor-mobile-close"
						type="button"
						onClick={() => setMobileMenuOpen(false)}
						aria-label="Close menu"
					>
						<CloseRounded />
					</button>
				</div>

				<button
					className="advisor-new-button"
					type="button"
					onClick={() => {
						navigate('/workspace');
						setMobileMenuOpen(false);
					}}
				>
					<AddRounded />
					New exploration
				</button>

				<nav className="advisor-domain-nav" aria-label="Domains">
					<span>DOMAINS</span>
					{(Object.keys(WORKSPACE_DOMAINS) as AssistantDomain[]).map((domain) => (
						<button
							className={selectedDomain === domain ? 'is-active' : ''}
							key={domain}
							type="button"
							onClick={() => {
								setSelectedDomain(domain);
								navigate('/workspace');
								setMobileMenuOpen(false);
							}}
						>
							<DomainIcon domain={domain} />
							<span>{WORKSPACE_DOMAINS[domain].shortTitle}</span>
						</button>
					))}
				</nav>

				<div className="advisor-session-nav">
					<span>RECENT EXPLORATIONS</span>
					<div>
						{supportedSessions.length ? (
							supportedSessions.map((session) => {
								const domain = getSessionDomain(session)!;
								return (
									<button
										className={session.sessionId === sessionId ? 'is-active' : ''}
										key={session.sessionId}
										type="button"
										onClick={() => {
											navigate(`/workspace/${session.sessionId}`);
											setMobileMenuOpen(false);
										}}
									>
										<i style={{ background: WORKSPACE_DOMAINS[domain].accent }} />
										<span>
											<strong>{session.title}</strong>
											<small>{formatSessionDate(session.updatedAt)}</small>
										</span>
									</button>
								);
							})
						) : (
							<p>No explorations yet.</p>
						)}
					</div>
				</div>

				<div className="advisor-sidebar__account">
					<span className="advisor-avatar">{initials}</span>
					<div>
						<strong>{userProfile?.showName || 'Demo user'}</strong>
						<span>Signed in</span>
					</div>
					<button type="button" onClick={() => void logout()} aria-label="Sign out">
						<LogoutRounded />
					</button>
				</div>
			</aside>

			{mobileMenuOpen && (
				<button
					className="advisor-sidebar-scrim"
					type="button"
					aria-label="Close navigation"
					onClick={() => setMobileMenuOpen(false)}
				/>
			)}

			<div className="advisor-main-shell">
				<header className="advisor-mobile-header">
					<button type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
						<MenuRounded />
					</button>
					<span>grounded</span>
					<span
						className="advisor-mobile-domain"
						style={{ '--mobile-domain': WORKSPACE_DOMAINS[selectedDomain].accent } as React.CSSProperties}
					>
						{activeSession ? WORKSPACE_DOMAINS[selectedDomain].shortTitle : 'New'}
					</span>
				</header>
				<WorkspaceRoute selectedDomain={selectedDomain} onDomainChange={setSelectedDomain} />
			</div>
		</div>
	);
}
