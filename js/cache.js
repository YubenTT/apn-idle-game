export const RUNTIME_BUILD_ID = 'gaf2d-motion-v1';

export function withRuntimeVersion(source) {
  const value = String(source || '');
  const normalized =
    value.startsWith('./') ||
    value.startsWith('../') ||
    value.startsWith('/')
      ? value
      : `./${value}`;
  const separator = normalized.includes('?') ? '&' : '?';
  return `${normalized}${separator}v=${RUNTIME_BUILD_ID}`;
}
