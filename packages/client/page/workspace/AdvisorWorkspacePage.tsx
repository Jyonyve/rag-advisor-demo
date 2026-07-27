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
import { Dialog, DialogContent, IconButton, Tooltip } from '@mui/material';
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
import { useLanguage } from '../../provider/LanguageProvider.js';
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
import { getWorkspaceCopy, getWorkspaceDomainConfig } from './workspaceI18n.js';
import './advisorWorkspace.css';

const DomainIcon = ({ domain }: { domain: AssistantDomain }) =>
	domain === 'finance' ? <AccountBalanceOutlined /> : <LocalHospitalOutlined />;

const formatSessionDate = (value: string, lang: 'kor' | 'eng'): string => {
	const date = new Date(value);
	if (Number.isNaN(date.valueOf())) return '';
	return new Intl.DateTimeFormat(lang === 'kor' ? 'ko-KR' : 'en', {
		month: 'short',
		day: 'numeric',
	}).format(date);
};

const WorkspaceLogin = ({ onLogin }: { onLogin: () => void }) => {
	const { lang, toggleLang } = useLanguage();
	const text = getWorkspaceCopy(lang);
	return (
		<div className="advisor-landing">
			<header className="advisor-landing__nav">
				<a className="advisor-wordmark" href="/" aria-label="Grounded home">
					<span className="advisor-wordmark__mark">G</span>
					<span>grounded</span>
				</a>
				<div className="advisor-landing__nav-actions">
					<button className="advisor-language-toggle" type="button" onClick={toggleLang}>
						{lang === 'kor' ? 'EN · English' : '한 · 한국어'}
					</button>
					<button className="advisor-button advisor-button--ghost" type="button" onClick={onLogin}>
						{text.signIn}
					</button>
				</div>
			</header>
			<main className="advisor-landing__main">
				<div className="advisor-landing__copy">
					<p className="advisor-kicker">
						<span />
						{text.evidenceFirst}
					</p>
					<h1>
						{text.heroLine1}
						<br />
						{text.heroLine2}
					</h1>
					<p className="advisor-landing__lede">{text.landingDescription}</p>
					<div className="advisor-landing__actions">
						<button className="advisor-button advisor-button--primary" type="button" onClick={onLogin}>
							{text.openWorkspace}
							<ArrowForwardRounded />
						</button>
						<span>{text.noRealData}</span>
					</div>
				</div>
				<div className="advisor-landing__preview" aria-label="Workspace preview">
					<div className="advisor-preview__header">
						<span>{text.livePreview}</span>
						<span className="advisor-status-dot">Grounded</span>
					</div>
					<div className="advisor-preview__question">
						<span>01</span>
						<p>{text.previewQuestion}</p>
					</div>
					<div className="advisor-preview__answer">
						<div className="advisor-preview__answer-mark">
							<AutoAwesomeRounded />
						</div>
						<div>
							<span>{text.guidance}</span>
							<p>{text.previewAnswer}</p>
						</div>
					</div>
					<div className="advisor-preview__sources">
						<div>
							<FactCheckOutlined />
							<span>{text.eligibleSources}</span>
						</div>
						<div>
							<ShieldOutlined />
							<span>{text.suitabilityFilters}</span>
						</div>
					</div>
				</div>
			</main>
			<footer className="advisor-landing__footer">
				<span>{text.fictionalDemo.toUpperCase()}</span>
				<span>{text.financeHealthcare}</span>
				<span>{text.builtForTraceability}</span>
			</footer>
		</div>
	);
};

type NewSessionPanelProps = {
	domain: AssistantDomain;
	userId: string;
	onDomainChange: (domain: AssistantDomain) => void;
};

