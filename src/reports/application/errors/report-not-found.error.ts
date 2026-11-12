export class ReportNotFoundError extends Error {
  constructor(id: string) {
    super(`Report with id "${id}" was not found`);
    this.name = 'ReportNotFoundError';
  }
}
