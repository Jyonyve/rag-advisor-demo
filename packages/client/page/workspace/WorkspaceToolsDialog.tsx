import CheckRounded from '@mui/icons-material/CheckRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import PostAddRounded from '@mui/icons-material/PostAddRounded';
import TuneRounded from '@mui/icons-material/TuneRounded';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import { Dialog, DialogContent, IconButton, Tooltip } from '@mui/material';
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
import { useLanguage } from '../../provider/LanguageProvider.js';
import {
	buildDefaultFinanceReportRequest,
	buildFinanceDomainProfile,
	buildHealthcareDomainProfile,
	EMPTY_FINANCE_PROFILE,
	EMPTY_HEALTHCARE_PROFILE,
	type FinanceProfileDraft,
	type HealthcareProfileDraft,
} from './workspaceConfig.js';
import { parseReportMarkdown } from './reportMarkdownUtils.js';
import { getWorkspaceCopy, getWorkspaceDomainConfig, type WorkspaceCopy } from './workspaceI18n.js';

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

const documentStatusLabel = (document: DocumentInfo, text: WorkspaceCopy): string => {
	if (document.status === 'archived') return text.archived;
	if (document.status === 'approved' && document.retrievalEnabled) return text.inRag;
	if (document.status === 'approved') return text.approved;
	return text.draft;
};

const ReportMarkdown = ({ body }: { body: string }) => {
	const blocks = useMemo(() => parseReportMarkdown(body), [body]);
	return (
		<div className="advisor-report-markdown">
			{blocks.map((block, index) => {
				const key = `${block.type}-${index}`;
				if (block.type === 'heading') {
					if (block.level === 1) return <h1 key={key}>{block.text}</h1>;
					if (block.level === 2) return <h2 key={key}>{block.text}</h2>;
					return <h3 key={key}>{block.text}</h3>;
				}
				if (block.type === 'blockquote') return <blockquote key={key}>{block.text}</blockquote>;
				if (block.type === 'list') {
					return (
						<ul key={key}>
							{block.items.map((item, itemIndex) => (
								<li key={`${key}-${itemIndex}`}>{item}</li>
							))}
						</ul>
					);
				}
				return <p key={key}>{block.text}</p>;
			})}
		</div>
	);
};

