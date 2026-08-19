export class InMemoryStorageSpy {
  readonly writes: Array<{ bucket: string; objectName: string; size: number }> = [];

  async uploadFile(
    bucket: string,
    objectName: string,
    buffer: Buffer,
  ): Promise<string> {
    this.writes.push({ bucket, objectName, size: buffer.length });
    return objectName;
  }

  async getPresignedUrl(): Promise<string> {
    return 'memory://authz-test-object';
  }

  assertNoWrites(): void {
    if (this.writes.length !== 0) {
      throw new Error(`Expected no storage writes, received ${this.writes.length}`);
    }
  }
}
