import {
  Awaitable,
  SessionData,
  SessionSerializationOptions,
  SessionStore,
} from ".";

export class SimpleCookieStore implements SessionStore {
  protected readonly _stringify: (data: SessionData) => string;
  protected readonly _parse: (data: string) => SessionData;

  constructor(serializationOptions: SessionSerializationOptions = {}) {
    const { stringify = JSON.stringify, parse = JSON.parse } =
      serializationOptions;
    this._stringify = stringify;
    this._parse = parse;
  }

  load(id: string) {
    try {
      return this._parse(id);
    } catch {
      return null;
    }
  }

  save(
    _id: string | null,
    data: SessionData,
    _maxAge: number,
  ): Awaitable<string> {
    void _maxAge;
    return this._stringify(data);
  }

  destroy() {
    // Do nothing
  }
}
