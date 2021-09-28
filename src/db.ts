import loki from 'lokijs';

/** local database interface */
export default class Database {
  #db = null;

  constructor(file: string) {
    this.#db = new loki(file, {
      autosave: true,
      autosaveInterval: 30 * 1000, // autosave database every 30 seconds
    });
  }

  /**
   * creates or gets a collection
   * @param name collection name
   * @param options collection options
   * @returns the created or existing collection
   */
  collection(name: string, options: object): loki.Collection {
    return (
      this.#db.getCollection(name) ?? this.#db.addCollection(name, options)
    );
  }

  /**
   * save the database
   */
  async save() {
    await new Promise<void>((resolve, reject) => {
      this.#db.saveDatabase((err: Error) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  /**
   * Close and save the database
   */
  async close() {
    await new Promise<void>((resolve, reject) => {
      this.#db.saveDatabase((err: Error) => {
        if (err) return reject(err);
        this.#db.close((err: Error) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  /**
   * initialize the database, create collections if they don't exist
   */
  async init() {
    await new Promise<void>((resolve, reject) => {
      this.#db.loadDatabase({}, (err: Error) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