export function WorkspaceToolsDialog({
	open,
	initialTab,
	domain,
	session,
	profile,
	onClose,
}: WorkspaceToolsDialogProps) {
	const { lang } = useLanguage();
	const text = getWorkspaceCopy(lang);
	const config = getWorkspaceDomainConfig(domain, lang);
	const [tab, setTab] = useState<WorkspaceToolTab>(initialTab);
	const [financeDraft, setFinanceDraft] = useState(() => profileToFinanceDraft(profile));
	const [healthcareDraft, setHealthcareDraft] = useState(() => profileToHealthcareDraft(profile));
	const [documentTitle, setDocumentTitle] = useState('');
	const [documentBody, setDocumentBody] = useState('');
	const [documentIncludeInRag, setDocumentIncludeInRag] = useState(true);
	const [reportRequest, setReportRequest] = useState(() =>
		buildDefaultFinanceReportRequest(profile.domainProfile, lang)
	);
	const [selectedDocumentId, setSelectedDocumentId] = useState<string>();
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
	const selectedDocument = documents.find((document) => document.documentId === selectedDocumentId);

	useEffect(() => {
		if (!open) return;
		setTab(initialTab);
		setFinanceDraft(profileToFinanceDraft(profile));
		setHealthcareDraft(profileToHealthcareDraft(profile));
		setReportRequest(buildDefaultFinanceReportRequest(profile.domainProfile, lang));
		setSelectedDocumentId(undefined);
		setMessage(undefined);
		setError(undefined);
	}, [initialTab, lang, open, profile]);

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
			setMessage(text.contextSaved);
		} catch (cause) {
			console.error('Profile update failed:', cause);
			setError(text.contextSaveFailed);
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
			setMessage(text.draftSaved);
		} catch (cause) {
			console.error('Reference creation failed:', cause);
			setError(text.draftSaveFailed);
		}
	};

	const approveDocument = async (document: DocumentInfo) => {
		setError(undefined);
		setMessage(undefined);
		try {
			await documentApi.approve({ documentId: document.documentId, sessionId: session.sessionId });
			setMessage(text.documentApproved);
		} catch (cause) {
			console.error('Document approval failed:', cause);
			setError(text.documentApproveFailed);
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
			setError(text.retrievalUpdateFailed);
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
			setMessage(text.reportCreated);
			setTab('documents');
		} catch (cause) {
			console.error('Finance report generation failed:', cause);
			setError(text.reportCreateFailed);
		}
	};

	return (
		<>
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
							<span>{text.workspaceTools}</span>
							<h2>{config.shortTitle}</h2>
						</div>
						<Tooltip title={text.closeTools}>
							<IconButton onClick={onClose} aria-label={text.closeTools}>
								<CloseRounded />
							</IconButton>
						</Tooltip>
					</header>

					<nav className="advisor-tools-tabs" aria-label={text.workspaceTools}>
						<button
							className={tab === 'profile' ? 'is-active' : ''}
							type="button"
							onClick={() => setTab('profile')}
						>
							<TuneRounded />
							{text.profileTab}
						</button>
						<button
							className={tab === 'documents' ? 'is-active' : ''}
							type="button"
							onClick={() => setTab('documents')}
						>
							<DescriptionOutlined />
							{text.documentsTab}
							<span>{documents.length}</span>
						</button>
						{domain === 'finance' && (
							<button
								className={tab === 'report' ? 'is-active' : ''}
								type="button"
								onClick={() => setTab('report')}
							>
								<FactCheckOutlined />
								{text.reportTab}
							</button>
						)}
					</nav>

					<div className="advisor-tools-dialog__body">
						{tab === 'profile' && (
							<section className="advisor-tool-panel">
								<div className="advisor-tool-panel__intro">
									<span>{text.canonicalProfile}</span>
									<h3>{text.profileHeading}</h3>
									<p>{text.profileMissingNote}</p>
								</div>
								{domain === 'finance' ? (
									<div className="advisor-form-grid">
										<label className="advisor-field advisor-field--wide">
											<span>{text.investmentGoal}</span>
											<input
												value={financeDraft.investmentGoal}
												onChange={(event) => updateFinance('investmentGoal', event.target.value)}
											/>
										</label>
										<label className="advisor-field">
											<span>{text.horizonMonths}</span>
											<input
												type="number"
												min="1"
												value={financeDraft.investmentHorizonMonths}
												onChange={(event) => updateFinance('investmentHorizonMonths', event.target.value)}
											/>
										</label>
										<label className="advisor-field">
											<span>{text.liquidityNeed}</span>
											<select
												value={financeDraft.liquidityNeed}
												onChange={(event) =>
													updateFinance(
														'liquidityNeed',
														event.target.value as FinanceProfileDraft['liquidityNeed']
													)
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
											<span>{text.constraints}</span>
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
										{isSavingProfile ? text.savingContext : text.saveContext}
									</button>
								</div>
							</section>
						)}

						{tab === 'documents' && (
							<section className="advisor-tool-panel">
								<div className="advisor-tool-panel__intro">
									<span>{text.sessionKnowledge}</span>
									<h3>{text.referenceHeading}</h3>
									<p>{text.referenceNote}</p>
								</div>
								<div className="advisor-reference-create">
									<label className="advisor-field">
										<span>{text.referenceTitle}</span>
										<input
											value={documentTitle}
											onChange={(event) => setDocumentTitle(event.target.value)}
											placeholder={text.referenceTitlePlaceholder}
										/>
									</label>
									<label className="advisor-field">
										<span>{text.referenceBody}</span>
										<textarea
											value={documentBody}
											onChange={(event) => setDocumentBody(event.target.value)}
											placeholder={text.referenceBodyPlaceholder}
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
											{text.requestRag}
										</label>
										<button
											className="advisor-button advisor-button--primary"
											type="button"
											onClick={() => void createReferenceDocument()}
											disabled={documentApi.isMutating || !documentTitle.trim() || !documentBody.trim()}
										>
											<PostAddRounded />
											{text.saveDraft}
										</button>
									</div>
								</div>

								<div className="advisor-document-list">
									{documentQuery.isLoading ? (
										<p>{text.loadingReferences}</p>
									) : documents.length ? (
										documents.map((document) => (
											<article key={document.documentId}>
												<div className="advisor-document-list__heading">
													<div>
														<span>{document.origin === 'manual' ? text.manual : text.generated}</span>
														<h4>{document.title}</h4>
													</div>
													<span
														className={`advisor-document-status advisor-document-status--${document.status}`}
													>
														{documentStatusLabel(document, text)}
													</span>
												</div>
												<p>{document.body.slice(0, 240) || text.emptyDraft}</p>
												<div className="advisor-document-list__footer">
													<label className="advisor-check-field">
														<input
															type="checkbox"
															checked={document.includeInRag}
															disabled={document.status === 'archived' || documentApi.isMutating}
															onChange={(event) => void toggleDocumentRetrieval(document, event.target.checked)}
														/>
														{text.includeInRag}
													</label>
													<div className="advisor-document-list__actions">
														<button type="button" onClick={() => setSelectedDocumentId(document.documentId)}>
															<VisibilityOutlined />
															{document.status === 'draft' ? text.readDraft : text.readDocument}
														</button>
														{document.status === 'draft' && (
															<button
																type="button"
																onClick={() => void approveDocument(document)}
																disabled={documentApi.isMutating}
															>
																{text.approve}
															</button>
														)}
													</div>
												</div>
											</article>
										))
									) : (
										<p>{text.noReferences}</p>
									)}
								</div>
							</section>
						)}

						{tab === 'report' && domain === 'finance' && (
							<section className="advisor-tool-panel advisor-report-panel">
								<div className="advisor-tool-panel__intro">
									<span>{text.traceableOutput}</span>
									<h3>{text.reportHeading}</h3>
									<p>{text.reportNote}</p>
								</div>
								<div className="advisor-report-card">
									<FactCheckOutlined />
									<div>
										<strong>{text.evidenceGroundedReport}</strong>
										<span>{text.reportCardNote}</span>
									</div>
								</div>
								<label className="advisor-field">
									<span>{text.reportRequest}</span>
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
										{documentApi.isGenerating ? text.generatingReport : text.generateReport}
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

			<Dialog
				open={Boolean(selectedDocument)}
				onClose={() => setSelectedDocumentId(undefined)}
				fullWidth
				maxWidth="md"
				slotProps={{ paper: { className: 'advisor-document-reader' } }}
			>
				{selectedDocument && (
					<DialogContent className="advisor-document-reader__content">
						<header className="advisor-document-reader__header">
							<div>
								<span>
									{selectedDocument.origin === 'manual' ? text.manualDocument : text.generatedReport}
								</span>
								<h2>{selectedDocument.title}</h2>
							</div>
							<Tooltip title={text.closeReader}>
								<IconButton onClick={() => setSelectedDocumentId(undefined)} aria-label={text.closeReader}>
									<CloseRounded />
								</IconButton>
							</Tooltip>
						</header>
						<div className="advisor-document-reader__body">
							<ReportMarkdown body={selectedDocument.body} />
						</div>
						<footer className="advisor-document-reader__footer">
							<div>
								<span
									className={`advisor-document-status advisor-document-status--${selectedDocument.status}`}
								>
									{documentStatusLabel(selectedDocument, text)}
								</span>
								<small>{text.reviewComplete}</small>
							</div>
							{selectedDocument.status === 'draft' && (
								<button
									className="advisor-button advisor-button--primary"
									type="button"
									onClick={() => void approveDocument(selectedDocument)}
									disabled={documentApi.isMutating}
								>
									<CheckRounded />
									{text.approveDocument}
								</button>
							)}
						</footer>
					</DialogContent>
				)}
			</Dialog>
		</>
	);
}
