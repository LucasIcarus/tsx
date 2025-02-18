import path from 'node:path';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolveTsPath } from '../../utils/resolve-ts-path.js';
import type { NodeError } from '../../types.js';
import { isRelativePath, fileUrlPrefix, tsExtensionsPattern } from '../../utils/path-utils.js';
import { tsconfigPathsMatcher, allowJs } from '../../utils/tsconfig.js';

const nodeModulesPath = `${path.sep}node_modules${path.sep}`;

type ResolveFilename = typeof Module._resolveFilename;

const defaultResolver = Module._resolveFilename.bind(Module);

/**
 * Typescript gives .ts, .cts, or .mts priority over actual .js, .cjs, or .mjs extensions
 */
const resolveTsFilename = (
	request: string,
	parent: Module.Parent,
	isMain: boolean,
	options?: Record<PropertyKey, unknown>,
) => {
	const tsPath = resolveTsPath(request);

	if (
		parent?.filename
		&& (
			tsExtensionsPattern.test(parent.filename)
			|| allowJs
		)
		&& tsPath
	) {
		for (const tryTsPath of tsPath) {
			try {
				return defaultResolver(
					tryTsPath,
					parent,
					isMain,
					options,
				);
			} catch (error) {
				const { code } = error as NodeError;
				if (
					code !== 'MODULE_NOT_FOUND'
					&& code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED'
				) {
					throw error;
				}
			}
		}
	}
};

export const resolveFilename: ResolveFilename = (
	request,
	parent,
	isMain,
	options,
) => {
	// Strip query string
	const queryIndex = request.indexOf('?');
	if (queryIndex !== -1) {
		request = request.slice(0, queryIndex);
	}

	// Support file protocol
	if (request.startsWith(fileUrlPrefix)) {
		request = fileURLToPath(request);
	}

	if (
		tsconfigPathsMatcher

		// bare specifier
		&& !isRelativePath(request)

		// Dependency paths should not be resolved using tsconfig.json
		&& !parent?.filename?.includes(nodeModulesPath)
	) {
		const possiblePaths = tsconfigPathsMatcher(request);

		for (const possiblePath of possiblePaths) {
			const tsFilename = resolveTsFilename(possiblePath, parent, isMain, options);
			if (tsFilename) {
				return tsFilename;
			}

			try {
				return defaultResolver(
					possiblePath,
					parent,
					isMain,
					options,
				);
			} catch {}
		}
	}

	const tsFilename = resolveTsFilename(request, parent, isMain, options);
	if (tsFilename) {
		return tsFilename;
	}

	return defaultResolver(request, parent, isMain, options);
};
