// src/client/component/page/chat/UserInput.tsx

import {
	Box,
	IconButton,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	useTheme,
	FormControlLabel,
	Tooltip,
} from '@mui/material';
import React, { ChangeEventHandler, FC, useState } from 'react';
import {
	GlassBox,
	GlassButton,
	GlassMenu,
	GlassMenuItem,
} from '../../layout/component/glass/index.js';
import { useToast } from '../../provider/ToastProvider.jsx';
import { getLangAlertText, getLangText } from '../../util/translateUtils.js';
import { AiModelSelector } from './AiModelSelector.jsx';
import SettingsIcon from '@mui/icons-material/Settings';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import KeyIcon from '@mui/icons-material/Key';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import { silver } from '../../style/index.js';
import { LANG_KEYS, REQUEST_CHARACTER_LIMIT } from '@rag-advisor-demo/shared/config';
import type { SessionContentPolicy } from '@rag-advisor-demo/shared/domain';
import type { ModelCatalogEntry } from '@rag-advisor-demo/shared/api';
import type { ChatDisplayMode } from './chatDisplayMode.js';
import { ApiKeyDialog } from './ApiKeyDialog.js';
import { AdultSwitch } from '../../layout/component/AdultSwitch.js';

interface UserInputProps {
	userId: string;
	value: string;
	isProcessing: boolean;
	isDisabled: boolean;
	onChange: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
	onSend: () => void;
	onCancel: () => void;
	modelName: string;
	onAiModel: (modelName: string) => void;
	models?: ModelCatalogEntry[];
	displayMode: ChatDisplayMode;
	onDisplayMode: (mode: ChatDisplayMode) => void;
	contentPolicy: SessionContentPolicy;
	isContentPolicyUpdating: boolean;
	onContentPolicy: (contentPolicy: SessionContentPolicy) => void;
	onOpenUserNoteModal: () => void;
}