const NewSessionPanel = ({ domain, userId, onDomainChange }: NewSessionPanelProps) => {
	const { lang } = useLanguage();
	const text = getWorkspaceCopy(lang);
	const navigate = useNavigate();
	const config = getWorkspaceDomainConfig(domain, lang);
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
			setError(text.assistantNotReady);
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
			setError(text.workspaceCreateFailed);
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<section className="advisor-start">
			<div className="advisor-start__intro">
				<p className="advisor-kicker">
					<span />
					{text.newExploration}
				</p>
				<h1>{text.newIntroTitle}</h1>
				<p>{text.newIntroBody}</p>
			</div>

			<div className="advisor-domain-grid">
				{(Object.keys(WORKSPACE_DOMAINS) as AssistantDomain[]).map((itemDomain) => {
					const item = getWorkspaceDomainConfig(itemDomain, lang);
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
						<span>{text.sessionProfile}</span>
						<h2>
							{config.shortTitle} {text.contextSuffix}
						</h2>
					</div>
					<span className="advisor-optional-badge">
						<TuneRounded />
						{text.editablePerSession}
					</span>
				</div>

				{domain === 'finance' ? (
					<div className="advisor-form-grid">
						<label className="advisor-field advisor-field--wide">
							<span>{text.goalQuestion}</span>
							<input
								value={financeDraft.investmentGoal}
								onChange={(event) => updateFinance('investmentGoal', event.target.value)}
								placeholder={text.goalPlaceholder}
							/>
						</label>
						<label className="advisor-field">
							<span>{text.timeHorizon}</span>
							<div className="advisor-input-suffix">
								<input
									type="number"
									min="1"
									value={financeDraft.investmentHorizonMonths}
									onChange={(event) => updateFinance('investmentHorizonMonths', event.target.value)}
									placeholder="36"
								/>
								<small>{text.months}</small>
							</div>
						</label>
						<label className="advisor-field">
							<span>{text.liquidityNeed}</span>
							<select
								value={financeDraft.liquidityNeed}
								onChange={(event) =>
									updateFinance('liquidityNeed', event.target.value as FinanceProfileDraft['liquidityNeed'])
								}
							>
								<option value="">{text.notProvided}</option>
								<option value="high">{text.high}</option>
								<option value="medium">{text.medium}</option>
								<option value="low">{text.low}</option>
							</select>
						</label>
						<label className="advisor-field">
							<span>{text.riskPreference}</span>
							<select
								value={financeDraft.riskPreference}
								onChange={(event) =>
									updateFinance(
										'riskPreference',
										event.target.value as FinanceProfileDraft['riskPreference']
									)
								}
							>
								<option value="">{text.notProvided}</option>
								<option value="conservative">{text.conservative}</option>
								<option value="moderate">{text.moderate}</option>
								<option value="growth">{text.growth}</option>
							</select>
						</label>
						<label className="advisor-field advisor-field--wide">
							<span>{text.constraints}</span>
							<input
								value={financeDraft.constraints}
								onChange={(event) => updateFinance('constraints', event.target.value)}
								placeholder={text.optionalComma}
							/>
						</label>
					</div>
				) : (
					<div className="advisor-form-grid">
						<label className="advisor-field advisor-field--wide">
							<span>{text.workflowTopic}</span>
							<input
								value={healthcareDraft.workflowTopic}
								onChange={(event) => updateHealthcare('workflowTopic', event.target.value)}
								placeholder={text.workflowPlaceholder}
							/>
						</label>
						<label className="advisor-field">
							<span>{text.requesterRole}</span>
							<select
								value={healthcareDraft.requesterRole}
								onChange={(event) =>
									updateHealthcare(
										'requesterRole',
										event.target.value as HealthcareProfileDraft['requesterRole']
									)
								}
							>
								<option value="">{text.notProvided}</option>
								<option value="patient_support">{text.patientSupport}</option>
								<option value="admin_staff">{text.adminStaff}</option>
								<option value="nurse">{text.nurse}</option>
								<option value="doctor">{text.doctor}</option>
							</select>
						</label>
						<label className="advisor-field">
							<span>{text.urgency}</span>
							<select
								value={healthcareDraft.urgency}
								onChange={(event) =>
									updateHealthcare('urgency', event.target.value as HealthcareProfileDraft['urgency'])
								}
							>
								<option value="">{text.notProvided}</option>
								<option value="routine">{text.routine}</option>
								<option value="time_sensitive">{text.timeSensitive}</option>
							</select>
						</label>
						<label className="advisor-field advisor-field--wide">
							<span>{text.operationalConstraints}</span>
							<input
								value={healthcareDraft.constraints}
								onChange={(event) => updateHealthcare('constraints', event.target.value)}
								placeholder={text.optionalComma}
							/>
						</label>
					</div>
				)}

				<div className="advisor-profile-builder__footer">
					<p>
						<ShieldOutlined />
						{text.useFictional}
					</p>
					<div>
						{error && <span className="advisor-inline-error">{error}</span>}
						<button
							className="advisor-button advisor-button--primary"
							type="button"
							onClick={createWorkspace}
							disabled={isCreating || isCharacterLoading}
						>
							{isCreating ? text.creatingWorkspace : text.startExploration}
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
	const { lang } = useLanguage();
	const text = getWorkspaceCopy(lang);
	const config = getWorkspaceDomainConfig(domain, lang);
	const profileSummary = summarizeDomainProfile(profile?.domainProfile, lang);
	const evidenceKinds = countEvidenceKinds(evidence, lang);
	return (
		<aside className="advisor-inspector">
			<div className="advisor-inspector__top">
				<span>{text.trace}</span>
				<span className={`advisor-live-state${evidence ? ' is-active' : ''}`}>
					<i />
					{evidence ? text.evidenceReady : text.awaitingQuestion}
				</span>
			</div>

			<section className="advisor-inspector__section">
				<div className="advisor-inspector__title">
					<TuneRounded />
					<h3>{text.contextFull}</h3>
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
					<h3>{text.retrievedEvidence}</h3>
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
											{item.origin
												? `${item.origin === 'manual' ? text.manual : text.generated} ${text.document}`
												: item.sourceKind.replaceAll('_', ' ')}
										</small>
									</div>
								</li>
							))}
						</ul>
					</>
				) : (
					<p className="advisor-inspector__empty">{text.noEvidence}</p>
				)}
			</section>

			{evidence && (
				<section className="advisor-inspector__section">
					<div className="advisor-inspector__title">
						<ShieldOutlined />
						<h3>{text.decisionNotes}</h3>
					</div>
					<div className="advisor-note-stack">
						<div>
							<span>{text.missingInformation}</span>
							<strong>{evidence.missingInformation.length}</strong>
						</div>
						<div>
							<span>{text.explicitAssumptions}</span>
							<strong>{evidence.assumptions.length}</strong>
						</div>
						<div>
							<span>{text.excludedGroups}</span>
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
	const { lang } = useLanguage();
	const text = getWorkspaceCopy(lang);
	const domain = getSessionDomain(session) ?? profile.domainProfile?.domain ?? 'finance';
	const config = getWorkspaceDomainConfig(domain, lang);
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
				setError(cause instanceof Error ? cause.message : text.taskFailed);
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
							<Tooltip title={text.contextFull}>
								<button type="button" onClick={() => openTools('profile')} aria-label={text.contextFull}>
									<TuneRounded />
									<span>{text.context}</span>
								</button>
							</Tooltip>
							<Tooltip title={text.references}>
								<button type="button" onClick={() => openTools('documents')} aria-label={text.references}>
									<DescriptionOutlined />
									<span>{text.references}</span>
								</button>
							</Tooltip>
							{domain === 'finance' && (
								<Tooltip title={text.report}>
									<button type="button" onClick={() => openTools('report')} aria-label={text.report}>
										<FactCheckOutlined />
										<span>{text.report}</span>
									</button>
								</Tooltip>
							)}
							<span className="advisor-demo-badge">{text.fictionalDemo}</span>
						</div>
					</header>

					<div className="advisor-thread" aria-live="polite">
						{isLoadingHistory ? (
							<div className="advisor-thread__loading">{text.loadingExploration}</div>
						) : displayTurns.length === 0 && !isProcessing ? (
							<div className="advisor-empty-thread">
								<div
									className="advisor-empty-thread__icon"
									style={{ background: config.softAccent, color: config.accent }}
								>
									<DomainIcon domain={domain} />
								</div>
								<span>{text.startQuestion}</span>
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
											<span>{text.yourQuestion}</span>
											<p>{parseEntriesToText(turn.request.entries)}</p>
										</div>
										<div className="advisor-message advisor-message--assistant">
											<div className="advisor-message__label">
												<span className="advisor-assistant-mark">
													<AutoAwesomeRounded />
												</span>
												<span>{text.groundedGuidance}</span>
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
										<span>{text.yourQuestion}</span>
										<p>{input || text.requestSubmitted}</p>
									</div>
									<div className="advisor-message advisor-message--assistant">
										<div className="advisor-message__label">
											<span className="advisor-assistant-mark is-pulsing">
												<AutoAwesomeRounded />
											</span>
											<span>{stage ? text[stage].toUpperCase() : text.working}</span>
										</div>
										<div className="advisor-response-copy advisor-response-copy--streaming">
											{streamingText || text.reviewingEvidence}
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
								aria-label={text.taskQuestionLabel}
								value={input}
								onChange={(event) => setInput(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === 'Enter' && !event.shiftKey) {
										event.preventDefault();
										void sendMessage();
									}
								}}
								placeholder={domain === 'finance' ? text.askFinance : text.askHealthcare}
								rows={2}
							/>
							<div className="advisor-composer__footer">
								<span className="advisor-composer-hint">
									<ShieldOutlined />
									{text.fictionalOnly}
								</span>
								{isProcessing ? (
									<Tooltip title={text.cancel}>
										<button
											className="advisor-send-button is-cancel"
											type="button"
											onClick={() => abortRef.current?.abort()}
											aria-label={text.cancel}
										>
											<CloseRounded />
										</button>
									</Tooltip>
								) : (
									<Tooltip title={text.send}>
										<span className="advisor-send-tooltip">
											<button
												className="advisor-send-button"
												type="button"
												onClick={() => void sendMessage()}
												disabled={!input.trim()}
												aria-label={text.send}
											>
												<ArrowUpwardRounded />
											</button>
										</span>
									</Tooltip>
								)}
							</div>
						</div>
						<p className="advisor-disclaimer">
							{domain === 'finance' ? text.financeDisclaimer : text.healthcareDisclaimer}
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
	const { lang } = useLanguage();
	const text = getWorkspaceCopy(lang);
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
		return <div className="advisor-route-state">{text.loadingWorkspace}</div>;
	}
	if (
		sessionError ||
		profileError ||
		!sessionResponse?.sessionInfo ||
		!profileResponse?.profileInfo
	) {
		return (
			<div className="advisor-route-state advisor-route-state--error">
				<strong>{text.loadFailed}</strong>
				<span>{text.loadFailedHint}</span>
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
	const { lang, toggleLang } = useLanguage();
	const text = getWorkspaceCopy(lang);
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
		return <div className="advisor-route-state advisor-route-state--full">{text.opening}</div>;
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
					<Tooltip title={text.closeSignIn}>
						<IconButton
							onClick={closeLoginModal}
							aria-label={text.closeSignIn}
							sx={{ position: 'absolute', right: 10, top: 10, zIndex: 2 }}
						>
							<CloseRounded />
						</IconButton>
					</Tooltip>
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
					<Tooltip title={text.closeNavigation}>
						<button
							className="advisor-mobile-close"
							type="button"
							onClick={() => setMobileMenuOpen(false)}
							aria-label={text.closeNavigation}
						>
							<CloseRounded />
						</button>
					</Tooltip>
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
					{text.newExploration}
				</button>

				<button
					className="advisor-language-toggle advisor-language-toggle--sidebar"
					type="button"
					onClick={toggleLang}
				>
					{lang === 'kor' ? 'EN · English' : '한 · 한국어'}
				</button>

				<nav className="advisor-domain-nav" aria-label={text.domains}>
					<span>{text.domains.toUpperCase()}</span>
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
							<span>{getWorkspaceDomainConfig(domain, lang).shortTitle}</span>
						</button>
					))}
				</nav>

				<div className="advisor-session-nav">
					<span>{text.recent.toUpperCase()}</span>
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
											<small>{formatSessionDate(session.updatedAt, lang)}</small>
										</span>
									</button>
								);
							})
						) : (
							<p>{text.none}</p>
						)}
					</div>
				</div>

				<div className="advisor-sidebar__account">
					<span className="advisor-avatar">{initials}</span>
					<div>
						<strong>{userProfile?.showName || text.demoUser}</strong>
						<span>{text.signedIn}</span>
					</div>
					<Tooltip title={text.signOut}>
						<button type="button" onClick={() => void logout()} aria-label={text.signOut}>
							<LogoutRounded />
						</button>
					</Tooltip>
				</div>
			</aside>

			{mobileMenuOpen && (
				<button
					className="advisor-sidebar-scrim"
					type="button"
					aria-label={text.closeNavigation}
					onClick={() => setMobileMenuOpen(false)}
				/>
			)}

			<div className="advisor-main-shell">
				<header className="advisor-mobile-header">
					<Tooltip title={text.openNavigation}>
						<button
							type="button"
							onClick={() => setMobileMenuOpen(true)}
							aria-label={text.openNavigation}
						>
							<MenuRounded />
						</button>
					</Tooltip>
					<span>grounded</span>
					<span
						className="advisor-mobile-domain"
						style={{ '--mobile-domain': WORKSPACE_DOMAINS[selectedDomain].accent } as React.CSSProperties}
					>
						{activeSession ? getWorkspaceDomainConfig(selectedDomain, lang).shortTitle : text.new}
					</span>
				</header>
				<WorkspaceRoute selectedDomain={selectedDomain} onDomainChange={setSelectedDomain} />
			</div>
		</div>
	);
}
