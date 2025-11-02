export function collectProjects(value: string, previous: string[] = []) {
  return previous.concat([value]);
}
