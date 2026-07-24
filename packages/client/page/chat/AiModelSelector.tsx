// src/client/component/page/chat/AiModelSelector.tsx

import { alpha, FormControl, InputLabel, ListSubheader } from '@mui/material';
import { GlassMenuItem, GlassSelect } from '../../layout/component/glass/index.js';
import { glassEffect, glassEffectLight } from '../../style/glassEffect.js';
import { LANG_KEYS, SELECTABLE_MODEL_INFO } from '@rag-advisor-demo/shared/config';
import type { ModelCatalogEntry } from '@rag-advisor-demo/shared/api';
import { getLangText } from '../../util/translateUtils.js';

type ModelOption = Pick<ModelCatalogEntry, 'id' | 'name' | 'platform' | 'provider'>;

const fallbackOptions: ModelOption[] = Object.entries(SELECTABLE_MODEL_INFO).flatMap(
	([platform, providers]) =>
		Object.entries(providers).flatMap(([provider, models]) =>
			models.map((id) => ({
				id,
				name: id.split('/').at(-1) ?? id,
				platform: platform as ModelOption['platform'],
				provider: provider as ModelOption['provider'],
			}))
		)
);

const groupOptions = <K extends string>(
	options: ModelOption[],
	getKey: (option: ModelOption) => K
): Map<K, ModelOption[]> => {
	const groups = new Map<K, ModelOption[]>();
	for (const option of options) {
		const key = getKey(option);
		groups.set(key, [...(groups.get(key) ?? []), option]);
	}
	return groups;
};

export const AiModelSelector = ({
	modelName,
	onAiModel,
	models,
}: {
	modelName: string;
	onAiModel: (modelName: string) => void;
	models?: ModelCatalogEntry[];
}) => {
	const handleModelChange = (eventValue: string) => {
		onAiModel(eventValue);
	};
	const options = models?.length ? models : fallbackOptions;
	const groupedOptions = groupOptions(options, (option) => option.platform);
	const modelOptions = Array.from(groupedOptions.entries()).flatMap(([platform, platformModels]) => {
		// THE FIX: The platform header now has the prominent, uppercase style.
		const platformHeader = (
			<ListSubheader
				key={platform}
				sx={(theme) => ({
					fontSize: '0.75rem',
					fontStyle: 'italic',
					color: theme.palette.text.secondary,
					backgroundColor: alpha(theme.palette.background.default, 0.9),
					borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
					lineHeight: '24px',
					py: 0.5,
				})}
			>
				{platform}
			</ListSubheader>
		);

		const providerItems = Array.from(
			groupOptions(platformModels, (option) => option.provider).entries()
		).flatMap(([provider, providerModels]) => {
			// THE FIX: The provider sub-header now has the subtler, italic style.
			const providerHeader = (
				<ListSubheader
					key={`${platform}-${provider}`}
					sx={(theme) => ({
						pl: 4,
						bgcolor: 'transparent',
						py: 0.5,
						fontWeight: 'bold',
						fontSize: '0.8rem',
						textTransform: 'uppercase',
						color: theme.palette.primary.dark,
					})}
				>
					{provider}
				</ListSubheader>
			);

			const modelItems = providerModels.map((model) => (
				<GlassMenuItem key={model.id} value={model.id} sx={{ pl: 6, py: 0.5 }}>
					{model.name}
				</GlassMenuItem>
			));

			// THE FIX: The divider has been completely removed.
			return [providerHeader, ...modelItems];
		});

		return [platformHeader, ...providerItems];
	});

	return (
		<FormControl variant="outlined" size="small" sx={{ width: '100%', minWidth: 0 }}>
			<InputLabel id="ai-model-select-label" sx={{ color: 'text.secondary' }}>
				{getLangText(LANG_KEYS.AI_MODEL)}
			</InputLabel>
			<GlassSelect
				labelId="ai-model-select-label"
				id="ai-model-select"
				value={modelName || ''}
				label={getLangText(LANG_KEYS.AI_MODEL)}
				onChange={(e) => handleModelChange(`${e.target.value}`)}
				sx={{
					minWidth: 0,
					'& .MuiSelect-select': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
				}}
				MenuProps={{
					PaperProps: {
						className: 'hide-scrollbar',
						sx: (theme) => {
							const styleObject = theme.palette.mode === 'dark' ? glassEffect : glassEffectLight;
							const { '&:hover': hoverStyles, ...baseStyles } = styleObject;

							return { ...baseStyles, ...hoverStyles };
						},
					},
				}}
			>
				{modelOptions}
			</GlassSelect>
		</FormControl>
	);
};
