import CheckRounded from '@mui/icons-material/CheckRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import PostAddRounded from '@mui/icons-material/PostAddRounded';
import TuneRounded from '@mui/icons-material/TuneRounded';
import { Dialog, DialogContent, IconButton } from '@mui/material';
import { DEFAULT_CHAT_MODEL } from '@rag-advisor-demo/shared/config';
import type {
	AssistantDomain,
	DocumentInfo,
	ProfileCdo,
	ProfileInfo,
	SessionInfo,
} from '@rag-advisor-demo/shared/domain';
import { useEffect, useMemo, useState } from 'react';

import { useDocumentApi, useProfileApi } from '../../hook/api/index.js';
import {
	buildFinanceDomainProfile,
	buildHealthcareDomainProfile,
	EMPTY_FINANCE_PROFILE,
	EMPTY_HEALTHCARE_PROFILE,
	type FinanceProfileDraft,
	type HealthcareProfileDraft,
	WORKSPACE_DOMAINS,
} from './workspaceConfig.js';

export type WorkspaceToolTab = 'profile' | 'documents' | 'report';

type WorkspaceToolsDialogProps = {
	open: boolean;
	initialTab: WorkspaceToolTab;
	domain: AssistantDomain;
	session: SessionInfo;
	profile: ProfileInfo;
	onClose: () => void;
};

const profileToFinanceDraft = (profile: ProfileInfo): FinanceProfileDraft => {
	const domainProfile =
		profile.domainProfile?.domain === 'finance' ? profile.domainProfile : undefined;
	return {
		investmentGoal: domainProfile?.investmentGoal ?? '',
		investmentHorizonMonths: domainProfile?.investmentHorizonMonths?.toString() ?? '',
		liquidityNeed: domainProfile?.liquidityNeed ?? '',
		riskPreference: domainProfile?.riskPreference ?? '',
		constraints: domainProfile?.constraints.join(', ') ?? '',
	};
};

const profileToHealthcareDraft = (profile: ProfileInfo): HealthcareProfileDraft => {
	const domainProfile =
		profile.domainProfile?.domain === 'healthcare_operations' ? profile.domainProfile : undefined;
	return {
		workflowTopic: domainProfile?.workflowTopic ?? '',
		requesterRole: domainProfile?.requesterRole ?? '',
		urgency: domainProfile?.urgency ?? '',
		constraints: domainProfile?.constraints.join(', ') ?? '',
	};
};

const documentStatusLabel = (document: DocumentInfo): string => {
	if (document.status === 'archived') return 'Archived';
	if (document.status === 'approved' && document.retrievalEnabled) return 'In RAG';
	if (document.status === 'approved') return 'Approved';
	return 'Draft';
};

