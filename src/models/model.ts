import { nanoid } from 'nanoid';

export default abstract class Model<T> {
  private uuid: string;

  constructor(uuid?: string) {
    if (!uuid) {
      this.uuid = nanoid();
    } else {
      this.uuid = uuid;
    }
  }

  getUUID(): string {
    return this.uuid;
  }

  abstract toJSON(): T;
}
