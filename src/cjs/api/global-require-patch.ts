import Module from 'node:module';
import { loadTsconfig } from '../../utils/tsconfig.js';
import { extensions } from './module-extensions.js';
import { resolveFilename } from './module-resolve-filename.js';

export const register = () => {
	const { sourceMapsEnabled } = process;
	const { _extensions, _resolveFilename } = Module;

	loadTsconfig(process.env.TSX_TSCONFIG_PATH);

	// register
	process.setSourceMapsEnabled(true);
	// @ts-expect-error overwriting read-only property
	Module._extensions = extensions;
	Module._resolveFilename = resolveFilename;

	// unregister
	return () => {
		if (sourceMapsEnabled === false) {
			process.setSourceMapsEnabled(false);
		}

		// @ts-expect-error overwriting read-only property
		Module._extensions = _extensions;
		Module._resolveFilename = _resolveFilename;
	};
};