export function WorkspaceToolsDialog({
	open,
	initialTab,
	domain,
	session,
	profile,
	onClose,
}: WorkspaceToolsDialogProps) {
	const config = WORKSPACE_DOMAINS[domain];
	const [tab, setTab] = useState<WorkspaceToolTab>(initialTab);
	const [financeDraft, setFinanceDraft] = useState(() => profileToFinanceDraft(profile));
	const [healthcareDraft, setHealthcareDraft] = useState(() => profileToHealthcareDraft(profile));
	const [documentTitle, setDocumentTitle] = useState('');
	const [documentBody, setDocumentBody] = useState('');
	const [documentIncludeInRag, setDocumentIncludeInRag] = useState(true);
	const [reportRequest, setReportRequest] = useState(
		'Create a concise personalized comparison report from the current fictional profile and eligible evidence.'
	);
	const [isSavingProfile, setIsSavingProfile] = useState(false);
	const [message, setMessage] = useState<string>();
	const [error, setError] = useState<string>();
	const { storeProfile } = useProfileApi();
	const documentApi = useDocumentApi();
	const documentQuery = documentApi.getDocumentsBySession(session.sessionId);
	const documents = useMemo(
		() =>
			[...(documentQuery.data?.documentInfos ?? [])].sort((a, b) =>
				b.updatedAt.localeCompare(a.updatedAt)
			),
		[documentQuery.data]
	);

	useEffect(() => {
		if (!open) return;
		setTab(initialTab);
		setFinanceDraft(profileToFinanceDraft(profile));
		setHealthcareDraft(profileToHealthcareDraft(profile));
		setMessage(undefined);
		setError(undefined);
	}, [initialTab, open, profile]);

	const updateFinance = <K extends keyof FinanceProfileDraft>(
		field: K,
		value: FinanceProfileDraft[K]
	) => setFinanceDraft((current) => ({ ...current, [field]: value }));
	const updateHealthcare = <K extends keyof HealthcareProfileDraft>(
		field: K,
		value: HealthcareProfileDraft[K]
	) => setHealthcareDraft((current) => ({ ...current, [field]: value }));

	const saveProfile = async () => {
		setError(undefined);
		setMessage(undefined);
		setIsSavingProfile(true);
		try {
			const domainProfile =
				domain === 'finance'
					? buildFinanceDomainProfile(financeDraft)
					: buildHealthcareDomainProfile(healthcareDraft);
			const input: ProfileCdo = {
				userId: profile.userId,
				sessionId: profile.sessionId,
				name: profile.name,
				showName: profile.showName,
				gender: profile.gender,
				title: profile.title,
				description: profile.description,
				domainProfile,
			};
			await storeProfile(input);
			setMessage('Session context updated.');
		} catch (cause) {
			console.error('Profile update failed:', cause);
			setError('The session context could not be saved.');
		} finally {
			setIsSavingProfile(false);
		}
	};

	const createReferenceDocument = async () => {
		if (!documentTitle.trim() || !documentBody.trim()) return;
		setError(undefined);
		setMessage(undefined);
		try {
			const created = await documentApi.createManualDraft({
				sessionId: session.sessionId,
				title: documentTitle.trim(),
				body: documentBody.trim(),
				documentKind: 'session reference',
				viewpoint: 'user-provided fictional demo reference',
			});
			if (documentIncludeInRag) {
				await documentApi.updateDraft({
					documentId: created.documentInfo.documentId,
					sessionId: session.sessionId,
					input: { includeInRag: true, expectedRevision: created.documentInfo.revision },
				});
			}
			setDocumentTitle('');
			setDocumentBody('');
			setMessage('Reference saved as a draft. Approve it when it is ready for use.');
		} catch (cause) {
			console.error('Reference creation failed:', cause);
			setError('The reference could not be created.');
		}
	};

	const approveDocument = async (document: DocumentInfo) => {
		setError(undefined);
		setMessage(undefined);
		try {
			await documentApi.approve({ documentId: document.documentId, sessionId: session.sessionId });
			setMessage('Document approved.');
		} catch (cause) {
			console.error('Document approval failed:', cause);
			setError('The document could not be approved.');
		}
	};

	const toggleDocumentRetrieval = async (document: DocumentInfo, enabled: boolean) => {
		setError(undefined);
		try {
			if (document.status === 'draft') {
				await documentApi.updateDraft({
					documentId: document.documentId,
					sessionId: session.sessionId,
					input: { includeInRag: enabled, expectedRevision: document.revision },
				});
			} else if (document.status === 'approved') {
				await documentApi.setRetrievalPreference({
					documentId: document.documentId,
					sessionId: session.sessionId,
					enabled,
				});
			}
		} catch (cause) {
			console.error('Retrieval preference update failed:', cause);
			setError('The retrieval setting could not be updated.');
		}
	};

	const generateFinanceReport = async () => {
		if (!reportRequest.trim()) return;
		setError(undefined);
		setMessage(undefined);
		try {
			await documentApi.generateFinanceReport({
				sessionId: session.sessionId,
				requestText: reportRequest.trim(),
				modelName: DEFAULT_CHAT_MODEL,
			});
			setMessage('Finance report created as an output-only draft.');
			setTab('documents');
		} catch (cause) {
			console.error('Finance report generation failed:', cause);
			setError('The finance report could not be generated.');
		}
	};

	return (
		<Dialog
			open={open}
			onClose={onClose}
			fullWidth
			maxWidth="md"
			slotProps={{ paper: { className: 'advisor-tools-dialog' } }}
		>
			<DialogContent className="advisor-tools-dialog__content">
				<header className="advisor-tools-dialog__header">
					<div>
						<span>WORKSPACE TOOLS</span>
						<h2>{config.shortTitle}</h2>
					</div>
					<IconButton onClick={onClose} aria-label="Close workspace tools">
						<CloseRounded />
					</IconButton>
				</header>

				<nav className="advisor-tools-tabs" aria-label="Workspace tools">
					<button
						className={tab === 'profile' ? 'is-active' : ''}
						type="button"
						onClick={() => setTab('profile')}
					>
						<TuneRounded />
						Session context
					</button>
					<button
						className={tab === 'documents' ? 'is-active' : ''}
						type="button"
						onClick={() => setTab('documents')}
					>
						<DescriptionOutlined />
						References
						<span>{documents.length}</span>
					</button>
					{domain === 'finance' && (
						<button
							className={tab === 'report' ? 'is-active' : ''}
							type="button"
							onClick={() => setTab('report')}
						>
							<FactCheckOutlined />
							Finance report
						</button>
					)}
				</nav>

				<div className="advisor-tools-dialog__body">
					{tab === 'profile' && (
						<section className="advisor-tool-panel">
							<div className="advisor-tool-panel__intro">
								<span>CANONICAL SESSION PROFILE</span>
								<h3>Set the context used to filter evidence.</h3>
								<p>Blank fields remain explicitly missing and are never silently inferred.</p>
							</div>
							{domain === 'finance' ? (
								<div className="advisor-form-grid">
									<label className="advisor-field advisor-field--wide">
										<span>Investment goal</span>
										<input
											value={financeDraft.investmentGoal}
											onChange={(event) => updateFinance('investmentGoal', event.target.value)}
										/>
									</label>
									<label className="advisor-field">
										<span>Horizon (months)</span>
										<input
											type="number"
											min="1"
											value={financeDraft.investmentHorizonMonths}
											onChange={(event) => updateFinance('investmentHorizonMonths', event.target.value)}
										/>
									</label>
									<label className="advisor-field">
										<span>Liquidity need</span>
										<select
											value={financeDraft.liquidityNeed}
											onChange={(event) =>
												updateFinance(
													'liquidityNeed',
													event.target.value as FinanceProfileDraft['liquidityNeed']
												)
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
										<span>Constraints</span>
										<input
											value={healthcareDraft.constraints}
											onChange={(event) => updateHealthcare('constraints', event.target.value)}
										/>
									</label>
								</div>
							)}
							<div className="advisor-tool-panel__actions">
								<button
									className="advisor-button advisor-button--primary"
									type="button"
									onClick={() => void saveProfile()}
									disabled={isSavingProfile}
								>
									<CheckRounded />
									{isSavingProfile ? 'Saving…' : 'Save context'}
								</button>
							</div>
						</section>
					)}

					{tab === 'documents' && (
						<section className="advisor-tool-panel">
							<div className="advisor-tool-panel__intro">
								<span>SESSION KNOWLEDGE</span>
								<h3>Add optional reference material.</h3>
								<p>
									Manual and generated Documents remain distinct. Retrieval requires approval and an explicit
									RAG preference.
								</p>
							</div>
							<div className="advisor-reference-create">
								<label className="advisor-field">
									<span>Reference title</span>
									<input
										value={documentTitle}
										onChange={(event) => setDocumentTitle(event.target.value)}
										placeholder="Fictional session reference"
									/>
								</label>
								<label className="advisor-field">
									<span>Reference body</span>
									<textarea
										value={documentBody}
										onChange={(event) => setDocumentBody(event.target.value)}
										placeholder="Paste fictional reference text only."
										rows={5}
									/>
								</label>
								<div className="advisor-reference-create__footer">
									<label className="advisor-check-field">
										<input
											type="checkbox"
											checked={documentIncludeInRag}
											onChange={(event) => setDocumentIncludeInRag(event.target.checked)}
										/>
										Request inclusion in RAG after approval
									</label>
									<button
										className="advisor-button advisor-button--primary"
										type="button"
										onClick={() => void createReferenceDocument()}
										disabled={documentApi.isMutating || !documentTitle.trim() || !documentBody.trim()}
									>
										<PostAddRounded />
										Save draft
									</button>
								</div>
							</div>

							<div className="advisor-document-list">
								{documentQuery.isLoading ? (
									<p>Loading references…</p>
								) : documents.length ? (
									documents.map((document) => (
										<article key={document.documentId}>
											<div className="advisor-document-list__heading">
												<div>
													<span>{document.origin === 'manual' ? 'MANUAL' : 'GENERATED'}</span>
													<h4>{document.title}</h4>
												</div>
												<span className={`advisor-document-status advisor-document-status--${document.status}`}>
													{documentStatusLabel(document)}
												</span>
											</div>
											<p>{document.body.slice(0, 240) || 'Empty draft'}</p>
											<div className="advisor-document-list__footer">
												<label className="advisor-check-field">
													<input
														type="checkbox"
														checked={document.includeInRag}
														disabled={document.status === 'archived' || documentApi.isMutating}
														onChange={(event) => void toggleDocumentRetrieval(document, event.target.checked)}
													/>
													Include in RAG
												</label>
												{document.status === 'draft' && (
													<button
														type="button"
														onClick={() => void approveDocument(document)}
														disabled={documentApi.isMutating}
													>
														Approve
													</button>
												)}
											</div>
										</article>
									))
								) : (
									<p>No session references or reports yet.</p>
								)}
							</div>
						</section>
					)}

					{tab === 'report' && domain === 'finance' && (
						<section className="advisor-tool-panel advisor-report-panel">
							<div className="advisor-tool-panel__intro">
								<span>TRACEABLE OUTPUT</span>
								<h3>Generate a personalized finance report.</h3>
								<p>
									The report uses the current request, Profile, eligible chat memory, Lore, and approved
									session Documents. It is output-only by default.
								</p>
							</div>
							<div className="advisor-report-card">
								<FactCheckOutlined />
								<div>
									<strong>Evidence-grounded report</strong>
									<span>
										Up to three fictional products with citations, suitability notes, missing information, and
										the fixed demo disclaimer.
									</span>
								</div>
							</div>
							<label className="advisor-field">
								<span>Report request</span>
								<textarea
									value={reportRequest}
									onChange={(event) => setReportRequest(event.target.value)}
									rows={5}
								/>
							</label>
							<div className="advisor-tool-panel__actions">
								<button
									className="advisor-button advisor-button--primary"
									type="button"
									onClick={() => void generateFinanceReport()}
									disabled={documentApi.isGenerating || !reportRequest.trim()}
								>
									<FactCheckOutlined />
									{documentApi.isGenerating ? 'Generating…' : 'Generate report'}
								</button>
							</div>
						</section>
					)}
				</div>

				{(message || error) && (
					<div className={`advisor-tools-message${error ? ' is-error' : ''}`}>{error || message}</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