export const UserInput: FC<UserInputProps> = ({
	userId,
	value,
	isProcessing,
	isDisabled,
	onChange,
	onSend,
	onCancel,
	modelName,
	onAiModel,
	models,
	displayMode,
	onDisplayMode,
	contentPolicy,
	isContentPolicyUpdating,
	onContentPolicy,
	onOpenUserNoteModal,
}) => {
	const { addToast } = useToast();
	const theme = useTheme();
	const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);

	// State for controlling the settings dropdown menu
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const isMenuOpen = Boolean(anchorEl);

	// Settings menu handlers
	const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
		setAnchorEl(event.currentTarget);
	};

	const handleMenuClose = () => {
		setAnchorEl(null);
	};

	const handleSend = async () => {
		if (import.meta.env.VITE_APP_MODE === 'static') {
			addToast(getLangAlertText(LANG_KEYS.STATIC_SENDING_DISABLE), 'warning');
			return;
		}

		try {
			onSend();
		} catch (error) {
			console.error('Send failed:', error);
		}
	};

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === 'Enter') {
			if (event.ctrlKey || event.metaKey) {
				event.preventDefault();
				if (!isDisabled && value.trim()) {
					handleSend();
				}
			}
		}
	};

	return (
		<Box margin={1}>
			<Box>
				<TextField
					placeholder={getLangText(LANG_KEYS.MESSAGE_PLACEHOLDER)}
					variant="outlined"
					fullWidth
					multiline
					minRows={2}
					maxRows={4}
					value={value}
					slotProps={{
						formHelperText: { sx: { textAlign: 'right', m: 0, mr: 1 } },
						htmlInput: { maxLength: REQUEST_CHARACTER_LIMIT },
						input: { sx: { fontSize: theme.typography.body2.fontSize } },
					}}
					onChange={onChange}
					disabled={isDisabled}
					onKeyDown={handleKeyDown}
					error={value.length > REQUEST_CHARACTER_LIMIT}
					helperText={`${value.length} / ${REQUEST_CHARACTER_LIMIT}`}
				/>
			</Box>
			{/* Row 2: Model Selector and Send Button */}
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					gap: { xs: 0.5, sm: 1 },
					[theme.breakpoints.down('md')]: { pb: 1 },
				}}
			>
				<Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
					{/* Settings Icon and Menu */}
					<IconButton
						onClick={handleMenuOpen}
						aria-label={getLangText(LANG_KEYS.SESSION_SETTINGS)}
						aria-controls={isMenuOpen ? 'session-setting-menu' : undefined}
						aria-haspopup="true"
						sx={{
							color: 'silver',
							transition: 'all 0.3s ease-in-out',
							'&:hover': { color: silver.main },
						}}
					>
						<SettingsIcon />
					</IconButton>
					<GlassMenu
						id="session-setting-menu"
						anchorEl={anchorEl}
						open={isMenuOpen}
						onClose={handleMenuClose}
						onClick={handleMenuClose}
						// Changed: Open upward from bottom-left
						anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
						transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
					>
						<GlassMenuItem
							onClick={() => {
								handleMenuClose();
								onOpenUserNoteModal();
							}}
							colorVariant="silver"
						>
							{getLangText(LANG_KEYS.USER_NOTE)}
						</GlassMenuItem>
						<Box sx={{ px: 1, py: 0.5 }} onClick={(event) => event.stopPropagation()}>
							<FormControlLabel
								control={
									<AdultSwitch
										checked={contentPolicy === 'adult'}
										onChange={(_, checked) => onContentPolicy(checked ? 'adult' : 'general')}
										disabled={isProcessing || isContentPolicyUpdating}
										inputProps={{ 'aria-label': getLangText(LANG_KEYS.ADULT_SESSION) }}
									/>
								}
								label={getLangText(
									contentPolicy === 'adult' ? LANG_KEYS.ADULT_SESSION : LANG_KEYS.GENERAL_SESSION
								)}
								sx={{ m: 0 }}
							/>
						</Box>
						<GlassMenuItem
							onClick={() => {
								handleMenuClose();
								setApiKeyDialogOpen(true);
							}}
							colorVariant="silver"
						>
							<KeyIcon fontSize="small" sx={{ mr: 1 }} />
							{getLangText(LANG_KEYS.API_KEYS)}
						</GlassMenuItem>
						<Box
							sx={{ px: 1, py: 0.5, display: 'flex', justifyContent: 'center' }}
							onClick={(event) => event.stopPropagation()}
						>
							<ToggleButtonGroup
								exclusive
								size="small"
								value={displayMode}
								onChange={(_event, mode: ChatDisplayMode | null) => {
									if (mode) onDisplayMode(mode);
								}}
								aria-label={getLangText(LANG_KEYS.CHAT_DISPLAY_MODE)}
							>
								<ToggleButton
									value="book"
									aria-label={getLangText(LANG_KEYS.BOOK_MODE)}
									title={getLangText(LANG_KEYS.BOOK_MODE)}
								>
									<MenuBookOutlinedIcon fontSize="small" />
								</ToggleButton>
								<ToggleButton
									value="conversation"
									aria-label={getLangText(LANG_KEYS.CONVERSATION_MODE)}
									title={getLangText(LANG_KEYS.CONVERSATION_MODE)}
								>
									<ForumOutlinedIcon fontSize="small" />
								</ToggleButton>
							</ToggleButtonGroup>
						</Box>
					</GlassMenu>

					<AiModelSelector modelName={modelName} onAiModel={onAiModel} models={models} />
				</Box>
				<Tooltip title={isProcessing ? getLangText(LANG_KEYS.STOP_GENERATION) : ''}>
					<GlassButton
						variant="contained"
						colorVariant={isProcessing ? 'silver' : 'secondary'}
						onClick={isProcessing ? onCancel : handleSend}
						disabled={!isProcessing && (isDisabled || !value.trim())}
						aria-label={
							isProcessing ? getLangText(LANG_KEYS.STOP_GENERATION) : getLangText(LANG_KEYS.SEND)
						}
						sx={{ flexShrink: 0 }}
					>
						{isProcessing ? <StopCircleOutlinedIcon /> : getLangText(LANG_KEYS.SEND)}
					</GlassButton>
				</Tooltip>
			</Box>
			<ApiKeyDialog
				open={apiKeyDialogOpen}
				userId={userId}
				onClose={() => setApiKeyDialogOpen(false)}
			/>
		</Box>
	);
};
